'use client';

import { PageHeader, SectionHeader } from '@/components';
import { RefreshCw, Clock, Database, Upload, GitMerge } from 'lucide-react';

const steps = [
  { icon: Clock, title: 'Wait for Snapshot', desc: 'Ensures initial load completed before starting CDC' },
  { icon: Database, title: 'Read Change Tracking', desc: 'Polls SQL Server CT tables for new changes' },
  { icon: RefreshCw, title: 'Process Schema Changes', desc: 'Handles DDL changes (ALTER TABLE, etc.)' },
  { icon: GitMerge, title: 'Merge Rows', desc: 'Batches multiple changes for efficiency' },
  { icon: Upload, title: 'Upload to Journal', desc: 'Writes changes to Snowflake journal table' },
  { icon: GitMerge, title: 'Merge to Destination', desc: 'Applies UPSERT/DELETE to final table' },
];

const processors = [
  { name: 'CaptureChangeSqlServer', fn: 'Reads SQL Server Change Tracking tables' },
  { name: 'EnrichCdcStream', fn: 'Processes schema changes and DDL events' },
  { name: 'MergeContent', fn: 'Batches rows for efficient upload' },
  { name: 'PutSnowpipeStreaming', fn: 'Streams changes to Snowflake' },
  { name: 'MergeSnowflakeJournalTable', fn: 'Applies UPSERT/DELETE to destination' },
];

export default function IncrementalPage() {
  return (
    <div>
      <PageHeader
        title="Incremental Load"
        subtitle="Ongoing capture of changes (INSERT, UPDATE, DELETE) after initial snapshot"
      />

      <div className="bg-primary/10 border border-primary/20 rounded-xl p-6 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <RefreshCw className="text-primary" size={24} />
          <h2 className="text-lg font-semibold text-foreground">Continuous CDC Phase</h2>
        </div>
        <p className="text-foreground-muted">
          After the snapshot completes, Openflow continuously monitors SQL Server Change Tracking 
          tables. Every INSERT, UPDATE, and DELETE is captured and replicated to Snowflake in near real-time.
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

      <SectionHeader title="Data Flow" />
      <div className="mt-4 mb-8 bg-background-secondary border border-background-tertiary rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="text-center">
            <div className="w-24 h-24 bg-blue-500/20 rounded-lg flex items-center justify-center mb-2 mx-auto">
              <Database size={32} className="text-blue-400" />
            </div>
            <p className="text-sm font-semibold text-foreground">SQL Server CT</p>
            <p className="text-xs text-foreground-muted">Change Tracking</p>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="h-0.5 bg-primary/50 flex-1 max-w-24" />
            <RefreshCw size={20} className="text-primary mx-2" />
            <div className="h-0.5 bg-primary/50 flex-1 max-w-24" />
          </div>
          <div className="text-center">
            <div className="w-24 h-24 bg-yellow-500/20 rounded-lg flex items-center justify-center mb-2 mx-auto">
              <Database size={32} className="text-yellow-400" />
            </div>
            <p className="text-sm font-semibold text-foreground">Journal Table</p>
            <p className="text-xs text-foreground-muted">Staging</p>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="h-0.5 bg-primary/50 flex-1 max-w-24" />
            <GitMerge size={20} className="text-primary mx-2" />
            <div className="h-0.5 bg-primary/50 flex-1 max-w-24" />
          </div>
          <div className="text-center">
            <div className="w-24 h-24 bg-green-500/20 rounded-lg flex items-center justify-center mb-2 mx-auto">
              <Database size={32} className="text-green-400" />
            </div>
            <p className="text-sm font-semibold text-foreground">Destination</p>
            <p className="text-xs text-foreground-muted">Final Table</p>
          </div>
        </div>
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
          <strong>Result:</strong> Changes appear in Snowflake within seconds of occurring in SQL Server. 
          The journal pattern ensures exactly-once delivery with no duplicates.
        </p>
      </div>
    </div>
  );
}
