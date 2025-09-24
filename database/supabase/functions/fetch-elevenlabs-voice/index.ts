import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🎙️ Edge Function: Iniciando fetch-elevenlabs-voice')
    
    const { voice_id, api_key } = await req.json()
    console.log('📥 Parâmetros recebidos:', { voice_id, tem_api_key: !!api_key })

    if (!voice_id) {
      console.error('❌ voice_id não fornecido')
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'voice_id is required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    console.log('🔧 Configuração Supabase:', {
      supabaseUrl: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'NÃO CONFIGURADO',
      supabaseServiceKey: supabaseServiceKey ? `${supabaseServiceKey.substring(0, 20)}...` : 'NÃO CONFIGURADO'
    })

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

      console.log('📊 Resultado da consulta:', {
        hasData: !!apiData,
        hasApiKey: !!(apiData?.api_key),
        hasError: !!apiError,
        error: apiError?.message
      })

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
      console.log('✅ API key encontrada no banco')
    }

    // Fetch voice details from ElevenLabs API
    const elevenLabsUrl = `https://api.elevenlabs.io/v1/voices/${voice_id}`
    console.log('📤 Fazendo requisição para ElevenLabs:', {
      url: elevenLabsUrl,
      method: 'GET',
      headers: {
        'xi-api-key': `${elevenLabsApiKey.substring(0, 10)}...`,
        'Content-Type': 'application/json'
      }
    })

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
      ok: elevenLabsResponse.ok,
      headers: Object.fromEntries(elevenLabsResponse.headers.entries())
    })

    if (!elevenLabsResponse.ok) {
      const errorText = await elevenLabsResponse.text()
      console.error('❌ Erro na ElevenLabs API:', {
        status: elevenLabsResponse.status,
        statusText: elevenLabsResponse.statusText,
        errorText
      })
      
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

    const voiceData = await elevenLabsResponse.json()
    console.log('📦 Dados recebidos da ElevenLabs:', {
      voice_id: voiceData.voice_id,
      name: voiceData.name,
      category: voiceData.category,
      labels: voiceData.labels,
      preview_url: voiceData.preview_url ? 'PRESENTE' : 'AUSENTE'
    })

    // Process and return the voice data
    const processedData = {
      voice_id: voiceData.voice_id,
      nome_voz: voiceData.name,
      plataforma: 'ElevenLabs',
      idioma: voiceData.labels?.language === 'en' ? 'Inglês' : 
               voiceData.labels?.language === 'pt' ? 'Português' :
               voiceData.labels?.language === 'es' ? 'Espanhol' :
               voiceData.labels?.language === 'fr' ? 'Francês' :
               voiceData.labels?.language === 'de' ? 'Alemão' :
               'Inglês',
      genero: voiceData.labels?.gender === 'male' ? 'Masculino' :
              voiceData.labels?.gender === 'female' ? 'Feminino' :
              'Não especificado',
      preview_url: voiceData.preview_url || '',
      description: voiceData.description || '',
      category: voiceData.category,
      age: voiceData.labels?.age,
      accent: voiceData.labels?.accent,
      use_case: voiceData.labels?.use_case,
      popularity: (voiceData.sharing?.liked_by_count || 0) + (voiceData.sharing?.cloned_by_count || 0),
      settings: voiceData.settings,
      raw_data: voiceData
    }

    console.log('✅ Dados processados:', {
      voice_id: processedData.voice_id,
      nome_voz: processedData.nome_voz,
      preview_url_presente: !!processedData.preview_url,
      preview_url_length: processedData.preview_url.length
    })

    return new Response(
      JSON.stringify({
        success: true,
        data: processedData
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