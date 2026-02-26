import { NextResponse } from 'next/server';
import sql from 'mssql';
import { QUERIES } from '@/lib/queries';
import type { DatabaseStats } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function queryDb(database: string, query: string) {
  const config: sql.config = {
    server: process.env.SQL_HOST || 'localhost',
    port: parseInt(process.env.SQL_PORT || '1433'),
    user: process.env.SQL_USER || 'sa',
    password: process.env.SQL_PASSWORD || '',
    database,
    options: { encrypt: false, trustServerCertificate: true },
  };
  const pool = await sql.connect(config);
  const result = await pool.request().query(query);
  await pool.close();
  return result;
}

export async function GET() {
  try {
    const stats: DatabaseStats = {
      RetailAnalyticsDB: {},
      ConfigDB: {},
    };

    try {
      for (const table of QUERIES.RETAIL_TABLES) {
        const result = await queryDb('RetailAnalyticsDB', `SELECT COUNT(*) as count FROM ${table}`);
        stats.RetailAnalyticsDB[table] = result.recordset[0].count;
      }
    } catch (e) {
      console.error('Failed to get RetailAnalyticsDB stats:', e);
    }

    try {
      for (const table of QUERIES.CONFIG_TABLES) {
        const result = await queryDb('ConfigDB', `SELECT COUNT(*) as count FROM ${table}`);
        stats.ConfigDB[table] = result.recordset[0].count;
      }
    } catch (e) {
      console.error('Failed to get ConfigDB stats:', e);
    }

    return NextResponse.json(stats);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
