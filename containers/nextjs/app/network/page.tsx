'use client';

import { PageHeader, SectionHeader } from '@/components';
import { Card } from '@/components/ui/card';
import { Network, Shield, Lock, Server, ArrowRight, ExternalLink, CheckCircle, AlertTriangle } from 'lucide-react';

const tcpRequirements = [
  { port: '1433', protocol: 'TCP', service: 'TDS (Tabular Data Stream)', description: 'Primary SQL Server communication protocol' },
  { port: '1434', protocol: 'UDP', service: 'SQL Server Browser', description: 'Named instance discovery (optional)' },
  { port: '443', protocol: 'TCP', service: 'HTTPS', description: 'Snowflake API endpoints' },
];

const encryptionOptions = [
  {
    mode: 'Encrypt=false',
    tds: 'TDS 7.x',
    security: 'None',
    useCase: 'Development/Testing only',
    risk: true,
  },
  {
    mode: 'Encrypt=true',
    tds: 'TDS 7.x',
    security: 'TLS 1.2+',
    useCase: 'Standard production',
    risk: false,
  },
  {
    mode: 'Encrypt=strict',
    tds: 'TDS 8.0',
    security: 'TLS 1.3',
    useCase: 'High-security environments',
    risk: false,
  },
];

const networkRuleExamples = [
  {
    name: 'SQL Server Database',
    rule: "VALUE_LIST = ('your-sqlserver-host.com:1433')",
  },
  {
    name: 'Multiple Databases',
    rule: "VALUE_LIST = ('db1.example.com:1433', 'db2.example.com:1433')",
  },
];

