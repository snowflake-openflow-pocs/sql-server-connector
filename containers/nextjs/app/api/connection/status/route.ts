import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';

export async function GET() {
  try {
    const pool = await getConnection('master');
    const result = await pool.request().query('SELECT @@VERSION as version, GETDATE() as serverTime');
    return NextResponse.json({
      connected: true,
      version: result.recordset[0].version.split('\n')[0],
      serverTime: result.recordset[0].serverTime,
    });
  } catch (error) {
    return NextResponse.json(
      { connected: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
