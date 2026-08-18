import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useERP } from '../context/ERPContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';

export const SalesChart = () => {
  const { sales, purchases } = useERP();
  const { theme } = useTheme();
  const { t } = useLocale();
  const [timeframe, setTimeframe] = useState('Weekly');

  // Dynamically group sales & purchases by date
  const chartDataMap = {};

  sales.forEach(s => {
    const key = s.date || 'Today';
    if (!chartDataMap[key]) chartDataMap[key] = { date: key, sales: 0, purchases: 0 };
    chartDataMap[key].sales += s.amount || 0;
  });

  purchases.forEach(p => {
    const key = p.date || 'Today';
    if (!chartDataMap[key]) chartDataMap[key] = { date: key, sales: 0, purchases: 0 };
    chartDataMap[key].purchases += p.amount || 0;
  });

  const chartData = Object.values(chartDataMap);
  const hasData = chartData.length > 0;

  return (
    <div className={`border rounded-2xl p-5 card-shadow transition-colors ${
      theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-base">{t('salesPurchasesTrend')}</h3>
          <p className="text-xs text-slate-400">{t('salesTrendSub')}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 text-xs font-semibold">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              {t('sales')}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-brand-500"></span>
              {t('purchases')}
            </span>
          </div>
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className={`border rounded-xl px-2.5 py-1 text-xs font-semibold outline-none ${
              theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <option value="Weekly">{t('weekly')}</option>
            <option value="Monthly">{t('monthly')}</option>
          </select>
        </div>
      </div>

      <div className="h-64 w-full flex items-center justify-center">
        {!hasData ? (
          <div className="text-center text-xs text-slate-400 p-6 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl w-full">
            {t('noTransactionsRecorded')}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorPurchases" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1b63fb" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#1b63fb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#334155' : '#f1f5f9'} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: theme === 'dark' ? '#94a3b8' : '#64748b' }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: theme === 'dark' ? '#94a3b8' : '#64748b' }} tickFormatter={(val) => `${val / 1000}K`} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff', 
                  borderRadius: '12px', 
                  border: theme === 'dark' ? '1px solid #334155' : '1px solid #e2e8f0', 
                  color: theme === 'dark' ? '#ffffff' : '#000000',
                  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.2)' 
                }}
                formatter={(value) => [`Rs. ${Number(value).toLocaleString()}`, '']}
              />
              <Area type="monotone" dataKey="sales" name={t('sales')} stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSales)" />
              <Area type="monotone" dataKey="purchases" name={t('purchases')} stroke="#1b63fb" strokeWidth={2.5} fillOpacity={1} fill="url(#colorPurchases)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
