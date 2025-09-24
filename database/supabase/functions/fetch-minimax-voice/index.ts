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
    console.log('🤖 Edge Function: Iniciando fetch-minimax-voice')
    
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

    // Get Minimax API key from database if not provided
    let minimaxApiKey = api_key
    
    if (!minimaxApiKey) {
      console.log('🔑 Buscando API key do Minimax no banco...')
      
      const { data: apiData, error: apiError } = await supabase
        .from('apis')
        .select('api_key')
        .eq('plataforma', 'Minimax')
        .single()

      console.log('📊 Resultado da consulta:', {
        hasData: !!apiData,
        hasApiKey: !!(apiData?.api_key),
        hasError: !!apiError,
        error: apiError?.message
      })

      if (apiError || !apiData?.api_key) {
        console.error('❌ Minimax API key não encontrada:', apiError)
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'Minimax API key not found in database' 
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      minimaxApiKey = apiData.api_key
      console.log('✅ API key encontrada no banco')
    }

    // Fetch voice details from Minimax API
    // Note: Minimax doesn't have individual voice endpoints, so we'll fetch all and filter
    const minimaxUrl = `https://api.minimax.chat/v1/text_to_speech/voice_list`
    console.log('📤 Fazendo requisição para Minimax:', {
      url: minimaxUrl,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${minimaxApiKey.substring(0, 10)}...`,
        'Content-Type': 'application/json'
      }
    })

    const minimaxResponse = await fetch(minimaxUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${minimaxApiKey}`,
        'Content-Type': 'application/json',
      },
    })

    console.log('📥 Resposta da Minimax API:', {
      status: minimaxResponse.status,
      statusText: minimaxResponse.statusText,
      ok: minimaxResponse.ok,
      headers: Object.fromEntries(minimaxResponse.headers.entries())
    })

    if (!minimaxResponse.ok) {
      const errorText = await minimaxResponse.text()
      console.error('❌ Erro na Minimax API:', {
        status: minimaxResponse.status,
        statusText: minimaxResponse.statusText,
        errorText
      })
      
      return new Response(
        JSON.stringify({ 
          success: false,
          error: `Minimax API error: ${minimaxResponse.status}`,
          details: errorText
        }),
        { 
          status: minimaxResponse.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const data = await minimaxResponse.json()
    console.log('📦 Dados recebidos da Minimax:', {
      system_voice_count: data.system_voice?.length || 0
    })

    // Find the specific voice
    const voiceData = data.system_voice?.find((voice: any) => voice.voice_id === voice_id)
    
    if (!voiceData) {
      console.error('❌ Voz não encontrada:', voice_id)
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Voice not found' 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('📦 Voz encontrada:', {
      voice_id: voiceData.voice_id,
      voice_name: voiceData.voice_name,
      description: voiceData.description
    })

    // Detect language and gender from voice_id
    const detectLanguage = (voiceId: string): string => {
      const id = voiceId.toLowerCase()
      if (id.includes('english')) return 'Inglês'
      if (id.includes('chinese') || id.includes('mandarin')) return 'Chinês'
      if (id.includes('spanish')) return 'Espanhol'
      if (id.includes('french')) return 'Francês'
      if (id.includes('german')) return 'Alemão'
      if (id.includes('portuguese')) return 'Português'
      if (id.includes('japanese')) return 'Japonês'
      if (id.includes('korean')) return 'Coreano'
      return 'Não especificado'
    }

    const detectGender = (description: string[]): string => {
      const fullDescription = description.join(' ').toLowerCase()
      if (fullDescription.includes('male') && !fullDescription.includes('female')) return 'Masculino'
      if (fullDescription.includes('female') && !fullDescription.includes('male')) return 'Feminino'
      if (fullDescription.includes('girl') || fullDescription.includes('woman')) return 'Feminino'
      if (fullDescription.includes('boy') || fullDescription.includes('man')) return 'Masculino'
      return 'Não especificado'
    }

    // Process and return the voice data
    const processedData = {
      voice_id: voiceData.voice_id,
      nome_voz: voiceData.voice_name,
      plataforma: 'Minimax',
      idioma: detectLanguage(voiceData.voice_id),
      genero: detectGender(voiceData.description || []),
      preview_url: '', // Minimax geralmente não tem preview
      description: Array.isArray(voiceData.description) ? voiceData.description.join(', ') : (voiceData.description || ''),
      created_time: voiceData.created_time,
      raw_data: voiceData
    }

    console.log('✅ Dados processados:', {
      voice_id: processedData.voice_id,
      nome_voz: processedData.nome_voz,
      preview_url_presente: !!processedData.preview_url
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