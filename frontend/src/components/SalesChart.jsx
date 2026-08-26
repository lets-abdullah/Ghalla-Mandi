import React, { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useERP } from '../context/ERPContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';

export const SalesChart = () => {
  const { sales = [], purchases = [] } = useERP();
  const { theme } = useTheme();
  const { t } = useLocale();
  const [timeframe, setTimeframe] = useState('Weekly'); // 'Weekly' | 'Monthly'

  // Build timeline data based on selected timeframe
  const chartData = useMemo(() => {
    const today = new Date();
    const todayStr = today.toLocaleDateString('en-GB');

    if (timeframe === 'Weekly') {
      // Last 7 days sequence
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const dayName = d.toLocaleDateString('en-GB', { weekday: 'short' }); // 'Mon', 'Tue'
        const dateNum = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); // '26 Aug'
        const rawIso = d.toISOString().split('T')[0];
        const ddmmyyyy = d.toLocaleDateString('en-GB');

        days.push({
          date: `${dayName}, ${dateNum}`,
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
          // If no specific match, attribute to current day slot
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
    } else {
      // Last 6 Months sequence
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthName = d.toLocaleDateString('en-GB', { month: 'short' });
        const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

        months.push({
          date: monthName,
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

  const totalPeriodSales = useMemo(() => chartData.reduce((sum, d) => sum + d.sales, 0), [chartData]);
  const totalPeriodPurchases = useMemo(() => chartData.reduce((sum, d) => sum + d.purchases, 0), [chartData]);

  return (
    <div className={`border rounded-2xl p-5 card-shadow transition-colors flex-1 flex flex-col justify-between ${
      theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
    }`}>
      {/* Header with Title and Timeframe Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="font-extrabold text-base tracking-tight flex items-center gap-2">
            <span>Sales & Purchases Trend</span>
          </h3>
          <div className="text-xs text-slate-500 font-medium mt-0.5">
            Sales: <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">Rs. {totalPeriodSales.toLocaleString()}</span>
            {' • '}
            Purchases: <span className="font-bold text-blue-600 dark:text-blue-400 font-mono">Rs. {totalPeriodPurchases.toLocaleString()}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Legend */}
          <div className="flex items-center gap-3 text-xs font-bold">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs shadow-emerald-500/50"></span>
              <span className="text-slate-700 dark:text-slate-200">Sales</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shadow-xs shadow-blue-500/50"></span>
              <span className="text-slate-700 dark:text-slate-200">Purchases</span>
            </span>
          </div>

          {/* Timeframe selector */}
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className={`border rounded-xl px-2.5 py-1 text-xs font-bold outline-none cursor-pointer ${
              theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <option value="Weekly">Last 7 Days</option>
            <option value="Monthly">Last 6 Months</option>
          </select>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="w-full h-64 min-h-[250px] pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorPurchases" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#334155' : '#f1f5f9'} />
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
                borderRadius: '14px',
                border: theme === 'dark' ? '1px solid #334155' : '1px solid #e2e8f0',
                color: theme === 'dark' ? '#ffffff' : '#0f172a',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15)',
                padding: '10px 14px',
                fontSize: '12px',
                fontWeight: 'bold'
              }}
              formatter={(value, name) => [
                `Rs. ${Number(value).toLocaleString()}`,
                name === 'sales' ? 'Total Sales' : 'Total Purchases'
              ]}
              labelStyle={{ fontWeight: 800, marginBottom: '4px', color: theme === 'dark' ? '#cbd5e1' : '#475569' }}
            />
            <Area
              type="monotone"
              dataKey="sales"
              name="sales"
              stroke="#10b981"
              strokeWidth={3}
              dot={{ r: 4, strokeWidth: 2, fill: '#10b981', stroke: '#ffffff' }}
              activeDot={{ r: 6, strokeWidth: 2, fill: '#10b981', stroke: '#ffffff' }}
              fillOpacity={1}
              fill="url(#colorSales)"
            />
            <Area
              type="monotone"
              dataKey="purchases"
              name="purchases"
              stroke="#2563eb"
              strokeWidth={3}
              dot={{ r: 4, strokeWidth: 2, fill: '#2563eb', stroke: '#ffffff' }}
              activeDot={{ r: 6, strokeWidth: 2, fill: '#2563eb', stroke: '#ffffff' }}
              fillOpacity={1}
              fill="url(#colorPurchases)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
