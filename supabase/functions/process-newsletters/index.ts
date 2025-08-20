import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now()
  
  try {
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const internalJobSecret = Deno.env.get('INTERNAL_JOB_SECRET')
    
    if (!supabaseUrl || !supabaseServiceKey || !internalJobSecret) {
      throw new Error('Missing required environment variables')
    }
    const appUrl = Deno.env.get('APP_URL') || 'http://localhost:5173'
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    })

    // Quick check if there are any newsletters to process
    const { data: scheduledNewsletters, error: queryError } = await supabase
      .from('newsletters')
      .select('id')
      .eq('status', 'scheduled')
      .lte('scheduled_at', new Date().toISOString())
      .limit(1)

    if (queryError) {
      throw new Error(`Failed to query newsletters: ${queryError.message}`)
    }

    if (!scheduledNewsletters || scheduledNewsletters.length === 0) {
      console.info('No scheduled newsletters to process')
      return new Response(
        JSON.stringify({
          success: true,
          message: "No scheduled newsletters to process",
          processedNewsletters: [],
          totalProcessed: 0,
          totalFailed: 0,
          executionTime: Date.now() - startTime,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    console.info(`Found ${scheduledNewsletters.length} newsletter(s) ready to process`)

    // Call the resource route to process newsletters
    const response = await fetch(`${appUrl}/resources/newsletter-processor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Job-Token': internalJobSecret,
      },
      body: JSON.stringify({}),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API call failed: ${response.status} - ${errorText}`)
    }

    const result = await response.json()
    
    console.info(`Processing complete: ${result.totalProcessed} sent, ${result.totalFailed} failed`)
    
    return new Response(
      JSON.stringify({
        ...result,
        executionTime: Date.now() - startTime,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error processing newsletters:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error occurred',
        executionTime: Date.now() - startTime,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})