/**
 * API Credits Service
 * Consulta saldo/créditos disponíveis nas plataformas de API
 */

export interface APICreditsResult {
  credits: number | string;
  unit: 'dollars' | 'characters' | 'credits';
  error?: string;
}

/**
 * Consulta créditos do ElevenLabs
 * Retorna caracteres restantes
 */
export async function fetchElevenLabsCredits(apiKey: string): Promise<APICreditsResult> {
  try {
    const response = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey
      }
    });

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    const data = await response.json();
    const characterLimit = data.character_limit || 0;
    const characterCount = data.character_count || 0;
    const remaining = characterLimit - characterCount;

    return {
      credits: remaining,
      unit: 'characters'
    };
  } catch (error) {
    console.error('Erro ao buscar créditos ElevenLabs:', error);
    return {
      credits: 'N/A',
      unit: 'characters',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}

/**
 * Consulta créditos do Fish-Audio
 * Retorna saldo em dólares
 */
export async function fetchFishAudioCredits(apiKey: string): Promise<APICreditsResult> {
  try {
    const response = await fetch('https://api.fish.audio/wallet/self/api-credit', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (!response.ok) {
      throw new Error(`Fish-Audio API error: ${response.status}`);
    }

    const data = await response.json();
    const credit = parseFloat(data.credit) || 0;

    return {
      credits: credit,
      unit: 'dollars'
    };
  } catch (error) {
    console.error('Erro ao buscar créditos Fish-Audio:', error);
    return {
      credits: 'N/A',
      unit: 'dollars',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}

/**
 * Consulta créditos do OpenRouter
 * Retorna saldo de créditos (total_credits - total_usage)
 */
export async function fetchOpenRouterCredits(apiKey: string): Promise<APICreditsResult> {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/credits', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const totalCredits = parseFloat(data.data?.total_credits || 0);
    const totalUsage = parseFloat(data.data?.total_usage || 0);
    const balance = totalCredits - totalUsage;

    return {
      credits: balance,
      unit: 'dollars'
    };
  } catch (error) {
    console.error('Erro ao buscar créditos OpenRouter:', error);
    return {
      credits: 'N/A',
      unit: 'dollars',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}

/**
 * Generate UUID v4 for Runware API
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Consulta créditos do Runware
 * Retorna saldo de créditos
 */
export async function fetchRunwareCredits(apiKey: string): Promise<APICreditsResult> {
  try {
    const response = await fetch('https://api.runware.ai/v1', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([
        {
          taskType: 'accountManagement',
          taskUUID: generateUUID(),
          operation: 'getDetails'
        }
      ])
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Runware API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const balance = parseFloat(data.data?.[0]?.balance || 0);

    return {
      credits: balance,
      unit: 'dollars'
    };
  } catch (error) {
    console.error('Erro ao buscar créditos Runware:', error);
    return {
      credits: 'N/A',
      unit: 'dollars',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}

/**
 * Formata o valor de créditos para exibição
 */
export function formatCredits(credits: number | string, unit: 'dollars' | 'characters' | 'credits'): string {
  if (credits === 'N/A') return 'N/A';

  const numCredits = typeof credits === 'number' ? credits : parseFloat(credits);

  switch (unit) {
    case 'dollars':
      return `$${numCredits.toFixed(2)}`;
    case 'characters':
      return numCredits.toLocaleString('pt-BR');
    case 'credits':
      return numCredits.toFixed(2);
    default:
      return String(credits);
  }
}

/**
 * Retorna label descritivo para o tipo de unidade
 */
export function getUnitLabel(unit: 'dollars' | 'characters' | 'credits'): string {
  switch (unit) {
    case 'dollars':
      return 'Créditos disponíveis';
    case 'characters':
      return 'Caracteres disponíveis';
    case 'credits':
      return 'Créditos disponíveis';
    default:
      return 'Disponível';
  }
}
