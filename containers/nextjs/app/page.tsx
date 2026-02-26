'use client';

import { PageHeader, SectionHeader } from '@/components';
import { Card } from '@/components/ui/card';
import { Database, Cloud, FileText, Radio, Zap, Shield, GitBranch, ExternalLink } from 'lucide-react';

const connectorCategories = [
  {
    category: 'Databases (CDC)',
    items: ['PostgreSQL', 'MySQL', 'SQL Server'],
    icon: Database,
    color: 'text-blue-400',
  },
  {
    category: 'SaaS & CRM',
    items: ['Salesforce', 'Workday', 'Jira', 'Dataverse'],
    icon: Cloud,
    color: 'text-purple-400',
  },
  {
    category: 'Document Storage',
    items: ['Google Drive', 'SharePoint', 'Box', 'Slack'],
    icon: FileText,
    color: 'text-green-400',
  },
  {
    category: 'Streaming',
    items: ['Kafka', 'AWS Kinesis'],
    icon: Radio,
    color: 'text-orange-400',
  },
  {
    category: 'Advertising',
    items: ['Google Ads', 'Meta Ads', 'LinkedIn Ads', 'Amazon Ads'],
    icon: Zap,
    color: 'text-yellow-400',
  },
];

const capabilities = [
  {
    title: 'Pre-Built Connectors',
    description: 'Deploy production-ready connectors for 30+ data sources with zero custom code.',
    icon: Database,
  },
  {
    title: 'Real-Time CDC',
    description: 'Capture database changes in real-time using native change tracking mechanisms.',
    icon: Zap,
  },
  {
    title: 'Custom Flows',
    description: 'Build bespoke integrations using the full power of Apache NiFi when needed.',
    icon: GitBranch,
  },
  {
    title: 'Managed Infrastructure',
    description: 'Runs on Snowpark Container Services with automatic scaling and high availability.',
    icon: Shield,
  },
];

const resources = [
  {
    title: 'Openflow Documentation',
    url: 'https://docs.snowflake.com/en/user-guide/data-load/openflow',
    description: 'Official Snowflake documentation',
  },
  {
    title: 'Connector Catalog',
    url: 'https://docs.snowflake.com/en/user-guide/data-load/openflow/connectors',
    description: 'Available connectors and configuration guides',
  },
  {
    title: 'Apache NiFi',
    url: 'https://nifi.apache.org/',
    description: 'Underlying dataflow engine',
  },
];

export default function HomePage() {
  return (
    <div>
      <PageHeader
        title="Snowflake Openflow"
        subtitle="Enterprise data integration powered by Apache NiFi"
      />

      <SectionHeader title="What is Openflow?" />
      <Card className="mt-4 p-6">
        <p className="text-foreground-muted leading-relaxed">
          <strong className="text-foreground">Openflow</strong> is Snowflake's managed data integration platform built on Apache NiFi.
          It provides a visual, no-code interface for building data pipelines that move data from external sources into Snowflake
          in real-time. Whether you need simple batch loads or complex CDC (Change Data Capture) pipelines, Openflow delivers
          enterprise-grade reliability without writing ETL code.
        </p>
      </Card>

      <SectionHeader title="Key Capabilities" />
      <div className="grid grid-cols-2 gap-4 mt-4">
        {capabilities.map((cap) => (
          <Card key={cap.title} className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/20 rounded-lg">
                <cap.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{cap.title}</h3>
                <p className="text-sm text-foreground-muted mt-1">{cap.description}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <SectionHeader title="Architecture Overview" />
      <Card className="mt-4 p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 text-center p-4 bg-primary/10 rounded-lg border border-primary/30">
            <div className="text-sm text-foreground-muted mb-1">Control Plane</div>
            <div className="font-semibold text-foreground">Snowflake UI</div>
            <div className="text-xs text-foreground-muted mt-1">Deployment & Monitoring</div>
          </div>
          <div className="text-foreground-muted">→</div>
          <div className="flex-1 text-center p-4 bg-primary/10 rounded-lg border border-primary/30">
            <div className="text-sm text-foreground-muted mb-1">Runtime</div>
            <div className="font-semibold text-foreground">SPCS Container</div>
            <div className="text-xs text-foreground-muted mt-1">NiFi Engine</div>
          </div>
          <div className="text-foreground-muted">→</div>
          <div className="flex-1 text-center p-4 bg-primary/10 rounded-lg border border-primary/30">
            <div className="text-sm text-foreground-muted mb-1">Connectors</div>
            <div className="font-semibold text-foreground">Pre-Built Flows</div>
            <div className="text-xs text-foreground-muted mt-1">CDC, Batch, Streaming</div>
          </div>
          <div className="text-foreground-muted">→</div>
          <div className="flex-1 text-center p-4 bg-success/10 rounded-lg border border-success/30">
            <div className="text-sm text-foreground-muted mb-1">Destination</div>
            <div className="font-semibold text-success">Snowflake</div>
            <div className="text-xs text-foreground-muted mt-1">Tables & Streams</div>
          </div>
        </div>
      </Card>

      <SectionHeader title="Supported Data Sources" />
      <div className="grid grid-cols-5 gap-4 mt-4">
        {connectorCategories.map((cat) => (
          <Card key={cat.category} className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <cat.icon className={`w-4 h-4 ${cat.color}`} />
              <h3 className="font-semibold text-foreground text-sm">{cat.category}</h3>
            </div>
            <ul className="space-y-1">
              {cat.items.map((item) => (
                <li key={item} className="text-sm text-foreground-muted">• {item}</li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      <SectionHeader title="How CDC Works" />
      <Card className="mt-4 p-6">
        <div className="space-y-4">
          <p className="text-foreground-muted">
            For database sources like SQL Server, Openflow uses <strong className="text-foreground">Change Data Capture</strong> to 
            efficiently replicate data changes without full table scans:
          </p>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-background-secondary rounded-lg">
              <div className="text-primary font-semibold mb-2">1. Snapshot Load</div>
              <p className="text-sm text-foreground-muted">
                Initial full table extraction with chunked reads for large tables.
              </p>
            </div>
            <div className="p-4 bg-background-secondary rounded-lg">
              <div className="text-primary font-semibold mb-2">2. Incremental Load</div>
              <p className="text-sm text-foreground-muted">
                Continuous polling for INSERTs, UPDATEs, and DELETEs via change tracking.
              </p>
            </div>
            <div className="p-4 bg-background-secondary rounded-lg">
              <div className="text-primary font-semibold mb-2">3. Stream Management</div>
              <p className="text-sm text-foreground-muted">
                Automatic staleness prevention keeps Snowflake streams active.
              </p>
            </div>
          </div>
        </div>
      </Card>

      <SectionHeader title="Resources" />
      <div className="grid grid-cols-3 gap-4 mt-4">
        {resources.map((resource) => (
          <a
            key={resource.title}
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <Card className="p-4 hover:border-primary/50 transition-colors cursor-pointer h-full">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">{resource.title}</h3>
                  <p className="text-sm text-foreground-muted mt-1">{resource.description}</p>
                </div>
                <ExternalLink className="w-4 h-4 text-foreground-muted flex-shrink-0" />
              </div>
            </Card>
          </a>
        ))}
      </div>
    </div>
  );
}
