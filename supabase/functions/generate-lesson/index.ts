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

  try {
    const { lesson_id } = await req.json();

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
        max_tokens: 3000,
        system: LESSON_PROMPT,
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
      throw new Error("Lesson generation API error: " + e.message);
    }

    // Search YouTube
    let videoUrl = null;
    try {
      const ytKey = Deno.env.get('YOUTUBE_API_KEY');
      if (ytKey) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const ytSearch = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(lesson.title + " " + lesson.courses.topic)}&type=video&key=${ytKey}&maxResults=3`,
          { signal: controller.signal }
        );
        clearTimeout(timeoutId);
        const ytData = await ytSearch.json();
        if (ytData.items && ytData.items.length > 0) {
          videoUrl = `https://www.youtube.com/watch?v=${ytData.items[0].id.videoId}`;
        }
      }
    } catch (e) {
      console.error("YouTube search failed or timed out.");
    }

    // Persist lesson content
    await adminClient
      .from('lessons')
      .update({ body: lessonJson.body, citations: lessonJson.citations || [], video_url: videoUrl })
      .eq('id', lesson_id);

    // Add token usage to the course running total
    const lessonUsage = lessonResponse?.usage;
    if (lessonUsage) {
      const { data: courseTokens } = await adminClient
        .from('courses')
        .select('input_tokens, output_tokens')
        .eq('id', lesson.courses.id)
        .single();

      const newInputTokens = (courseTokens?.input_tokens || 0) + lessonUsage.input_tokens;
      const newOutputTokens = (courseTokens?.output_tokens || 0) + lessonUsage.output_tokens;

      await adminClient
        .from('courses')
        .update({ input_tokens: newInputTokens, output_tokens: newOutputTokens })
        .eq('id', lesson.courses.id);

      return new Response(JSON.stringify({
        success: true,
        body: lessonJson.body,
        citations: lessonJson.citations || [],
        video_url: videoUrl,
        course_input_tokens: newInputTokens,
        course_output_tokens: newOutputTokens,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }

    return new Response(JSON.stringify({
      success: true,
      body: lessonJson.body,
      citations: lessonJson.citations || [],
      video_url: videoUrl,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("generate-lesson error:", errorMessage);
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  }
});
