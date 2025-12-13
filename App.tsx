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
  Download
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import ReactMarkdown from 'react-markdown';

import { Transaction, TransactionType, FinancialSummary, AccountType, Category } from './types';
import { getStoredTransactions, saveStoredTransactions } from './services/storage';
import { getFinancialAdvice } from './services/geminiService';
import TransactionForm from './components/TransactionForm';
import SummaryCard from './components/SummaryCard';
import FinancialChart from './components/FinancialChart';
import BottomNavigation from './components/BottomNavigation';
import SalaryManager from './components/SalaryManager';

const App: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [aiAdvice, setAiAdvice] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'input' | 'bazar' | 'report' | 'month' | 'year'>('input');
  const [accountFilter, setAccountFilter] = useState<'all' | 'salary' | 'savings' | 'cash'>('all');
  
  // Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    // Show the install prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    // Optionally, send analytics event with outcome of user choice
    console.log(`User response to the install prompt: ${outcome}`);
    // We've used the prompt, and can't use it again, discard it
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

  // Apply Theme
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Load initial data
  useEffect(() => {
    const loaded = getStoredTransactions();
    // Migration helper: Ensure all transactions have an accountId
    const migrated = loaded.map(t => ({
      ...t,
      accountId: t.accountId || 'salary'
    }));
    setTransactions(migrated);
  }, []);

  // Save on change
  useEffect(() => {
    saveStoredTransactions(transactions);
  }, [transactions]);

  const handleAddTransaction = (newTx: Omit<Transaction, 'id'>) => {
    const transaction: Transaction = {
      ...newTx,
      id: uuidv4()
    };
    setTransactions(prev => [transaction, ...prev]);
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
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
      // Amount logic based on type and account
      if (t.type === 'income') {
        if (t.accountId === 'salary') salaryBal += t.amount;
        if (t.accountId === 'savings') savingsBal += t.amount;
        if (t.accountId === 'cash') cashBal += t.amount;
      } else if (t.type === 'expense') {
        if (t.accountId === 'salary') salaryBal -= t.amount;
        if (t.accountId === 'savings') savingsBal -= t.amount;
        if (t.accountId === 'cash') cashBal -= t.amount;
      } else if (t.type === 'transfer') {
        // Source decreases
        if (t.accountId === 'salary') salaryBal -= t.amount;
        if (t.accountId === 'savings') savingsBal -= t.amount;
        if (t.accountId === 'cash') cashBal -= t.amount;
        
        // Target increases
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
      // Date Filter
      const tDate = new Date(t.date);
      if (isNaN(tDate.getTime())) return false;

      let dateMatch = true;
      if (period === 'month') {
        dateMatch = tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
      } else if (period === 'year') {
        dateMatch = tDate.getFullYear() === currentYear;
      }
      
      if (!dateMatch) return false;

      // Account Filter
      if (accFilter === 'all') return true;
      
      // If filtering by specific account, include if it is the source OR the target
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
    // Note: This summary is based on the *filtered* list (e.g., this month)
    let income = 0;
    let expenses = 0;

    filtered.forEach(t => {
      if (t.type === 'income') income += t.amount;
      else if (t.type === 'expense') expenses += t.amount;
    });

    // If filtering by specific account, transfers count as income/expense
    if (accountFilter !== 'all') {
      income = 0;
      expenses = 0;
      filtered.forEach(t => {
        const isSource = t.accountId === accountFilter;
        const isTarget = t.targetAccountId === accountFilter;

        if (t.type === 'income' && isSource) income += t.amount;
        if (t.type === 'expense' && isSource) expenses += t.amount;
        
        if (t.type === 'transfer') {
          if (isSource) expenses += t.amount; // Money leaving
          if (isTarget) income += t.amount;   // Money entering
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

  // Helper to group by Minute (Date + Time)
  const getGroupKey = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return new Date().toISOString();
    date.setSeconds(0, 0); // Ignore seconds for grouping 'same time'
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
    // Local state for Bazar quick add
    const [item, setItem] = useState('');
    const [amount, setAmount] = useState('');
    const [paidFrom, setPaidFrom] = useState<AccountType>('cash');
    // Using ISO slice for default datetime-local format: YYYY-MM-DDTHH:MM
    const [dateTime, setDateTime] = useState(new Date().toISOString().slice(0, 16));

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const monthName = now.toLocaleDateString('en-US', { month: 'long' });

    // Filter for Bazar category this month
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
      // Do NOT reset time to now immediately, to allow adding multiple items to same time group
    };

    // Grouping transactions by Date AND Time
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

         {/* Quick Add Form */}
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
               
               {/* Date & Account Selection */}
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

         {/* Daily List grouped by Time */}
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
                  // Calculate group total
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

    // --- Statistics for Summary View ---
    const { dailyStats, monthlyStats, yearlyStats } = useMemo(() => {
        const d: Record<string, {inc: number, exp: number}> = {};
        const m: Record<string, {inc: number, exp: number}> = {};
        const y: Record<string, {inc: number, exp: number}> = {};

        transactions.forEach(t => {
            if (!t.date) return;
            const date = new Date(t.date);
            if (isNaN(date.getTime())) return;

            // We focus on Income and Expense for the summary tables.
            // Transfers are excluded from "Spending/Earning" totals to avoid double counting, 
            // unless you want to track cash flow specifically. 
            // Here we adhere to "Expend" and "Income".
            if (t.type === 'transfer') return;

            const yKey = date.getFullYear().toString();
            // Month key: YYYY-MM
            const mKey = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;
            // Day key: YYYY-MM-DD
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

    // --- Bazar Report Logic ---
    const allBazar = transactions.filter(t => t.category === Category.BAZAR);
    const groupedByMonth = useMemo(() => {
      const groups: Record<string, Transaction[]> = {};
      allBazar.forEach(t => {
        if (!t.date) return;
        const monthKey = t.date.slice(0, 7); // YYYY-MM
        if (!groups[monthKey]) groups[monthKey] = [];
        groups[monthKey].push(t);
      });
      return groups;
    }, [allBazar]);
    const sortedMonths = Object.keys(groupedByMonth).sort((a, b) => b.localeCompare(a));
    const totalLifetimeBazar = allBazar.reduce((acc, t) => acc + t.amount, 0);

    // --- Full History Logic ---
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

         {/* Toggle */}
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
                {/* Yearly Section */}
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

                {/* Monthly Section */}
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

                {/* Daily Section */}
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

         {reportView === 'bazar' && (
           <>
            <div className="mt-4 mb-8 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800/50 flex justify-between items-center animate-in fade-in slide-in-from-bottom-2">
               <span className="font-medium text-indigo-900 dark:text-indigo-200">Total Bazar Spend (Lifetime)</span>
               <span className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">Tk {totalLifetimeBazar.toLocaleString()}</span>
            </div>

             {allBazar.length === 0 ? (
               <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                  <ShoppingBag className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">No bazar records found.</p>
               </div>
             ) : (
               <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                 {sortedMonths.map(monthKey => {
                   const monthlyTx = groupedByMonth[monthKey];
                   const monthlyTotal = monthlyTx.reduce((sum, t) => sum + t.amount, 0);
                   const [year, month] = monthKey.split('-');
                   const dateObj = new Date(parseInt(year), parseInt(month) - 1);
                   const monthTitle = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

                   // Group items within this month by TIME
                   const groupedByTime: Record<string, Transaction[]> = {};
                   monthlyTx.forEach(t => {
                     const key = getGroupKey(t.date);
                     if (!groupedByTime[key]) groupedByTime[key] = [];
                     groupedByTime[key].push(t);
                   });
                   const sortedTimeKeys = Object.keys(groupedByTime).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

                   return (
                     <div key={monthKey}>
                        <div className="flex items-center justify-between mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
                           <h3 className="font-bold text-xl text-gray-800 dark:text-gray-200">{monthTitle}</h3>
                           <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm font-bold text-gray-700 dark:text-gray-300">
                             Tk {monthlyTotal.toLocaleString()}
                           </span>
                        </div>
                        
                        <div className="space-y-4 pl-0 md:pl-2">
                          {sortedTimeKeys.map(timeKey => {
                            const tripItems = groupedByTime[timeKey];
                            const tripTotal = tripItems.reduce((sum, t) => sum + t.amount, 0);
                            const tripDate = new Date(timeKey);
                            
                            return (
                              <div key={timeKey} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
                                 {/* Trip Header */}
                                 <div className="bg-gray-50 dark:bg-gray-900/50 px-4 py-2 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                                    <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
                                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                        {tripDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                                      </span>
                                      <span className="text-xs text-gray-500 flex items-center gap-1">
                                        <Clock size={12} />
                                        {tripDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    </div>
                                    <span className="font-bold text-sm text-gray-900 dark:text-white">
                                      Tk {tripTotal.toFixed(2)}
                                    </span>
                                 </div>
                                 
                                 {/* Trip Items */}
                                 <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                   {tripItems.map(t => (
                                     <div key={t.id} className="flex justify-between items-center px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                        <span className="text-sm text-gray-600 dark:text-gray-300">{t.description}</span>
                                        <span className="text-sm font-medium text-gray-900 dark:text-white">Tk {t.amount.toFixed(2)}</span>
                                     </div>
                                   ))}
                                 </div>
                              </div>
                            )
                          })}
                        </div>
                     </div>
                   );
                 })}
               </div>
             )}
           </>
         )}

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
                                                <span className="text-[10px] text-gray-400">
                                                    {t.date.includes('T') ? new Date(t.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                                                </span>
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

    // Grouping for list
    const grouped = useMemo(() => {
      const groups: Record<string, Transaction[]> = {};
      filtered.forEach(t => {
        if (!t.date) return;
        const dateKey = t.date.split('T')[0]; // Using safe date split to handle potential time components
        if (!groups[dateKey]) groups[dateKey] = [];
        groups[dateKey].push(t);
      });
      return groups;
    }, [filtered]);

    const title = period === 'month' ? 'Monthly Overview' : 'Yearly Overview';

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
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
                              {t.type === 'income' ? <TrendingUp size={20} /> : t.type === 'transfer' ? <ArrowRightLeft size={20} /> : <TrendingDown size={20} />}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">{t.description}</p>
                              <div className="flex gap-2 text-xs text-gray-500 dark:text-gray-400">
                                <span>{t.category}</span>
                                {t.type === 'transfer' && (
                                  <span className="flex items-center gap-1">
                                     {t.accountId} 
                                     <ArrowRightLeft className="w-3 h-3" />
                                     {t.targetAccountId}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className={`font-semibold ${
                              t.type === 'income' 
                                ? 'text-emerald-600 dark:text-emerald-400' 
                                : 'text-rose-600 dark:text-rose-400'
                            }`}>
                              {(t.type === 'income' || (t.type === 'transfer' && t.targetAccountId === accountFilter)) ? '+' : '-'} Tk {t.amount.toFixed(2)}
                            </span>
                            <button 
                              onClick={() => handleDeleteTransaction(t.id)}
                              className="text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {filtered.length === 0 && (
                   <p className="text-center text-gray-400 dark:text-gray-500 py-8">No transactions found.</p>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar: AI Advisor */}
          <div className="space-y-8">
             <div className="bg-gradient-to-br from-indigo-900 to-indigo-800 dark:from-gray-800 dark:to-gray-900 rounded-xl shadow-lg p-6 text-white overflow-hidden relative border border-transparent dark:border-gray-700">
              <div className="absolute top-0 right-0 p-32 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
              
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-white/10 rounded-lg backdrop-blur-md">
                    <Bot className="w-6 h-6 text-indigo-200 dark:text-indigo-400" />
                  </div>
                  <h3 className="text-lg font-semibold">Financial Advisor</h3>
                </div>

                <div className="min-h-[120px] mb-4 text-indigo-100 dark:text-gray-300 text-sm leading-relaxed bg-white/5 rounded-lg p-4 border border-white/10">
                   {isAiLoading ? (
                     <div className="flex items-center gap-2 animate-pulse">
                       <RefreshCw className="w-4 h-4 animate-spin" />
                       Thinking...
                     </div>
                   ) : aiAdvice ? (
                     <ReactMarkdown>{aiAdvice}</ReactMarkdown>
                   ) : (
                     <p>Get personalized insights on your spending habits. Analyze your {period}ly data to find savings opportunities.</p>
                   )}
                </div>

                <button
                  onClick={handleGetAdvice}
                  disabled={isAiLoading || transactions.length === 0}
                  className="w-full bg-white text-indigo-900 dark:bg-indigo-600 dark:text-white dark:hover:bg-indigo-700 font-medium py-2 rounded-lg hover:bg-indigo-50 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isAiLoading ? 'Analyzing...' : 'Analyze My Finances'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 pb-24 transition-colors duration-200">
      {/* Top Header */}
      <header className="bg-indigo-700 dark:bg-gray-800 text-white py-4 px-4 shadow-md sticky top-0 z-40 transition-colors duration-200">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="w-6 h-6 text-indigo-200 dark:text-indigo-400" />
            <h1 className="text-lg font-bold tracking-tight">SmartSpend</h1>
          </div>
          <div className="flex items-center gap-2">
            {deferredPrompt && (
              <button 
                onClick={handleInstallClick}
                className="bg-white/10 hover:bg-white/20 text-white text-xs font-medium px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-colors mr-1"
              >
                <Download className="w-3.5 h-3.5" />
                Install App
              </button>
            )}
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <Moon className="w-5 h-5 text-indigo-100" /> : <Sun className="w-5 h-5 text-yellow-300" />}
            </button>
          </div>
        </div>
      </header>

      <main>
        {activeTab === 'input' && <InputPage />}
        {activeTab === 'bazar' && <BazarPage />}
        {activeTab === 'report' && <ReportPage />}
        {activeTab === 'month' && <DashboardView period="month" />}
        {activeTab === 'year' && <DashboardView period="year" />}
      </main>

      <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default App;