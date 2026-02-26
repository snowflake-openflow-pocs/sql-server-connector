import { NextRequest, NextResponse } from 'next/server';
import { getCustomConnection } from '@/lib/db';
import { QUERIES } from '@/lib/queries';
import type { DatabaseInfo } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { host, port, user, password } = await request.json();
    const pool = await getCustomConnection(host, parseInt(port), user, password, 'master');
    
    const result = await pool.request().query(QUERIES.DISCOVER_DATABASES);
    await pool.close();

    const databases: DatabaseInfo[] = result.recordset.map((row: any) => ({
      name: row.name,
      ctEnabled: Boolean(row.ct_enabled),
      retention: row.ct_enabled
        ? `${row.retention_period} ${(row.retention_period_units_desc || '').toLowerCase()}`
        : 'N/A',
      autoCleanup: Boolean(row.is_auto_cleanup_on),
    }));

    return NextResponse.json({ databases });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
