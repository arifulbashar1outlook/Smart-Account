import React, { useState, useMemo } from 'react';
import { ShoppingBag, Plus, CalendarDays, Clock, Trash2, X, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { Transaction, Category, AccountType, Account } from '../types';

interface BazarViewProps {
  transactions: Transaction[];
  accounts: Account[];
  onAddTransaction: (t: Omit<Transaction, 'id'>) => void;
  onUpdateTransaction: (t: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
}

const BazarView: React.FC<BazarViewProps> = ({ transactions, accounts, onAddTransaction, onUpdateTransaction, onDeleteTransaction }) => {
    // Helper to get local date string for datetime-local input (YYYY-MM-DDThh:mm)
    const getLocalDateTime = () => {
        const now = new Date();
        const offsetMs = now.getTimezoneOffset() * 60000;
        const localTime = new Date(now.getTime() - offsetMs);
        return localTime.toISOString().slice(0, 16);
    };

    const defaultCash = accounts.find(a => a.id === 'cash')?.id || accounts[0]?.id || '';
    
    const [item, setItem] = useState('');
    const [amount, setAmount] = useState('');
    const [paidFrom, setPaidFrom] = useState<AccountType>(defaultCash);
    // Initialize date with current device time
    const [dateTime, setDateTime] = useState(getLocalDateTime());

    // Navigation State for viewing different months
    const [viewDate, setViewDate] = useState(new Date());

    // Edit State
    const [editingTx, setEditingTx] = useState<Transaction | null>(null);
    const [editDesc, setEditDesc] = useState('');
    const [editAmount, setEditAmount] = useState('');
    const [editDate, setEditDate] = useState('');
    const [editAccount, setEditAccount] = useState<AccountType>(defaultCash);

    const changeMonth = (offset: number) => {
        const newDate = new Date(viewDate);
        newDate.setMonth(newDate.getMonth() + offset);
        setViewDate(newDate);
    };

    const currentMonth = viewDate.getMonth();
    const currentYear = viewDate.getFullYear();
    const monthName = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    // Check if we are viewing the current calendar month to allow adding items
    const isCurrentCalendarMonth = new Date().getMonth() === currentMonth && new Date().getFullYear() === currentYear;

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

      onAddTransaction({
        description: item,
        amount: parseFloat(amount),
        type: 'expense',
        category: Category.BAZAR,
        date: finalDate,
        accountId: paidFrom
      });
      setItem('');
      setAmount('');
      // Reset time to current device time for the next entry
      setDateTime(getLocalDateTime());
    };

    const startEditing = (t: Transaction) => {
        setEditingTx(t);
        setEditDesc(t.description);
        setEditAmount(t.amount.toString());
        // Handle potentially missing time or Z suffix for datetime-local input
        try {
            const d = new Date(t.date);
            // Adjust to local ISO string part for input
            const localIso = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
            setEditDate(localIso);
        } catch (e) {
            setEditDate(getLocalDateTime());
        }
        setEditAccount(t.accountId);
    };

    const saveEdit = () => {
        if (!editingTx || !editDesc || !editAmount) return;
        
        const updatedTx: Transaction = {
            ...editingTx,
            description: editDesc,
            amount: parseFloat(editAmount),
            date: new Date(editDate).toISOString(),
            accountId: editAccount
        };

        onUpdateTransaction(updatedTx);
        setEditingTx(null);
    };

    const handleDelete = () => {
        if (editingTx) {
            if (confirm("Are you sure you want to delete this item?")) {
                onDeleteTransaction(editingTx.id);
                setEditingTx(null);
            }
        }
    };

    const getGroupKey = (dateStr: string) => {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return new Date().toISOString();
        date.setSeconds(0, 0); 
        return date.toISOString();
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
      <div className="max-w-2xl mx-auto px-4 py-8 pb-24 relative">
         {/* Edit Modal */}
         {editingTx && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                        <h3 className="font-bold text-gray-900 dark:text-white">Edit Item</h3>
                        <button onClick={() => setEditingTx(null)} className="text-gray-400 hover:text-gray-600">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="p-4 space-y-3">
                        <div>
                            <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Item Name</label>
                            <input 
                                type="text" 
                                value={editDesc}
                                onChange={(e) => setEditDesc(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-transparent text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                             <div>
                                <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Amount</label>
                                <input 
                                    type="number" 
                                    value={editAmount}
                                    onChange={(e) => setEditAmount(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-transparent text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                             </div>
                             <div>
                                <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Account</label>
                                <select
                                    value={editAccount}
                                    onChange={(e) => setEditAccount(e.target.value as AccountType)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-transparent text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                                >
                                    {accounts.map(a => (
                                        <option key={a.id} value={a.id}>{a.emoji} {a.name}</option>
                                    ))}
                                </select>
                             </div>
                        </div>
                         <div>
                            <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Date & Time</label>
                            <input 
                                type="datetime-local" 
                                value={editDate}
                                onChange={(e) => setEditDate(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-transparent text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                            />
                        </div>
                    </div>
                    <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex justify-between gap-3 bg-gray-50 dark:bg-gray-800/50">
                        <button 
                            onClick={handleDelete}
                            className="text-red-600 hover:text-red-700 dark:text-red-400 text-sm font-medium flex items-center gap-2 px-2"
                        >
                            <Trash2 className="w-4 h-4" /> Delete
                        </button>
                        <div className="flex gap-2">
                            <button onClick={() => setEditingTx(null)} className="px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg">Cancel</button>
                            <button onClick={saveEdit} className="px-4 py-2 text-sm bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg font-medium flex items-center justify-center gap-2">
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

         <div className="mb-6 flex items-center justify-between">
           <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Bazar List</h2>
            <p className="text-gray-500 dark:text-gray-400">Items for {monthName}</p>
           </div>
           <div className="text-right">
             <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Total</p>
             <p className="text-xl font-bold text-rose-600 dark:text-rose-400">Tk {totalBazarSpend.toLocaleString()}</p>
           </div>
         </div>

         {isCurrentCalendarMonth && (
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
                          {accounts.map(a => (
                                <option key={a.id} value={a.id}>{a.emoji} {a.name}</option>
                           ))}
                        </select>
                        <button type="submit" className="ml-auto bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 text-sm font-medium whitespace-nowrap">
                          Add
                        </button>
                     </div>
                   </div>
                </div>
             </form>
         )}

         <div className="space-y-6">
           {bazarTransactions.length === 0 ? (
             <div className="text-center py-10 text-gray-400 dark:text-gray-600">
               <ShoppingBag className="w-12 h-12 mx-auto mb-2 opacity-50" />
               <p>No bazar items recorded for this month</p>
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
                          <div 
                              key={t.id} 
                              onClick={() => startEditing(t)}
                              className="flex items-center justify-between p-3 border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group cursor-pointer"
                          >
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
                                  onClick={(e) => {
                                      e.stopPropagation();
                                      onDeleteTransaction(t.id);
                                  }}
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

export default BazarView;