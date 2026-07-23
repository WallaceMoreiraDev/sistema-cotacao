import { NextResponse } from 'next/server';
import { getSuppliersAction } from '@/app/lib/actions/suppliers';

export async function GET(request: Request) {
  const result = await getSuppliersAction();
  return NextResponse.json(result);
}
