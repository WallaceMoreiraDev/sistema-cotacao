import { NextResponse } from 'next/server';
import { BlingService } from '../../../lib/services/blingService';

export async function POST(request: Request) {
  try {
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json({ success: false, error: 'Código (code) não fornecido.' }, { status: 400 });
    }

    const tokenData = await BlingService.exchangeCodeForToken(code);

    return NextResponse.json({ success: true, data: tokenData });
  } catch (err: any) {
    console.error('Bling OAuth Exchange Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
