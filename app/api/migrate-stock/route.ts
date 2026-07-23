import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { stockMockProducts } from '../../lib/mocks/stockMockData';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Convert to DB format
    const inserts = stockMockProducts.map(p => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      code: p.code,
      stock: p.stock,
      cost_price: p.costPrice,
      category: p.category,
      brand: p.brand || null,
      measurements: p.measurements || {}
    }));

    const { data, error } = await supabase.from('stock_products').insert(inserts).select();

    if (error) {
      return NextResponse.json({ success: false, error: error.message, details: error });
    }

    return NextResponse.json({ success: true, count: data.length, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}
