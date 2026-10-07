import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase/server';
import PainelComprasClient from './PainelComprasClient';

export const dynamic = 'force-dynamic';

export default async function ComprasPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect('/login');
  }

  // Fetch all suppliers
  const { data: suppliers } = await supabase
    .from('suppliers')
    .select('id, name')
    .order('name');

  // Fetch active protocols with items using getProtocolsAction
  const { getProtocolsAction } = await import('../../lib/actions/protocols');
  const protocolsRes = await getProtocolsAction();
  const protocols = (protocolsRes.data || []).filter(p => p.status !== 'cancelado');

  const { data: userRow } = await supabase
    .from('users')
    .select('role')
    .eq('id', userData.user.id)
    .single();

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-auto p-4 md:p-8">
        <PainelComprasClient 
          initialProtocols={protocols || []} 
          suppliers={suppliers || []} 
          userRole={userRow?.role}
        />
      </div>
    </div>
  );
}
