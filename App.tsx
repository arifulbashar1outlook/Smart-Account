import React, { useState, useEffect, useMemo } from 'react';
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
  Settings
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import ReactMarkdown from 'react-markdown';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, query, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';

import { Transaction, TransactionType, FinancialSummary, AccountType, Category } from './types';
import { getStoredTransactions, saveStoredTransactions } from './services/storage';
import { getFinancialAdvice } from './services/geminiService';
import { auth, db, signInWithGoogle, logout } from './services/firebase';
import TransactionForm from './components/TransactionForm';
import SummaryCard from './components/SummaryCard';
import FinancialChart from './components/FinancialChart';
import BottomNavigation from './components/BottomNavigation';
import SalaryManager from './components/SalaryManager';
import ConfigModal from './components/ConfigModal';

const App: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [aiAdvice, setAiAdvice] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'input' | 'bazar' | 'report' | 'month' | 'year'>('input');
  const [accountFilter, setAccountFilter] = useState<'all' | 'salary' | 'savings' | 'cash'>('all');
  
  // Config & Auth
  const [showConfig, setShowConfig] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

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
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
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
       const q = query(collection(db, 'users', user.uid, 'transactions'));
       unsubscribe = onSnapshot(q, (snapshot) => {
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
      await signInWithGoogle();
    } catch (error) {
      alert("Failed to sign in. Please check your configuration in settings.");
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    // On logout, revert to local storage data
    const loaded = getStoredTransactions();
    setTransactions(loaded);
  };

  const handleAddTransaction = async (newTx: Omit<Transaction, 'id'>) => {
    if (user && db) {
      // Add to Cloud
      try {
        await addDoc(collection(db, 'users', user.uid, 'transactions'), {
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
        await deleteDoc(doc(db, 'users', user.uid, 'transactions', id));
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
    <div className="max-w-xl mx-auto px-4 py-8">
       <div className="mb-8 text-center">
         <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Add Transaction</h2>
         <p className="text-gray-500 dark:text-gray-400">Manage your money flow</p>
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
      <div className="max-w-2xl mx-auto px-4 py-8 pb-20">
         <div className="mb-6 flex items-center justify-between">
           <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Bazar Tracker</h2>
            <p className="text-gray-500 dark:text-gray-400">Daily market spendings</p>
           </div>
           <div className="text-right">
             <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Cost ({monthName})</p>
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
                      Add Item
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

  const ReportPage = () => {
    const [reportView, setReportView] = useState<'summary' | 'bazar' | 'full'>('summary');

    const { dailyStats, monthlyStats, yearlyStats } = useMemo(() => {
        const d: Record<string, {inc: number, exp: number}> = {};
        const m: Record<string, {inc: number, exp: number}> = {};
        const y: Record<string, {inc: number, exp: number}> = {};

        transactions.forEach(t => {
            if (!t.date) return;
            const date = new Date(t.date);
            if (isNaN(date.getTime())) return;

            if (t.type === 'transfer') return;

            const yKey = date.getFullYear().toString();
            const mKey = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;
            const dKey = t.date.split('T')[0];

            if(!y[yKey]) y[yKey] = {inc: 0, exp: 0};
            if(!m[mKey]) m[mKey] = {inc: 0, exp: 0};
            if(!d[dKey]) d[dKey] = {inc: 0, exp: 0};

            if(t.type === 'income') {
                const amt = t.amount;
                y[yKey].inc += amt;
                m[mKey].inc += amt;
                d[dKey].inc += amt;
            } else if (t.type === 'expense') {
                const amt = t.amount;
                y[yKey].exp += amt;
                m[mKey].exp += amt;
                d[dKey].exp += amt;
            }
        });

        return {
            dailyStats: Object.entries(d).sort((a,b) => b[0].localeCompare(a[0])),
            monthlyStats: Object.entries(m).sort((a,b) => b[0].localeCompare(a[0])),
            yearlyStats: Object.entries(y).sort((a,b) => b[0].localeCompare(a[0]))
        };
    }, [transactions]);

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
       <div className="max-w-3xl mx-auto px-4 py-8 pb-20">
         <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FileText className="w-6 h-6 text-indigo-500" />
              Reports & History
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Detailed breakdown of your finances</p>
         </div>

         <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl mb-8 overflow-x-auto">
             <button 
                onClick={() => setReportView('summary')}
                className={`flex-1 min-w-[100px] py-2 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap ${reportView === 'summary' ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'}`}
            >
                <Calculator className="w-4 h-4" />
                Sum & Totals
            </button>
            <button 
                onClick={() => setReportView('bazar')}
                className={`flex-1 min-w-[100px] py-2 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap ${reportView === 'bazar' ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'}`}
            >
                <ShoppingBag className="w-4 h-4" />
                Bazar Report
            </button>
            <button 
                onClick={() => setReportView('full')}
                className={`flex-1 min-w-[100px] py-2 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap ${reportView === 'full' ? 'bg-white dark:bg-gray-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'}`}
            >
                <List className="w-4 h-4" />
                Full History
            </button>
         </div>

         {reportView === 'summary' && (
             <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div>
                   <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                       <CalendarRange className="w-5 h-5 text-indigo-500" /> 
                       Yearly Summary
                   </h3>
                   <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                       <div className="grid grid-cols-4 bg-gray-50 dark:bg-gray-900/50 p-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                           <div>Year</div>
                           <div className="text-right">Income</div>
                           <div className="text-right">Expense</div>
                           <div className="text-right">Net</div>
                       </div>
                       <div className="divide-y divide-gray-100 dark:divide-gray-700">
                           {yearlyStats.length === 0 ? (
                               <div className="p-4 text-center text-gray-400 text-sm">No data available</div>
                           ) : yearlyStats.map(([year, stats]) => (
                               <div key={year} className="grid grid-cols-4 p-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                   <div className="font-bold text-gray-900 dark:text-white">{year}</div>
                                   <div className="text-right text-emerald-600 dark:text-emerald-400">{stats.inc > 0 ? `+${stats.inc.toLocaleString()}` : '-'}</div>
                                   <div className="text-right text-rose-600 dark:text-rose-400">{stats.exp > 0 ? `-${stats.exp.toLocaleString()}` : '-'}</div>
                                   <div className={`text-right font-medium ${stats.inc - stats.exp >= 0 ? 'text-gray-900 dark:text-white' : 'text-rose-600'}`}>
                                       {(stats.inc - stats.exp).toLocaleString()}
                                   </div>
                               </div>
                           ))}
                       </div>
                   </div>
                </div>

                <div>
                   <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                       <Calendar className="w-5 h-5 text-blue-500" /> 
                       Monthly Summary
                   </h3>
                   <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                       <div className="grid grid-cols-4 bg-gray-50 dark:bg-gray-900/50 p-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                           <div>Month</div>
                           <div className="text-right">Inc</div>
                           <div className="text-right">Exp</div>
                           <div className="text-right">Net</div>
                       </div>
                       <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[300px] overflow-y-auto">
                           {monthlyStats.length === 0 ? (
                               <div className="p-4 text-center text-gray-400 text-sm">No data available</div>
                           ) : monthlyStats.map(([monthKey, stats]) => {
                               const [y, m] = monthKey.split('-');
                               const date = new Date(parseInt(y), parseInt(m)-1);
                               const display = date.toLocaleDateString('en-US', {month: 'short', year: '2-digit'});
                               return (
                                   <div key={monthKey} className="grid grid-cols-4 p-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                       <div className="font-medium text-gray-900 dark:text-white">{display}</div>
                                       <div className="text-right text-emerald-600 dark:text-emerald-400">{stats.inc > 0 ? `${(stats.inc/1000).toFixed(1)}k` : '-'}</div>
                                       <div className="text-right text-rose-600 dark:text-rose-400">{stats.exp > 0 ? `${(stats.exp/1000).toFixed(1)}k` : '-'}</div>
                                       <div className={`text-right font-medium ${stats.inc - stats.exp >= 0 ? 'text-gray-700 dark:text-gray-300' : 'text-rose-600'}`}>
                                           {((stats.inc - stats.exp)/1000).toFixed(1)}k
                                       </div>
                                   </div>
                               );
                           })}
                       </div>
                   </div>
                </div>

                <div>
                   <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                       <Clock className="w-5 h-5 text-amber-500" /> 
                       Daily Summary (Last 30 Days)
                   </h3>
                   <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                       <div className="grid grid-cols-4 bg-gray-50 dark:bg-gray-900/50 p-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                           <div>Date</div>
                           <div className="text-right">Inc</div>
                           <div className="text-right">Exp</div>
                           <div className="text-right">Net</div>
                       </div>
                       <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[400px] overflow-y-auto">
                           {dailyStats.length === 0 ? (
                               <div className="p-4 text-center text-gray-400 text-sm">No data available</div>
                           ) : dailyStats.slice(0, 30).map(([dayKey, stats]) => {
                               const date = new Date(dayKey);
                               const display = date.toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
                               return (
                                   <div key={dayKey} className="grid grid-cols-4 p-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                       <div className="font-medium text-gray-900 dark:text-white">{display}</div>
                                       <div className="text-right text-emerald-600 dark:text-emerald-400">{stats.inc > 0 ? stats.inc.toLocaleString() : '-'}</div>
                                       <div className="text-right text-rose-600 dark:text-rose-400">{stats.exp > 0 ? stats.exp.toLocaleString() : '-'}</div>
                                       <div className={`text-right font-medium ${stats.inc - stats.exp >= 0 ? 'text-gray-700 dark:text-gray-300' : 'text-rose-600'}`}>
                                           {(stats.inc - stats.exp).toLocaleString()}
                                       </div>
                                   </div>
                               );
                           })}
                       </div>
                   </div>
                </div>
             </div>
         )}

         {reportView === 'bazar' && <BazarPage />}
         {reportView === 'full' && (
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
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className={`block font-bold text-sm ${
                                                     t.type === 'income' ? 'text-emerald-600' : 
                                                     t.type === 'expense' ? 'text-rose-600' : 'text-gray-600 dark:text-gray-400'
                                                }`}>
                                                    {t.type === 'income' ? '+' : t.type === 'expense' ? '-' : ''} Tk {t.amount.toFixed(2)}
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
         )}
       </div>
    );
  };

  const DashboardView = ({ period }: { period: 'month' | 'year' }) => {
    const filtered = useMemo(() => getFilteredTransactions(period, accountFilter), [period, transactions, accountFilter]);
    const summary = useMemo(() => getSummary(filtered), [filtered, accountFilter, accountBalances]);

    const grouped = useMemo(() => {
      const groups: Record<string, Transaction[]> = {};
      filtered.forEach(t => {
        if (!t.date) return;
        const dateKey = t.date.split('T')[0];
        if (!groups[dateKey]) groups[dateKey] = [];
        groups[dateKey].push(t);
      });
      return groups;
    }, [filtered]);

    const title = period === 'month' ? 'Monthly Overview' : 'Yearly Overview';

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-20">
        
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

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  {accountFilter === 'all' ? 'Transactions' : `${accountFilter.charAt(0).toUpperCase() + accountFilter.slice(1)} Statement`}
                </h3>
              </div>
              
              <div className="space-y-6">
                {Object.keys(grouped).sort((a, b) => b.localeCompare(a)).map(date => (
                  <div key={date}>
                    <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 pl-1 sticky top-0 bg-white dark:bg-gray-800 py-2 z-10">
                      {new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </h4>
                    <div className="space-y-3">
                      {grouped[date].map((t) => (
                        <div key={t.id} className="group flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors border border-transparent hover:border-gray-100 dark:hover:border-gray-600">
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              t.type === 'income' 
                                ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' 
                                : t.type === 'transfer'
                                  ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                                  : 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'
                            }`}>
                              {t.type === 'income' ? <TrendingUp className="w-5 h-5" /> : t.type === 'transfer' ? <ArrowRightLeft className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">{t.description}</p>
                              <div className="flex gap-2 text-xs text-gray-500 dark:text-gray-400">
                                <span>{t.category}</span>
                                <span>•</span>
                                <span className="capitalize">{t.accountId}</span>
                                {t.type === 'transfer' && <span>→ {t.targetAccountId}</span>}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className={`font-bold ${
                              t.type === 'income' 
                                ? 'text-emerald-600 dark:text-emerald-400' 
                                : t.type === 'expense'
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : 'text-gray-600 dark:text-gray-400'
                            }`}>
                              {t.type === 'income' ? '+' : t.type === 'expense' ? '-' : ''} Tk {t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                            <button 
                              onClick={() => handleDeleteTransaction(t.id)}
                              className="text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
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

          <div className="flex items-center gap-3">
             {isSyncing && (
                <span className="text-xs text-indigo-500 animate-pulse hidden sm:inline">Syncing...</span>
             )}
             
             <button
              onClick={() => setShowConfig(true)}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors"
              title="Settings & Config"
             >
                <Settings className="w-5 h-5" />
             </button>

             <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors"
              aria-label="Toggle Theme"
            >
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
            
            {user ? (
              <div className="flex items-center gap-3 pl-3 border-l border-gray-200 dark:border-gray-700">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-600" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <UserIcon className="w-4 h-4" />
                  </div>
                )}
                <button
                  onClick={handleLogout}
                  className="hidden sm:block text-sm font-medium text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={handleLogin}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
              >
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">Sign In</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="transition-all duration-300">
        {activeTab === 'input' && <InputPage />}
        {activeTab === 'bazar' && <BazarPage />}
        {activeTab === 'report' && <ReportPage />}
        {activeTab === 'month' && <DashboardView period="month" />}
        {activeTab === 'year' && <DashboardView period="year" />}
      </main>

      {/* Bottom Navigation */}
      <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default App;