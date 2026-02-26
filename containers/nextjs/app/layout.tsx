import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import { Providers } from './providers';
import { Home, Settings, Play, Camera, RefreshCw, Cpu, Shield, FileText, Workflow, Monitor, Network } from 'lucide-react';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SQL Server CDC Dashboard',
  description: 'Change Data Capture with Snowflake Openflow',
};

const navSections = [
  {
    items: [
      { href: '/', label: 'Home', icon: Home },
    ],
  },
  {
    title: 'Workflows',
    icon: Workflow,
    items: [
      { href: '/demo', label: 'Demo', icon: Monitor },
      { href: '/setup', label: 'Setup', icon: Settings },
      { href: '/simulator', label: 'Simulator', icon: Play },
    ],
  },
  {
    title: 'Documents',
    icon: FileText,
    items: [
      { href: '/network', label: 'Network', icon: Network },
      { href: '/snapshot', label: 'Snapshot Load', icon: Camera },
      { href: '/incremental', label: 'Incremental Load', icon: RefreshCw },
      { href: '/staleness', label: 'Staleness Prevention', icon: Shield },
      { href: '/technical', label: 'Technical', icon: Cpu },
    ],
  },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <div className="flex min-h-screen">
            <aside className="w-64 bg-background-secondary border-r border-background-tertiary p-4 flex flex-col">
              <div className="mb-6">
                <h1 className="text-lg font-bold text-primary">SQL Server CDC</h1>
                <p className="text-xs text-foreground-muted">Openflow Demo</p>
              </div>
              <nav className="flex-1 space-y-6">
                {navSections.map((section, sIdx) => (
                  <div key={sIdx}>
                    {section.title && (
                      <div className="flex items-center gap-2 px-3 mb-2">
                        {section.icon && <section.icon size={14} className="text-primary" />}
                        <span className="text-xs font-semibold text-primary uppercase tracking-wide">
                          {section.title}
                        </span>
                      </div>
                    )}
                    <div className="space-y-1">
                      {section.items.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg text-foreground-muted hover:text-foreground hover:bg-background-tertiary transition-colors"
                        >
                          <item.icon size={18} />
                          <span className="text-sm">{item.label}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </nav>
              <div className="border-t border-background-tertiary pt-4 mt-4">
                <p className="text-xs text-foreground-muted text-center">
                  SQL Server Openflow POC
                </p>
              </div>
            </aside>
            <main className="flex-1 p-8 overflow-auto">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
