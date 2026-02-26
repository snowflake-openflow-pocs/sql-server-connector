'use client';

import { PageHeader, SectionHeader } from '@/components';
import { Camera, Database, Upload, CheckCircle } from 'lucide-react';

const steps = [
  { icon: Database, title: 'Discover Tables', desc: 'Scans source database for configured tables' },
  { icon: Database, title: 'Create Schema', desc: 'Creates matching schema in Snowflake' },
  { icon: Database, title: 'Create Table', desc: 'Creates destination table with CDC columns' },
  { icon: Upload, title: 'Fetch All Rows', desc: 'Reads entire table contents from SQL Server' },
  { icon: Upload, title: 'Upload via Snowpipe', desc: 'Streams data using Snowpipe Streaming API' },
  { icon: CheckCircle, title: 'Mark Complete', desc: 'Signals incremental load can begin' },
];

const processors = [
  { name: 'FetchSourceTableSchema', fn: 'Gets table DDL from SQL Server' },
  { name: 'UpdateSnowflakeDatabase', fn: 'Creates schemas and tables in Snowflake' },
  { name: 'FetchTableSnapshot', fn: 'Bulk reads all rows from source table' },
  { name: 'PutSnowpipeStreaming', fn: 'High-throughput data loading into Snowflake' },
];

export default function SnapshotPage() {
  return (
    <div>
      <PageHeader
        title="Snapshot Load"
        subtitle="One-time full table copy when a table is first added to replication"
      />

      <div className="bg-primary/10 border border-primary/20 rounded-xl p-6 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Camera className="text-primary" size={24} />
          <h2 className="text-lg font-semibold text-foreground">Initial Sync Phase</h2>
        </div>
        <p className="text-foreground-muted">
          Before CDC can track changes, Openflow performs a complete snapshot of each table. 
          This ensures the destination starts with an exact copy of the source data.
        </p>
      </div>

      <SectionHeader title="What Happens" />
      <div className="grid grid-cols-3 gap-4 mt-4 mb-8">
        {steps.map((step, i) => (
          <div key={i} className="bg-background-secondary border border-background-tertiary rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold text-sm">
                {i + 1}
              </div>
              <step.icon size={20} className="text-primary" />
            </div>
            <h3 className="font-semibold text-foreground mb-1">{step.title}</h3>
            <p className="text-sm text-foreground-muted">{step.desc}</p>
          </div>
        ))}
      </div>

      <SectionHeader title="Key Processors" />
      <div className="mt-4 overflow-hidden rounded-lg border border-background-tertiary">
        <table className="w-full">
          <thead className="bg-background-secondary">
            <tr>
              <th className="text-left px-4 py-3 text-foreground font-semibold">Processor</th>
              <th className="text-left px-4 py-3 text-foreground font-semibold">Function</th>
            </tr>
          </thead>
          <tbody>
            {processors.map((p, i) => (
              <tr key={i} className="border-t border-background-tertiary">
                <td className="px-4 py-3 font-mono text-sm text-primary">{p.name}</td>
                <td className="px-4 py-3 text-foreground-muted">{p.fn}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8 bg-success/10 border border-success/30 rounded-lg p-4">
        <p className="text-foreground">
          <strong>Result:</strong> After snapshot completes, the Snowflake table contains an exact copy 
          of all source data, and the pipeline transitions to incremental CDC mode.
        </p>
      </div>
    </div>
  );
}
