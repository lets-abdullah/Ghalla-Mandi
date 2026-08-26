import React, { useState, useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts';
import { TrendingUp, BarChart3, LineChart, Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useERP } from '../context/ERPContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';

export const SalesChart = () => {
  const { sales = [], purchases = [] } = useERP();
  const { theme } = useTheme();
  const { t } = useLocale();

  const [timeframe, setTimeframe] = useState('7d'); // '7d' | '30d' | '6m'
  const [chartMode, setChartMode] = useState('area'); // 'area' | 'bar'

  // Build timeline data based on selected timeframe
  const chartData = useMemo(() => {
    const today = new Date();
    const todayStr = today.toLocaleDateString('en-GB');

    if (timeframe === '7d') {
      // Last 7 days sequence
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const dayName = d.toLocaleDateString('en-GB', { weekday: 'short' });
        const dateNum = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
        const rawIso = d.toISOString().split('T')[0];
        const ddmmyyyy = d.toLocaleDateString('en-GB');

        days.push({
          date: `${dayName}, ${dateNum}`,
          shortDate: dayName,
          rawIso,
          ddmmyyyy,
          sales: 0,
          purchases: 0
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

      return days;
    } else if (timeframe === '30d') {
      // Group last 30 days in 4-5 weekly intervals or daily
      const days = [];
      for (let i = 29; i >= 0; i -= 5) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const dateNum = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
        const rawIso = d.toISOString().split('T')[0];
        const ddmmyyyy = d.toLocaleDateString('en-GB');

        days.push({
          date: dateNum,
          shortDate: dateNum,
          rawIso,
          ddmmyyyy,
          sales: 0,
          purchases: 0
        });
      }

      sales.forEach(s => {
        const amt = Number(s.amount ?? s.grandTotal ?? s.grandtotal ?? s.total ?? 0);
        if (amt <= 0) return;
        days[days.length - 1].sales += amt;
      });

      purchases.forEach(p => {
        const amt = Number(p.amount ?? p.grandTotal ?? p.grandtotal ?? p.total ?? 0);
        if (amt <= 0) return;
        days[days.length - 1].purchases += amt;
      });

      return days;
    } else {
      // Last 6 Months sequence
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthName = d.toLocaleDateString('en-GB', { month: 'short' });
        const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

        months.push({
          date: monthName,
          shortDate: monthName,
          yearMonth,
          sales: 0,
          purchases: 0
        });
      }

      sales.forEach(s => {
        const amt = Number(s.amount ?? s.grandTotal ?? s.grandtotal ?? s.total ?? 0);
        if (amt <= 0) return;
        const sDateStr = String(s.date || s.createdAt || '');
        const matched = months.find(m => sDateStr.includes(m.yearMonth) || sDateStr.includes(m.date));
        if (matched) {
          matched.sales += amt;
        } else {
          months[months.length - 1].sales += amt;
        }
      });

      purchases.forEach(p => {
        const amt = Number(p.amount ?? p.grandTotal ?? p.grandtotal ?? p.total ?? 0);
        if (amt <= 0) return;
        const pDateStr = String(p.date || p.createdAt || '');
        const matched = months.find(m => pDateStr.includes(m.yearMonth) || pDateStr.includes(m.date));
        if (matched) {
          matched.purchases += amt;
        } else {
          months[months.length - 1].purchases += amt;
        }
      });

      return months;
    }
  }, [sales, purchases, timeframe]);

  const totalSales = useMemo(() => chartData.reduce((sum, d) => sum + d.sales, 0), [chartData]);
  const totalPurchases = useMemo(() => chartData.reduce((sum, d) => sum + d.purchases, 0), [chartData]);
  const netTradeMargin = totalSales - totalPurchases;

  return (
    <div className={`border rounded-3xl p-5 sm:p-6 card-shadow transition-all duration-300 flex-1 flex flex-col justify-between relative overflow-hidden ${
      theme === 'dark'
        ? 'bg-slate-900/90 border-slate-800 text-white shadow-xl shadow-slate-950/40'
        : 'bg-white border-slate-200/80 text-slate-900 shadow-xl shadow-slate-200/50'
    }`}>
      {/* Top Header Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              theme === 'dark' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
            }`}>
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base tracking-tight text-slate-900 dark:text-white">
                Revenue & Procurement Flow
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Live comparison of customer sales volume versus inventory purchases
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          {/* Chart Mode Toggle: Area vs Bar */}
          <div className={`flex items-center p-0.5 rounded-xl border ${
            theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              onClick={() => setChartMode('area')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                chartMode === 'area'
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="Smooth Line Chart"
            >
              <LineChart className="w-3.5 h-3.5" />
              <span>Line</span>
            </button>
            <button
              onClick={() => setChartMode('bar')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                chartMode === 'bar'
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="Column Bar Chart"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Bars</span>
            </button>
          </div>

          {/* Timeframe Selector Pills */}
          <div className={`flex items-center p-0.5 rounded-xl border ${
            theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              onClick={() => setTimeframe('7d')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                timeframe === '7d'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => setTimeframe('30d')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                timeframe === '30d'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              30 Days
            </button>
            <button
              onClick={() => setTimeframe('6m')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                timeframe === '6m'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              6 Months
            </button>
          </div>
        </div>
      </div>

      {/* Mini Executive Metric Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        {/* Sales Mini Card */}
        <div className={`p-3 rounded-2xl border transition-all ${
          theme === 'dark'
            ? 'bg-slate-800/60 border-emerald-500/20'
            : 'bg-emerald-50/50 border-emerald-100'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Total Sales
            </span>
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            Rs. {totalSales.toLocaleString()}
          </div>
        </div>

        {/* Purchases Mini Card */}
        <div className={`p-3 rounded-2xl border transition-all ${
          theme === 'dark'
            ? 'bg-slate-800/60 border-blue-500/20'
            : 'bg-blue-50/50 border-blue-100'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              Total Purchases
            </span>
            <ArrowDownRight className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-lg font-black font-mono text-blue-600 dark:text-blue-400 mt-1">
            Rs. {totalPurchases.toLocaleString()}
          </div>
        </div>

        {/* Trade Spread */}
        <div className={`p-3 rounded-2xl border transition-all ${
          theme === 'dark'
            ? 'bg-slate-800/60 border-slate-700'
            : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Trade Margin
            </span>
            <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${
              netTradeMargin >= 0
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
            }`}>
              {netTradeMargin >= 0 ? '+Surplus' : '-Deficit'}
            </span>
          </div>
          <div className={`text-lg font-black font-mono mt-1 ${
            netTradeMargin >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
          }`}>
            Rs. {Math.abs(netTradeMargin).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Main Chart Graphic Canvas */}
      <div className="w-full h-64 min-h-[260px] pt-2">
        <ResponsiveContainer width="100%" height="100%">
          {chartMode === 'area' ? (
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="gradSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="gradPurchases" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke={theme === 'dark' ? '#334155' : '#f1f5f9'}
              />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={{ stroke: theme === 'dark' ? '#334155' : '#e2e8f0' }}
                tick={{ fontSize: 11, fontWeight: 600, fill: theme === 'dark' ? '#94a3b8' : '#64748b' }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fontWeight: 600, fill: theme === 'dark' ? '#94a3b8' : '#64748b' }}
                tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff',
                  borderRadius: '16px',
                  border: theme === 'dark' ? '1px solid #334155' : '1px solid #e2e8f0',
                  color: theme === 'dark' ? '#ffffff' : '#0f172a',
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                  padding: '12px 16px',
                  fontSize: '12px'
                }}
                formatter={(value, name) => [
                  `Rs. ${Number(value).toLocaleString()}`,
                  name === 'sales' ? 'Total Sales' : 'Total Purchases'
                ]}
                labelStyle={{ fontWeight: 800, marginBottom: '6px', color: theme === 'dark' ? '#cbd5e1' : '#475569' }}
              />
              <Area
                type="monotone"
                dataKey="sales"
                name="sales"
                stroke="#10b981"
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 2, fill: '#10b981', stroke: '#ffffff' }}
                activeDot={{ r: 7, strokeWidth: 2, fill: '#10b981', stroke: '#ffffff' }}
                fillOpacity={1}
                fill="url(#gradSales)"
              />
              <Area
                type="monotone"
                dataKey="purchases"
                name="purchases"
                stroke="#2563eb"
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 2, fill: '#2563eb', stroke: '#ffffff' }}
                activeDot={{ r: 7, strokeWidth: 2, fill: '#2563eb', stroke: '#ffffff' }}
                fillOpacity={1}
                fill="url(#gradPurchases)"
              />
            </AreaChart>
          ) : (
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }} barGap={6}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke={theme === 'dark' ? '#334155' : '#f1f5f9'}
              />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={{ stroke: theme === 'dark' ? '#334155' : '#e2e8f0' }}
                tick={{ fontSize: 11, fontWeight: 600, fill: theme === 'dark' ? '#94a3b8' : '#64748b' }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fontWeight: 600, fill: theme === 'dark' ? '#94a3b8' : '#64748b' }}
                tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff',
                  borderRadius: '16px',
                  border: theme === 'dark' ? '1px solid #334155' : '1px solid #e2e8f0',
                  color: theme === 'dark' ? '#ffffff' : '#0f172a',
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
                  padding: '12px 16px'
                }}
                formatter={(value, name) => [
                  `Rs. ${Number(value).toLocaleString()}`,
                  name === 'sales' ? 'Total Sales' : 'Total Purchases'
                ]}
                labelStyle={{ fontWeight: 800, marginBottom: '6px', color: theme === 'dark' ? '#cbd5e1' : '#475569' }}
              />
              <Bar dataKey="sales" name="sales" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={32} />
              <Bar dataKey="purchases" name="purchases" fill="#2563eb" radius={[6, 6, 0, 0]} maxBarSize={32} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};
