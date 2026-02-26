'use client';

import { PageHeader, SectionHeader } from '@/components';
import { Cpu, AlertTriangle, GitBranch, Database, Upload, Clock } from 'lucide-react';

const categories = [
  {
    name: 'Error Handling',
    icon: AlertTriangle,
    color: 'red',
    processors: [
      { name: 'Update Failure Reason With CONTENT_MERGE_FAILED', type: 'UpdateAttribute', purpose: 'Sets error code when row batching fails' },
      { name: 'Update Failure Reason With CONTENT_MERGE_FAILED', type: 'UpdateAttribute', purpose: 'Duplicate for alternate failure path' },
      { name: 'Update Failure Reason With SNOWFLAKE_OBJECT_OPERATION_FAILED', type: 'UpdateAttribute', purpose: 'Sets error code when DDL operations fail' },
      { name: 'Update Failure Reason With SNOWPIPE_UPLOAD_FAILED', type: 'UpdateAttribute', purpose: 'Sets error code when Snowpipe streaming fails' },
      { name: 'Mark Replication as Failed', type: 'UpdateTableState', purpose: 'Records table-level failure in state store' },
      { name: 'Mark Replication as Failed', type: 'UpdateTableState', purpose: 'Duplicate for alternate failure path' },
    ],
  },
  {
    name: 'State Management',
    icon: Clock,
    color: 'blue',
    processors: [
      { name: 'Wait for Snapshot Load to Finish', type: 'WaitForTableState', purpose: 'Blocks incremental until initial load completes' },
      { name: 'Set Source Table FQN', type: 'UpdateAttribute', purpose: 'Adds fully-qualified table name to FlowFile' },
    ],
  },
  {
    name: 'Schema Evolution',
    icon: GitBranch,
    color: 'purple',
    processors: [
      { name: 'Process Schema Changes', type: 'EnrichCdcStream', purpose: 'Detects and processes DDL changes from source' },
      { name: 'Drop First DDL', type: 'RouteOnAttribute', purpose: 'Filters initial DDL event to prevent duplicates' },
      { name: 'Alter Destination Table', type: 'UpdateSnowflakeDatabase', purpose: 'Applies ALTER TABLE to Snowflake destination' },
    ],
  },
  {
    name: 'Data Flow',
    icon: Database,
    color: 'green',
    processors: [
      { name: 'Read SQLServer Change Tracking tables', type: 'CaptureChangeSqlServer', purpose: 'Polls CT tables for INSERT/UPDATE/DELETE' },
      { name: 'Merge Rows Into Bigger FlowFiles', type: 'MergeContent', purpose: 'Batches small changes for efficient upload' },
      { name: 'Schedule Warehouse', type: 'MergeContent', purpose: 'Controls warehouse scheduling for MERGE operations' },
      { name: 'Drop Journal Stream', type: 'UpdateSnowflakeDatabase', purpose: 'Cleans up Snowflake stream after merge' },
    ],
  },
  {
    name: 'Snowflake Writes',
    icon: Upload,
    color: 'cyan',
    processors: [
      { name: 'Upload Rows via Snowpipe Streaming', type: 'PutSnowpipeStreaming', purpose: 'High-throughput loading to journal table' },
      { name: 'Merge Journal to Destination', type: 'MergeSnowflakeJournalTable', purpose: 'Applies UPSERT/DELETE from journal to destination' },
      { name: 'Create Journal Table', type: '(Nested Process Group)', purpose: 'Creates journal table schema in Snowflake' },
    ],
  },
];

const colorMap: Record<string, string> = {
  red: 'bg-red-500/20 text-red-400 border-red-500/30',
  blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  green: 'bg-green-500/20 text-green-400 border-green-500/30',
  cyan: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
};

export default function TechnicalPage() {
  return (
    <div>
      <PageHeader
        title="Technical: Incremental Load"
        subtitle="Complete processor inventory for the Incremental Load flow"
      />

      <div className="bg-background-secondary border border-background-tertiary rounded-xl p-6 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Cpu className="text-primary" size={24} />
          <h2 className="text-lg font-semibold text-foreground">18 Processors Across 5 Categories</h2>
        </div>
        <p className="text-foreground-muted">
          The Incremental Load flow handles error recovery, state coordination, schema evolution, 
          and high-throughput data streaming. Each processor has a specific role in the CDC pipeline.
        </p>
      </div>

      {categories.map((cat, i) => (
        <div key={i} className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${colorMap[cat.color]}`}>
              <cat.icon size={20} />
            </div>
            <SectionHeader title={`${cat.name} (${cat.processors.length})`} />
          </div>
          
          <div className="overflow-hidden rounded-lg border border-background-tertiary">
            <table className="w-full">
              <thead className="bg-background-secondary">
                <tr>
                  <th className="text-left px-4 py-3 text-foreground font-semibold">Processor</th>
                  <th className="text-left px-4 py-3 text-foreground font-semibold">Type</th>
                  <th className="text-left px-4 py-3 text-foreground font-semibold">Purpose</th>
                </tr>
              </thead>
              <tbody>
                {cat.processors.map((p, j) => (
                  <tr key={j} className="border-t border-background-tertiary">
                    <td className="px-4 py-3 text-foreground text-sm">{p.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-primary">{p.type}</td>
                    <td className="px-4 py-3 text-foreground-muted text-sm">{p.purpose}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <div className="mt-8 bg-primary/10 border border-primary/20 rounded-lg p-4">
        <p className="text-foreground text-sm">
          <strong>Note:</strong> Flow definitions are exported to <code className="bg-background-tertiary px-1 rounded">docs/incremental-load.json</code> and can be imported into any Openflow runtime.
        </p>
      </div>
    </div>
  );
}
