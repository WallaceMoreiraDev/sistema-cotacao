import { NextResponse } from 'next/server';
import { createClient } from '@/app/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  
  const { error: insertError } = await supabase.from('suppliers').insert([
    { id: 'sippel', name: 'Sippel', type: 'Fornecedor Original' },
    { id: 'vedpira', name: 'VedPira', type: 'Mercado Local' }
  ]);
  
  return NextResponse.json({ insertError });
}
