import { NextRequest, NextResponse } from 'next/server';
import { getCustomConnection } from '@/lib/db';
import { QUERIES } from '@/lib/queries';
import type { TableInfo } from '@/lib/types';

export async function POST(
  request: NextRequest,
  { params }: { params: { db: string } }
) {
  try {
    const { host, port, user, password } = await request.json();
    const dbName = params.db;
    
    const pool = await getCustomConnection(host, parseInt(port), user, password, dbName);
    const result = await pool.request().query(QUERIES.CHECK_TABLES);

    const tables: TableInfo[] = [];
    for (const row of result.recordset) {
      const fqn = `[${row.schema_name}].[${row.table_name}]`;
      const countResult = await pool.request().query(`SELECT COUNT(*) as count FROM ${fqn}`);
      
      tables.push({
        schema: row.schema_name,
        table: row.table_name,
        rows: countResult.recordset[0].count,
        hasPK: Boolean(row.has_pk),
        ctEnabled: Boolean(row.ct_enabled),
        hasSelect: Boolean(row.has_select),
      });
    }

    await pool.close();
    return NextResponse.json({ tables });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
