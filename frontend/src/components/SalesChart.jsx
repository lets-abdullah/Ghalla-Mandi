import React, { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { useERP, computeSaleFinancials, computePurchaseFinancials } from '../context/ERPContext';
import { useTheme } from '../context/ThemeContext';

export const SalesChart = () => {
  const { sales = [], purchases = [], saleReturns = [], purchaseReturns = [], paymentLogs = [] } = useERP();
  const { theme } = useTheme();
  const [timeframe, setTimeframe] = useState('7D'); // '7D' | '30D' | '6M' | '1Y'

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
          date: `${dayName}, ${dateNum}`,
          shortDate: `${dayName} ${d.getDate()}`,
          rawIso,
          ddmmyyyy,
          sales: 0,
          purchases: 0
        });
      }

      sales.forEach(s => {
        const fin = computeSaleFinancials(s, saleReturns, paymentLogs, sales);
        const amt = fin.netTotal;
        if (amt < 0) return;
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
        const fin = computePurchaseFinancials(p, purchaseReturns, paymentLogs, purchases);
        const amt = fin.netTotal;
        if (amt < 0) return;
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
    } else if (timeframe === '30D') {
      // 4 Weekly intervals over the last 30 days
      const weeks = [];
      for (let i = 3; i >= 0; i--) {
        const endDay = new Date();
        endDay.setDate(today.getDate() - (i * 7));
        const startDay = new Date();
        startDay.setDate(today.getDate() - ((i + 1) * 7) + 1);

        const label = `Week ${4 - i}`;
        weeks.push({
          date: `${label} (${startDay.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })})`,
          shortDate: label,
          startDate: startDay,
          endDate: endDay,
          sales: 0,
          purchases: 0
        });
      }

      sales.forEach(s => {
        const fin = computeSaleFinancials(s, saleReturns, paymentLogs, sales);
        const amt = fin.netTotal;
        if (amt < 0) return;
        const sDate = s.createdAt ? new Date(s.createdAt) : new Date();
        const matched = weeks.find(w => sDate >= w.startDate && sDate <= w.endDate);
        if (matched) matched.sales += amt;
        else weeks[weeks.length - 1].sales += amt;
      });

      purchases.forEach(p => {
        const fin = computePurchaseFinancials(p, purchaseReturns, paymentLogs, purchases);
        const amt = fin.netTotal;
        if (amt < 0) return;
        const pDate = p.createdAt ? new Date(p.createdAt) : new Date();
        const matched = weeks.find(w => pDate >= w.startDate && pDate <= w.endDate);
        if (matched) matched.purchases += amt;
        else weeks[weeks.length - 1].purchases += amt;
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
          purchases: 0
        });
      }

      sales.forEach(s => {
        const fin = computeSaleFinancials(s, saleReturns, paymentLogs, sales);
        const amt = fin.netTotal;
        if (amt < 0) return;
        const sDateStr = String(s.date || s.createdAt || '');
        const matched = months.find(m => sDateStr.includes(m.yearMonth) || sDateStr.includes(m.shortDate));
        if (matched) matched.sales += amt;
        else months[months.length - 1].sales += amt;
      });

      purchases.forEach(p => {
        const fin = computePurchaseFinancials(p, purchaseReturns, paymentLogs, purchases);
        const amt = fin.netTotal;
        if (amt < 0) return;
        const pDateStr = String(p.date || p.createdAt || '');
        const matched = months.find(m => pDateStr.includes(m.yearMonth) || pDateStr.includes(m.shortDate));
        if (matched) matched.purchases += amt;
        else months[months.length - 1].purchases += amt;
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
          purchases: 0
        });
      }

      sales.forEach(s => {
        const fin = computeSaleFinancials(s, saleReturns, paymentLogs, sales);
        const amt = fin.netTotal;
        if (amt < 0) return;
        const sDateStr = String(s.date || s.createdAt || '');
        const matched = months.find(m => sDateStr.includes(m.yearMonth) || sDateStr.includes(m.shortDate));
        if (matched) matched.sales += amt;
        else months[months.length - 1].sales += amt;
      });

      purchases.forEach(p => {
        const fin = computePurchaseFinancials(p, purchaseReturns, paymentLogs, purchases);
        const amt = fin.netTotal;
        if (amt < 0) return;
        const pDateStr = String(p.date || p.createdAt || '');
        const matched = months.find(m => pDateStr.includes(m.yearMonth) || pDateStr.includes(m.shortDate));
        if (matched) matched.purchases += amt;
        else months[months.length - 1].purchases += amt;
      });

      return months;
    }
  }, [sales, purchases, saleReturns, purchaseReturns, paymentLogs, timeframe]);

  const isDark = theme === 'dark';

  // Clean Tooltip Component
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;

    const sVal = payload.find(p => p.dataKey === 'sales')?.value || 0;
    const pVal = payload.find(p => p.dataKey === 'purchases')?.value || 0;

    return (
      <div className={`p-3 rounded-xl shadow-lg border transition-all ${
        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        <div className="text-xs font-bold text-slate-500 mb-1.5 pb-1 border-b border-slate-100 dark:border-slate-800">
          {label}
        </div>
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              Sales:
            </span>
            <span className="font-mono font-bold">Rs. {sVal.toLocaleString()}</span>
          </div>

          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 font-medium text-blue-600 dark:text-blue-400">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              Purchases:
            </span>
            <span className="font-mono font-bold">Rs. {pVal.toLocaleString()}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`border rounded-2xl p-5 card-shadow transition-all flex-1 flex flex-col justify-between ${
      isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
    }`}>
      {/* Header with Title and Timeframe Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="font-bold text-base tracking-tight flex items-center gap-2">
            <span>Sales & Purchases Trend</span>
          </h3>
        </div>

        {/* Timeframe Segmented Pills */}
        <div className={`flex items-center p-1 rounded-xl border self-start sm:self-auto ${
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
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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

      {/* Main Line Chart Canvas */}
      <div className="w-full h-72 min-h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 15, right: 15, left: -15, bottom: 5 }}>
            <CartesianGrid
              strokeDasharray="0"
              vertical={false}
              stroke={isDark ? '#334155' : '#e2e8f0'}
            />
            <XAxis
              dataKey="shortDate"
              tickLine={false}
              axisLine={{ stroke: isDark ? '#334155' : '#cbd5e1' }}
              tick={{ fontSize: 11, fontWeight: 500, fill: isDark ? '#94a3b8' : '#64748b' }}
            />
            <YAxis
              domain={[0, 'auto']}
              allowDataOverflow={false}
              tickLine={false}
              axisLine={{ stroke: isDark ? '#334155' : '#cbd5e1' }}
              tick={{ fontSize: 11, fontWeight: 500, fill: isDark ? '#94a3b8' : '#64748b' }}
              tickFormatter={(val) => {
                if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
                if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
                return val;
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="sales"
              name="Sales"
              stroke="#10b981"
              strokeWidth={3}
              dot={{ r: 5, strokeWidth: 2, fill: '#10b981', stroke: '#ffffff' }}
              activeDot={{ r: 7, strokeWidth: 2, fill: '#10b981', stroke: '#ffffff' }}
            />
            <Line
              type="monotone"
              dataKey="purchases"
              name="Purchases"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={{ r: 5, strokeWidth: 2, fill: '#3b82f6', stroke: '#ffffff' }}
              activeDot={{ r: 7, strokeWidth: 2, fill: '#3b82f6', stroke: '#ffffff' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom Legend */}
      <div className="flex items-center justify-center gap-6 pt-3 mt-2 border-t border-slate-100 dark:border-slate-700/60 text-xs font-semibold">
        <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
          <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-800 shadow-xs"></span>
          Sales
        </span>
        <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
          <span className="w-3.5 h-3.5 rounded-full bg-blue-500 border-2 border-white dark:border-slate-800 shadow-xs"></span>
          Purchases
        </span>
      </div>
    </div>
  );
};
