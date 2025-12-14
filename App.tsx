import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  PiggyBank, 
  Trash2, 
  History,
  Bot,
  RefreshCw,
  Sun,
  Moon,
  ArrowRightLeft,
  Building2,
  Landmark,
  Banknote,
  ShoppingBag,
  Plus,
  CalendarDays,
  FileText,
  Clock,
  List,
  Receipt,
  Calculator,
  CalendarRange,
  Calendar,
  User as UserIcon,
  LogIn,
  Download,
  Settings,
  Database,
  Menu,
  X,
  LogOut,
  BarChart3,
  BarChartBig,
  PieChart as PieChartIcon,
  HandCoins,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import ReactMarkdown from 'react-markdown';
import firebase from 'firebase/compat/app';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

import { Transaction, TransactionType, FinancialSummary, AccountType, Category } from './types';
import { getStoredTransactions, saveStoredTransactions } from './services/storage';
import { getFinancialAdvice } from './services/geminiService';
import { auth, db, signInWithGoogle, logout, isInitialized } from './services/firebase';
import TransactionForm from './components/TransactionForm';
import SummaryCard from './components/SummaryCard';
import FinancialChart from './components/FinancialChart';
import BottomNavigation from './components/BottomNavigation';
import SalaryManager from './components/SalaryManager';
import ConfigModal from './components/ConfigModal';
import LendingView from './components/LendingView';
import BazarView from './components/BazarView';
import HistoryView from './components/HistoryView';

