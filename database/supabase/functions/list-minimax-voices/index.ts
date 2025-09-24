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
    console.log('🤖 Edge Function: Iniciando list-minimax-voices')
    
    const { api_key, search, language } = await req.json()
    console.log('📥 Parâmetros recebidos:', { 
      tem_api_key: !!api_key, 
      search, 
      language 
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

    // Get Minimax API key from database if not provided
    let minimaxApiKey = api_key
    
    if (!minimaxApiKey) {
      console.log('🔑 Buscando API key do Minimax no banco...')
      
      const { data: apiData, error: apiError } = await supabase
        .from('apis')
        .select('api_key')
        .eq('plataforma', 'Minimax')
        .single()

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
    }

    // Fetch voices from Minimax API
    const minimaxUrl = `https://api.minimax.chat/v1/text_to_speech/voice_list`
    console.log('📤 Fazendo requisição para Minimax:', minimaxUrl)

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
      ok: minimaxResponse.ok
    })

    if (!minimaxResponse.ok) {
      const errorText = await minimaxResponse.text()
      console.error('❌ Erro na Minimax API:', errorText)
      
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
    console.log('📦 Dados recebidos:', {
      system_voice_count: data.system_voice?.length || 0
    })

    // Helper functions
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

    // Process voices data
    let voices = (data.system_voice || []).map((voice: any) => ({
      voice_id: voice.voice_id,
      nome_voz: voice.voice_name,
      plataforma: 'Minimax',
      idioma: detectLanguage(voice.voice_id),
      genero: detectGender(voice.description || []),
      preview_url: '', // Minimax geralmente não tem preview
      description: Array.isArray(voice.description) ? voice.description.join(', ') : (voice.description || ''),
      created_time: voice.created_time,
      raw_data: voice
    }))

    // Apply filters
    if (search) {
      const searchTerm = search.toLowerCase()
      voices = voices.filter((voice: any) => 
        voice.nome_voz.toLowerCase().includes(searchTerm) ||
        voice.voice_id.toLowerCase().includes(searchTerm) ||
        voice.description.toLowerCase().includes(searchTerm)
      )
    }

    if (language) {
      voices = voices.filter((voice: any) => 
        voice.idioma.toLowerCase().includes(language.toLowerCase())
      )
    }

    const result = {
      voices,
      total: voices.length
    }

    console.log('✅ Processamento concluído:', {
      voices_processed: voices.length,
      total: result.total,
      filtered_by_search: !!search,
      filtered_by_language: !!language
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