'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  PageHeader, SectionHeader, StatCardRow,
  StackedBarChart,
  DataTable, EnabledDisabledCell, PassFailCell,
  CodeBlock,
} from '@/components';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import type { DatabaseInfo, TableInfo, ConnectorConfig } from '@/lib/types';

async function testConnection(host: string, port: string, user: string, password: string) {
  const res = await fetch('/api/connection/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ host, port, user, password }),
  });
  return res.json();
}

async function discoverDatabases(host: string, port: string, user: string, password: string) {
  const res = await fetch('/api/databases', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ host, port, user, password }),
  });
  return res.json();
}

async function scanTables(host: string, port: string, user: string, password: string, db: string) {
  const res = await fetch(`/api/tables/${db}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ host, port, user, password }),
  });
  return res.json();
}

interface SetupFormProps {
  defaultHost: string;
  defaultPort: string;
  defaultUser: string;
  defaultPassword: string;
}

export default function SetupForm({ defaultHost, defaultPort, defaultUser, defaultPassword }: SetupFormProps) {
  const [host, setHost] = useState(defaultHost);
  const [port, setPort] = useState(defaultPort);
  const [user, setUser] = useState(defaultUser);
  const [password, setPassword] = useState(defaultPassword);

  const [connected, setConnected] = useState(false);
  const [version, setVersion] = useState('');
  const [databases, setDatabases] = useState<DatabaseInfo[]>([]);
  const [tableResults, setTableResults] = useState<Record<string, TableInfo[]>>({});
  const [tablesScanned, setTablesScanned] = useState(false);
  const [selectedDb, setSelectedDb] = useState('');

  const [sfAccount, setSfAccount] = useState('');
  const [destDb, setDestDb] = useState('CDC_TARGET');
  const [destWh, setDestWh] = useState('CDC_WH');
  const [sfRole, setSfRole] = useState('');

  const connectionMutation = useMutation({
    mutationFn: () => testConnection(host, port, user, password),
    onSuccess: async (data) => {
      if (data.connected) {
        setConnected(true);
        setVersion(data.version || '');
        const dbData = await discoverDatabases(host, port, user, password);
        setDatabases(dbData.databases || []);
        setTableResults({});
        setTablesScanned(false);
      } else {
        setConnected(false);
        alert(`Connection failed: ${data.error}`);
      }
    },
  });

  const scanMutation = useMutation({
    mutationFn: async () => {
      const ctDbs = databases.filter((d) => d.ctEnabled).map((d) => d.name);
      const results: Record<string, TableInfo[]> = {};
      for (const db of ctDbs) {
        const data = await scanTables(host, port, user, password, db);
        results[db] = data.tables || [];
      }
      return results;
    },
    onSuccess: (data) => {
      setTableResults(data);
      setTablesScanned(true);
      const dbNames = Object.keys(data);
      if (dbNames.length > 0 && !selectedDb) {
        setSelectedDb(dbNames[0]);
      }
    },
  });

  const ctEnabled = databases.filter((d) => d.ctEnabled).length;
  const ctDisabled = databases.length - ctEnabled;

  const aggRows = Object.entries(tableResults).map(([dbName, tables]) => {
    const total = tables.length;
    const withPK = tables.filter((t) => t.hasPK).length;
    const withCT = tables.filter((t) => t.ctEnabled).length;
    const withSel = tables.filter((t) => t.hasSelect).length;
    const ready = tables.filter((t) => t.hasPK && t.ctEnabled && t.hasSelect).length;
    return { dbName, total, withPK, withCT, withSel, ready };
  });

  const totalScanned = aggRows.reduce((sum, r) => sum + r.total, 0);
  const totalReady = aggRows.reduce((sum, r) => sum + r.ready, 0);
  const readinessPct = totalScanned > 0 ? Math.round((totalReady / totalScanned) * 100) : 0;

  const configs: Record<string, ConnectorConfig> = {};
  Object.entries(tableResults).forEach(([dbName, tables]) => {
    const readyTables = tables.filter((t) => t.hasPK && t.ctEnabled && t.hasSelect);
    if (readyTables.length === 0) return;
    const tableList = readyTables.map((t) => `"${t.schema}"."${t.table}"`).join(', ');
    configs[dbName] = {
      source_parameters: {
        'SQL Server Connection URL': `jdbc:sqlserver://<SERVICE_DNS>:1433;databaseName=${dbName};encrypt=false`,
        'SQL Server Username': user,
        'SQL Server Password': '<SET_VIA_CLI>',
      },
      destination_parameters: {
        'Snowflake Account': sfAccount,
        'Snowflake Database': destDb,
        'Snowflake Warehouse': destWh,
        'Snowflake User Role': sfRole,
      },
      ingestion_parameters: {
        'Included Table Names': tableList,
        'Object Identifier Resolution': 'CASE_INSENSITIVE',
      },
    };
  });

  return (
    <div>
      <PageHeader
        title="Setup — Connector Readiness"
        subtitle="Instance-level prerequisite check for the Openflow SQL Server Connector | Supports multi-database discovery"
      />

      <SectionHeader title="1. Instance Connection" />
      <div className="grid grid-cols-2 gap-4 mt-4">
        <Input label="Host" value={host} onChange={(e) => setHost(e.target.value)} />
        <Input label="Port" value={port} onChange={(e) => setPort(e.target.value)} />
        <Input label="Username" value={user} onChange={(e) => setUser(e.target.value)} />
        <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <div className="mt-4">
        <Button onClick={() => connectionMutation.mutate()} disabled={connectionMutation.isPending} className="w-full">
          {connectionMutation.isPending ? 'Connecting...' : 'Test Connection'}
        </Button>
      </div>
      {connected && version && (
        <div className="mt-4 text-sm text-foreground-muted">
          <p>{version}</p>
          <CodeBlock code={`jdbc:sqlserver://${host}:${port};encrypt=false`} language="text" />
        </div>
      )}

      {!connected && (
        <div className="mt-6 bg-primary/10 border border-primary/30 text-foreground-muted px-4 py-3 rounded-lg">
          Connect to SQL Server to begin prerequisite checks.
        </div>
      )}

      {connected && (
        <>
          <hr className="my-8 border-background-tertiary" />
          <SectionHeader title="2. Database Discovery" />
          {databases.length === 0 ? (
            <div className="mt-4 text-warning">No user databases found on this instance.</div>
          ) : (
            <div className="mt-4 space-y-4">
              <StatCardRow
                cards={[
                  { label: 'Databases', value: databases.length, icon: '🗄️' },
                  { label: 'CT Enabled', value: ctEnabled, icon: '✅' },
                  { label: 'CT Disabled', value: ctDisabled, icon: '⚠️' },
                ]}
              />
              <DataTable
                  data={databases}
                  columns={[
                    { key: 'name', header: 'Database' },
                    { key: 'ctEnabled', header: 'Change Tracking', render: (v) => <EnabledDisabledCell value={v as boolean} /> },
                    { key: 'retention', header: 'Retention' },
                    { key: 'autoCleanup', header: 'Auto-Cleanup', render: (v) => (v ? 'On' : 'Off') },
                  ]}
                />
            </div>
          )}

          <hr className="my-8 border-background-tertiary" />
          <SectionHeader title="3. Table Readiness" />
          {ctEnabled === 0 ? (
            <div className="mt-4 text-warning">No databases with Change Tracking enabled. Enable CT first.</div>
          ) : (
            <>
              <div className="mt-4">
                <Button onClick={() => scanMutation.mutate()} disabled={scanMutation.isPending} className="w-full">
                  {scanMutation.isPending ? 'Scanning...' : 'Scan Tables'}
                </Button>
              </div>
              {!tablesScanned && (
                <div className="mt-4 bg-primary/10 border border-primary/30 text-foreground-muted px-4 py-3 rounded-lg">
                  Click <strong>Scan Tables</strong> to check table prerequisites across all CT-enabled databases.
                </div>
              )}
            </>
          )}

          {tablesScanned && (
            <>
              <div className="mt-6 space-y-4">
                <StatCardRow
                  cards={[
                    { label: 'Ready', value: totalReady, icon: '✅' },
                    { label: 'Total Tables', value: totalScanned, icon: '📋' },
                  ]}
                />
                <StackedBarChart
                  data={aggRows.map((r) => ({ name: r.dbName, Ready: r.ready, 'Not Ready': r.total - r.ready }))}
                  keys={['Ready', 'Not Ready']}
                  title="Per-Database Readiness"
                  layout="vertical"
                  height={200}
                />
              </div>

              <div className="mt-6">
                <Select
                  label="Database detail"
                  value={selectedDb}
                  onChange={(e) => setSelectedDb(e.target.value)}
                  options={Object.keys(tableResults).map((db) => ({ value: db, label: db }))}
                />
              </div>
              {selectedDb && tableResults[selectedDb] && (
                <div className="mt-4">
                  <DataTable
                    data={tableResults[selectedDb]}
                    columns={[
                      { key: 'schema', header: 'Schema' },
                      { key: 'table', header: 'Table' },
                      { key: 'rows', header: 'Rows' },
                      { key: 'hasPK', header: 'Primary Key', render: (v) => <PassFailCell value={v as boolean} /> },
                      { key: 'ctEnabled', header: 'Change Tracking', render: (v) => <PassFailCell value={v as boolean} /> },
                      { key: 'hasSelect', header: 'SELECT Permission', render: (v) => <PassFailCell value={v as boolean} /> },
                    ]}
                  />
                </div>
              )}

              <hr className="my-8 border-background-tertiary" />
              <SectionHeader title="4. Connector Configuration" />
              {totalReady === 0 ? (
                <div className="mt-4 text-warning">No tables are fully ready for replication yet.</div>
              ) : (
                <>
                  {totalReady === totalScanned ? (
                    <div className="mt-4 bg-success/10 border border-success/30 text-success px-4 py-3 rounded-lg">
                      All {totalReady} tables across {Object.keys(tableResults).length} databases are ready.
                    </div>
                  ) : (
                    <div className="mt-4 bg-warning/10 border border-warning/30 text-warning px-4 py-3 rounded-lg">
                      {totalReady}/{totalScanned} tables ready. Fix the remaining tables above before deploying.
                    </div>
                  )}

                  <div className="mt-6">
                    <h3 className="text-lg font-medium text-foreground mb-4">Snowflake Destination Settings</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <Input label="Snowflake Account" value={sfAccount} onChange={(e) => setSfAccount(e.target.value)} />
                      <Input label="Destination Database" value={destDb} onChange={(e) => setDestDb(e.target.value)} />
                      <Input label="Warehouse" value={destWh} onChange={(e) => setDestWh(e.target.value)} />
                      <Input label="Snowflake Role (optional)" value={sfRole} onChange={(e) => setSfRole(e.target.value)} />
                    </div>
                    <div className="mt-4">
                      <CodeBlock code={`CREATE DATABASE IF NOT EXISTS ${destDb};`} language="sql" />
                      <p className="text-sm text-foreground-muted mt-2">
                        Pre-create the destination database. Openflow auto-creates schemas and tables inside it.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6">
                    <h3 className="text-lg font-medium text-foreground mb-4">Per-Database Openflow Configs</h3>
                    <p className="text-sm text-foreground-muted mb-4">
                      One config file per database with all 3 Openflow parameter contexts: <strong>Source</strong>, <strong>Destination</strong>, and <strong>Ingestion</strong>.
                    </p>
                    {Object.entries(configs).map(([dbName, config]) => (
                      <Card key={dbName} className="mb-4">
                        <h4 className="font-medium text-foreground mb-3">{dbName} — {dbName}-openflow-config.json</h4>
                        <CodeBlock
                          code={JSON.stringify(config, null, 2)}
                          language="json"
                          downloadName={`${dbName}-openflow-config.json`}
                        />
                      </Card>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
