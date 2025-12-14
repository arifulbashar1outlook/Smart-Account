import React, { useState, useMemo } from 'react';
import { 
  User, 
  Search, 
  ArrowLeft, 
  Plus, 
  Trash2, 
  ArrowRight,
  UserMinus, 
  UserPlus,
  ChevronRight,
  CalendarDays,
  X,
  Check
} from 'lucide-react';
import { Transaction, Category, AccountType, Account } from '../types';

interface LendingViewProps {
  transactions: Transaction[];
  accounts: Account[];
  onAddTransaction: (t: Omit<Transaction, 'id'>) => void;
  onUpdateTransaction: (t: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
}

const LendingView: React.FC<LendingViewProps> = ({ transactions, accounts, onAddTransaction, onUpdateTransaction, onDeleteTransaction }) => {
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const defaultCash = accounts.find(a => a.id === 'cash')?.id || accounts[0]?.id || '';

  // Transaction Form State within Detail View
  const [amount, setAmount] = useState('');
  const [account, setAccount] = useState<AccountType>(defaultCash);
  const [formMode, setFormMode] = useState<'lend' | 'recover'>('lend');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // New Person State
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');

  // Edit State
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editDesc, setEditDesc] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editAccount, setEditAccount] = useState<AccountType>(defaultCash);

  // Helper to extract person name from transaction description
  const getPersonData = (t: Transaction) => {
    if (t.category !== Category.LENDING) return null;
    const lendMatch = t.description.match(/Lent to\s+(.*)/i);
    const returnMatch = t.description.match(/Returned by\s+(.*)/i);
    
    if (lendMatch) return { name: lendMatch[1].trim(), type: 'lend', amount: t.amount };
    if (returnMatch) return { name: returnMatch[1].trim(), type: 'recover', amount: t.amount };
    return null;
  };

  // Group Data by Person to build the directory
  const peopleData = useMemo(() => {
    const people: Record<string, { balance: number, lastTxDate: string }> = {};
    
    transactions.forEach(t => {
      const data = getPersonData(t);
      if (!data) return;
      
      // Initialize if not exists
      if (!people[data.name]) {
        people[data.name] = { balance: 0, lastTxDate: t.date };
      }
      
      if (data.type === 'lend') {
        people[data.name].balance += data.amount;
      } else {
        people[data.name].balance -= data.amount;
      }
      
      // Track last activity
      if (new Date(t.date) > new Date(people[data.name].lastTxDate)) {
        people[data.name].lastTxDate = t.date;
      }
    });

    return Object.entries(people)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => new Date(b.lastTxDate).getTime() - new Date(a.lastTxDate).getTime());
  }, [transactions]);

  const filteredPeople = peopleData.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const personTransactions = useMemo(() => {
    if (!selectedPerson) return [];
    return transactions.filter(t => {
      const data = getPersonData(t);
      return data && data.name === selectedPerson;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, selectedPerson]);

  const handleTransaction = () => {
    if (!amount || !selectedPerson) return;
    
    const description = formMode === 'lend' 
      ? `Lent to ${selectedPerson}` 
      : `Returned by ${selectedPerson}`;
      
    const type = formMode === 'lend' ? 'expense' : 'income';

    onAddTransaction({
      amount: parseFloat(amount),
      type,
      category: Category.LENDING,
      description,
      date: date,
      accountId: account
    });
    
    setAmount('');
  };

  const handleAddNewPerson = () => {
    if(newPersonName) {
        setSelectedPerson(newPersonName);
        setNewPersonName('');
        setIsAddingNew(false);
    }
  }

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
          if (confirm("Are you sure you want to delete this transaction?")) {
              onDeleteTransaction(editingTx.id);
              setEditingTx(null);
          }
      }
  };

  // --- Render List View ---
  if (!selectedPerson) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 pb-24 relative">
         <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <UserMinus className="w-6 h-6 text-amber-500" />
              Lending Manager
            </h2>
            <p className="text-gray-500 dark:text-gray-400">Track loans and repayments</p>
         </div>

         <div className="flex gap-2 mb-6">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input 
                  type="text"
                  placeholder="Search name..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-gray-900 dark:text-white"
                />
            </div>
            <button 
              onClick={() => setIsAddingNew(true)}
              className="bg-amber-500 hover:bg-amber-600 text-white px-3 rounded-lg flex items-center gap-1 shadow-sm"
            >
               <Plus className="w-5 h-5" />
            </button>
         </div>

         {isAddingNew && (
             <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-xl border border-amber-200 dark:border-amber-800 animate-in slide-in-from-top-2">
                 <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Add New Person</h3>
                 <div className="flex gap-2">
                     <input 
                        type="text"
                        placeholder="Enter name"
                        value={newPersonName}
                        onChange={e => setNewPersonName(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-transparent text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                        autoFocus
                     />
                     <button onClick={() => setIsAddingNew(false)} className="px-3 py-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">Cancel</button>
                     <button 
                        onClick={handleAddNewPerson}
                        disabled={!newPersonName}
                        className="bg-amber-600 text-white px-4 py-2 rounded-lg disabled:opacity-50 hover:bg-amber-700 font-medium"
                     >
                         Start
                     </button>
                 </div>
             </div>
         )}

         <div className="space-y-3">
            {filteredPeople.map(p => (
                <div 
                  key={p.name}
                  onClick={() => setSelectedPerson(p.name)}
                  className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between cursor-pointer hover:border-amber-300 dark:hover:border-amber-700 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold text-sm">
                            {p.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">{p.name}</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Last: {new Date(p.lastTxDate).toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                         <div className="text-right">
                             <p className="text-[10px] text-gray-400 uppercase font-semibold">Balance</p>
                             <p className={`font-bold ${p.balance > 0 ? 'text-red-500' : p.balance < 0 ? 'text-green-500' : 'text-gray-400'}`}>
                                 Tk {Math.abs(p.balance).toLocaleString()}
                                 <span className="text-[10px] ml-1 opacity-70">
                                     {p.balance > 0 ? '(Due)' : p.balance < 0 ? '(Adv)' : ''}
                                 </span>
                             </p>
                         </div>
                         <ChevronRight className="w-5 h-5 text-gray-300 dark:text-gray-600" />
                    </div>
                </div>
            ))}
            {filteredPeople.length === 0 && !isAddingNew && (
                <div className="text-center py-10 text-gray-400 dark:text-gray-600">
                    <User className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p>No records found</p>
                </div>
            )}
         </div>
      </div>
    );
  }

  // --- Render Detail View ---
  const totalBalance = personTransactions.reduce((acc, t) => {
     const data = getPersonData(t);
     if (!data) return acc;
     return acc + (data.type === 'lend' ? t.amount : -t.amount);
  }, 0);

  return (
      <div className="max-w-2xl mx-auto px-4 py-8 pb-24 relative">
          {/* Edit Modal */}
         {editingTx && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                        <h3 className="font-bold text-gray-900 dark:text-white">Edit Lending Info</h3>
                        <button onClick={() => setEditingTx(null)} className="text-gray-400 hover:text-gray-600">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="p-4 space-y-3">
                        <div>
                            <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Description</label>
                            <input 
                                type="text" 
                                value={editDesc}
                                onChange={(e) => setEditDesc(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-transparent text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                             <div>
                                <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Amount</label>
                                <input 
                                    type="number" 
                                    value={editAmount}
                                    onChange={(e) => setEditAmount(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-transparent text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                                />
                             </div>
                             <div>
                                <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Account</label>
                                <select
                                    value={editAccount}
                                    onChange={(e) => setEditAccount(e.target.value as AccountType)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-transparent text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500 text-sm"
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
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-transparent text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500 text-sm"
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
                             <button onClick={saveEdit} className="px-4 py-2 text-sm bg-amber-600 text-white hover:bg-amber-700 rounded-lg font-medium flex items-center justify-center gap-2">
                                <Check className="w-4 h-4" /> Save
                             </button>
                        </div>
                    </div>
                </div>
            </div>
         )}

          <button 
            onClick={() => setSelectedPerson(null)}
            className="flex items-center gap-1 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 mb-6"
          >
              <ArrowLeft className="w-4 h-4" /> Back to List
          </button>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 mb-6 text-center">
              <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 mx-auto flex items-center justify-center text-2xl font-bold mb-3">
                  {selectedPerson.charAt(0).toUpperCase()}
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{selectedPerson}</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">Account Directory</p>
              
              <div className="inline-block px-4 py-2 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800">
                  <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">Net Outstanding:</span>
                  <span className={`font-bold text-lg ${totalBalance > 0 ? 'text-red-500' : totalBalance < 0 ? 'text-green-500' : 'text-gray-500'}`}>
                      Tk {Math.abs(totalBalance).toLocaleString()}
                      {totalBalance > 0 ? ' (Due)' : totalBalance < 0 ? ' (Paid)' : ''}
                  </span>
              </div>
          </div>

          {/* Action Form */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 mb-6">
              <div className="flex gap-2 mb-4">
                  <button 
                    onClick={() => setFormMode('lend')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors ${formMode === 'lend' ? 'bg-red-50 text-red-600 border border-red-200 dark:bg-red-900/20 dark:border-red-800' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                  >
                      <UserMinus className="w-4 h-4" /> Give / Lend
                  </button>
                  <button 
                    onClick={() => setFormMode('recover')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors ${formMode === 'recover' ? 'bg-green-50 text-green-600 border border-green-200 dark:bg-green-900/20 dark:border-green-800' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                  >
                      <UserPlus className="w-4 h-4" /> Receive Back
                  </button>
              </div>

              <div className="flex flex-col gap-3">
                 <div className="flex gap-2">
                     <div className="relative flex-1">
                        <CalendarDays className="absolute left-3 top-2.5 w-4 h-4 text-gray-500 dark:text-gray-400" />
                        <input 
                           type="date" 
                           value={date}
                           onChange={e => setDate(e.target.value)}
                           className="w-full pl-9 pr-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-transparent text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                     </div>
                     <select
                        value={account}
                        onChange={e => setAccount(e.target.value as AccountType)}
                        className="w-28 sm:w-36 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-transparent text-gray-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                     >
                        {accounts.map(a => (
                            <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                     </select>
                 </div>
                 <div className="flex gap-2">
                     <div className="relative flex-1">
                         <span className="absolute left-3 top-2.5 text-gray-500 dark:text-gray-400 text-xs font-bold">Tk</span>
                         <input 
                           type="number" 
                           value={amount}
                           onChange={e => setAmount(e.target.value)}
                           placeholder="0.00"
                           className="w-full pl-8 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-transparent text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                         />
                     </div>
                     <button 
                        onClick={handleTransaction}
                        disabled={!amount}
                        className={`px-4 py-2 rounded-lg text-white font-medium disabled:opacity-50 transition-colors ${formMode === 'lend' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
                     >
                         <Plus className="w-5 h-5" />
                     </button>
                 </div>
              </div>
          </div>

          <h3 className="font-medium text-gray-900 dark:text-white mb-3 text-sm uppercase tracking-wide">History</h3>
          <div className="space-y-3">
              {personTransactions.map(t => {
                   const data = getPersonData(t)!;
                   return (
                       <div 
                        key={t.id} 
                        onClick={() => startEditing(t)}
                        className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg group cursor-pointer hover:border-amber-300 dark:hover:border-amber-700 transition-colors"
                       >
                           <div className="flex items-center gap-3">
                               <div className={`w-8 h-8 rounded-full flex items-center justify-center ${data.type === 'lend' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'}`}>
                                   {data.type === 'lend' ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
                               </div>
                               <div>
                                   <p className="text-sm font-medium text-gray-900 dark:text-white">
                                       {data.type === 'lend' ? 'Lent Money' : 'Received Back'}
                                   </p>
                                   <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(t.date).toLocaleDateString()}</p>
                               </div>
                           </div>
                           <div className="flex items-center gap-3">
                               <span className={`font-bold text-sm ${data.type === 'lend' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                   Tk {t.amount.toLocaleString()}
                               </span>
                           </div>
                       </div>
                   );
              })}
              {personTransactions.length === 0 && (
                  <p className="text-center text-gray-400 dark:text-gray-500 py-4 text-sm">No transactions yet.</p>
              )}
          </div>
      </div>
  );
};

export default LendingView;