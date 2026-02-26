'use client';

import { PageHeader, SectionHeader } from '@/components';
import { Clock, Database, Search, Play, AlertTriangle } from 'lucide-react';

const steps = [
  { icon: Search, title: 'Fetch Journal Streams', desc: 'Query Snowflake for all journal stream metadata' },
  { icon: Database, title: 'Get Stream Coordinates', desc: 'Extract stream name and coordinates from results' },
  { icon: Clock, title: 'Check If Streams Present', desc: 'Route based on whether any streams exist' },
  { icon: Play, title: 'Advance STALE_AFTER', desc: 'Execute SQL to refresh the staleness timestamp' },
];

const processors = [
  { name: 'Fetch Journal Streams', type: 'ExecuteSQLRecord', purpose: 'Queries Snowflake for all journal stream metadata' },
  { name: 'Get Stream Coordinates', type: 'EvaluateJsonPath', purpose: 'Extracts stream name and coordinates from query results' },
  { name: 'Check If Journal Streams Are Present', type: 'RouteOnAttribute', purpose: 'Routes flow based on whether any streams were found' },
  { name: 'Advance Stream\'s STALE_AFTER', type: 'ExecuteSQL', purpose: 'Executes SQL to advance the stream\'s staleness timestamp' },
];

export default function StalenessPage() {
  return (
    <div>
      <PageHeader
        title="Stream Staleness Prevention"
        subtitle="Prevents Snowflake streams from becoming stale during periods of inactivity"
      />

      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="text-yellow-400" size={24} />
          <h2 className="text-lg font-semibold text-foreground">Why This Matters</h2>
        </div>
        <p className="text-foreground-muted">
          Snowflake streams have a <strong className="text-foreground">staleness window</strong> based on the table's data retention period. 
          If a stream is not consumed within this window, it becomes <strong className="text-yellow-400">STALE</strong> and unusable — 
          you lose the ability to track changes and must recreate the stream.
        </p>
      </div>

      <SectionHeader title="How It Works" />
      <div className="grid grid-cols-4 gap-4 mt-4 mb-8">
        {steps.map((step, i) => (
          <div key={i} className="bg-background-secondary border border-background-tertiary rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold text-sm">
                {i + 1}
              </div>
              <step.icon size={20} className="text-primary" />
            </div>
            <h3 className="font-semibold text-foreground mb-1 text-sm">{step.title}</h3>
            <p className="text-xs text-foreground-muted">{step.desc}</p>
          </div>
        ))}
      </div>

      <SectionHeader title="Stream Lifecycle" />
      <div className="mt-4 mb-8 bg-background-secondary border border-background-tertiary rounded-lg p-6">
        <div className="flex items-center justify-between text-center">
          <div className="flex-1">
            <div className="w-20 h-20 bg-green-500/20 rounded-lg flex items-center justify-center mb-2 mx-auto">
              <Clock size={28} className="text-green-400" />
            </div>
            <p className="text-sm font-semibold text-green-400">ACTIVE</p>
            <p className="text-xs text-foreground-muted">Within retention</p>
          </div>
          <div className="flex items-center">
            <div className="h-0.5 bg-foreground-muted/30 w-16" />
            <span className="text-xs text-foreground-muted mx-2">time passes</span>
            <div className="h-0.5 bg-foreground-muted/30 w-16" />
          </div>
          <div className="flex-1">
            <div className="w-20 h-20 bg-yellow-500/20 rounded-lg flex items-center justify-center mb-2 mx-auto">
              <AlertTriangle size={28} className="text-yellow-400" />
            </div>
            <p className="text-sm font-semibold text-yellow-400">AT RISK</p>
            <p className="text-xs text-foreground-muted">Approaching stale</p>
          </div>
          <div className="flex items-center">
            <div className="h-0.5 bg-foreground-muted/30 w-16" />
            <span className="text-xs text-foreground-muted mx-2">no activity</span>
            <div className="h-0.5 bg-foreground-muted/30 w-16" />
          </div>
          <div className="flex-1">
            <div className="w-20 h-20 bg-red-500/20 rounded-lg flex items-center justify-center mb-2 mx-auto">
              <AlertTriangle size={28} className="text-red-400" />
            </div>
            <p className="text-sm font-semibold text-red-400">STALE</p>
            <p className="text-xs text-foreground-muted">Must recreate</p>
          </div>
        </div>
        <div className="mt-6 pt-4 border-t border-background-tertiary text-center">
          <p className="text-sm text-foreground">
            <strong className="text-primary">This processor prevents staleness</strong> by periodically advancing the stream offset
          </p>
        </div>
      </div>

      <SectionHeader title="Processors" />
      <div className="mt-4 overflow-hidden rounded-lg border border-background-tertiary">
        <table className="w-full">
          <thead className="bg-background-secondary">
            <tr>
              <th className="text-left px-4 py-3 text-foreground font-semibold">Processor</th>
              <th className="text-left px-4 py-3 text-foreground font-semibold">Type</th>
              <th className="text-left px-4 py-3 text-foreground font-semibold">Purpose</th>
            </tr>
          </thead>
          <tbody>
            {processors.map((p, i) => (
              <tr key={i} className="border-t border-background-tertiary">
                <td className="px-4 py-3 text-foreground text-sm">{p.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-primary">{p.type}</td>
                <td className="px-4 py-3 text-foreground-muted text-sm">{p.purpose}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8 bg-primary/10 border border-primary/20 rounded-lg p-4">
        <p className="text-foreground text-sm">
          <strong>Scheduling:</strong> This processor group runs on a schedule (typically every few hours) 
          to ensure streams stay fresh even during periods of inactivity on source tables.
        </p>
      </div>
    </div>
  );
}