// Reusable Report View Component with Edit/Delete capabilities
interface ReportViewProps {
  title: string;
  icon: React.ElementType;
  transactions: Transaction[];
  filterFn: (t: Transaction) => boolean;
  onUpdateTransaction: (t: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  colorClass: string;
  bgClass: string;
  totalLabel: string;
  emptyMessage: string;
}

const ReportView: React.FC<ReportViewProps> = ({ 
  title, 
  icon: Icon, 
  transactions, 
  filterFn, 
  onUpdateTransaction, 
  onDeleteTransaction,
  colorClass,
  bgClass,
  totalLabel,
  emptyMessage
}) => {
    // Navigation State for viewing different months
    const [viewDate, setViewDate] = useState(new Date());

    const changeMonth = (offset: number) => {
        const newDate = new Date(viewDate);
        newDate.setMonth(newDate.getMonth() + offset);
        setViewDate(newDate);
    };

    const currentMonth = viewDate.getMonth();
    const currentYear = viewDate.getFullYear();
    const monthName = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const [editingTx, setEditingTx] = useState<Transaction | null>(null);
    const [editDesc, setEditDesc] = useState('');
    const [editAmount, setEditAmount] = useState('');
    const [editDate, setEditDate] = useState('');
    const [editAccount, setEditAccount] = useState<AccountType>('cash');
    const [editCategory, setEditCategory] = useState<string>('');
    const [editType, setEditType] = useState<TransactionType>('expense');
    
    // First apply the type/category filter (passed as prop)
    const typeFilteredTxs = transactions.filter(filterFn);
    
    // Then filter by the selected month
    const thisMonthTxs = typeFilteredTxs.filter(t => {
        if (!t.date) return false;
        const d = new Date(t.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const totalSpent = thisMonthTxs.reduce((sum, t) => sum + t.amount, 0);

    const dailyData = useMemo(() => {
        const groups: Record<string, { total: number, items: Transaction[] }> = {};
        thisMonthTxs.forEach(t => {
            const dateKey = t.date.split('T')[0];
            if (!groups[dateKey]) {
                groups[dateKey] = { total: 0, items: [] };
            }
            groups[dateKey].total += t.amount;
            groups[dateKey].items.push(t);
        });
        
        return Object.entries(groups)
          .map(([date, data]) => ({ date, ...data }))
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [thisMonthTxs]);

    const startEditing = (t: Transaction) => {
        setEditingTx(t);
        setEditDesc(t.description);
        setEditAmount(t.amount.toString());
        try {
            const d = new Date(t.date);
            const localIso = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
            setEditDate(localIso);
        } catch (e) {
            setEditDate(new Date().toISOString().slice(0, 16));
        }
        setEditAccount(t.accountId);
        setEditCategory(t.category);
        setEditType(t.type);
    };

    const saveEdit = () => {
        if (!editingTx || !editDesc || !editAmount) return;
        
        const updatedTx: Transaction = {
            ...editingTx,
            description: editDesc,
            amount: parseFloat(editAmount),
            date: new Date(editDate).toISOString(),
            accountId: editAccount,
            category: editCategory,
            type: editType
        };

        onUpdateTransaction(updatedTx);
        setEditingTx(null);
    };

    const handleDelete = () => {
        if (editingTx) {
            if (confirm("Are you sure you want to delete this transaction?")) {
                onDeleteTransaction(editingTx.id);
                setEditingTx(null);
            }
        }
    };

    return (
        <div className="max-w-2xl mx-auto px-4 py-8 pb-24 relative">
           {/* Edit Modal */}
           {editingTx && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center shrink-0">
                        <h3 className="font-bold text-gray-900 dark:text-white">Edit Transaction</h3>
                        <button onClick={() => setEditingTx(null)} className="text-gray-400 hover:text-gray-600">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="p-4 space-y-3 overflow-y-auto">
                        <div>
                            <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Description</label>
                            <input 
                                type="text" 
                                value={editDesc}
                                onChange={(e) => setEditDesc(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-transparent text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                             <div>
                                <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Amount</label>
                                <input 
                                    type="number" 
                                    value={editAmount}
                                    onChange={(e) => setEditAmount(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-transparent text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                             </div>
                             <div>
                                <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Type</label>
                                <select
                                    value={editType}
                                    onChange={(e) => setEditType(e.target.value as TransactionType)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-transparent text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                >
                                    <option value="expense">Expense</option>
                                    <option value="income">Income</option>
                                    <option value="transfer">Transfer</option>
                                </select>
                             </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                             <div>
                                <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Account</label>
                                <select
                                    value={editAccount}
                                    onChange={(e) => setEditAccount(e.target.value as AccountType)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-transparent text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                >
                                    <option value="salary">Salary</option>
                                    <option value="savings">Savings</option>
                                    <option value="cash">Cash</option>
                                </select>
                             </div>
                             <div>
                                <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Category</label>
                                <select
                                    value={editCategory}
                                    onChange={(e) => setEditCategory(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-transparent text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                                >
                                    {Object.values(Category).map((cat) => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                    {!Object.values(Category).includes(editCategory as Category) && (
                                        <option value={editCategory}>{editCategory}</option>
                                    )}
                                </select>
                             </div>
                        </div>
                         <div>
                            <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Date & Time</label>
                            <input 
                                type="datetime-local" 
                                value={editDate}
                                onChange={(e) => setEditDate(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-transparent text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                            />
                        </div>
                    </div>
                    <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex justify-between gap-3 bg-gray-50 dark:bg-gray-800/50 shrink-0">
                        <button 
                            onClick={handleDelete}
                            className="text-red-600 hover:text-red-700 dark:text-red-400 text-sm font-medium flex items-center gap-2 px-2"
                        >
                            <Trash2 className="w-4 h-4" /> Delete
                        </button>
                        <div className="flex gap-2">
                             <button onClick={() => setEditingTx(null)} className="px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg">Cancel</button>
                             <button onClick={saveEdit} className="px-4 py-2 text-sm bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg font-medium flex items-center justify-center gap-2">
                                <Check className="w-4 h-4" /> Save
                             </button>
                        </div>
                    </div>
                </div>
            </div>
           )}

           {/* Month Navigation */}
           <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm mb-6">
              <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300">
                  <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="text-center">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{monthName}</p>
              </div>
              <button onClick={() => changeMonth(1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300">
                  <ChevronRight className="w-5 h-5" />
              </button>
           </div>

           <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Icon className={`w-6 h-6 ${colorClass}`} />
                  {title}
              </h2>
              <p className="text-gray-500 dark:text-gray-400">Analysis for {monthName}</p>
           </div>

           <div className={`${bgClass} p-6 rounded-xl border border-gray-100 dark:border-gray-700 mb-8 flex flex-col items-center justify-center text-center`}>
               <p className={`text-sm font-medium mb-2 uppercase tracking-wide opacity-80 ${colorClass}`}>{totalLabel}</p>
               <p className={`text-4xl font-extrabold ${colorClass}`}>Tk {totalSpent.toLocaleString()}</p>
           </div>

           <div className="space-y-4">
               <h3 className="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                   <CalendarDays className="w-5 h-5 text-gray-500" />
                   Daily Breakdown
               </h3>
               
               {dailyData.length > 0 ? (
                   <div className="space-y-4">
                       {dailyData.map((day, idx) => {
                           const dateObj = new Date(day.date);
                           return (
                               <div key={idx} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                                   {/* Header */}
                                   <div className="flex justify-between items-center p-4 bg-gray-50/50 dark:bg-gray-700/30 border-b border-gray-100 dark:border-gray-700">
                                       <div className="flex items-center gap-4">
                                           <div className="flex flex-col items-center justify-center bg-white dark:bg-gray-700 rounded-lg w-12 h-12 border border-gray-100 dark:border-gray-600 shadow-sm">
                                               <span className="text-[10px] font-bold text-gray-400 dark:text-gray-400 uppercase leading-none mb-0.5">
                                                  {dateObj.toLocaleDateString('en-US', { month: 'short' })}
                                               </span>
                                               <span className="text-xl font-bold text-gray-800 dark:text-white leading-none">
                                                  {dateObj.getDate()}
                                               </span>
                                           </div>
                                           <div>
                                               <p className="font-semibold text-gray-900 dark:text-white">
                                                  {dateObj.toLocaleDateString('en-US', { weekday: 'long' })}
                                               </p>
                                               <p className="text-xs text-gray-500 dark:text-gray-400">
                                                  {day.items.length} items
                                               </p>
                                           </div>
                                       </div>
                                       <span className={`font-bold text-lg ${colorClass}`}>
                                           Tk {day.total.toLocaleString()}
                                       </span>
                                   </div>
                                   
                                   {/* List */}
                                   <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                                      {day.items.map((item, i) => (
                                          <div 
                                            key={item.id} 
                                            onClick={() => startEditing(item)}
                                            className="flex justify-between items-center py-3 px-4 hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors cursor-pointer"
                                          >
                                              <div className="flex items-center gap-3">
                                                  <span className="text-xs font-medium text-gray-400 w-4">{i + 1}.</span>
                                                  <div>
                                                      <p className="text-sm text-gray-700 dark:text-gray-200">{item.description}</p>
                                                      {item.category && <p className="text-[10px] text-gray-400">{item.category}</p>}
                                                  </div>
                                              </div>
                                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                  {item.amount.toLocaleString()}
                                              </span>
                                          </div>
                                      ))}
                                   </div>
                               </div>
                           );
                       })}
                   </div>
               ) : (
                   <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                       <p className="text-gray-500">{emptyMessage}</p>
                   </div>
               )}
           </div>
        </div>
    );
};

// --- New Component: Full Categorical Monthly Report ---
interface FullMonthlyReportProps {
    transactions: Transaction[];
}

const FullMonthlyReport: React.FC<FullMonthlyReportProps> = ({ transactions }) => {
    // Navigation State for viewing different months
    const [viewDate, setViewDate] = useState(new Date());

    const changeMonth = (offset: number) => {
        const newDate = new Date(viewDate);
        newDate.setMonth(newDate.getMonth() + offset);
        setViewDate(newDate);
    };

    const currentMonth = viewDate.getMonth();
    const currentYear = viewDate.getFullYear();
    const monthName = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    // Filter transactions for this month
    const monthlyData = useMemo(() => {
        const thisMonthTxs = transactions.filter(t => {
            if (!t.date) return false;
            const d = new Date(t.date);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });

        // Calculate Totals
        const totalIncome = thisMonthTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const totalExpense = thisMonthTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        // Withdrawals are transfers from salary/savings TO cash
        const totalWithdrawals = thisMonthTxs
            .filter(t => t.type === 'transfer' && t.targetAccountId === 'cash' && (t.accountId === 'salary' || t.accountId === 'savings'))
            .reduce((sum, t) => sum + t.amount, 0);

        // Group Expenses by Category
        const expensesByCategory: Record<string, number> = {};
        thisMonthTxs.filter(t => t.type === 'expense').forEach(t => {
            const cat = t.category || 'Other';
            expensesByCategory[cat] = (expensesByCategory[cat] || 0) + t.amount;
        });

        const sortedCategories = Object.entries(expensesByCategory).sort((a,b) => b[1] - a[1]);

        return {
            totalIncome,
            totalExpense,
            totalWithdrawals,
            sortedCategories,
            count: thisMonthTxs.length
        };
    }, [transactions, currentMonth, currentYear]);

    return (
        <div className="max-w-2xl mx-auto px-4 py-8 pb-24 relative">
            <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm mb-6">
                <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300">
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="text-center">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{monthName}</p>
                </div>
                <button onClick={() => changeMonth(1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300">
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>

            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <ClipboardList className="w-6 h-6 text-indigo-500" />
                    Full Monthly Report
                </h2>
                <p className="text-gray-500 dark:text-gray-400">Comprehensive breakdown</p>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800">
                    <p className="text-xs font-medium uppercase text-emerald-600 dark:text-emerald-400 mb-1">Total Income</p>
                    <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">Tk {monthlyData.totalIncome.toLocaleString()}</p>
                </div>
                <div className="bg-rose-50 dark:bg-rose-900/20 p-4 rounded-xl border border-rose-100 dark:border-rose-800">
                    <p className="text-xs font-medium uppercase text-rose-600 dark:text-rose-400 mb-1">Total Expense</p>
                    <p className="text-xl font-bold text-rose-700 dark:text-rose-300">Tk {monthlyData.totalExpense.toLocaleString()}</p>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden mb-6">
                 <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 flex justify-between items-center">
                     <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                         <Banknote className="w-4 h-4 text-amber-500" /> Cash Withdrawals
                     </h3>
                     <span className="font-bold text-amber-600 dark:text-amber-400">Tk {monthlyData.totalWithdrawals.toLocaleString()}</span>
                 </div>
                 <div className="p-4 text-xs text-gray-500 dark:text-gray-400 bg-amber-50/30 dark:bg-amber-900/10">
                    Money transferred from Salary/Savings to Cash (Wallet). This is not an expense, but money taken out for use.
                 </div>
            </div>

            <h3 className="font-semibold text-gray-900 dark:text-white mb-3 pl-1">Categorical Breakdown</h3>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                {monthlyData.sortedCategories.length > 0 ? (
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                        {monthlyData.sortedCategories.map(([cat, amount]) => (
                            <div key={cat} className="flex justify-between items-center p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                <span className="font-medium text-gray-700 dark:text-gray-200">{cat}</span>
                                <span className="font-bold text-gray-900 dark:text-white">Tk {amount.toLocaleString()}</span>
                            </div>
                        ))}
                         <div className="p-4 bg-gray-50 dark:bg-gray-900/50 flex justify-between items-center border-t border-gray-100 dark:border-gray-700">
                            <span className="font-bold text-gray-900 dark:text-white uppercase text-sm">Total</span>
                            <span className="font-bold text-rose-600 dark:text-rose-400">Tk {monthlyData.totalExpense.toLocaleString()}</span>
                        </div>
                    </div>
                ) : (
                    <div className="p-8 text-center text-gray-400 dark:text-gray-500">
                        No expenses recorded for this month.
                    </div>
                )}
            </div>
            
            <div className="mt-8 text-center">
                <p className="text-xs text-gray-400 dark:text-gray-600">
                    Showing {monthlyData.count} records from {monthName}
                </p>
            </div>
        </div>
    );
}

const App: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [aiAdvice, setAiAdvice] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  // Navigation State
  const [activeTab, setActiveTab] = useState<'input' | 'bazar' | 'bazar-report' | 'expense-report' | 'lending' | 'history' | 'dashboard' | 'full-report'>('input');
  const [dashboardPeriod, setDashboardPeriod] = useState<'month' | 'year'>('month');
  const [accountFilter, setAccountFilter] = useState<'all' | 'salary' | 'savings' | 'cash'>('all');
  
  // Menu State
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Auth & Config
  const [user, setUser] = useState<firebase.User | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  
  // Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // If firebase is not initialized, show config modal on first load
    if (!isInitialized) {
        const timer = setTimeout(() => setShowConfig(true), 500);
        return () => clearTimeout(timer);
    }
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response: ${outcome}`);
    setDeferredPrompt(null);
  };
  
  // Theme State
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved as 'light' | 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  // Firebase Auth Observer
  useEffect(() => {
    if (!auth) return;
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Data Loading Strategy: LocalStorage vs Firestore
  useEffect(() => {
    let unsubscribe = () => {};

    if (user && db) {
       setIsSyncing(true);
       // Load from Firestore if user is logged in
       const ref = db.collection('users').doc(user.uid).collection('transactions');
       unsubscribe = ref.onSnapshot((snapshot) => {
          const cloudTxs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Transaction[];
          // Sort by date desc
          cloudTxs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setTransactions(cloudTxs);
          setIsSyncing(false);
       }, (error) => {
          console.error("Firestore sync error:", error);
          setIsSyncing(false);
       });
    } else {
       // Load from Local Storage if not logged in
       const loaded = getStoredTransactions();
       const migrated = loaded.map(t => ({ ...t, accountId: t.accountId || 'salary' }));
       setTransactions(migrated);
    }
    
    return () => unsubscribe();
  }, [user]);

  // Sync back to Local Storage (Only if guest)
  useEffect(() => {
    if (!user) {
      saveStoredTransactions(transactions);
    }
  }, [transactions, user]);

  const handleLogin = async () => {
    try {
      if (!isInitialized) {
        setShowConfig(true);
        return;
      }
      await signInWithGoogle();
      setIsMenuOpen(false);
    } catch (error) {
       // Error handled in service
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setIsMenuOpen(false);
    // On logout, revert to local storage data
    const loaded = getStoredTransactions();
    setTransactions(loaded);
  };

  const handleAddTransaction = async (newTx: Omit<Transaction, 'id'>) => {
    if (user && db) {
      // Add to Cloud
      try {
        // Firestore throws error if fields are undefined. JSON stringify/parse removes undefined fields.
        const cleanTx = JSON.parse(JSON.stringify({
          ...newTx,
          date: newTx.date || new Date().toISOString()
        }));
        
        await db.collection('users').doc(user.uid).collection('transactions').add(cleanTx);
      } catch (e) {
        console.error("Error saving to cloud", e);
        alert("Failed to save transaction to cloud. See console for details.");
      }
    } else {
      // Add Locally
      const transaction: Transaction = {
        ...newTx,
        id: uuidv4()
      };
      setTransactions(prev => [transaction, ...prev]);
    }
  };

  const handleUpdateTransaction = async (updatedTx: Transaction) => {
    if (user && db) {
      // Update in Cloud
      try {
        // Firestore throws error if fields are undefined.
        const cleanTx = JSON.parse(JSON.stringify(updatedTx));
        await db.collection('users').doc(user.uid).collection('transactions').doc(updatedTx.id).update(cleanTx);
      } catch (e) {
        console.error("Error updating in cloud", e);
        alert("Failed to update transaction in cloud.");
      }
    } else {
      // Update Locally
      setTransactions(prev => prev.map(t => t.id === updatedTx.id ? updatedTx : t));
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (user && db) {
      // Delete from Cloud
      try {
        await db.collection('users').doc(user.uid).collection('transactions').doc(id).delete();
      } catch (e) {
        console.error("Error deleting from cloud", e);
      }
    } else {
      // Delete Locally
      setTransactions(prev => prev.filter(t => t.id !== id));
    }
  };

  const handleGetAdvice = async () => {
    setIsAiLoading(true);
    const advice = await getFinancialAdvice(transactions);
    setAiAdvice(advice);
    setIsAiLoading(false);
  };

  const handleMenuAction = (action: () => void) => {
    action();
    setIsMenuOpen(false);
  };

  // ------------------------------------------------------------------
  // Global Balance Calculation
  // ------------------------------------------------------------------
  const accountBalances = useMemo(() => {
    let salaryBal = 0;
    let savingsBal = 0;
    let cashBal = 0;

    transactions.forEach(t => {
      if (t.type === 'income') {
        if (t.accountId === 'salary') salaryBal += t.amount;
        if (t.accountId === 'savings') savingsBal += t.amount;
        if (t.accountId === 'cash') cashBal += t.amount;
      } else if (t.type === 'expense') {
        if (t.accountId === 'salary') salaryBal -= t.amount;
        if (t.accountId === 'savings') savingsBal -= t.amount;
        if (t.accountId === 'cash') cashBal -= t.amount;
      } else if (t.type === 'transfer') {
        if (t.accountId === 'salary') salaryBal -= t.amount;
        if (t.accountId === 'savings') savingsBal -= t.amount;
        if (t.accountId === 'cash') cashBal -= t.amount;
        
        if (t.targetAccountId === 'salary') salaryBal += t.amount;
        if (t.targetAccountId === 'savings') savingsBal += t.amount;
        if (t.targetAccountId === 'cash') cashBal += t.amount;
      }
    });

    return { salaryBal, savingsBal, cashBal };
  }, [transactions]);


  // ------------------------------------------------------------------
  // Filtering Logic for Views
  // ------------------------------------------------------------------

  const getFilteredTransactions = (period: 'month' | 'year', accFilter: 'all' | 'salary' | 'savings' | 'cash') => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return transactions.filter(t => {
      if (!t.date) return false;
      const tDate = new Date(t.date);
      if (isNaN(tDate.getTime())) return false;

      let dateMatch = true;
      if (period === 'month') {
        dateMatch = tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
      } else if (period === 'year') {
        dateMatch = tDate.getFullYear() === currentYear;
      }
      
      if (!dateMatch) return false;

      if (accFilter === 'all') return true;
      
      if (accFilter === 'salary') {
        return t.accountId === 'salary' || t.targetAccountId === 'salary';
      }
      if (accFilter === 'savings') {
        return t.accountId === 'savings' || t.targetAccountId === 'savings';
      }
      if (accFilter === 'cash') {
        return t.accountId === 'cash' || t.targetAccountId === 'cash';
      }
      
      return true;
    });
  };

  const getSummary = (filtered: Transaction[]): FinancialSummary => {
    let income = 0;
    let expenses = 0;

    filtered.forEach(t => {
      if (t.type === 'income') income += t.amount;
      else if (t.type === 'expense') expenses += t.amount;
    });

    if (accountFilter !== 'all') {
      income = 0;
      expenses = 0;
      filtered.forEach(t => {
        const isSource = t.accountId === accountFilter;
        const isTarget = t.targetAccountId === accountFilter;

        if (t.type === 'income' && isSource) income += t.amount;
        if (t.type === 'expense' && isSource) expenses += t.amount;
        
        if (t.type === 'transfer') {
          if (isSource) expenses += t.amount;
          if (isTarget) income += t.amount;
        }
      });
    }

    const balance = income - expenses;
    const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;

    return { 
      totalIncome: income, 
      totalExpenses: expenses, 
      balance, 
      savingsRate,
      salaryAccountBalance: accountBalances.salaryBal,
      savingsAccountBalance: accountBalances.savingsBal,
      cashBalance: accountBalances.cashBal
    };
  };

  // ------------------------------------------------------------------
  // Views
  // ------------------------------------------------------------------

  const InputPage = () => (
    <div className="max-w-xl mx-auto px-4 py-8 pb-24">
       <div className="mb-8 text-center">
         <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Add Transaction</h2>
         <p className="text-gray-500 dark:text-gray-400">Manage your money flow</p>
         {!isInitialized && (
            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg inline-block">
                <p className="text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    Offline Mode. Connect database in settings to sync.
                </p>
            </div>
         )}
       </div>
       
       <SalaryManager onAddTransaction={handleAddTransaction} />
       <TransactionForm onAddTransaction={handleAddTransaction} />
    </div>
  );

  const DashboardView = ({ period }: { period: 'month' | 'year' }) => {
    const filtered = useMemo(() => getFilteredTransactions(period, accountFilter), [period, transactions, accountFilter]);
    const summary = useMemo(() => getSummary(filtered), [filtered, accountFilter, accountBalances]);

    const title = period === 'month' ? 'Monthly Overview' : 'Yearly Overview';

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-24 animate-in fade-in duration-300">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>
            <p className="text-gray-500 dark:text-gray-400">
              {period === 'month' 
                ? new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) 
                : new Date().getFullYear().toString()}
            </p>
          </div>

          <div className="flex bg-gray-200 dark:bg-gray-700 p-1 rounded-lg overflow-x-auto">
             <button
              onClick={() => setAccountFilter('all')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${accountFilter === 'all' ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}
            >
              All
            </button>
            <button
              onClick={() => setAccountFilter('salary')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${accountFilter === 'salary' ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}
            >
              Salary
            </button>
            <button
              onClick={() => setAccountFilter('savings')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${accountFilter === 'savings' ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}
            >
              Savings
            </button>
            <button
              onClick={() => setAccountFilter('cash')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${accountFilter === 'cash' ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}
            >
              Cash
            </button>
          </div>
        </div>

        {/* Global Account Balances (Lifetime) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           {(accountFilter === 'all' || accountFilter === 'salary') && (
              <SummaryCard 
                title="Salary Account" 
                amount={accountBalances.salaryBal} 
                icon={Building2} 
                colorClass="text-blue-600 dark:text-blue-400" 
                bgClass="bg-blue-50 dark:bg-blue-900/30"
              />
           )}
           {(accountFilter === 'all' || accountFilter === 'savings') && (
              <SummaryCard 
                title="Savings Account" 
                amount={accountBalances.savingsBal} 
                icon={Landmark} 
                colorClass="text-purple-600 dark:text-purple-400" 
                bgClass="bg-purple-50 dark:bg-purple-900/30"
              />
           )}
           {(accountFilter === 'all' || accountFilter === 'cash') && (
              <SummaryCard 
                title="Cash In Hand" 
                amount={accountBalances.cashBal} 
                icon={Banknote} 
                colorClass="text-amber-600 dark:text-amber-400" 
                bgClass="bg-amber-50 dark:bg-amber-900/30"
              />
           )}
        </div>

        {/* Period Summary Cards */}
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
           {period === 'month' ? 'This Month Flow' : 'This Year Flow'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <SummaryCard 
            title="Net Flow" 
            amount={summary.balance} 
            icon={Wallet} 
            colorClass="text-indigo-600 dark:text-indigo-400" 
            bgClass="bg-indigo-50 dark:bg-indigo-900/30"
          />
          <SummaryCard 
            title="Total In" 
            amount={summary.totalIncome} 
            icon={TrendingUp} 
            colorClass="text-emerald-600 dark:text-emerald-400" 
            bgClass="bg-emerald-50 dark:bg-emerald-900/30"
          />
          <SummaryCard 
            title="Total Out" 
            amount={summary.totalExpenses} 
            icon={TrendingDown} 
            colorClass="text-rose-600 dark:text-rose-400" 
            bgClass="bg-rose-50 dark:bg-rose-900/30"
          />
           <SummaryCard 
            title="Savings Rate" 
            amount={summary.savingsRate} 
            icon={PiggyBank} 
            colorClass="text-amber-600 dark:text-amber-400" 
            bgClass="bg-amber-50 dark:bg-amber-900/30"
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Main Content: Charts & List */}
          <div className="xl:col-span-2 space-y-8">
            <FinancialChart transactions={filtered} period={period} />
          </div>

          {/* Sidebar: AI Advice & Install App */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl p-6 text-white shadow-lg">
              <div className="flex items-center gap-2 mb-4">
                <Bot className="w-6 h-6" />
                <h3 className="font-bold text-lg">AI Financial Advisor</h3>
              </div>
              <p className="text-indigo-100 text-sm mb-6 leading-relaxed">
                Get personalized insights about your spending habits and savings opportunities powered by Gemini AI.
              </p>
              
              {aiAdvice && (
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 mb-4 text-sm leading-relaxed border border-white/20">
                  <ReactMarkdown>{aiAdvice}</ReactMarkdown>
                </div>
              )}

              <button
                onClick={handleGetAdvice}
                disabled={isAiLoading || transactions.length === 0}
                className="w-full bg-white text-indigo-600 font-semibold py-2.5 rounded-lg hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAiLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Bot className="w-4 h-4" />
                    Generate Insights
                  </>
                )}
              </button>
            </div>

            {deferredPrompt && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-full text-blue-600 dark:text-blue-400">
                    <Download className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Install App</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Install SmartSpend on your home screen for quick access.</p>
                    <button 
                      onClick={handleInstallClick}
                      className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                    >
                      Install Now →
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <ConfigModal isOpen={showConfig} onClose={() => setShowConfig(false)} />
      
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 hidden sm:block">
              SmartSpend
            </h1>
            <h1 className="text-xl font-bold text-indigo-600 dark:text-indigo-400 sm:hidden">
              SmartSpend
            </h1>
          </div>

          <div className="relative" ref={menuRef}>
            <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            {isMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                        {user ? (
                           <div className="flex items-center gap-3">
                             {user.photoURL ? (
                                <img src={user.photoURL} alt="Profile" className="w-10 h-10 rounded-full border border-gray-200 dark:border-gray-600" />
                             ) : (
                                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                                    <UserIcon className="w-5 h-5" />
                                </div>
                             )}
                             <div>
                                 <p className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-[150px]">{user.displayName || 'User'}</p>
                                 <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[150px]">{user.email}</p>
                             </div>
                           </div>
                        ) : (
                           <button 
                             onClick={handleLogin}
                             className="w-full flex items-center justify-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-2 rounded-lg text-sm font-medium"
                           >
                               <LogIn className="w-4 h-4" />
                               Sign In
                           </button>
                        )}
                    </div>
                    
                    <div className="p-2 space-y-1">
                        <button 
                             onClick={() => handleMenuAction(() => setActiveTab('full-report'))}
                             className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            <ClipboardList className="w-4 h-4" />
                            Full Monthly Report
                        </button>

                        <div className="h-px bg-gray-100 dark:bg-gray-700 my-1"></div>

                        <button 
                            onClick={() => handleMenuAction(() => toggleTheme())}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                            {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
                        </button>
                        
                        <button 
                             onClick={() => handleMenuAction(() => setShowConfig(true))}
                             className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            <Settings className="w-4 h-4" />
                            Settings
                        </button>

                        <div className="h-px bg-gray-100 dark:bg-gray-700 my-1"></div>

                        <button 
                             onClick={() => handleMenuAction(() => setActiveTab('lending'))}
                             className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            <HandCoins className="w-4 h-4" />
                            Lending Manager
                        </button>

                        <div className="h-px bg-gray-100 dark:bg-gray-700 my-1"></div>

                        <button 
                            onClick={() => handleMenuAction(() => { setActiveTab('dashboard'); setDashboardPeriod('month'); })}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            <Calendar className="w-4 h-4" />
                            Monthly Overview
                        </button>

                        <button 
                            onClick={() => handleMenuAction(() => { setActiveTab('dashboard'); setDashboardPeriod('year'); })}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            <BarChart3 className="w-4 h-4" />
                            Yearly Overview
                        </button>

                        {user && (
                            <>
                                <div className="h-px bg-gray-100 dark:bg-gray-700 my-1"></div>
                                <button 
                                    onClick={() => handleMenuAction(handleLogout)}
                                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Sign Out
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="transition-all duration-300">
        {activeTab === 'input' && <InputPage />}
        {activeTab === 'bazar' && <BazarView transactions={transactions} onAddTransaction={handleAddTransaction} onUpdateTransaction={handleUpdateTransaction} onDeleteTransaction={handleDeleteTransaction} />}
        {activeTab === 'bazar-report' && (
          <ReportView 
            title="Bazar Report" 
            icon={BarChartBig} 
            transactions={transactions}
            filterFn={(t) => t.category === Category.BAZAR}
            onUpdateTransaction={handleUpdateTransaction}
            onDeleteTransaction={handleDeleteTransaction}
            colorClass="text-rose-600 dark:text-rose-400"
            bgClass="bg-rose-50 dark:bg-rose-900/20"
            totalLabel="Total Spent"
            emptyMessage="No records for this month."
          />
        )}
        {activeTab === 'expense-report' && (
          <ReportView 
            title="Expense Report" 
            icon={Receipt} 
            transactions={transactions}
            filterFn={(t) => t.type === 'expense'}
            onUpdateTransaction={handleUpdateTransaction}
            onDeleteTransaction={handleDeleteTransaction}
            colorClass="text-purple-600 dark:text-purple-400"
            bgClass="bg-purple-50 dark:bg-purple-900/20"
            totalLabel="Total Expenses"
            emptyMessage="No expense records for this month."
          />
        )}
        {activeTab === 'full-report' && <FullMonthlyReport transactions={transactions} />}
        {activeTab === 'lending' && <LendingView transactions={transactions} onAddTransaction={handleAddTransaction} onUpdateTransaction={handleUpdateTransaction} onDeleteTransaction={handleDeleteTransaction} />}
        {activeTab === 'history' && <HistoryView transactions={transactions} onUpdateTransaction={handleUpdateTransaction} onDeleteTransaction={handleDeleteTransaction} />}
        {activeTab === 'dashboard' && <DashboardView period={dashboardPeriod} />}
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation 
        activeTab={activeTab} 
        onTabChange={(tab: any) => {
            setActiveTab(tab);
            if (tab === 'dashboard') setDashboardPeriod('month');
        }} 
      />
    </div>
  );
};

export default App;