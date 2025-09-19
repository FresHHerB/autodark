import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🎙️ Edge Function: Iniciando list-elevenlabs-voices')
    
    const { api_key, show_legacy = false } = await req.json()
    console.log('📥 Parâmetros recebidos:', { 
      tem_api_key: !!api_key, 
      show_legacy 
    })

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Configuração Supabase não encontrada')
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Supabase configuration not found' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get ElevenLabs API key from database if not provided
    let elevenLabsApiKey = api_key
    
    if (!elevenLabsApiKey) {
      console.log('🔑 Buscando API key do ElevenLabs no banco...')
      
      const { data: apiData, error: apiError } = await supabase
        .from('apis')
        .select('api_key')
        .eq('plataforma', 'ElevenLabs')
        .single()

      if (apiError || !apiData?.api_key) {
        console.error('❌ ElevenLabs API key não encontrada:', apiError)
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'ElevenLabs API key not found in database' 
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      elevenLabsApiKey = apiData.api_key
    }

    // Build query parameters
    const params = new URLSearchParams()
    if (show_legacy) params.append('show_legacy', 'true')

    // Fetch voices from ElevenLabs API
    const elevenLabsUrl = `https://api.elevenlabs.io/v1/voices?${params.toString()}`
    console.log('📤 Fazendo requisição para ElevenLabs:', elevenLabsUrl)

    const elevenLabsResponse = await fetch(elevenLabsUrl, {
      method: 'GET',
      headers: {
        'xi-api-key': elevenLabsApiKey,
        'Content-Type': 'application/json',
      },
    })

    console.log('📥 Resposta da ElevenLabs API:', {
      status: elevenLabsResponse.status,
      statusText: elevenLabsResponse.statusText,
      ok: elevenLabsResponse.ok
    })

    if (!elevenLabsResponse.ok) {
      const errorText = await elevenLabsResponse.text()
      console.error('❌ Erro na ElevenLabs API:', errorText)
      
      return new Response(
        JSON.stringify({ 
          success: false,
          error: `ElevenLabs API error: ${elevenLabsResponse.status}`,
          details: errorText
        }),
        { 
          status: elevenLabsResponse.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const data = await elevenLabsResponse.json()
    console.log('📦 Dados recebidos:', {
      voices_count: data.voices?.length || 0
    })

    // Process voices data
    const voices = (data.voices || []).map((voice: any) => ({
      voice_id: voice.voice_id,
      nome_voz: voice.name,
      plataforma: 'ElevenLabs',
      idioma: voice.labels?.language === 'en' ? 'Inglês' : 
               voice.labels?.language === 'pt' ? 'Português' :
               voice.labels?.language === 'es' ? 'Espanhol' :
               voice.labels?.language === 'fr' ? 'Francês' :
               voice.labels?.language === 'de' ? 'Alemão' :
               'Inglês',
      genero: voice.labels?.gender === 'male' ? 'Masculino' :
              voice.labels?.gender === 'female' ? 'Feminino' :
              'Não especificado',
      preview_url: voice.preview_url || '',
      description: voice.description || '',
      category: voice.category,
      age: voice.labels?.age,
      accent: voice.labels?.accent,
      use_case: voice.labels?.use_case,
      popularity: (voice.sharing?.liked_by_count || 0) + (voice.sharing?.cloned_by_count || 0),
      settings: voice.settings,
      raw_data: voice
    }))

    const result = {
      voices,
      total: voices.length
    }

    console.log('✅ Processamento concluído:', {
      voices_processed: voices.length,
      total: result.total
    })

    return new Response(
      JSON.stringify({
        success: true,
        ...result
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('🚨 Erro na Edge Function:', {
      error: error.message,
      stack: error.stack
    })
    
    return new Response(
      JSON.stringify({ 
        success: false,
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