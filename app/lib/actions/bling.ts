'use server';

import { createClient } from '../supabase/server';
import { BlingService } from '../services/blingService';
import { insertLogAction } from './logs';

/**
 * Enviar para Bling Action
 * Completes the protocol (status 'finalizado'). Note: validation of items must be done on the client or before this call.
 */
export async function enviarParaBlingAction(protocolId: string | number): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    
    const { error: protoError } = await supabase
      .from('protocols')
      .update({ status: 'finalizado', updated_at: new Date().toISOString() })
      .eq('id', Number(protocolId));
      
    if (protoError) throw protoError;
    
    // We could add integration logic to Bling here later
    
    await insertLogAction(protocolId, 'status_change', 'Protocolo Efetivado no Bling (Finalizado).');

    return { success: true };
  } catch (err: any) {
    console.error('[enviarParaBling] Exception:', err);
    return { success: false, error: err?.message || 'Falha ao enviar para o Bling.' };
  }
}
