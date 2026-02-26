'use client';

import { useState, useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { PageHeader, SectionHeader, StatCardRow } from '@/components';
import { Card } from '@/components/ui/card';
import { Zap, Square, Radio, Database, ArrowRight, Clock } from 'lucide-react';
import { useSSE } from '@/hooks/useSSE';

interface DatabaseStats {
  RetailAnalyticsDB?: Record<string, number>;
  ConfigDB?: Record<string, number>;
}

const SSE_URL = process.env.NEXT_PUBLIC_SSE_URL || 'http://localhost:8000/events';

const runSimulator = async (params: { mode: string; count: number }) => {
  const res = await fetch('/api/simulator', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error('Simulator failed');
  return res.json();
};

export default function SimulatorPage() {
  const [running, setRunning] = useState(false);
  const [mode, setMode] = useState<'steady' | 'mixed'>('steady');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const { data: stats, connected } = useSSE<DatabaseStats>(SSE_URL, running);

  const mutation = useMutation({
    mutationFn: runSimulator,
  });

  const fireSporadicBurst = () => {
    const numCalls = Math.floor(Math.random() * 4) + 1;
    for (let i = 0; i < numCalls; i++) {
      const count = Math.floor(Math.random() * 9) + 2;
      mutation.mutate({ mode, count });
    }
  };

  const handleStart = () => {
    setRunning(true);
    fireSporadicBurst();
    intervalRef.current = setInterval(fireSporadicBurst, 800 + Math.random() * 400);
  };

  const handleStop = () => {
    setRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <div>
      <PageHeader
        title="Data Simulator"
        subtitle="Generate synthetic CDC events to demonstrate real-time data replication"
      />

      <Card className="p-6 mb-8">
        <h3 className="text-lg font-semibold text-foreground mb-3">How It Works</h3>
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2 text-sm text-foreground-muted">
            <Database size={16} className="text-primary" />
            <span>SQL Server</span>
          </div>
          <ArrowRight size={16} className="text-foreground-muted" />
          <div className="flex items-center gap-2 text-sm text-foreground-muted">
            <Zap size={16} className="text-warning" />
            <span>CDC Capture</span>
          </div>
          <ArrowRight size={16} className="text-foreground-muted" />
          <div className="flex items-center gap-2 text-sm text-foreground-muted">
            <Radio size={16} className="text-success" />
            <span>Openflow</span>
          </div>
          <ArrowRight size={16} className="text-foreground-muted" />
          <div className="flex items-center gap-2 text-sm text-foreground-muted">
            <Database size={16} className="text-primary" />
            <span>Snowflake</span>
          </div>
        </div>
        <p className="text-sm text-foreground-muted">
          This simulator generates randomized INSERT and UPDATE operations against SQL Server tables 
          with Change Data Capture enabled. Changes are captured by CDC, read by Openflow connectors, 
          and replicated to Snowflake in near real-time. The stats below update live via Server-Sent Events.
        </p>
      </Card>

      <SectionHeader title="Simulation Controls" />
      
      <div className="mt-4 flex items-center gap-6">
        <div className="flex gap-2">
          <button
            onClick={() => setMode('steady')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              mode === 'steady'
                ? 'bg-primary text-white'
                : 'bg-background-secondary text-foreground-muted hover:bg-background-tertiary'
            }`}
          >
            Steady Mode
          </button>
          <button
            onClick={() => setMode('mixed')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              mode === 'mixed'
                ? 'bg-primary text-white'
                : 'bg-background-secondary text-foreground-muted hover:bg-background-tertiary'
            }`}
          >
            Mixed Mode
          </button>
        </div>

        <div className="h-8 w-px bg-background-tertiary" />

        {!running ? (
          <button
            onClick={handleStart}
            className="flex items-center gap-2 px-6 py-2 bg-success hover:bg-success/90 text-white rounded-lg font-medium transition-all"
          >
            <Zap size={18} />
            Start Simulation
          </button>
        ) : (
          <button
            onClick={handleStop}
            className="flex items-center gap-2 px-6 py-2 bg-error hover:bg-error/90 text-white rounded-lg font-medium transition-all"
          >
            <Square size={18} />
            Stop Simulation
          </button>
        )}

        <div className="ml-auto flex items-center gap-4">
          {connected ? (
            <div className="flex items-center gap-2 text-success text-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
              </span>
              Live Feed
            </div>
          ) : (
            <div className="flex items-center gap-2 text-warning text-sm">
              <Clock size={14} className="animate-spin" />
              Connecting...
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 text-xs text-foreground-muted">
        {mode === 'steady' ? (
          <span><strong>Steady:</strong> 100% INSERT operations - simulates continuous data ingestion</span>
        ) : (
          <span><strong>Mixed:</strong> 70% INSERT, 30% UPDATE - simulates realistic workload patterns</span>
        )}
      </div>

      <SectionHeader title="RetailAnalyticsDB" />
      {stats?.RetailAnalyticsDB ? (
        <div className="mt-4">
          <StatCardRow
            cards={[
              { label: 'Distributors', value: stats.RetailAnalyticsDB.Distributors || 0, icon: '🏢' },
              { label: 'Products', value: stats.RetailAnalyticsDB.Products || 0, icon: '📦' },
              { label: 'Sales', value: stats.RetailAnalyticsDB.SalesTransactions || 0, icon: '💰' },
              { label: 'Audit Logs', value: stats.RetailAnalyticsDB.AuditLog || 0, icon: '📋' },
            ]}
          />
        </div>
      ) : (
        <div className="mt-4 text-foreground-muted">Waiting for data...</div>
      )}

      <SectionHeader title="ConfigDB" />
      <Card className="mt-4 p-6 border-dashed opacity-60">
        <div className="flex items-center justify-center gap-3 text-foreground-muted">
          <Clock size={20} />
          <span className="text-sm font-medium">Coming Soon</span>
        </div>
        <p className="text-center text-xs text-foreground-muted mt-2">
          ConfigDB simulation will be available in a future update
        </p>
      </Card>
    </div>
  );
}
