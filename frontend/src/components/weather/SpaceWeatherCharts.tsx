import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import type { SpaceWeatherStat } from '@/types';

interface SpaceWeatherChartsProps {
  data: SpaceWeatherStat[];
}

export const SpaceWeatherCharts: React.FC<SpaceWeatherChartsProps> = ({ data }) => {
  const chartData = data.map((d) => ({
    ...d,
    displayDate: d.date.length > 5 ? d.date.substring(5) : d.date,
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const c = payload.find((p: any) => p.dataKey === 'c_class')?.value || 0;
      const m = payload.find((p: any) => p.dataKey === 'm_class')?.value || 0;
      const x = payload.find((p: any) => p.dataKey === 'x_class')?.value || 0;
      const cme = payload.find((p: any) => p.dataKey === 'cme_count')?.value || 0;
      const total = c + m + x;

      return (
        <div className="p-3 rounded-xl bg-surface-container/95 border border-primary/40 backdrop-blur-md shadow-2xl text-xs font-data-sm flex flex-col gap-1.5 min-w-[180px]">
          <div className="flex items-center justify-between border-b border-outline-variant/30 pb-1">
            <span className="font-bold text-on-surface">{label}</span>
            <span className="text-primary font-bold">{total} Total Flares</span>
          </div>
          <div className="flex flex-col gap-1 pt-1">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2 h-2 rounded bg-emerald-400" /> C-Class (Minor)
              </span>
              <span className="font-bold text-on-surface">{c}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-amber-400">
                <span className="w-2 h-2 rounded bg-amber-400" /> M-Class (Moderate)
              </span>
              <span className="font-bold text-on-surface">{m}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-rose-500">
                <span className="w-2 h-2 rounded bg-rose-500" /> X-Class (Extreme)
              </span>
              <span className="font-bold text-on-surface">{x}</span>
            </div>
            {cme > 0 && (
              <div className="flex items-center justify-between pt-1 border-t border-outline-variant/20 text-orange-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-orange-400" /> CMEs Detected
                </span>
                <span className="font-bold text-on-surface">{cme}</span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-80 pt-2 select-none">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2c42" vertical={false} />
          <XAxis
            dataKey="displayDate"
            stroke="#859397"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: '#1f2c42' }}
          />
          <YAxis
            stroke="#859397"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: '#1f2c42' }}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="top"
            align="right"
            wrapperStyle={{ paddingBottom: '12px', fontSize: '11px', textTransform: 'uppercase' }}
            formatter={(value) => {
              if (value === 'c_class') return <span className="text-emerald-400 mr-2">C-Class</span>;
              if (value === 'm_class') return <span className="text-amber-400 mr-2">M-Class</span>;
              if (value === 'x_class') return <span className="text-rose-400 mr-2">X-Class</span>;
              if (value === 'cme_count') return <span className="text-orange-400">CME Count</span>;
              return value;
            }}
          />
          <Bar dataKey="c_class" name="c_class" stackId="flares" fill="#34d399" radius={[0, 0, 0, 0]} />
          <Bar dataKey="m_class" name="m_class" stackId="flares" fill="#f59e0b" radius={[0, 0, 0, 0]} />
          <Bar dataKey="x_class" name="x_class" stackId="flares" fill="#ef4444" radius={[3, 3, 0, 0]} />
          <Line
            type="monotone"
            dataKey="cme_count"
            name="cme_count"
            stroke="#f97316"
            strokeWidth={2.5}
            dot={{ r: 4, fill: '#f97316' }}
            activeDot={{ r: 6 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};
