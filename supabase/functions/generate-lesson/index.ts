import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Anthropic from "npm:@anthropic-ai/sdk@0.20.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LESSON_PROMPT = `
You are an expert educator and writer with deep knowledge across many fields.
Your task is to write a single comprehensive lesson for a course, based on your training knowledge.

The user will provide:
- Course Title: The overall course context
- Lesson Title: The specific topic for this lesson

IMPORTANT INSTRUCTIONS:
1. Write a thorough, accurate lesson using your knowledge. Be concrete, practical, and educational.
2. The lesson body MUST be written in readable Markdown. Use headings (##, ###), bold text, bullet points, numbered lists, and paragraphs.
3. Aim for approximately 400-600 words of substantive content.
4. Include a "citations" array with 2-3 well-known, real reference sources (books, official documentation, or well-known websites) relevant to the topic. Only include sources you are highly confident exist — do not invent URLs.

Return the lesson as a JSON object strictly following this structure:
{
  "body": "The markdown content of the lesson...",
  "citations": [
    {
      "id": "1",
      "title": "Title of the source",
      "url": "https://example.com/source"
    }
  ]
}

DO NOT include any markdown formatting around the JSON (e.g. \`\`\`json). Just return the raw JSON object.
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

    // Already generated — return the existing content without re-generating
    if (lesson.body) {
      return new Response(JSON.stringify({
        success: true,
        body: lesson.body,
        citations: lesson.citations,
        video_url: lesson.video_url,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }

    const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY'), maxRetries: 0 });

    // Generate lesson content
    let lessonJson = { body: "Content generation failed.", citations: [] };
    try {
      const lessonResponse = await anthropic.messages.create({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 1500,
        system: LESSON_PROMPT,
        messages: [{
          role: "user",
          content: `Course Title: ${lesson.courses.title}\nLesson Title: ${lesson.title}`,
        }]
      }, { timeout: 45000 });

      const rawText = lessonResponse.content.find(c => c.type === 'text')?.text || "{}";
      try {
        lessonJson = JSON.parse(rawText.replace(/```json\n?|\n?```/g, '').trim());
      } catch (e) {
        console.error("Failed to parse lesson JSON:", rawText);
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

    // Add this lesson's token usage to the course running total
    const lessonUsage = lessonResponse.usage;
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

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("generate-lesson error:", errorMessage);
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  }
});
