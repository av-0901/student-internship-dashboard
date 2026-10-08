import type { ReactNode } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardHeader } from '../components/ui';
import { EmptyState } from '../components/States';
import type { NameValue } from '../types';
import { CHART_COLORS, colorFor, fmtNumber, truncate } from '../utils/format';

const axisTick = { fontSize: 11, fill: '#64748b' };
const tooltipStyle = {
  contentStyle: { borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, boxShadow: '0 4px 12px rgb(15 23 42 / 0.08)' },
  cursor: { fill: 'rgba(37, 84, 224, 0.06)' },
};

export function ChartCard({
  title,
  subtitle,
  children,
  height = 300,
  empty,
  actions,
  className = '',
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  height?: number;
  empty?: boolean;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader title={title} subtitle={subtitle} actions={actions} />
      <div className="px-3 pb-3 pt-4" style={{ height }}>
        {empty ? <EmptyState title="No data" message="No records match the current filters." /> : children}
      </div>
    </Card>
  );
}

type ValueFormatter = (v: number) => string;

export function HBarChart({
  data,
  color = CHART_COLORS[0],
  onClick,
  format = (v) => fmtNumber(v),
  label = 'Records',
  labelWidth = 150,
  colorByName = false,
}: {
  data: NameValue[];
  color?: string;
  onClick?: (name: string) => void;
  format?: ValueFormatter;
  label?: string;
  labelWidth?: number;
  colorByName?: boolean;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ left: 4, right: 24, top: 0, bottom: 0 }}>
        <CartesianGrid horizontal={false} stroke="#f1f5f9" />
        <XAxis type="number" tick={axisTick} tickFormatter={(v) => format(v)} axisLine={false} tickLine={false} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="name"
          width={labelWidth}
          tick={axisTick}
          tickFormatter={(v: string) => truncate(v, Math.floor(labelWidth / 6.5))}
          axisLine={false}
          tickLine={false}
          interval={0}
        />
        <Tooltip {...tooltipStyle} formatter={(v: number) => [format(v), label]} />
        <Bar
          dataKey="value"
          radius={[0, 4, 4, 0]}
          maxBarSize={22}
          fill={color}
          onClick={onClick ? (d: { name?: string }) => d.name && onClick(d.name) : undefined}
          className={onClick ? 'cursor-pointer' : ''}
        >
          {colorByName && data.map((d, i) => <Cell key={d.name} fill={colorFor(d.name, i)} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function VBarChart({
  data,
  color = CHART_COLORS[0],
  format = (v) => fmtNumber(v),
  label = 'Records',
  onClick,
  colorByName = false,
}: {
  data: NameValue[];
  color?: string;
  format?: ValueFormatter;
  label?: string;
  onClick?: (name: string) => void;
  colorByName?: boolean;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} interval={0} angle={data.length > 8 ? -35 : 0} textAnchor={data.length > 8 ? 'end' : 'middle'} height={data.length > 8 ? 56 : 30} />
        <YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={(v) => format(v)} width={56} allowDecimals={false} />
        <Tooltip {...tooltipStyle} formatter={(v: number) => [format(v), label]} />
        <Bar
          dataKey="value"
          fill={color}
          radius={[4, 4, 0, 0]}
          maxBarSize={44}
          onClick={onClick ? (d: { name?: string }) => d.name && onClick(d.name) : undefined}
          className={onClick ? 'cursor-pointer' : ''}
        >
          {colorByName && data.map((d, i) => <Cell key={d.name} fill={colorFor(d.name, i)} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DonutChart({
  data,
  onClick,
  centerLabel,
}: {
  data: NameValue[];
  onClick?: (name: string) => void;
  centerLabel?: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="flex h-full flex-col">
      <div className="relative min-h-[130px] flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="58%"
              outerRadius="85%"
              paddingAngle={1.5}
              stroke="none"
              onClick={onClick ? (d: { name?: string }) => d.name && onClick(d.name) : undefined}
              className={onClick ? 'cursor-pointer' : ''}
            >
              {data.map((d, i) => (
                <Cell key={d.name} fill={colorFor(d.name, i)} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle.contentStyle} formatter={(v: number, n: string) => [`${fmtNumber(v)} (${Math.round((v / total) * 100)}%)`, n]} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-semibold tabular-nums text-slate-900">{fmtNumber(total)}</span>
          <span className="text-[11px] uppercase tracking-wide text-slate-500">{centerLabel ?? 'Total'}</span>
        </div>
      </div>
      <ul className="mt-2 grid grid-cols-1 gap-y-1 px-2 text-xs">
        {data.map((d, i) => (
          <li key={d.name}>
            <button
              type="button"
              onClick={onClick ? () => onClick(d.name) : undefined}
              className={`flex w-full items-center gap-2 rounded px-1 py-0.5 text-left ${onClick ? 'hover:bg-slate-50' : 'cursor-default'}`}
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: colorFor(d.name, i) }} />
              <span className="min-w-0 flex-1 truncate text-slate-600" title={d.name}>
                {d.name}
              </span>
              <span className="tabular-nums font-medium text-slate-800">{d.value}</span>
              <span className="w-9 text-right tabular-nums text-slate-400">{total ? Math.round((d.value / total) * 100) : 0}%</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TimelineChart({
  data,
  color = CHART_COLORS[0],
  label = 'Joinings',
  format = (v) => fmtNumber(v),
}: {
  data: NameValue[];
  color?: string;
  label?: string;
  format?: ValueFormatter;
}) {
  const id = `grad-${color.replace('#', '')}`;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ left: 0, right: 12, top: 8, bottom: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={16} />
        <YAxis tick={axisTick} axisLine={false} tickLine={false} width={48} allowDecimals={false} tickFormatter={(v) => format(v)} />
        <Tooltip contentStyle={tooltipStyle.contentStyle} formatter={(v: number) => [format(v), label]} />
        <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#${id})`} dot={{ r: 2.5, fill: color }} activeDot={{ r: 4 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function StackedBarChart({
  data,
  keys,
  colors,
  layout = 'horizontal',
  categoryKey = 'name',
}: {
  data: Record<string, string | number | boolean | null>[];
  keys: string[];
  colors?: string[];
  layout?: 'horizontal' | 'vertical';
  categoryKey?: string;
}) {
  const vertical = layout === 'vertical';
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout={vertical ? 'vertical' : 'horizontal'} margin={{ left: 4, right: 16, top: 4, bottom: 0 }}>
        <CartesianGrid stroke="#f1f5f9" horizontal={!vertical} vertical={vertical} />
        {vertical ? (
          <>
            <XAxis type="number" tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} />
            <YAxis type="category" dataKey={categoryKey} tick={axisTick} width={140} axisLine={false} tickLine={false} interval={0} tickFormatter={(v: string) => truncate(v, 22)} />
          </>
        ) : (
          <>
            <XAxis dataKey={categoryKey} tick={axisTick} axisLine={false} tickLine={false} interval={0} />
            <YAxis tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} width={40} />
          </>
        )}
        <Tooltip {...tooltipStyle} />
        <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 11 }} />
        {keys.map((k, i) => (
          <Bar key={k} dataKey={k} stackId="a" fill={colors?.[i] ?? colorFor(k, i)} maxBarSize={26} radius={i === keys.length - 1 ? (vertical ? [0, 4, 4, 0] : [4, 4, 0, 0]) : 0} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
