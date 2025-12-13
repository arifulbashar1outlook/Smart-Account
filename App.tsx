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
  PieChart as PieChartIcon
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

const App: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [aiAdvice, setAiAdvice] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  // Navigation State
  const [activeTab, setActiveTab] = useState<'input' | 'bazar' | 'bazar-report' | 'lending' | 'history' | 'dashboard'>('input');
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
        await db.collection('users').doc(user.uid).collection('transactions').add({
          ...newTx,
          date: newTx.date || new Date().toISOString()
        });
      } catch (e) {
        console.error("Error saving to cloud", e);
        alert("Failed to save transaction to cloud.");
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

  const getGroupKey = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return new Date().toISOString();
    date.setSeconds(0, 0); 
    return date.toISOString();
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

  const BazarPage = () => {
    const [item, setItem] = useState('');
    const [amount, setAmount] = useState('');
    const [paidFrom, setPaidFrom] = useState<AccountType>('cash');
    const [dateTime, setDateTime] = useState(new Date().toISOString().slice(0, 16));

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const monthName = now.toLocaleDateString('en-US', { month: 'long' });

    const bazarTransactions = transactions.filter(t => {
      if (!t.date || t.category !== Category.BAZAR) return false;
      const d = new Date(t.date);
      if (isNaN(d.getTime())) return false;
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const totalBazarSpend = bazarTransactions.reduce((sum, t) => sum + t.amount, 0);

    const handleQuickAdd = (e: React.FormEvent) => {
      e.preventDefault();
      if(!item || !amount) return;
      
      const finalDate = dateTime ? new Date(dateTime).toISOString() : new Date().toISOString();

      handleAddTransaction({
        description: item,
        amount: parseFloat(amount),
        type: 'expense',
        category: Category.BAZAR,
        date: finalDate,
        accountId: paidFrom
      });
      setItem('');
      setAmount('');
    };

    const groupedBazar = useMemo(() => {
      const groups: Record<string, Transaction[]> = {};
      bazarTransactions.forEach(t => {
        const key = getGroupKey(t.date);
        if (!groups[key]) groups[key] = [];
        groups[key].push(t);
      });
      return groups;
    }, [bazarTransactions]);

    const sortedKeys = Object.keys(groupedBazar).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    return (
      <div className="max-w-2xl mx-auto px-4 py-8 pb-24">
         <div className="mb-6 flex items-center justify-between">
           <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Bazar List</h2>
            <p className="text-gray-500 dark:text-gray-400">Add & View Daily Items</p>
           </div>
           <div className="text-right">
             <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Total ({monthName})</p>
             <p className="text-xl font-bold text-rose-600 dark:text-rose-400">Tk {totalBazarSpend.toLocaleString()}</p>
           </div>
         </div>

         <form onSubmit={handleQuickAdd} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 mb-8">
            <h3 className="font-medium text-gray-800 dark:text-white mb-3 flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-500" />
              Quick Add Item
            </h3>
            <div className="flex flex-col gap-3">
               <div className="flex gap-2">
                 <input 
                   type="text" 
                   value={item}
                   onChange={(e) => setItem(e.target.value)}
                   placeholder="Item name (e.g. Vegetables)"
                   className="flex-[2] px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                   required
                 />
                 <input 
                   type="number" 
                   value={amount}
                   onChange={(e) => setAmount(e.target.value)}
                   placeholder="Cost"
                   className="flex-1 min-w-[80px] px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                   required
                   step="0.01"
                 />
               </div>
               
               <div className="flex flex-col sm:flex-row gap-3">
                 <div className="flex-1 flex items-center gap-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-1.5 border border-gray-200 dark:border-gray-600">
                    <CalendarDays className="w-4 h-4 text-gray-400" />
                    <input 
                      type="datetime-local" 
                      value={dateTime}
                      onChange={(e) => setDateTime(e.target.value)}
                      className="bg-transparent border-none outline-none text-sm text-gray-700 dark:text-gray-200 w-full"
                      required
                    />
                 </div>

                 <div className="flex items-center gap-2">
                   <select
                      value={paidFrom}
                      onChange={(e) => setPaidFrom(e.target.value as AccountType)}
                      className="text-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white w-full sm:w-auto"
                    >
                      <option value="cash">Cash 💵</option>
                      <option value="salary">Salary Acc 🏦</option>
                      <option value="savings">Savings Acc 🐷</option>
                    </select>
                    <button type="submit" className="ml-auto bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 text-sm font-medium whitespace-nowrap">
                      Add
                    </button>
                 </div>
               </div>
            </div>
         </form>

         <div className="space-y-6">
           <h3 className="font-medium text-gray-500 dark:text-gray-400 text-sm uppercase">Recent Shopping History</h3>
           {bazarTransactions.length === 0 ? (
             <div className="text-center py-10 text-gray-400 dark:text-gray-600">
               <ShoppingBag className="w-12 h-12 mx-auto mb-2 opacity-50" />
               <p>No bazar items yet this month</p>
             </div>
           ) : (
             <div className="space-y-6">
                {sortedKeys.map(timeKey => {
                  const groupItems = groupedBazar[timeKey];
                  const groupTotal = groupItems.reduce((sum, t) => sum + t.amount, 0);
                  const dateObj = new Date(timeKey);
                  
                  return (
                    <div key={timeKey}>
                      <div className="flex justify-between items-center mb-2 pl-1 sticky top-0 bg-gray-50 dark:bg-gray-900 py-1 z-10 backdrop-blur-sm bg-opacity-90 dark:bg-opacity-90">
                        <div className="flex items-center gap-2">
                           <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                             {dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                           </h4>
                           <span className="text-[10px] text-gray-400 dark:text-gray-500 bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded flex items-center gap-1">
                              <Clock size={10} />
                              {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                           </span>
                        </div>
                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                          Tk {groupTotal.toFixed(2)}
                        </span>
                      </div>
                      
                      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                        {groupItems
                          .map(t => (
                          <div key={t.id} className="flex items-center justify-between p-3 border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
                              <div className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                  <ShoppingBag size={12} />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">{t.description}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Tk {t.amount.toFixed(2)}</span>
                                <button 
                                  onClick={() => handleDeleteTransaction(t.id)}
                                  className="text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
             </div>
           )}
         </div>
      </div>
    );
  };

  const BazarReportPage = () => {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      const bazarTxs = transactions.filter(t => t.category === Category.BAZAR);
      
      const thisMonthTxs = bazarTxs.filter(t => {
          const d = new Date(t.date);
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });

      const totalSpent = thisMonthTxs.reduce((sum, t) => sum + t.amount, 0);

      // Prepare daily data for chart
      const dailyData = useMemo(() => {
          const daysMap = new Map();
          const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
          
          for(let i=1; i<=daysInMonth; i++) {
              daysMap.set(i, 0);
          }

          thisMonthTxs.forEach(t => {
              const d = new Date(t.date).getDate();
              daysMap.set(d, daysMap.get(d) + t.amount);
          });

          return Array.from(daysMap.entries()).map(([day, amount]) => ({
              name: day.toString(),
              amount
          }));
      }, [thisMonthTxs, currentMonth, currentYear]);

      // Top Items (Simple grouping by description)
      const topItems = useMemo(() => {
          const groups: Record<string, number> = {};
          thisMonthTxs.forEach(t => {
              const name = t.description.toLowerCase().trim();
              groups[name] = (groups[name] || 0) + t.amount;
          });
          return Object.entries(groups)
            .sort((a,b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, amount]) => ({ name, amount }));
      }, [thisMonthTxs]);

      return (
          <div className="max-w-2xl mx-auto px-4 py-8 pb-24">
             <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <BarChartBig className="w-6 h-6 text-rose-500" />
                    Bazar Report
                </h2>
                <p className="text-gray-500 dark:text-gray-400">Monthly Analysis: {now.toLocaleDateString('en-US', {month: 'long', year: 'numeric'})}</p>
             </div>

             <div className="grid grid-cols-2 gap-4 mb-8">
                 <div className="bg-rose-50 dark:bg-rose-900/20 p-5 rounded-xl border border-rose-100 dark:border-rose-800">
                     <p className="text-sm text-rose-600 dark:text-rose-400 font-medium mb-1">Total Spent</p>
                     <p className="text-2xl font-bold text-rose-700 dark:text-rose-300">Tk {totalSpent.toLocaleString()}</p>
                 </div>
                 <div className="bg-indigo-50 dark:bg-indigo-900/20 p-5 rounded-xl border border-indigo-100 dark:border-indigo-800">
                     <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium mb-1">Avg. Daily</p>
                     <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">
                        Tk {(totalSpent / (new Date().getDate())).toFixed(0)}
                     </p>
                 </div>
             </div>

             <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 mb-8">
                 <h3 className="font-semibold text-gray-800 dark:text-white mb-4">Daily Spending Trend</h3>
                 <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dailyData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" className="dark:stroke-gray-700" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 10}} interval={2} />
                            <Tooltip 
                                formatter={(value: number) => `Tk ${value.toFixed(0)}`}
                                contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
                            />
                            <Bar dataKey="amount" fill="#f43f5e" radius={[2, 2, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                 </div>
             </div>

             <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                 <h3 className="font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                     <PieChartIcon className="w-4 h-4 text-gray-400" />
                     Top Expense Items
                 </h3>
                 <div className="space-y-3">
                     {topItems.length > 0 ? topItems.map((item, idx) => (
                         <div key={idx} className="flex items-center justify-between">
                             <div className="flex items-center gap-3">
                                 <span className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 flex items-center justify-center text-xs font-bold">
                                     {idx + 1}
                                 </span>
                                 <span className="capitalize text-gray-700 dark:text-gray-200 font-medium">{item.name}</span>
                             </div>
                             <span className="font-bold text-gray-900 dark:text-white">Tk {item.amount}</span>
                         </div>
                     )) : (
                         <p className="text-center text-gray-400 text-sm py-4">No data available</p>
                     )}
                 </div>
             </div>
          </div>
      );
  };

  const HistoryPage = () => {
    const groupedAll = useMemo(() => {
        const groups: Record<string, Transaction[]> = {};
        transactions.forEach(t => {
            if (!t.date) return;
            const dateKey = t.date.split('T')[0];
            if (!groups[dateKey]) groups[dateKey] = [];
            groups[dateKey].push(t);
        });
        return groups;
    }, [transactions]);
    const sortedAllDates = Object.keys(groupedAll).sort((a,b) => new Date(b).getTime() - new Date(a).getTime());

    return (
       <div className="max-w-3xl mx-auto px-4 py-8 pb-24">
         <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <History className="w-6 h-6 text-indigo-500" />
              Transaction History
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Full log of all activities</p>
         </div>

         <div className="animate-in fade-in slide-in-from-right-4 duration-300">
             {transactions.length === 0 ? (
                <div className="text-center py-12">
                   <Receipt className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                   <p className="text-gray-500">No transactions recorded.</p>
                </div>
             ) : (
                <div className="space-y-6">
                    {sortedAllDates.map(date => {
                        const dayTransactions = groupedAll[date];
                        return (
                            <div key={date}>
                                <div className="sticky top-0 z-10 bg-gray-50/95 dark:bg-gray-900/95 backdrop-blur-sm py-2 mb-2 border-b border-gray-100 dark:border-gray-800">
                                    <h3 className="font-semibold text-gray-800 dark:text-gray-200">
                                        {new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                    </h3>
                                </div>
                                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                                    {dayTransactions.map(t => (
                                        <div key={t.id} className="p-4 border-b border-gray-100 dark:border-gray-700 last:border-0 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                                    t.type === 'income' ? 'bg-emerald-100 text-emerald-600' :
                                                    t.type === 'transfer' ? 'bg-blue-100 text-blue-600' :
                                                    'bg-rose-100 text-rose-600'
                                                }`}>
                                                    {t.type === 'income' ? <TrendingUp size={14} /> : 
                                                     t.type === 'transfer' ? <ArrowRightLeft size={14} /> :
                                                     <TrendingDown size={14} />}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900 dark:text-white text-sm">{t.description}</p>
                                                    <div className="flex gap-2 text-xs text-gray-500">
                                                        <span>{t.category}</span>
                                                        <span>•</span>
                                                        <span className="capitalize">{t.accountId}</span>
                                                        {t.type === 'transfer' && t.targetAccountId && <span>→ {t.targetAccountId}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className={`block font-bold text-sm ${
                                                     t.type === 'income' ? 'text-emerald-600' : 
                                                     t.type === 'expense' ? 'text-rose-600' : 'text-gray-600 dark:text-gray-400'
                                                }`}>
                                                    {t.type === 'income' ? '+' : t.type === 'expense' ? '-' : ''} Tk {t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </span>
                                                <button 
                                                    onClick={() => handleDeleteTransaction(t.id)}
                                                    className="text-xs text-red-500 hover:underline mt-1 opacity-50 hover:opacity-100"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
             )}
         </div>
       </div>
    );
  };

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
        {activeTab === 'bazar' && <BazarPage />}
        {activeTab === 'bazar-report' && <BazarReportPage />}
        {activeTab === 'lending' && <LendingView transactions={transactions} onAddTransaction={handleAddTransaction} onDeleteTransaction={handleDeleteTransaction} />}
        {activeTab === 'history' && <HistoryPage />}
        {activeTab === 'dashboard' && <DashboardView period={dashboardPeriod} />}
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default App;