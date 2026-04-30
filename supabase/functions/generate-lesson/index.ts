import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Anthropic from "npm:@anthropic-ai/sdk@0.36.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LESSON_PROMPT = `
You are an expert educator. Use the web_search tool to research the lesson topic, then write the lesson.

The user will provide:
- Course Title: the overall course context
- Lesson Title: the specific topic to teach

Write the lesson as plain Markdown (400-600 words). Use ## headings, **bold text**, and bullet points. Be concrete and educational.

At the very end of your response, add a divider and a Sources section listing the real URLs you found during research, like this:

---
**Sources:**
- [Title of source](https://actual-url.com)
- [Title of source](https://actual-url.com)

Rules:
- Only include sources from actual web search results. Never invent a URL.
- If a source has no URL, leave it out.
- Write the lesson content first, then the Sources section. Nothing else.
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let lesson_id: string | null = null;

  try {
    ({ lesson_id } = await req.json());

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Validate user
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    // Fetch lesson + parent course to verify ownership
    const { data: lesson, error: lessonError } = await adminClient
      .from('lessons')
      .select('*, courses(id, title, topic, user_id)')
      .eq('id', lesson_id)
      .single();

    if (lessonError || !lesson) throw new Error("Lesson not found");
    if (lesson.courses.user_id !== user.id) throw new Error("Unauthorized");

    // Already generated — return existing content without re-generating
    if (lesson.body) {
      return new Response(JSON.stringify({
        success: true,
        body: lesson.body,
        citations: lesson.citations,
        video_url: lesson.video_url,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }

    const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY'), maxRetries: 0 });

    // Generate lesson content with web search grounding
    let lessonJson = { body: "Content generation failed.", citations: [] };
    let lessonResponse;
    try {
      lessonResponse = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1500,
        system: [{ type: "text", text: LESSON_PROMPT, cache_control: { type: "ephemeral" } }],
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [{
          role: "user",
          content: `Course Title: ${lesson.courses.title}\nLesson Title: ${lesson.title}`,
        }]
      }, { timeout: 60000 });

      // Extract the final text block — web search may add other block types before it
      const rawText = lessonResponse.content
        .filter(c => c.type === 'text')
        .map(c => c.text)
        .join('') || "";

      if (rawText) {
        // Split body from the Sources section
        const dividerIndex = rawText.lastIndexOf('\n---');
        const bodyPart = dividerIndex !== -1 ? rawText.slice(0, dividerIndex).trim() : rawText.trim();
        const sourcesPart = dividerIndex !== -1 ? rawText.slice(dividerIndex) : '';

        // Parse markdown links from the Sources section: [Title](url)
        const citations = [];
        const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
        let match;
        let idx = 1;
        while ((match = linkRegex.exec(sourcesPart)) !== null) {
          citations.push({ id: String(idx++), title: match[1], url: match[2] });
        }

        lessonJson = { body: bodyPart, citations };
      }
    } catch (e) {
      if (e.status === 429) {
        throw new Error("We're generating lessons a little too quickly. Please wait 30 seconds and try again.");
      }
      throw new Error("Lesson generation API error: " + e.message);
    }

    // Search YouTube with quality filter: ≥10k views, published ≤5yrs ago, channel ≥1yr old
    let videoUrl = null;
    try {
      const ytKey = Deno.env.get('YOUTUBE_API_KEY');
      if (ytKey) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);
        const get = (url) => fetch(url, { signal: controller.signal });

        // Step 1: search for candidates by relevance — "tutorial" biases toward educational content
        const searchRes = await get(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(lesson.title + " " + lesson.courses.topic + " tutorial")}&type=video&key=${ytKey}&maxResults=5`
        );
        const searchData = await searchRes.json();
        const candidates = searchData.items || [];

        if (candidates.length > 0) {
          const videoIds = candidates.map(i => i.id.videoId).join(',');
          const channelIds = [...new Set(candidates.map(i => i.snippet.channelId))].join(',');

          // Steps 2+3: batch-fetch video stats and channel ages in parallel
          const [videosRes, channelsRes] = await Promise.all([
            get(`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoIds}&key=${ytKey}`),
            get(`https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelIds}&key=${ytKey}`),
          ]);
          clearTimeout(timeoutId);

          const videosData = await videosRes.json();
          const channelsData = await channelsRes.json();

          // Map channelId -> creation date for fast lookup
          const channelCreatedAt = {};
          for (const ch of (channelsData.items || [])) {
            channelCreatedAt[ch.id] = new Date(ch.snippet.publishedAt);
          }

          // Map videoId -> stats so we can iterate in search-relevance order
          const videoStats = {};
          for (const v of (videosData.items || [])) {
            videoStats[v.id] = v;
          }

          const now = new Date();
          const fiveYearsAgo = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate());
          const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

          // Collect all candidates that pass the stats filters
          const passingCandidates = [];
          for (const candidate of candidates) {
            const vid = videoStats[candidate.id.videoId];
            if (!vid) continue;

            const views = parseInt(vid.statistics?.viewCount || '0', 10);
            const publishedAt = new Date(vid.snippet.publishedAt);
            const channelAge = channelCreatedAt[vid.snippet.channelId];

            if (views >= 10000 && publishedAt >= fiveYearsAgo && channelAge && channelAge <= oneYearAgo) {
              passingCandidates.push({ id: vid.id, title: vid.snippet.title, channel: vid.snippet.channelTitle });
            }
          }

          // Ask Claude Haiku to pick the most educational video, or reject all
          if (passingCandidates.length > 0) {
            try {
              const videoList = passingCandidates.map((v, i) => `${i + 1}. "${v.title}" by ${v.channel}`).join('\n');
              const filterRes = await anthropic.messages.create({
                model: "claude-haiku-4-5-20251001",
                max_tokens: 10,
                messages: [{
                  role: "user",
                  content: `You are screening YouTube videos for an educational lesson.\n\nLesson: ${lesson.title}\nCourse: ${lesson.courses.title}\n\nCandidates:\n${videoList}\n\nWhich number is the most clearly educational and appropriate video? Reply with just the number, or "none" if none are appropriate.`,
                }],
              }, { timeout: 10000 });

              const pick = filterRes.content[0]?.text?.trim().toLowerCase() ?? 'none';
              if (pick !== 'none') {
                const idx = parseInt(pick, 10) - 1;
                if (idx >= 0 && idx < passingCandidates.length) {
                  videoUrl = `https://www.youtube.com/watch?v=${passingCandidates[idx].id}`;
                }
              }
            } catch (e) {
              // Filter call failed — fall back to first passing candidate
              videoUrl = `https://www.youtube.com/watch?v=${passingCandidates[0].id}`;
            }
          }
        } else {
          clearTimeout(timeoutId);
        }
      }
    } catch (e) {
      console.error("YouTube search failed or timed out:", e.message);
    }

    const lessonUsage = lessonResponse?.usage;
    const lessonInputTokens = lessonUsage?.input_tokens || 0;
    const lessonOutputTokens = lessonUsage?.output_tokens || 0;

    // Persist lesson content + per-lesson token counts
    await adminClient
      .from('lessons')
      .update({
        body: lessonJson.body,
        citations: lessonJson.citations || [],
        video_url: videoUrl,
        input_tokens: lessonInputTokens,
        output_tokens: lessonOutputTokens,
        generation_failed: false,
      })
      .eq('id', lesson_id);

    // Add token usage to the course running total
    const { data: courseTokens } = await adminClient
      .from('courses')
      .select('input_tokens, output_tokens')
      .eq('id', lesson.courses.id)
      .single();

    const newInputTokens = (courseTokens?.input_tokens || 0) + lessonInputTokens;
    const newOutputTokens = (courseTokens?.output_tokens || 0) + lessonOutputTokens;

    await adminClient
      .from('courses')
      .update({ input_tokens: newInputTokens, output_tokens: newOutputTokens })
      .eq('id', lesson.courses.id);

    return new Response(JSON.stringify({
      success: true,
      body: lessonJson.body,
      citations: lessonJson.citations || [],
      video_url: videoUrl,
      lesson_input_tokens: lessonInputTokens,
      lesson_output_tokens: lessonOutputTokens,
      course_input_tokens: newInputTokens,
      course_output_tokens: newOutputTokens,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("generate-lesson error:", errorMessage);

    if (lesson_id) {
      try {
        const adminClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        );
        await adminClient.from('lessons').update({ generation_failed: true }).eq('id', lesson_id);
      } catch (e) {
        console.error("Failed to mark lesson as failed:", e);
      }
    }

    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  }
});
