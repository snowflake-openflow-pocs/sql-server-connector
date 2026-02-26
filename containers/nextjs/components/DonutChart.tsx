'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface DonutChartProps {
  data: Array<{ name: string; value: number }>;
  colors?: string[];
  title?: string;
  height?: number;
}

const DEFAULT_COLORS = ['#00D26A', '#FFC107', '#FF4B4B', '#29B5E8', '#A78BFA'];

export function DonutChart({ data, colors = DEFAULT_COLORS, title, height = 300 }: DonutChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div style={{ height }}>
      {title && <div className="text-sm font-medium text-foreground-muted mb-2 text-center">{title}</div>}
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
            label={({ name, value }) => `${name}: ${value}`}
            labelLine={false}
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number, name: string) => [
              `${value} (${total > 0 ? ((value / total) * 100).toFixed(1) : 0}%)`,
              name,
            ]}
            contentStyle={{ backgroundColor: '#1A1D24', border: '1px solid #262730', borderRadius: '8px' }}
            labelStyle={{ color: '#FAFAFA' }}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value) => <span className="text-foreground-muted text-sm">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
