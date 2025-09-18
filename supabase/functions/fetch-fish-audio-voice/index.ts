import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { voice_id } = await req.json()

    if (!voice_id) {
      return new Response(
        JSON.stringify({ error: 'voice_id is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get Fish Audio API key from database
    const { data: apiData, error: apiError } = await supabase
      .from('apis')
      .select('api_key')
      .eq('plataforma', 'Fish-Audio')
      .single()

    if (apiError || !apiData?.api_key) {
      console.error('Error fetching Fish Audio API key:', apiError)
      return new Response(
        JSON.stringify({ error: 'Fish Audio API key not found' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const fishAudioApiKey = apiData.api_key

    // Fetch voice details from Fish Audio API
    const fishAudioResponse = await fetch(`https://api.fish.audio/model/${voice_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${fishAudioApiKey}`,
        'Content-Type': 'application/json',
      },
    })

    if (!fishAudioResponse.ok) {
      const errorText = await fishAudioResponse.text()
      console.error('Fish Audio API error:', fishAudioResponse.status, errorText)
      return new Response(
        JSON.stringify({ 
          error: `Fish Audio API error: ${fishAudioResponse.status}`,
          details: errorText
        }),
        { 
          status: fishAudioResponse.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const voiceData = await fishAudioResponse.json()

    // Process and return the voice data
    const processedData = {
      voice_id: voiceData._id,
      nome_voz: voiceData.title,
      plataforma: 'Fish-Audio',
      idioma: voiceData.languages?.join(', ') || 'Não especificado',
      genero: 'Não especificado', // Fish-Audio não fornece gênero
      preview_url: voiceData.samples?.[0]?.audio || '',
      description: voiceData.description || '',
      author: voiceData.author?.nickname || 'Desconhecido',
      popularity: voiceData.like_count || 0,
      samples: voiceData.samples || [],
      raw_data: voiceData
    }

    return new Response(
      JSON.stringify(processedData),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in fetch-fish-audio-voice function:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})