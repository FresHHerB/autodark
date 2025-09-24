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
    console.log('🐟 Edge Function: Iniciando fetch-fish-audio-voice')
    
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

    // Get Fish Audio API key from database if not provided
    let fishAudioApiKey = api_key
    
    if (!fishAudioApiKey) {
      console.log('🔑 Buscando API key do Fish Audio no banco...')
      
      const { data: apiData, error: apiError } = await supabase
        .from('apis')
        .select('api_key')
        .eq('plataforma', 'Fish-Audio')
        .single()

      console.log('📊 Resultado da consulta:', {
        hasData: !!apiData,
        hasApiKey: !!(apiData?.api_key),
        hasError: !!apiError,
        error: apiError?.message
      })

      if (apiError || !apiData?.api_key) {
        console.error('❌ Fish Audio API key não encontrada:', apiError)
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'Fish Audio API key not found in database' 
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      fishAudioApiKey = apiData.api_key
      console.log('✅ API key encontrada no banco')
    }

    // Fetch voice details from Fish Audio API
    const fishAudioUrl = `https://api.fish.audio/model/${voice_id}`
    console.log('📤 Fazendo requisição para Fish Audio:', {
      url: fishAudioUrl,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${fishAudioApiKey.substring(0, 10)}...`,
        'Content-Type': 'application/json'
      }
    })

    const fishAudioResponse = await fetch(fishAudioUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${fishAudioApiKey}`,
        'Content-Type': 'application/json',
      },
    })

    console.log('📥 Resposta da Fish Audio API:', {
      status: fishAudioResponse.status,
      statusText: fishAudioResponse.statusText,
      ok: fishAudioResponse.ok,
      headers: Object.fromEntries(fishAudioResponse.headers.entries())
    })

    if (!fishAudioResponse.ok) {
      const errorText = await fishAudioResponse.text()
      console.error('❌ Erro na Fish Audio API:', {
        status: fishAudioResponse.status,
        statusText: fishAudioResponse.statusText,
        errorText
      })
      
      return new Response(
        JSON.stringify({ 
          success: false,
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
    console.log('📦 Dados recebidos da Fish Audio:', {
      _id: voiceData._id,
      title: voiceData.title,
      author: voiceData.author?.nickname,
      languages: voiceData.languages,
      samples_count: voiceData.samples?.length || 0,
      first_sample_audio: voiceData.samples?.[0]?.audio ? 'PRESENTE' : 'AUSENTE'
    })

    // Process and return the voice data
    const processedData = {
      voice_id: voiceData._id,
      nome_voz: voiceData.title,
      plataforma: 'Fish-Audio',
      idioma: voiceData.languages?.join(', ') || 'Não especificado',
      genero: 'Não especificado',
      preview_url: voiceData.samples?.[0]?.audio || '',
      description: voiceData.description || '',
      author: voiceData.author?.nickname || 'Desconhecido',
      popularity: voiceData.like_count || 0,
      samples: voiceData.samples || [],
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