import React, { useState, useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { TrendingUp, ArrowUpRight, ArrowDownRight, Layers, BarChart2, Calendar } from 'lucide-react';
import { useERP } from '../context/ERPContext';
import { useTheme } from '../context/ThemeContext';

export const SalesChart = () => {
  const { sales = [], purchases = [] } = useERP();
  const { theme } = useTheme();
  const [timeframe, setTimeframe] = useState('7D'); // '7D' | '30D' | '6M' | '1Y'
  const [chartType, setChartType] = useState('area'); // 'area' | 'bar'

  // Build timeline data based on selected timeframe
  const chartData = useMemo(() => {
    const today = new Date();
    const todayStr = today.toLocaleDateString('en-GB');

    if (timeframe === '7D') {
      // Last 7 days sequence
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
        const dateNum = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
        const rawIso = d.toISOString().split('T')[0];
        const ddmmyyyy = d.toLocaleDateString('en-GB');

        days.push({
          date: `${dayName} (${dateNum})`,
          shortDate: dateNum,
          rawIso,
          ddmmyyyy,
          sales: 0,
          purchases: 0,
          net: 0
        });
      }

      sales.forEach(s => {
        const amt = Number(s.amount ?? s.grandTotal ?? s.grandtotal ?? s.total ?? 0);
        if (amt <= 0) return;
        const sDateStr = String(s.date || s.createdAt || '');
        const matched = days.find(d =>
          sDateStr.includes(d.rawIso) ||
          sDateStr.includes(d.ddmmyyyy) ||
          (sDateStr === 'Today' && d.ddmmyyyy === todayStr)
        );
        if (matched) {
          matched.sales += amt;
        } else {
          days[days.length - 1].sales += amt;
        }
      });

      purchases.forEach(p => {
        const amt = Number(p.amount ?? p.grandTotal ?? p.grandtotal ?? p.total ?? 0);
        if (amt <= 0) return;
        const pDateStr = String(p.date || p.createdAt || '');
        const matched = days.find(d =>
          pDateStr.includes(d.rawIso) ||
          pDateStr.includes(d.ddmmyyyy) ||
          (pDateStr === 'Today' && d.ddmmyyyy === todayStr)
        );
        if (matched) {
          matched.purchases += amt;
        } else {
          days[days.length - 1].purchases += amt;
        }
      });

      days.forEach(d => {
        d.net = d.sales - d.purchases;
      });

      return days;
    } else if (timeframe === '30D') {
      // 4 Weekly intervals over the last 30 days
      const weeks = [];
      for (let i = 3; i >= 0; i--) {
        const endDay = new Date();
        endDay.setDate(today.getDate() - (i * 7));
        const startDay = new Date();
        startDay.setDate(today.getDate() - ((i + 1) * 7) + 1);

        const label = `W${4 - i} (${startDay.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })})`;
        weeks.push({
          date: label,
          shortDate: `W${4 - i}`,
          startDate: startDay,
          endDate: endDay,
          sales: 0,
          purchases: 0,
          net: 0
        });
      }

      sales.forEach(s => {
        const amt = Number(s.amount ?? s.grandTotal ?? s.grandtotal ?? s.total ?? 0);
        if (amt <= 0) return;
        const sDate = s.createdAt ? new Date(s.createdAt) : new Date();
        const matched = weeks.find(w => sDate >= w.startDate && sDate <= w.endDate);
        if (matched) matched.sales += amt;
        else weeks[weeks.length - 1].sales += amt;
      });

      purchases.forEach(p => {
        const amt = Number(p.amount ?? p.grandTotal ?? p.grandtotal ?? p.total ?? 0);
        if (amt <= 0) return;
        const pDate = p.createdAt ? new Date(p.createdAt) : new Date();
        const matched = weeks.find(w => pDate >= w.startDate && pDate <= w.endDate);
        if (matched) matched.purchases += amt;
        else weeks[weeks.length - 1].purchases += amt;
      });

      weeks.forEach(w => {
        w.net = w.sales - w.purchases;
      });

      return weeks;
    } else if (timeframe === '6M') {
      // Last 6 Months sequence
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthName = d.toLocaleDateString('en-US', { month: 'short' });
        const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

        months.push({
          date: `${monthName} ${d.getFullYear()}`,
          shortDate: monthName,
          yearMonth,
          sales: 0,
          purchases: 0,
          net: 0
        });
      }

      sales.forEach(s => {
        const amt = Number(s.amount ?? s.grandTotal ?? s.grandtotal ?? s.total ?? 0);
        if (amt <= 0) return;
        const sDateStr = String(s.date || s.createdAt || '');
        const matched = months.find(m => sDateStr.includes(m.yearMonth) || sDateStr.includes(m.shortDate));
        if (matched) matched.sales += amt;
        else months[months.length - 1].sales += amt;
      });

      purchases.forEach(p => {
        const amt = Number(p.amount ?? p.grandTotal ?? p.grandtotal ?? p.total ?? 0);
        if (amt <= 0) return;
        const pDateStr = String(p.date || p.createdAt || '');
        const matched = months.find(m => pDateStr.includes(m.yearMonth) || pDateStr.includes(m.shortDate));
        if (matched) matched.purchases += amt;
        else months[months.length - 1].purchases += amt;
      });

      months.forEach(m => {
        m.net = m.sales - m.purchases;
      });

      return months;
    } else {
      // 1Y - 12 Months
      const months = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthName = d.toLocaleDateString('en-US', { month: 'short' });
        const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

        months.push({
          date: `${monthName} ${d.getFullYear()}`,
          shortDate: monthName,
          yearMonth,
          sales: 0,
          purchases: 0,
          net: 0
        });
      }

      sales.forEach(s => {
        const amt = Number(s.amount ?? s.grandTotal ?? s.grandtotal ?? s.total ?? 0);
        if (amt <= 0) return;
        const sDateStr = String(s.date || s.createdAt || '');
        const matched = months.find(m => sDateStr.includes(m.yearMonth) || sDateStr.includes(m.shortDate));
        if (matched) matched.sales += amt;
        else months[months.length - 1].sales += amt;
      });

      purchases.forEach(p => {
        const amt = Number(p.amount ?? p.grandTotal ?? p.grandtotal ?? p.total ?? 0);
        if (amt <= 0) return;
        const pDateStr = String(p.date || p.createdAt || '');
        const matched = months.find(m => pDateStr.includes(m.yearMonth) || pDateStr.includes(m.shortDate));
        if (matched) matched.purchases += amt;
        else months[months.length - 1].purchases += amt;
      });

      months.forEach(m => {
        m.net = m.sales - m.purchases;
      });

      return months;
    }
  }, [sales, purchases, timeframe]);

  const totalPeriodSales = useMemo(() => chartData.reduce((sum, d) => sum + d.sales, 0), [chartData]);
  const totalPeriodPurchases = useMemo(() => chartData.reduce((sum, d) => sum + d.purchases, 0), [chartData]);
  const totalNetFlow = totalPeriodSales - totalPeriodPurchases;

  const isDark = theme === 'dark';

  // Custom High-End Tooltip Component
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;

    const sVal = payload.find(p => p.dataKey === 'sales')?.value || 0;
    const pVal = payload.find(p => p.dataKey === 'purchases')?.value || 0;
    const netVal = sVal - pVal;

    return (
      <div className={`p-4 rounded-2xl shadow-2xl border backdrop-blur-md transition-all ${
        isDark ? 'bg-slate-900/95 border-slate-700 text-white' : 'bg-white/95 border-slate-200 text-slate-900'
      }`}>
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5 pb-1.5 border-b border-slate-200/50 dark:border-slate-800">
          {label}
        </div>
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between gap-6">
            <span className="flex items-center gap-1.5 font-medium text-slate-500 dark:text-slate-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20"></span>
              Sales Revenue
            </span>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
              Rs. {sVal.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center justify-between gap-6">
            <span className="flex items-center gap-1.5 font-medium text-slate-500 dark:text-slate-400">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-blue-500/20"></span>
              Stock Purchases
            </span>
            <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
              Rs. {pVal.toLocaleString()}
            </span>
          </div>

          <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-6 font-bold">
            <span className="text-slate-600 dark:text-slate-300">
              Net Inflow
            </span>
            <span className={`font-mono ${netVal >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {netVal >= 0 ? '+' : ''}Rs. {netVal.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`border rounded-3xl p-6 card-shadow transition-all flex-1 flex flex-col justify-between relative overflow-hidden ${
      isDark ? 'bg-slate-800/90 border-slate-700/80 text-white' : 'bg-white border-slate-200/90 text-slate-800'
    }`}>
      {/* Decorative top accent glow */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-600 opacity-80" />

      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
                Revenue & Purchase Analytics
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Live commercial inflow vs stock procurement
              </p>
            </div>
          </div>
        </div>

        {/* Controls Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Chart View Toggle (Area / Bar) */}
          <div className={`flex items-center p-1 rounded-xl border ${
            isDark ? 'bg-slate-900 border-slate-700' : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              onClick={() => setChartType('area')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                chartType === 'area'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Smooth Area Spline"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Spline</span>
            </button>
            <button
              onClick={() => setChartType('bar')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                chartType === 'bar'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Bar Chart View"
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Bars</span>
            </button>
          </div>

          {/* Timeframe Segmented Pills */}
          <div className={`flex items-center p-1 rounded-xl border ${
            isDark ? 'bg-slate-900 border-slate-700' : 'bg-slate-100 border-slate-200'
          }`}>
            {[
              { id: '7D', label: '7D' },
              { id: '30D', label: '30D' },
              { id: '6M', label: '6M' },
              { id: '1Y', label: '1Y' }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTimeframe(t.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  timeframe === t.id
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <div className={`p-3 rounded-2xl border transition-all ${
          isDark ? 'bg-slate-900/60 border-slate-700/60' : 'bg-emerald-50/50 border-emerald-100'
        }`}>
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Total Sales
          </div>
          <div className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
            Rs. {totalPeriodSales.toLocaleString()}
          </div>
        </div>

        <div className={`p-3 rounded-2xl border transition-all ${
          isDark ? 'bg-slate-900/60 border-slate-700/60' : 'bg-blue-50/50 border-blue-100'
        }`}>
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            Total Purchases
          </div>
          <div className="text-lg font-black font-mono text-blue-600 dark:text-blue-400 mt-0.5">
            Rs. {totalPeriodPurchases.toLocaleString()}
          </div>
        </div>

        <div className={`p-3 rounded-2xl border transition-all ${
          isDark ? 'bg-slate-900/60 border-slate-700/60' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            {totalNetFlow >= 0 ? (
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <ArrowDownRight className="w-3.5 h-3.5 text-rose-600" />
            )}
            Net Balance
          </div>
          <div className={`text-lg font-black font-mono mt-0.5 ${
            totalNetFlow >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
          }`}>
            {totalNetFlow >= 0 ? '+' : ''}Rs. {totalNetFlow.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Main Chart Area */}
      <div className="w-full h-72 min-h-[270px]">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'area' ? (
            <AreaChart data={chartData} margin={{ top: 12, right: 12, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="proSalesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="85%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="proPurchasesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                  <stop offset="85%" stopColor="#3b82f6" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="4 4"
                vertical={false}
                stroke={isDark ? '#334155' : '#f1f5f9'}
                strokeOpacity={0.8}
              />
              <XAxis
                dataKey="shortDate"
                tickLine={false}
                axisLine={{ stroke: isDark ? '#334155' : '#e2e8f0' }}
                tick={{ fontSize: 11, fontWeight: 600, fill: isDark ? '#94a3b8' : '#64748b' }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fontWeight: 600, fill: isDark ? '#94a3b8' : '#64748b' }}
                tickFormatter={(val) => {
                  if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
                  if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
                  return val;
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="natural"
                dataKey="sales"
                name="Sales"
                stroke="#10b981"
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 2, fill: '#10b981', stroke: '#ffffff' }}
                activeDot={{ r: 7, strokeWidth: 2, fill: '#10b981', stroke: '#ffffff', filter: 'drop-shadow(0 4px 6px rgba(16, 185, 129, 0.4))' }}
                fillOpacity={1}
                fill="url(#proSalesGradient)"
              />
              <Area
                type="natural"
                dataKey="purchases"
                name="Purchases"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 2, fill: '#3b82f6', stroke: '#ffffff' }}
                activeDot={{ r: 7, strokeWidth: 2, fill: '#3b82f6', stroke: '#ffffff', filter: 'drop-shadow(0 4px 6px rgba(59, 130, 246, 0.4))' }}
                fillOpacity={1}
                fill="url(#proPurchasesGradient)"
              />
            </AreaChart>
          ) : (
            <BarChart data={chartData} margin={{ top: 12, right: 12, left: -18, bottom: 0 }} barGap={6}>
              <CartesianGrid
                strokeDasharray="4 4"
                vertical={false}
                stroke={isDark ? '#334155' : '#f1f5f9'}
                strokeOpacity={0.8}
              />
              <XAxis
                dataKey="shortDate"
                tickLine={false}
                axisLine={{ stroke: isDark ? '#334155' : '#e2e8f0' }}
                tick={{ fontSize: 11, fontWeight: 600, fill: isDark ? '#94a3b8' : '#64748b' }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fontWeight: 600, fill: isDark ? '#94a3b8' : '#64748b' }}
                tickFormatter={(val) => {
                  if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
                  if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
                  return val;
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="sales"
                name="Sales"
                fill="#10b981"
                radius={[6, 6, 0, 0]}
              />
              <Bar
                dataKey="purchases"
                name="Purchases"
                fill="#3b82f6"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};
