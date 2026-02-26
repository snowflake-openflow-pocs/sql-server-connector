'use client';

import { useState } from 'react';
import { Check, Copy, Download } from 'lucide-react';

interface CodeBlockProps {
  code: string;
  language?: string;
  downloadName?: string;
}

export function CodeBlock({ code, language = 'sql', downloadName }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadFile = () => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = downloadName || `code.${language}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative group">
      <pre className="bg-background-tertiary rounded-lg p-4 overflow-x-auto text-sm text-foreground font-mono">
        <code>{code}</code>
      </pre>
      <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={copyToClipboard}
          className="p-2 bg-background-secondary rounded hover:bg-background-tertiary transition-colors"
          title="Copy to clipboard"
        >
          {copied ? <Check size={16} className="text-success" /> : <Copy size={16} className="text-foreground-muted" />}
        </button>
        {downloadName && (
          <button
            onClick={downloadFile}
            className="p-2 bg-background-secondary rounded hover:bg-background-tertiary transition-colors"
            title={`Download ${downloadName}`}
          >
            <Download size={16} className="text-foreground-muted" />
          </button>
        )}
      </div>
    </div>
  );
}
