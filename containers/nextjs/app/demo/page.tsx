'use client';

import { useQuery } from '@tanstack/react-query';
import { ConnectionBadge } from '@/components';
import { Database, Zap, RefreshCw, Shield, Camera, Activity, Server, Snowflake, ArrowRight, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

async function fetchConnectionStatus() {
  const res = await fetch('/api/connection/status');
  if (!res.ok) throw new Error('Failed to fetch connection status');
  return res.json();
}

const capabilities = [
  {
    icon: Camera,
    title: 'Snapshot Load',
    desc: 'Full table replication for initial data sync',
    href: '/snapshot',
  },
  {
    icon: RefreshCw,
    title: 'Incremental CDC',
    desc: 'Real-time change capture for ongoing sync',
    href: '/incremental',
  },
  {
    icon: Shield,
    title: 'Staleness Prevention',
    desc: 'Automated stream health management',
    href: '/staleness',
  },
  {
    icon: Activity,
    title: 'Data Simulator',
    desc: 'Generate test data for demonstrations',
    href: '/simulator',
  },
];

const benefits = [
  { label: 'Near Real-Time', value: 'Changes sync within seconds' },
  { label: 'Zero Code Changes', value: 'Uses native Change Tracking' },
  { label: 'Schema Evolution', value: 'Handles DDL automatically' },
  { label: 'Exactly-Once', value: 'No duplicates via journal pattern' },
];

const demoHighlights = [
  'Live SQL Server 2022 instance running in the cloud with CDC enabled',
  'Openflow connector continuously capturing changes from transaction logs',
  'Data automatically lands in Snowflake tables within seconds of source changes',
  'Supports both initial snapshot loads and incremental CDC streaming',
  'Built-in staleness prevention to keep streams healthy and active',
];

export default function DemoPage() {
  const { data: connection } = useQuery({
    queryKey: ['connection-status'],
    queryFn: fetchConnectionStatus,
    retry: false,
  });

  const connected = connection?.connected ?? false;

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-primary/20 rounded-xl flex items-center justify-center">
            <Database size={32} className="text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">SQL Server CDC Demo</h1>
            <p className="text-foreground-muted">Live demonstration of Change Data Capture pipeline</p>
          </div>
        </div>
        <ConnectionBadge connected={connected} />
      </div>

      <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-6 mb-8">
        <div className="flex items-start gap-4">
          <Zap size={24} className="text-primary mt-1" />
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">What This Does</h2>
            <p className="text-foreground-muted leading-relaxed">
              This pipeline continuously replicates data from a <strong className="text-foreground">SQL Server database</strong> in 
              the cloud to <strong className="text-foreground">Snowflake</strong> using Change Data Capture (CDC). 
              Every INSERT, UPDATE, and DELETE is captured and mirrored in near real-time, enabling analytics 
              on live operational data without impacting source systems.
            </p>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <h3 className="text-sm font-semibold text-foreground-muted uppercase tracking-wide mb-4">Architecture Overview</h3>
        <div className="bg-background-secondary border border-background-tertiary rounded-xl p-6">
          <div className="flex items-center justify-center gap-6 mb-6">
            <div className="flex flex-col items-center gap-2">
              <div className="w-14 h-14 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Server size={28} className="text-blue-400" />
              </div>
              <span className="text-sm font-medium text-foreground">SQL Server</span>
              <span className="text-xs text-foreground-muted">Source</span>
            </div>
            <ArrowRight size={24} className="text-foreground-muted" />
            <div className="flex flex-col items-center gap-2">
              <div className="w-14 h-14 bg-warning/20 rounded-lg flex items-center justify-center">
                <Zap size={28} className="text-warning" />
              </div>
              <span className="text-sm font-medium text-foreground">CDC</span>
              <span className="text-xs text-foreground-muted">Capture</span>
            </div>
            <ArrowRight size={24} className="text-foreground-muted" />
            <div className="flex flex-col items-center gap-2">
              <div className="w-14 h-14 bg-success/20 rounded-lg flex items-center justify-center">
                <RefreshCw size={28} className="text-success" />
              </div>
              <span className="text-sm font-medium text-foreground">Openflow</span>
              <span className="text-xs text-foreground-muted">Transport</span>
            </div>
            <ArrowRight size={24} className="text-foreground-muted" />
            <div className="flex flex-col items-center gap-2">
              <div className="w-14 h-14 bg-primary/20 rounded-lg flex items-center justify-center">
                <Snowflake size={28} className="text-primary" />
              </div>
              <span className="text-sm font-medium text-foreground">Snowflake</span>
              <span className="text-xs text-foreground-muted">Destination</span>
            </div>
          </div>
          <p className="text-sm text-foreground-muted text-center">
            Changes flow automatically from source to destination with minimal latency
          </p>
        </div>
      </div>

      <div className="mb-8">
        <h3 className="text-sm font-semibold text-foreground-muted uppercase tracking-wide mb-4">This Demo Includes</h3>
        <div className="bg-background-secondary border border-background-tertiary rounded-xl p-6">
          <ul className="space-y-3">
            {demoHighlights.map((highlight, i) => (
              <li key={i} className="flex items-start gap-3">
                <CheckCircle2 size={18} className="text-success mt-0.5 flex-shrink-0" />
                <span className="text-foreground-muted">{highlight}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <h3 className="text-sm font-semibold text-foreground-muted uppercase tracking-wide mb-4">Pipeline Capabilities</h3>
      <div className="grid grid-cols-4 gap-4 mb-8">
        {capabilities.map((cap, i) => (
          <Link
            key={i}
            href={cap.href}
            className="bg-background-secondary border border-background-tertiary rounded-lg p-4 hover:border-primary/50 transition-colors group"
          >
            <cap.icon size={24} className="text-primary mb-3 group-hover:scale-110 transition-transform" />
            <h4 className="font-semibold text-foreground mb-1">{cap.title}</h4>
            <p className="text-sm text-foreground-muted">{cap.desc}</p>
          </Link>
        ))}
      </div>

      <h3 className="text-sm font-semibold text-foreground-muted uppercase tracking-wide mb-4">Key Benefits</h3>
      <div className="grid grid-cols-4 gap-4 mb-8">
        {benefits.map((b, i) => (
          <div key={i} className="bg-background-secondary border border-background-tertiary rounded-lg p-4">
            <p className="text-sm font-semibold text-primary mb-1">{b.label}</p>
            <p className="text-sm text-foreground-muted">{b.value}</p>
          </div>
        ))}
      </div>

      <div className="border-t border-background-tertiary pt-6">
        <p className="text-sm text-foreground-muted text-center">
          SQL Server CDC Pipeline • Powered by Snowflake Openflow
        </p>
      </div>
    </div>
  );
}
