import React, { useState } from 'react';
import { UserCog, UserPlus, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';

export const Employees = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { t } = useLocale();
  const [employees] = useState([]);

  if (user?.role === 'Employee') {
    return (
      <div className={`border rounded-2xl p-8 text-center max-w-lg mx-auto my-12 card-shadow ${
        theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
      }`}>
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-xl font-extrabold">{t('accessRestricted')}</h2>
        <p className="text-xs text-slate-400 mt-2">
          {t('accessRestrictedSub')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <UserCog className="w-6 h-6 text-brand-500" />
            {t('employeeManagementTitle')}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">{t('employeeManagementSubtitle')}</p>
        </div>

        <button className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition shadow-md shadow-brand-500/20 active:scale-98 cursor-pointer">
          <UserPlus className="w-4 h-4" />
          <span>{t('addNewEmployee')}</span>
        </button>
      </div>

      {/* Employees Table */}
      <div className={`border rounded-2xl card-shadow overflow-hidden transition-colors ${
        theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
      }`}>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className={`border-b text-[11px] font-bold text-slate-500 uppercase tracking-wider ${
              theme === 'dark' ? 'bg-slate-900/60 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}>
              <th className="py-3 px-4">{t('employeeName')}</th>
              <th className="py-3 px-4">{t('contactEmailPhone')}</th>
              <th className="py-3 px-4">{t('role')}</th>
              <th className="py-3 px-4">{t('grantedPermissions')}</th>
              <th className="py-3 px-4 text-center">{t('status')}</th>
            </tr>
          </thead>
          <tbody className={`divide-y text-xs font-medium ${
            theme === 'dark' ? 'divide-slate-700/60' : 'divide-slate-100'
          }`}>
            {employees.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                  {t('noEmployeesFound')}
                </td>
              </tr>
            ) : (
              employees.map(emp => (
                <tr key={emp.id} className={`transition ${
                  theme === 'dark' ? 'hover:bg-slate-700/40' : 'hover:bg-slate-50/80'
                }`}>
                  <td className="py-3 px-4 font-bold">{emp.name}</td>
                  <td className="py-3 px-4 text-slate-400">
                    <div>{emp.email}</div>
                    <div className="text-[10px] text-slate-400">{emp.phone}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                      theme === 'dark' ? 'bg-brand-500/10 text-brand-500 border border-brand-500/30' : 'bg-brand-500/10 text-brand-500 border border-brand-500/30'
                    }`}>
                      {emp.role}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      {emp.permissions.map(p => (
                        <span key={p} className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                          theme === 'dark' ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {p}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-extrabold border border-emerald-500/30">{t('paid')}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Employees;
