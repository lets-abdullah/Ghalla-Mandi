import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Bell,
  Check,
  CheckCheck,
  ShoppingCart,
  Package,
  RotateCcw,
  CreditCard,
  DollarSign,
  AlertTriangle,
  ChevronRight,
  ExternalLink,
  X,
  Clock,
  Filter,
  Sparkles,
  ChevronDown
} from 'lucide-react';
import { useERP } from '../context/ERPContext';
import { useTheme } from '../context/ThemeContext';
import { useLocale } from '../context/LocaleContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export const NotificationCenter = () => {
  const { user } = useAuth();
  const storageKey = `gm_${user?.shop_id || 'default'}_read_notifications_v1`;
  const {
    products = [],
    sales = [],
    purchases = [],
    saleReturns = [],
    purchaseReturns = [],
    customers = [],
    suppliers = [],
    paymentLogs = []
  } = useERP();

  const { theme } = useTheme();
  const { t } = useLocale();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('All'); // 'All' | 'Unread' | 'Stock' | 'Transactions' | 'Khata'
  const [readIds, setReadIds] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const panelRef = useRef(null);

  // Sync on shop change
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      setReadIds(saved ? JSON.parse(saved) : []);
    } catch {
      setReadIds([]);
    }
  }, [storageKey]);

  // Persist read IDs to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(readIds));
    } catch (e) {
      console.error('Failed to save read notifications', e);
    }
  }, [readIds, storageKey]);

  // Click outside to close (desktop)
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Generate real-time dynamic notifications from actual ERP data
  const notifications = useMemo(() => {
    const list = [];

    // 1. LOW STOCK & OUT OF STOCK NOTIFICATIONS
    products.forEach((p) => {
      const stock = Number(p.stockQty ?? p.stock ?? 0);
      const min = Number(p.minStock ?? p.minstock ?? 10);
      const unit = p.unit || 'KG';

      if (stock <= 0) {
        list.push({
          id: `stock-out-${p.id}`,
          category: 'Stock Alert',
          type: 'Out of Stock',
          title: `${p.name} Out of Stock`,
          message: `${p.name} (${p.category || 'General'}) is completely out of stock (0 ${unit}).`,
          time: 'Urgent Alert',
          timestamp: Date.now() + 10000,
          severity: 'danger',
          link: '/inventory',
          icon: AlertTriangle
        });
      } else if (stock <= min) {
        list.push({
          id: `stock-low-${p.id}`,
          category: 'Stock Alert',
          type: 'Low Stock',
          title: `Low Stock: ${p.name}`,
          message: `Only ${stock} ${unit} remaining in mandi storage (min required: ${min} ${unit}).`,
          time: 'Storage Alert',
          timestamp: Date.now() + 5000,
          severity: 'warning',
          link: '/inventory',
          icon: AlertTriangle
        });
      }
    });

    // 2. SALE NOTIFICATIONS (Recent 8 sales)
    [...sales].slice(0, 8).forEach((s) => {
      const amt = Number(s.amount || s.grandTotal || 0);
      const paid = Number(s.paidAmount || 0);
      const isUnpaid = (amt - paid) > 0;

      list.push({
        id: `sale-${s.id || s.invoiceNo}`,
        category: 'Sales POS',
        type: 'Sale',
        title: `Sale Invoice #${s.invoiceNo || 'INV'}`,
        message: `Sale of Rs. ${amt.toLocaleString()} recorded for ${s.partyName || 'Customer'}.`,
        time: s.date || 'Recent',
        timestamp: s.created_at ? new Date(s.created_at).getTime() : Date.now(),
        severity: 'success',
        link: '/sales',
        icon: ShoppingCart
      });

      if (isUnpaid && amt - paid >= 5000) {
        list.push({
          id: `sale-due-${s.id || s.invoiceNo}`,
          category: 'Khata',
          type: 'Khata',
          title: `Credit Receivable #${s.invoiceNo || 'INV'}`,
          message: `Rs. ${(amt - paid).toLocaleString()} outstanding due from ${s.partyName || 'Customer'}.`,
          time: s.date || 'Recent',
          timestamp: (s.created_at ? new Date(s.created_at).getTime() : Date.now()) - 500,
          severity: 'warning',
          link: `/ledger?type=Customer&customerId=${s.customerId || ''}`,
          icon: CreditCard
        });
      }
    });

    // 3. PURCHASE NOTIFICATIONS (Recent 8 purchases)
    [...purchases].slice(0, 8).forEach((p) => {
      const amt = Number(p.amount || p.grandTotal || 0);
      list.push({
        id: `purchase-${p.id || p.purchaseNo}`,
        category: 'Purchase',
        type: 'Purchase',
        title: `Purchase #${p.purchaseNo || 'PUR'}`,
        message: `Arrival entry of Rs. ${amt.toLocaleString()} from ${p.supplierName || p.supplier || 'Supplier'}.`,
        time: p.date || 'Recent',
        timestamp: p.created_at ? new Date(p.created_at).getTime() : Date.now(),
        severity: 'info',
        link: '/purchases',
        icon: Package
      });
    });

    // 4. SALE RETURN NOTIFICATIONS
    [...saleReturns].slice(0, 5).forEach((r) => {
      const amt = Number(r.refundAmount || 0);
      list.push({
        id: `salereturn-${r.id || r.returnNo}`,
        category: 'Returns',
        type: 'Sale Return',
        title: `Sale Return #${r.returnNo || 'RET'}`,
        message: `Sale return voucher of Rs. ${amt.toLocaleString()} processed for ${r.customerName || 'Customer'}.`,
        time: r.date || 'Recent',
        timestamp: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
        severity: 'warning',
        link: '/sale-returns',
        icon: RotateCcw
      });
    });

    // 5. PURCHASE RETURN NOTIFICATIONS
    [...purchaseReturns].slice(0, 5).forEach((r) => {
      const amt = Number(r.refundAmount || 0);
      list.push({
        id: `purreturn-${r.id || r.returnNo}`,
        category: 'Returns',
        type: 'Purchase Return',
        title: `Purchase Return #${r.returnNo || 'PR'}`,
        message: `Debit note of Rs. ${amt.toLocaleString()} adjusted with ${r.supplierName || 'Supplier'}.`,
        time: r.date || 'Recent',
        timestamp: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
        severity: 'warning',
        link: '/purchase-returns',
        icon: RotateCcw
      });
    });

    // 6. KHATA / OUTSTANDING OVERDUE NOTIFICATIONS
    customers.forEach((c) => {
      const bal = Number(c.balance || 0);
      if (bal >= 20000) {
        list.push({
          id: `cust-khata-${c.id}`,
          category: 'Khata',
          type: 'Khata',
          title: `High Khata: ${c.name}`,
          message: `${c.name} has an outstanding receivable balance of Rs. ${bal.toLocaleString()}.`,
          time: 'Khata Alert',
          timestamp: Date.now() - 10000,
          severity: 'warning',
          link: `/ledger?type=Customer&customerId=${c.id}`,
          icon: CreditCard
        });
      }
    });

    suppliers.forEach((s) => {
      const bal = Number(s.balance || 0);
      if (bal >= 30000) {
        list.push({
          id: `sup-payable-${s.id}`,
          category: 'Khata',
          type: 'Khata',
          title: `Supplier Payable: ${s.name}`,
          message: `Rs. ${bal.toLocaleString()} payable balance pending for ${s.name}.`,
          time: 'Payable Due',
          timestamp: Date.now() - 20000,
          severity: 'info',
          link: `/ledger?type=Supplier&customerId=${s.id}`,
          icon: DollarSign
        });
      }
    });

    // 7. PAYMENTS RECORDED
    (paymentLogs || []).slice(0, 5).forEach((p, idx) => {
      list.push({
        id: `pay-${p.id || idx}`,
        category: 'Khata',
        type: 'Payment',
        title: `Payment ${p.partyType === 'Supplier' ? 'Disbursed' : 'Received'}`,
        message: `Payment of Rs. ${Number(p.amount || 0).toLocaleString()} recorded via ${p.paymentMode || 'Cash'}.`,
        time: p.date || 'Recent',
        timestamp: p.created_at ? new Date(p.created_at).getTime() : Date.now(),
        severity: 'success',
        link: '/ledger',
        icon: DollarSign
      });
    });

    // Sort: unread first, then by timestamp descending
    return list.sort((a, b) => b.timestamp - a.timestamp);
  }, [products, sales, purchases, saleReturns, purchaseReturns, customers, suppliers, paymentLogs]);

  // Unread count
  const unreadCount = useMemo(() => {
    return notifications.filter(n => !readIds.includes(n.id)).length;
  }, [notifications, readIds]);

  // Filtered notifications based on active tab
  const filteredNotifications = useMemo(() => {
    if (activeTab === 'Unread') {
      return notifications.filter(n => !readIds.includes(n.id));
    }
    if (activeTab === 'Sales POS') {
      return notifications.filter(n => n.category === 'Sales POS');
    }
    if (activeTab === 'Purchase') {
      return notifications.filter(n => n.category === 'Purchase');
    }
    if (activeTab === 'Returns') {
      return notifications.filter(n => n.category === 'Returns');
    }
    if (activeTab === 'Khata') {
      return notifications.filter(n => n.category === 'Khata');
    }
    if (activeTab === 'Stock Alert') {
      return notifications.filter(n => n.category === 'Stock Alert');
    }
    return notifications;
  }, [notifications, activeTab, readIds]);

  // Mark single notification as read
  const handleMarkAsRead = (id, e) => {
    if (e) e.stopPropagation();
    setReadIds(prev => prev.includes(id) ? prev : [...prev, id]);
  };

  // Mark all as read
  const handleMarkAllAsRead = () => {
    const allIds = notifications.map(n => n.id);
    setReadIds(allIds);
  };

  // Notification click handler: mark read and navigate
  const handleNotificationClick = (item) => {
    handleMarkAsRead(item.id);
    setIsOpen(false);
    if (item.link) {
      navigate(item.link);
    }
  };

  // Severity color styles
  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'danger':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
      case 'warning':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'success':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      default:
        return 'bg-brand-500/10 text-brand-600 dark:text-brand-400 border-brand-500/20';
    }
  };

  const getIconBadge = (severity) => {
    switch (severity) {
      case 'danger':
        return 'bg-rose-500 text-white';
      case 'warning':
        return 'bg-amber-500 text-white';
      case 'success':
        return 'bg-emerald-500 text-white';
      default:
        return 'bg-brand-500 text-white';
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Navbar Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 sm:p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer flex items-center justify-center"
        title="All Notifications"
        aria-label="Open notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center animate-pulse shadow-xs">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Backdrop for Mobile (<640px) */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs sm:hidden"
          aria-hidden="true"
        />
      )}

      {/* Notification Center Dropdown Panel (Responsive: Full width centered on mobile, Anchored dropdown on desktop) */}
      {isOpen && (
        <div
          className={`fixed left-2 right-2 top-14 xs:left-4 xs:right-4 sm:left-auto sm:right-0 sm:top-full sm:absolute sm:mt-2 sm:w-96 max-h-[85vh] flex flex-col rounded-2xl sm:rounded-3xl border card-shadow shadow-2xl z-50 overflow-hidden transition-all duration-200 ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          style={{ zIndex: 1000 }}
        >
          {/* Header */}
          <div className="p-3 sm:p-3.5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center font-bold shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <div className="truncate">
                <h3 className="text-xs sm:text-sm font-black flex items-center gap-1.5 truncate">
                  <span>Notifications</span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[9px] sm:text-[10px] font-bold">
                      {unreadCount} new
                    </span>
                  )}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  className="text-[10px] sm:text-[11px] font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1 px-2 py-1 rounded-lg bg-brand-500/10 dark:bg-brand-500/20 cursor-pointer"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark All Read</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Category Filter Dropdown */}
          <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between gap-2.5 shrink-0">
            <div className="flex items-center gap-1.5 text-slate-400 shrink-0">
              <Filter className="w-3.5 h-3.5 text-brand-500" />
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Filter:</span>
            </div>

            <div className="relative flex-1">
              <select
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value)}
                className={`w-full border rounded-xl pl-3 pr-8 py-1.5 text-xs font-bold outline-none cursor-pointer h-[34px] appearance-none transition focus:border-brand-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'
                  }`}
              >
                <option value="All">All Notifications ({notifications.length})</option>
                <option value="Unread">Unread ({unreadCount})</option>
                <option value="Sales POS">Sales POS ({notifications.filter(n => n.category === 'Sales POS').length})</option>
                <option value="Purchase">Purchase ({notifications.filter(n => n.category === 'Purchase').length})</option>
                <option value="Returns">Returns ({notifications.filter(n => n.category === 'Returns').length})</option>
                <option value="Khata">Khata ({notifications.filter(n => n.category === 'Khata').length})</option>
                <option value="Stock Alert">Stock Alert ({notifications.filter(n => n.category === 'Stock Alert').length})</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {activeTab !== 'All' && (
              <button
                type="button"
                onClick={() => setActiveTab('All')}
                className="h-[34px] px-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white transition cursor-pointer text-[11px] font-bold shrink-0 flex items-center gap-1"
                title="Reset to All"
              >
                <RotateCcw className="w-3 h-3" />
                <span className="hidden xs:inline">All</span>
              </button>
            )}
          </div>

          {/* Notification List (Scrollable) */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/60 max-h-[58vh] sm:max-h-96">
            {filteredNotifications.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <Bell className="w-8 h-8 mx-auto stroke-[1.5] text-slate-300 dark:text-slate-600" />
                <p className="text-xs font-bold">No notifications found in {activeTab}.</p>
              </div>
            ) : (
              filteredNotifications.map((item) => {
                const isRead = readIds.includes(item.id);
                const IconComponent = item.icon || Bell;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleNotificationClick(item)}
                    className={`p-3 transition-colors cursor-pointer flex items-start gap-2.5 group relative hover:bg-slate-50 dark:hover:bg-slate-700/40 ${!isRead ? (theme === 'dark' ? 'bg-slate-900/40' : 'bg-brand-50/30') : ''
                      }`}
                  >
                    {/* Unread Indicator Bar */}
                    {!isRead && (
                      <span className="absolute left-0 top-2.5 bottom-2.5 w-1 bg-brand-500 rounded-r" />
                    )}

                    {/* Icon */}
                    <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 shadow-xs mt-0.5 ${getIconBadge(item.severity)}`}>
                      <IconComponent className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded border shrink-0 ${getSeverityBadge(item.severity)}`}>
                            {item.type}
                          </span>
                          <span className={`text-xs font-extrabold truncate ${!isRead ? 'text-slate-900 dark:text-white font-black' : 'text-slate-600 dark:text-slate-300'}`}>
                            {item.title}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-bold shrink-0">
                          {item.time}
                        </span>
                      </div>

                      <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 leading-snug line-clamp-2">
                        {item.message}
                      </p>
                    </div>

                    {/* Mark Read Check or Action Arrow */}
                    <div className="shrink-0 flex items-center gap-1 self-center">
                      {!isRead ? (
                        <button
                          type="button"
                          onClick={(e) => handleMarkAsRead(item.id, e)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-brand-500/10 text-slate-400 hover:text-brand-600 dark:bg-slate-700 dark:hover:bg-brand-500/20 dark:text-slate-300 dark:hover:text-brand-400 transition"
                          title="Mark as read"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 group-hover:text-brand-500 transition" />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 sm:p-3 border-t border-slate-100 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/50 flex items-center justify-between text-xs shrink-0">
            <span className="text-[10px] sm:text-[11px] text-slate-400 font-bold">
              {notifications.length} active alerts
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
