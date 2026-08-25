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

  // Fetch active protocols (not canceled, not finalized maybe? Wait, user might need to buy for finalized protocols)
  // Let's exclude canceled.
  const { data: protocols } = await supabase
    .from('protocols')
    .select('*')
    .neq('status', 'cancelado')
    .order('created_at', { ascending: false });

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
