import React, { useState, useMemo } from 'react';
import { History, Receipt, TrendingUp, TrendingDown, ArrowRightLeft, Trash2, X, Check, CalendarDays, FilterX, CalendarRange, Calendar } from 'lucide-react';
import { Transaction, AccountType, Category, TransactionType } from '../types';

interface HistoryViewProps {
  transactions: Transaction[];
  onUpdateTransaction: (t: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({ transactions, onUpdateTransaction, onDeleteTransaction }) => {
    // Filter State
    const [filterType, setFilterType] = useState<'date' | 'month'>('date');
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

    // Edit State
    const [editingTx, setEditingTx] = useState<Transaction | null>(null);
    const [editDesc, setEditDesc] = useState('');
    const [editAmount, setEditAmount] = useState('');
    const [editDate, setEditDate] = useState('');
    const [editAccount, setEditAccount] = useState<AccountType>('cash');
    const [editCategory, setEditCategory] = useState<string>('');
    const [editType, setEditType] = useState<TransactionType>('expense');

    // Filter transactions based on selection
    const filteredTransactions = useMemo(() => {
        if (filterType === 'date') {
            if (!selectedDate) return transactions;
            return transactions.filter(t => t.date.startsWith(selectedDate));
        } else {
            if (!selectedMonth) return transactions;
            return transactions.filter(t => t.date.startsWith(selectedMonth));
        }
    }, [transactions, filterType, selectedDate, selectedMonth]);

    const groupedAll = useMemo(() => {
        const groups: Record<string, Transaction[]> = {};
        filteredTransactions.forEach(t => {
            if (!t.date) return;
            const dateKey = t.date.split('T')[0];
            if (!groups[dateKey]) groups[dateKey] = [];
            groups[dateKey].push(t);
        });
        return groups;
    }, [filteredTransactions]);
    
    const sortedAllDates = Object.keys(groupedAll).sort((a,b) => new Date(b).getTime() - new Date(a).getTime());

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
       <div className="max-w-3xl mx-auto px-4 py-8 pb-24 relative">
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

         <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <History className="w-6 h-6 text-indigo-500" />
              Transaction History
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Full log of all activities</p>
         </div>

         {/* Filter Section */}
         <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 mb-6 space-y-4">
            {/* Filter Type Toggle */}
            <div className="flex gap-2 bg-gray-100 dark:bg-gray-700/50 p-1 rounded-lg">
                <button 
                    onClick={() => setFilterType('date')}
                    className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-all ${filterType === 'date' ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
                >
                    Specific Date
                </button>
                <button 
                    onClick={() => setFilterType('month')}
                    className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-all ${filterType === 'month' ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
                >
                    Entire Month
                </button>
            </div>

            <div className="flex items-end gap-3">
                <div className="flex-1">
                    <label className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1 block">
                        {filterType === 'date' ? 'Select Date' : 'Select Month'}
                    </label>
                    <div className="relative">
                        {filterType === 'date' ? (
                            <CalendarDays className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                        ) : (
                            <CalendarRange className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                        )}
                        
                        {filterType === 'date' ? (
                            <input 
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        ) : (
                            <input 
                                type="month"
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        )}
                    </div>
                </div>
                {((filterType === 'date' && selectedDate) || (filterType === 'month' && selectedMonth)) && (
                    <button 
                        onClick={() => {
                            if (filterType === 'date') setSelectedDate('');
                            else setSelectedMonth('');
                        }}
                        className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-gray-500 dark:text-gray-300 transition-colors h-[38px] w-[38px] flex items-center justify-center"
                        title="Clear Filter"
                    >
                        <FilterX className="w-5 h-5" />
                    </button>
                )}
            </div>
         </div>

         <div className="animate-in fade-in slide-in-from-right-4 duration-300">
             {filteredTransactions.length === 0 ? (
                <div className="text-center py-12">
                   <Receipt className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                   <p className="text-gray-500">
                       No transactions found.
                   </p>
                </div>
             ) : (
                <div className="space-y-6">
                    {sortedAllDates.map(date => {
                        const dayTransactions = groupedAll[date];
                        return (
                            <div key={date}>
                                <div className="sticky top-0 z-10 bg-gray-50/95 dark:bg-gray-900/95 backdrop-blur-sm py-2 mb-2 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                                    <h3 className="font-semibold text-gray-800 dark:text-gray-200">
                                        {new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                    </h3>
                                    {filterType === 'month' && (
                                         <span className="text-xs font-medium text-gray-500 bg-gray-200 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                                            {dayTransactions.length} items
                                         </span>
                                    )}
                                </div>
                                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                                    {dayTransactions.map(t => (
                                        <div 
                                            key={t.id} 
                                            onClick={() => startEditing(t)}
                                            className="p-4 border-b border-gray-100 dark:border-gray-700 last:border-0 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer group"
                                        >
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

export default HistoryView;