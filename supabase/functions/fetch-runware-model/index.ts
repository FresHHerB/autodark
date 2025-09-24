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
    console.log('🎨 Edge Function: Iniciando fetch-runware-model')

    const { air, api_key } = await req.json()
    console.log('📥 Parâmetros recebidos:', { air, tem_api_key: !!api_key })

    if (!air) {
      console.error('❌ AIR não fornecido')
      return new Response(
        JSON.stringify({
          success: false,
          error: 'AIR is required'
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

    // Get Runware API key from database if not provided
    let runwareApiKey = api_key

    if (!runwareApiKey) {
      console.log('🔑 Buscando API key do Runware no banco...')

      const { data: apiData, error: apiError } = await supabase
        .from('apis')
        .select('api_key')
        .eq('plataforma', 'Runware')
        .single()

      console.log('📊 Resultado da consulta:', {
        hasData: !!apiData,
        hasApiKey: !!(apiData?.api_key),
        hasError: !!apiError,
        error: apiError?.message
      })

      if (apiError || !apiData?.api_key) {
        console.error('❌ Runware API key não encontrada:', apiError)
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Runware API key not found in database'
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      runwareApiKey = apiData.api_key
      console.log('✅ API key encontrada no banco')
    }

    // Generate unique task UUID
    const taskUUID = crypto.randomUUID()

    // Fetch model details from Runware API using modelSearch
    const runwareUrl = 'https://api.runware.ai/v1'
    const requestBody = [
      {
        taskType: "modelSearch",
        taskUUID: taskUUID,
        search: air,
        visibility: ["public", "community"],
        limit: 1
      }
    ]

    console.log('📤 Fazendo requisição para Runware:', {
      url: runwareUrl,
      method: 'POST',
      taskUUID,
      search: air,
      headers: {
        'Authorization': `Bearer ${runwareApiKey.substring(0, 10)}...`,
        'Content-Type': 'application/json'
      }
    })

    const runwareResponse = await fetch(runwareUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${runwareApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    })

    console.log('📥 Resposta da Runware API:', {
      status: runwareResponse.status,
      statusText: runwareResponse.statusText,
      ok: runwareResponse.ok,
      headers: Object.fromEntries(runwareResponse.headers.entries())
    })

    if (!runwareResponse.ok) {
      const errorText = await runwareResponse.text()
      console.error('❌ Erro na Runware API:', {
        status: runwareResponse.status,
        statusText: runwareResponse.statusText,
        errorText
      })

      return new Response(
        JSON.stringify({
          success: false,
          error: `Runware API error: ${runwareResponse.status}`,
          details: errorText
        }),
        {
          status: runwareResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const responseData = await runwareResponse.json()
    console.log('📦 Dados recebidos da Runware:', {
      data_length: responseData?.data?.length || 0,
      first_result: responseData?.data?.[0] ? {
        taskUUID: responseData.data[0].taskUUID,
        taskType: responseData.data[0].taskType,
        models_count: responseData.data[0].models?.length || 0
      } : null
    })

    // Check if we got results
    if (!responseData?.data?.[0]?.models || responseData.data[0].models.length === 0) {
      console.warn('⚠️ Nenhum modelo encontrado para o AIR:', air)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Model not found',
          details: `No model found for AIR: ${air}`
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get the first model from results
    const modelData = responseData.data[0].models[0]
    console.log('📦 Primeiro modelo encontrado:', {
      air: modelData.air,
      name: modelData.name,
      category: modelData.category,
      description: modelData.description?.substring(0, 100) + '...' || 'N/A'
    })

    // Process and return the model data
    const processedData = {
      air: modelData.air,
      nome_modelo: modelData.name || 'Nome não disponível',
      plataforma: 'Runware',
      categoria: modelData.category || 'Não especificado',
      descricao: modelData.description || '',
      tags: modelData.tags || [],
      preview_url: modelData.previewImage || '',
      creator: modelData.creator || 'Desconhecido',
      base_model: modelData.baseModel || '',
      type: modelData.type || '',
      version: modelData.version || '',
      download_count: modelData.downloadCount || 0,
      like_count: modelData.likeCount || 0,
      raw_data: modelData
    }

    console.log('✅ Dados processados:', {
      air: processedData.air,
      nome_modelo: processedData.nome_modelo,
      categoria: processedData.categoria,
      preview_url_presente: !!processedData.preview_url,
      tags_count: processedData.tags.length
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