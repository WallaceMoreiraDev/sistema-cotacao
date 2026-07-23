import { NextResponse } from 'next/server';
import { approveWithCustomMarkupAction, getPendingApprovalsAction } from '@/app/lib/actions/protocols';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const itemId = searchParams.get('itemId');
  const customMarkup = searchParams.get('customMarkup');
  
  if (!itemId || !customMarkup) {
    const pendings = await getPendingApprovalsAction();
    return NextResponse.json({ pendings });
  }
  
  const result = await approveWithCustomMarkupAction(itemId, Number(customMarkup), 10);
  return NextResponse.json(result);
}
