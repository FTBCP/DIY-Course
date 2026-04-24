import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Anthropic from "npm:@anthropic-ai/sdk@0.20.1";
import { OUTLINE_PROMPT, LESSON_PROMPT } from "./prompts.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let courseId = null;
  let supabaseClient;
  const startTime = Date.now();

  try {
    const { topic, depth, time } = await req.json();

    // 1. Initialize Supabase clients
    // userClient: uses user's JWT — validates identity and reads with RLS
    // adminClient: uses service role — bypasses RLS for trusted server-side writes
    supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // 2. Validate User
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    // ⚠️ TEST MODE: Rate limit disabled. Re-enable before launch.
    // const today = new Date();
    // today.setHours(0, 0, 0, 0);
    // const { data: recentCourses, error: courseCheckError } = await supabaseClient
    //   .from('courses')
    //   .select('id')
    //   .eq('user_id', user.id)
    //   .eq('status', 'ready')
    //   .gte('created_at', today.toISOString());
    // if (courseCheckError) throw courseCheckError;
    // if (recentCourses && recentCourses.length >= 1) {
    //   throw new Error("You have reached the limit of 1 course per day.");
    // }

    // 4. Create the initial course record
    const { data: newCourse, error: insertError } = await supabaseClient
      .from('courses')
      .insert({
        user_id: user.id,
        topic,
        intake_answers: { depth, time },
        title: "Generating...",
      })
      .select()
      .single();

    if (insertError) throw insertError;

    courseId = newCourse.id;

    const anthropic = new Anthropic({
      apiKey: Deno.env.get('ANTHROPIC_API_KEY'),
      maxRetries: 0, // Disable automatic retries so we can handle timeouts ourselves
    });

    // 6. Generate Outline
    let outlineResponse;
    try {
        outlineResponse = await anthropic.messages.create({
          model: "claude-sonnet-4-5-20250929",
          max_tokens: 1000,
          system: OUTLINE_PROMPT,
          messages: [
            {
              role: "user",
              content: `Topic: ${topic}\nDepth: ${depth}\nTime: ${time}`
            }
          ]
        }, { timeout: 40000 });
    } catch (e) {
        throw new Error("Failed to generate outline: " + e.message);
    }

    let outlineText = outlineResponse.content[0].text;
    let outlineData;
    try {
      // Sometimes it wraps in markdown blocks despite instructions
      outlineText = outlineText.replace(/```json\n?|\n?```/g, '').trim();
      outlineData = JSON.parse(outlineText);
    } catch (e) {
      console.error("Failed to parse outline:", outlineText);
      throw new Error("Failed to generate course outline format.");
    }

    // Update course title
    await supabaseClient
      .from('courses')
      .update({ title: outlineData.title })
      .eq('id', courseId);

    // 7. Generate Lessons and find YouTube Videos sequentially
    let sequenceOrder = 1;
    let totalLessonsGenerated = 0;

    for (const module of outlineData.modules) {
      if (totalLessonsGenerated >= 1) break; // TEST MODE: 1 lesson. Increase after pipeline is confirmed.
      if (Date.now() - startTime > 100000) break;
      
      for (const lesson of module.lessons) {
        if (totalLessonsGenerated >= 1) break;
        if (Date.now() - startTime > 100000) break;
        
        let lessonJson = { body: "Content generation failed.", citations: [] };
        
        try {
          // A. Generate Lesson Content with Web Search
          // Limit timeout to 45 seconds per lesson so we don't blow past Edge Function limits
          const lessonResponse = await anthropic.messages.create({
            model: "claude-sonnet-4-5-20250929",
            max_tokens: 1500,
            system: LESSON_PROMPT,
            messages: [
              {
                role: "user",
                content: `Course Title: ${outlineData.title}\nModule Title: ${module.title}\nLesson Title: ${lesson.title}\nDescription: ${lesson.description}`
              }
            ]
          }, { timeout: 45000 });

          const lessonContentText = lessonResponse.content.find(c => c.type === 'text')?.text || "{}";
          try {
            const cleanText = lessonContentText.replace(/```json\n?|\n?```/g, '').trim();
            lessonJson = JSON.parse(cleanText);
          } catch (e) {
            console.error("Failed to parse lesson JSON.");
          }
        } catch (error) {
          console.error("Lesson generation API error:", error.message);
          // If we hit a rate limit or timeout, break the loop but save what we have!
          break; 
        }

        totalLessonsGenerated++;

        // B. Search YouTube
        let videoUrl = null;
        try {
          const ytKey = Deno.env.get('YOUTUBE_API_KEY');
          if (ytKey) {
            // Using AbortSignal for fetch timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const ytSearch = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(lesson.title + " " + topic)}&type=video&key=${ytKey}&maxResults=3`, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            
            const ytData = await ytSearch.json();
            if (ytData.items && ytData.items.length > 0) {
              videoUrl = `https://www.youtube.com/watch?v=${ytData.items[0].id.videoId}`;
            }
          }
        } catch (e) {
          console.error("YouTube search failed or timed out.");
        }

        // C. Insert Lesson (using adminClient to bypass RLS — user already validated above)
        const { error: insertErr } = await adminClient
          .from('lessons')
          .insert({
            course_id: courseId,
            title: lesson.title,
            body: lessonJson.body || "Content unavailable.",
            video_url: videoUrl,
            citations: lessonJson.citations || [],
            order: sequenceOrder++
          });
          
        if (insertErr) {
          console.error("Lesson insert failed:", JSON.stringify(insertErr));
        }
      }
    }

    if (courseId) {
      // Update course title to mark as completed (if not already done by outline step, but usually we just leave it)
      await supabaseClient
        .from('courses')
        .update({ status: 'ready' })
        .eq('id', courseId);
    }

    return new Response(JSON.stringify({ success: true, course_id: courseId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error("Edge Function Error:", error);
    
    // Convert error to a string, handling both objects and standard Errors
    let errorMessage = "Unknown error";
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'object') {
      try {
        errorMessage = JSON.stringify(error);
      } catch (e) {
        errorMessage = String(error);
      }
    } else {
      errorMessage = String(error);
    }
    
    // If a course was created but generation failed, delete it so the user can try again today
    try {
      if (courseId && supabaseClient) {
        await supabaseClient.from('courses').delete().eq('id', courseId);
      }
    } catch (e) {
      console.error("Failed to cleanup course:", e);
    }
    
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      // Return 200 so supabase-js invoke doesn't swallow the error body
      status: 200,
    });
  }
});
