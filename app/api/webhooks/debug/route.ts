import { NextResponse } from 'next/server';
import { BlingService } from '@/app/lib/services/blingService';

export async function GET(request: Request) {
  try {
    // Test BlingService methods directly
    const response = await BlingService.request('/produtos?limite=2');
    const data = await response.json();

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}
