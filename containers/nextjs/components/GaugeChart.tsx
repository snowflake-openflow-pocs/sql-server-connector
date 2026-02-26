'use client';

import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from 'recharts';

interface GaugeChartProps {
  value: number;
  maxValue?: number;
  title?: string;
  suffix?: string;
  height?: number;
}

export function GaugeChart({ value, maxValue = 100, title, suffix = '%', height = 250 }: GaugeChartProps) {
  const percentage = (value / maxValue) * 100;
  const color = percentage >= 80 ? '#00D26A' : percentage >= 50 ? '#FFC107' : '#FF4B4B';
  
  const data = [{ name: 'value', value: percentage, fill: color }];

  return (
    <div style={{ height }} className="relative">
      {title && <div className="text-sm font-medium text-foreground-muted mb-2 text-center">{title}</div>}
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          cx="50%"
          cy="50%"
          innerRadius="60%"
          outerRadius="90%"
          barSize={12}
          data={data}
          startAngle={180}
          endAngle={0}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
          <RadialBar
            background={{ fill: '#262730' }}
            dataKey="value"
            cornerRadius={6}
            angleAxisId={0}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ marginTop: '20px' }}>
        <span className="text-3xl font-bold text-foreground">{value}{suffix}</span>
      </div>
    </div>
  );
}
