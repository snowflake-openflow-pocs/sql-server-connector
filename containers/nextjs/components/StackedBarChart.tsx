'use client';

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface StackedBarChartProps {
  data: Array<{ name: string; [key: string]: string | number }>;
  keys: string[];
  colors?: Record<string, string>;
  title?: string;
  height?: number;
  layout?: 'horizontal' | 'vertical';
}

const DEFAULT_COLORS: Record<string, string> = {
  Ready: '#00D26A',
  'Not Ready': '#FF4B4B',
};

export function StackedBarChart({
  data,
  keys,
  colors = DEFAULT_COLORS,
  title,
  height = 300,
  layout = 'horizontal',
}: StackedBarChartProps) {
  return (
    <div style={{ height }}>
      {title && <div className="text-sm font-medium text-foreground-muted mb-2 text-center">{title}</div>}
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout={layout}
          margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
        >
          {layout === 'vertical' ? (
            <>
              <XAxis type="number" stroke="#A0AEC0" fontSize={12} />
              <YAxis type="category" dataKey="name" stroke="#A0AEC0" fontSize={12} width={120} />
            </>
          ) : (
            <>
              <XAxis dataKey="name" stroke="#A0AEC0" fontSize={12} />
              <YAxis stroke="#A0AEC0" fontSize={12} />
            </>
          )}
          <Tooltip
            contentStyle={{ backgroundColor: '#1A1D24', border: '1px solid #262730', borderRadius: '8px' }}
            labelStyle={{ color: '#FAFAFA' }}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value) => <span className="text-foreground-muted text-sm">{value}</span>}
          />
          {keys.map((key) => (
            <Bar key={key} dataKey={key} stackId="a" fill={colors[key] || '#29B5E8'} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
