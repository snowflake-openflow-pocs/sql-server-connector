import { NextRequest, NextResponse } from 'next/server';
import { testConnection } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { host, port, user, password } = await request.json();
    const result = await testConnection(host, parseInt(port), user, password);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { connected: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
