import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Anthropic from "npm:@anthropic-ai/sdk@0.20.1";
import { OUTLINE_PROMPT } from "./prompts.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let courseId = null;
  let supabaseClient;

  try {
    const { topic, experience } = await req.json();

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

    // Validate user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    // Enforce course limits only when payments are enabled (set PAYMENTS_ENABLED=true in secrets)
    if (Deno.env.get('PAYMENTS_ENABLED') === 'true') {
      const { data: subscription } = await adminClient
        .from('subscriptions')
        .select('status, current_period_start, current_period_end')
        .eq('user_id', user.id)
        .single();

      const isSubscribed = subscription?.status === 'active' &&
        subscription.current_period_end &&
        new Date(subscription.current_period_end) > new Date();

      if (isSubscribed) {
        const { count } = await adminClient
          .from('courses')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'ready')
          .gte('created_at', subscription.current_period_start);

        if ((count ?? 0) >= 10) {
          const resetDate = new Date(subscription.current_period_end).toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
          throw new Error(`MONTHLY_LIMIT_REACHED|Your 10-course limit resets on ${resetDate}.`);
        }
      } else {
        const { count } = await adminClient
          .from('courses')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'ready');

        if ((count ?? 0) >= 1) {
          throw new Error("FREE_LIMIT_REACHED");
        }
      }
    }

    const anthropic = new Anthropic({
      apiKey: Deno.env.get('ANTHROPIC_API_KEY'),
      maxRetries: 0,
    });

    // Generate outline first — harm check happens inside this call before any DB writes
    let outlineResponse;
    try {
      outlineResponse = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1500,
        system: OUTLINE_PROMPT,
        messages: [{ role: "user", content: `Topic: ${topic}\nExperience level: ${experience}` }]
      }, { timeout: 40000 });
    } catch (e) {
      throw new Error("Failed to generate outline: " + e.message);
    }

    const HARM_RESPONSE = { success: false, harmful: true, error: "We're not able to create a course on that topic. Please try a different subject." };

    // Empty content array means Claude's safety system blocked the request outright
    if (!outlineResponse.content || outlineResponse.content.length === 0) {
      return new Response(JSON.stringify(HARM_RESPONSE), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    let outlineText = outlineResponse.content[0].text;
    let outlineData;
    try {
      outlineText = outlineText.replace(/```json\n?|\n?```/g, '').trim();
      outlineData = JSON.parse(outlineText);
    } catch (e) {
      // If JSON parsing fails, Claude likely returned a plain-text safety refusal
      console.error("Failed to parse outline (possible safety refusal):", outlineText);
      return new Response(JSON.stringify(HARM_RESPONSE), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Harm detection — our prompt asked Claude to return this signal for harmful topics
    if (outlineData.error === "harmful_topic") {
      return new Response(JSON.stringify(HARM_RESPONSE), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Create the course record — only reached for safe topics
    const { data: newCourse, error: insertError } = await supabaseClient
      .from('courses')
      .insert({ user_id: user.id, topic, intake_answers: { experience }, title: "Generating..." })
      .select()
      .single();

    if (insertError) throw insertError;
    courseId = newCourse.id;

    // Update course title + seed token count from outline generation
    // Uses adminClient — no UPDATE RLS policy exists for courses via user JWT
    const outlineUsage = outlineResponse.usage;
    await adminClient
      .from('courses')
      .update({
        title: outlineData.title,
        outcomes: outlineData.outcomes || [],
        input_tokens: outlineUsage.input_tokens,
        output_tokens: outlineUsage.output_tokens,
      })
      .eq('id', courseId);

    // Insert lesson stubs — body/citations/video_url are null until generated on-demand
    let order = 1;
    for (const module of outlineData.modules) {
      for (const lesson of module.lessons) {
        const { error: lessonInsertErr } = await adminClient
          .from('lessons')
          .insert({
            course_id: courseId,
            title: lesson.title,
            body: null,
            citations: null,
            video_url: null,
            order: order++,
          });
        if (lessonInsertErr) {
          console.error("Lesson stub insert failed:", JSON.stringify(lessonInsertErr));
        }
      }
    }

    // Mark course ready — lessons will fill in as the user reads them
    await adminClient
      .from('courses')
      .update({ status: 'ready' })
      .eq('id', courseId);

    return new Response(JSON.stringify({ success: true, course_id: courseId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("Edge Function Error:", error);

    let errorMessage = "Unknown error";
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'object') {
      try { errorMessage = JSON.stringify(error); } catch { errorMessage = String(error); }
    } else {
      errorMessage = String(error);
    }

    // Don't clean up for limit errors — no course was created
    const isLimitError = errorMessage.startsWith("FREE_LIMIT_REACHED") || errorMessage.startsWith("MONTHLY_LIMIT_REACHED");
    if (!isLimitError) {
      try {
        if (courseId && supabaseClient) {
          await supabaseClient.from('courses').delete().eq('id', courseId);
        }
      } catch (e) {
        console.error("Failed to cleanup course:", e);
      }
    }

    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  }
});
