// Supabase Edge Function to process newsletter campaigns
// Runs every 30 minutes at :05 and :35
// Calls internal API endpoint to process pending campaigns

import { createClient } from "jsr:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    const appUrl = Deno.env.get("APP_URL") || "http://localhost:5173"

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables")
    }

    // Create Supabase client for service role operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log("Processing newsletter campaigns...")

    // Call internal API endpoint to process campaigns
    const response = await fetch(`${appUrl}/api/process-campaigns`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseServiceKey}`,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`API call failed: ${response.status} - ${errorText}`)

      return new Response(
        JSON.stringify({
          success: false,
          error: `API call failed: ${response.status}`,
          details: errorText,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      )
    }

    const result = await response.json()

    console.log(
      `Campaign processing complete: ${result.processed} campaigns processed, ${result.succeeded} succeeded, ${result.failed} failed`,
    )

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("Error in Edge Function:", error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    )
  }
})
