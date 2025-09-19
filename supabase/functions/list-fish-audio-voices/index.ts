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
    console.log('🐟 Edge Function: Iniciando list-fish-audio-voices')
    
    const { api_key, page = 1, page_size = 20, search, language } = await req.json()
    console.log('📥 Parâmetros recebidos:', { 
      tem_api_key: !!api_key, 
      page, 
      page_size, 
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

    // Get Fish Audio API key from database if not provided
    let fishAudioApiKey = api_key
    
    if (!fishAudioApiKey) {
      console.log('🔑 Buscando API key do Fish Audio no banco...')
      
      const { data: apiData, error: apiError } = await supabase
        .from('apis')
        .select('api_key')
        .eq('plataforma', 'Fish-Audio')
        .single()

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
    }

    // Build query parameters
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: page_size.toString()
    })
    
    if (search) params.append('search', search)
    if (language) params.append('language', language)

    // Fetch voices from Fish Audio API
    const fishAudioUrl = `https://api.fish.audio/model?${params.toString()}`
    console.log('📤 Fazendo requisição para Fish Audio:', fishAudioUrl)

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
      ok: fishAudioResponse.ok
    })

    if (!fishAudioResponse.ok) {
      const errorText = await fishAudioResponse.text()
      console.error('❌ Erro na Fish Audio API:', errorText)
      
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

    const data = await fishAudioResponse.json()
    console.log('📦 Dados recebidos:', {
      items_count: data.items?.length || 0,
      total: data.total,
      page: data.page
    })

    // Process voices data
    const voices = (data.items || []).map((voice: any) => ({
      voice_id: voice._id,
      nome_voz: voice.title,
      plataforma: 'Fish-Audio',
      idioma: voice.languages?.join(', ') || 'Não especificado',
      genero: 'Não especificado',
      preview_url: voice.samples?.[0]?.audio || '',
      description: voice.description || '',
      author: voice.author?.nickname || 'Desconhecido',
      popularity: voice.like_count || 0,
      samples: voice.samples || [],
      raw_data: voice
    }))

    const result = {
      voices,
      pagination: {
        page: data.page || page,
        page_size: data.page_size || page_size,
        total_pages: Math.ceil((data.total || 0) / page_size)
      },
      total: data.total || 0
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