export default function NetworkPage() {
  return (
    <div>
      <PageHeader
        title="Network Configuration"
        subtitle="TCP/IP requirements for SQL Server 2022 and Snowflake Openflow connectivity"
      />

      <SectionHeader title="SQL Server 2022 Protocol Stack" />
      <Card className="mt-4 p-6">
        <p className="text-foreground-muted mb-4">
          SQL Server 2022 uses the <strong className="text-foreground">Tabular Data Stream (TDS)</strong> protocol 
          for all client-server communication. TDS operates over TCP/IP and supports multiple encryption modes.
        </p>
        <div className="flex items-center justify-between gap-4 mt-6">
          <div className="flex-1 text-center p-4 bg-background-secondary rounded-lg">
            <Server className="w-6 h-6 text-primary mx-auto mb-2" />
            <div className="font-semibold text-foreground">SQL Server</div>
            <div className="text-xs text-foreground-muted mt-1">Port 1433</div>
          </div>
          <div className="flex flex-col items-center gap-1 text-foreground-muted">
            <div className="text-xs">TDS Protocol</div>
            <ArrowRight className="w-8 h-8" />
            <div className="text-xs">TCP/IP</div>
          </div>
          <div className="flex-1 text-center p-4 bg-background-secondary rounded-lg">
            <Network className="w-6 h-6 text-primary mx-auto mb-2" />
            <div className="font-semibold text-foreground">Openflow Runtime</div>
            <div className="text-xs text-foreground-muted mt-1">SPCS Container</div>
          </div>
          <div className="flex flex-col items-center gap-1 text-foreground-muted">
            <div className="text-xs">HTTPS</div>
            <ArrowRight className="w-8 h-8" />
            <div className="text-xs">Port 443</div>
          </div>
          <div className="flex-1 text-center p-4 bg-background-secondary rounded-lg">
            <Lock className="w-6 h-6 text-primary mx-auto mb-2" />
            <div className="font-semibold text-foreground">Snowflake</div>
            <div className="text-xs text-foreground-muted mt-1">Destination</div>
          </div>
        </div>
      </Card>

      <SectionHeader title="TCP Port Requirements" />
      <Card className="mt-4 p-6">
        <table className="w-full">
          <thead>
            <tr className="border-b border-background-tertiary">
              <th className="text-left py-3 text-sm font-semibold text-foreground">Port</th>
              <th className="text-left py-3 text-sm font-semibold text-foreground">Protocol</th>
              <th className="text-left py-3 text-sm font-semibold text-foreground">Service</th>
              <th className="text-left py-3 text-sm font-semibold text-foreground">Description</th>
            </tr>
          </thead>
          <tbody>
            {tcpRequirements.map((req) => (
              <tr key={req.port} className="border-b border-background-tertiary/50">
                <td className="py-3 font-mono text-primary">{req.port}</td>
                <td className="py-3 text-foreground-muted">{req.protocol}</td>
                <td className="py-3 text-foreground">{req.service}</td>
                <td className="py-3 text-sm text-foreground-muted">{req.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <SectionHeader title="TDS Encryption Modes" />
      <p className="text-foreground-muted mt-2 mb-4">
        SQL Server 2022 introduces TDS 8.0 with strict encryption support. Choose the appropriate mode based on your security requirements.
      </p>
      <div className="grid grid-cols-3 gap-4">
        {encryptionOptions.map((opt) => (
          <Card key={opt.mode} className={`p-4 ${opt.risk ? 'border-warning/50' : 'border-success/30'}`}>
            <div className="flex items-center gap-2 mb-3">
              {opt.risk ? (
                <AlertTriangle className="w-5 h-5 text-warning" />
              ) : (
                <CheckCircle className="w-5 h-5 text-success" />
              )}
              <h3 className="font-semibold text-foreground font-mono text-sm">{opt.mode}</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-foreground-muted">Protocol:</span>
                <span className="text-foreground">{opt.tds}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground-muted">Security:</span>
                <span className="text-foreground">{opt.security}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground-muted">Use Case:</span>
                <span className="text-foreground">{opt.useCase}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <SectionHeader title="Snowflake Network Configuration" />
      <Card className="mt-4 p-6">
        <p className="text-foreground-muted mb-4">
          For SPCS (Snowpark Container Services) deployments, Openflow requires <strong className="text-foreground">External Access Integration (EAI)</strong> to 
          reach external data sources like SQL Server.
        </p>
        <div className="space-y-4">
          <div className="p-4 bg-background-secondary rounded-lg">
            <h4 className="font-semibold text-foreground mb-2">1. Create Network Rule</h4>
            <p className="text-sm text-foreground-muted mb-3">
              Network Rules define which external hosts and ports the runtime can access.
            </p>
            <pre className="bg-background p-3 rounded text-sm overflow-x-auto">
              <code className="text-foreground-muted">{`CREATE NETWORK RULE sqlserver_openflow_rule
  TYPE = HOST_PORT
  MODE = EGRESS
  VALUE_LIST = ('<your-host>:1433');`}</code>
            </pre>
          </div>

          <div className="p-4 bg-background-secondary rounded-lg">
            <h4 className="font-semibold text-foreground mb-2">2. Create External Access Integration</h4>
            <p className="text-sm text-foreground-muted mb-3">
              EAIs bundle network rules and enable connectivity from SPCS containers.
            </p>
            <pre className="bg-background p-3 rounded text-sm overflow-x-auto">
              <code className="text-foreground-muted">{`CREATE EXTERNAL ACCESS INTEGRATION sqlserver_openflow_eai
  ALLOWED_NETWORK_RULES = (sqlserver_openflow_rule)
  ENABLED = TRUE;`}</code>
            </pre>
          </div>

          <div className="p-4 bg-background-secondary rounded-lg">
            <h4 className="font-semibold text-foreground mb-2">3. Grant to Runtime Role</h4>
            <p className="text-sm text-foreground-muted mb-3">
              The runtime role needs USAGE permission on the integration.
            </p>
            <pre className="bg-background p-3 rounded text-sm overflow-x-auto">
              <code className="text-foreground-muted">{`GRANT USAGE ON INTEGRATION sqlserver_openflow_eai
  TO ROLE <runtime_role>;`}</code>
            </pre>
          </div>

          <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg">
            <h4 className="font-semibold text-foreground mb-2">4. Attach via UI</h4>
            <p className="text-sm text-foreground-muted">
              Navigate to <strong>Openflow Control Plane → Runtime → ... menu → External access integrations</strong> to attach the EAI to your runtime.
            </p>
          </div>
        </div>
      </Card>

      <SectionHeader title="Connection String Reference" />
      <Card className="mt-4 p-6">
        <p className="text-foreground-muted mb-4">
          The JDBC connection string format for SQL Server 2022 with Openflow:
        </p>
        <pre className="bg-background-secondary p-4 rounded text-sm overflow-x-auto mb-4">
          <code className="text-foreground">{`jdbc:sqlserver://<host>:1433;databaseName=<database>;encrypt=false`}</code>
        </pre>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="font-semibold text-foreground mb-2">Common Parameters</h4>
            <ul className="space-y-1 text-sm text-foreground-muted">
              <li>• <code className="text-primary">encrypt</code> - Enable TLS encryption</li>
              <li>• <code className="text-primary">trustServerCertificate</code> - Skip cert validation</li>
              <li>• <code className="text-primary">loginTimeout</code> - Connection timeout (seconds)</li>
              <li>• <code className="text-primary">applicationIntent</code> - ReadOnly for AG replicas</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-2">Security Recommendations</h4>
            <ul className="space-y-1 text-sm text-foreground-muted">
              <li>• Use <code className="text-primary">encrypt=true</code> in production</li>
              <li>• Avoid <code className="text-primary">trustServerCertificate=true</code></li>
              <li>• Consider TDS 8.0 strict mode for sensitive data</li>
              <li>• Use dedicated service accounts, not SA</li>
            </ul>
          </div>
        </div>
      </Card>

      <SectionHeader title="Troubleshooting" />
      <div className="grid grid-cols-2 gap-4 mt-4">
        <Card className="p-4">
          <h4 className="font-semibold text-foreground mb-2">UnknownHostException</h4>
          <p className="text-sm text-foreground-muted mb-2">DNS resolution failed - host not in Network Rule</p>
          <p className="text-xs text-primary">Fix: Add host to Network Rule VALUE_LIST</p>
        </Card>
        <Card className="p-4">
          <h4 className="font-semibold text-foreground mb-2">SocketTimeoutException</h4>
          <p className="text-sm text-foreground-muted mb-2">Port blocked - not in Network Rule or firewall</p>
          <p className="text-xs text-primary">Fix: Ensure port 1433 is in VALUE_LIST</p>
        </Card>
        <Card className="p-4">
          <h4 className="font-semibold text-foreground mb-2">Connection Refused</h4>
          <p className="text-sm text-foreground-muted mb-2">Host reachable but SQL Server not listening</p>
          <p className="text-xs text-primary">Fix: Verify TCP/IP enabled in SQL Config Manager</p>
        </Card>
        <Card className="p-4">
          <h4 className="font-semibold text-foreground mb-2">SSL/TLS Handshake Failed</h4>
          <p className="text-sm text-foreground-muted mb-2">Certificate mismatch or unsupported TLS version</p>
          <p className="text-xs text-primary">Fix: Use encrypt=false or configure valid certificate</p>
        </Card>
      </div>

      <SectionHeader title="Resources" />
      <div className="grid grid-cols-3 gap-4 mt-4">
        <a
          href="https://learn.microsoft.com/en-us/sql/database-engine/configure-windows/server-network-configuration"
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          <Card className="p-4 hover:border-primary/50 transition-colors cursor-pointer h-full">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-foreground">SQL Server Network Config</h3>
                <p className="text-sm text-foreground-muted mt-1">Microsoft documentation</p>
              </div>
              <ExternalLink className="w-4 h-4 text-foreground-muted flex-shrink-0" />
            </div>
          </Card>
        </a>
        <a
          href="https://learn.microsoft.com/en-us/sql/relational-databases/security/networking/tds-8"
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          <Card className="p-4 hover:border-primary/50 transition-colors cursor-pointer h-full">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-foreground">TDS 8.0 Protocol</h3>
                <p className="text-sm text-foreground-muted mt-1">Strict encryption guide</p>
              </div>
              <ExternalLink className="w-4 h-4 text-foreground-muted flex-shrink-0" />
            </div>
          </Card>
        </a>
        <a
          href="https://docs.snowflake.com/en/user-guide/data-load/openflow"
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          <Card className="p-4 hover:border-primary/50 transition-colors cursor-pointer h-full">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-foreground">Openflow EAI Setup</h3>
                <p className="text-sm text-foreground-muted mt-1">Snowflake documentation</p>
              </div>
              <ExternalLink className="w-4 h-4 text-foreground-muted flex-shrink-0" />
            </div>
          </Card>
        </a>
      </div>
    </div>
  );
}
