import React, { useState } from 'react';
import { PlusCircle, Loader2, Sparkles, ArrowRightLeft, Banknote } from 'lucide-react';
import { Transaction, TransactionType, Category, AccountType, Account } from '../types';
import { categorizeDescription } from '../services/geminiService';

interface TransactionFormProps {
  onAddTransaction: (t: Omit<Transaction, 'id'>) => void;
  accounts: Account[];
}

const TransactionForm: React.FC<TransactionFormProps> = ({ onAddTransaction, accounts }) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType | 'withdrawal'>('expense');
  const [category, setCategory] = useState<string>(Category.FOOD);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Default to first account or 'salary' if exists
  const defaultAccount = accounts.find(a => a.id === 'salary')?.id || accounts[0]?.id || '';
  const defaultTarget = accounts.find(a => a.id === 'savings')?.id || accounts[1]?.id || accounts[0]?.id || '';
  const defaultCash = accounts.find(a => a.id === 'cash')?.id || '';

  const [accountId, setAccountId] = useState<AccountType>(defaultAccount);
  const [targetAccountId, setTargetAccountId] = useState<AccountType>(defaultTarget);
  const [isAutoCategorizing, setIsAutoCategorizing] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((type !== 'withdrawal' && !description) || !amount) return;

    let finalType: TransactionType = 'expense';
    let finalCategory = category;
    let finalTargetAccountId = undefined;
    let finalDescription = description;

    if (type === 'withdrawal') {
      finalType = 'transfer';
      finalCategory = Category.TRANSFER;
      finalTargetAccountId = defaultCash; // Default withdrawal target is Cash
      finalDescription = description || 'Cash Withdrawal';
    } else if (type === 'transfer') {
      finalType = 'transfer';
      finalCategory = Category.TRANSFER;
      finalTargetAccountId = targetAccountId;
    } else {
      finalType = type;
    }

    onAddTransaction({
      description: finalDescription,
      amount: parseFloat(amount),
      type: finalType,
      category: finalCategory,
      date,
      accountId,
      targetAccountId: finalTargetAccountId
    });

    setDescription('');
    setAmount('');
    if(type === 'withdrawal') setDescription(''); 
  };

  const handleMagicCategorize = async () => {
    if (!description) return;
    setIsAutoCategorizing(true);
    const suggested = await categorizeDescription(description);
    if (suggested) {
      setCategory(suggested);
    }
    setIsAutoCategorizing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-100 dark:border-gray-700 mb-8 transition-colors duration-200">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
        <PlusCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        New Transaction
      </h3>
      
      {/* Type Toggle - Scrollable on small screens if needed */}
      <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg mb-6 overflow-x-auto">
        <button
          type="button"
          onClick={() => setType('expense')}
          className={`flex-1 min-w-[70px] py-2 text-xs md:text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
            type === 'expense' 
              ? 'bg-white dark:bg-gray-600 text-red-600 dark:text-red-400 shadow-sm' 
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          Expense
        </button>
        <button
          type="button"
          onClick={() => setType('transfer')}
          className={`flex-1 min-w-[70px] py-2 text-xs md:text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
            type === 'transfer' 
              ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm' 
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          Transfer
        </button>
        {defaultCash && (
            <button
            type="button"
            onClick={() => setType('withdrawal')}
            className={`flex-1 min-w-[70px] py-2 text-xs md:text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                type === 'withdrawal' 
                ? 'bg-white dark:bg-gray-600 text-amber-600 dark:text-amber-400 shadow-sm' 
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
            >
            Withdraw
            </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Amount */}
        <div className="relative">
          <span className="absolute left-3 top-2.5 text-gray-500 dark:text-gray-400 font-bold text-xs pt-0.5">Tk</span>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            step="0.01"
            required
          />
        </div>

        {/* Date */}
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          required
        />
      </div>

      {type === 'withdrawal' && (
        <div className="mb-4 bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-100 dark:border-amber-800/50">
          <div className="flex items-center gap-2 mb-3 text-amber-800 dark:text-amber-200 text-sm font-medium">
            <Banknote className="w-4 h-4" />
            Cash Withdrawal
          </div>
          <div className="grid grid-cols-1 gap-4">
             <div>
               <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">From Account</label>
               <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value as AccountType)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {accounts.filter(a => a.id !== defaultCash).map(a => (
                    <option key={a.id} value={a.id}>{a.emoji} {a.name}</option>
                ))}
              </select>
             </div>
             <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
               <ArrowRightLeft className="w-4 h-4" />
               <span>To <strong>Cash (Wallet)</strong></span>
             </div>
          </div>
        </div>
      )}

      {type === 'transfer' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 items-center">
           <div>
             <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">From Account</label>
             <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value as AccountType)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {accounts.map(a => (
                  <option key={a.id} value={a.id}>{a.emoji} {a.name}</option>
              ))}
            </select>
           </div>
           <div className="flex flex-col items-center justify-center pt-5 md:pt-0">
             <ArrowRightLeft className="w-5 h-5 text-gray-400 rotate-90 md:rotate-0" />
           </div>
           <div>
             <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">To Account</label>
             <select
              value={targetAccountId}
              onChange={(e) => setTargetAccountId(e.target.value as AccountType)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {accounts.map(a => (
                  <option key={a.id} value={a.id}>{a.emoji} {a.name}</option>
              ))}
            </select>
           </div>
        </div>
      )}

      {type !== 'transfer' && type !== 'withdrawal' && (
        <div className="mb-4">
           <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
             {type === 'income' ? 'Deposit to' : 'Paid from'}
           </label>
           <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value as AccountType)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {accounts.map(a => (
                  <option key={a.id} value={a.id}>{a.emoji} {a.name}</option>
              ))}
            </select>
        </div>
      )}

      {/* Description & Category */}
      <div className="space-y-4 mb-6">
        <div className="relative flex gap-2">
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={type === 'transfer' ? "Transfer Description" : type === 'withdrawal' ? "Notes (Optional)" : "Description (e.g. Starbucks)"}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            required={type !== 'withdrawal'}
          />
          {type !== 'transfer' && type !== 'withdrawal' && (
            <button
              type="button"
              onClick={handleMagicCategorize}
              disabled={isAutoCategorizing || !description}
              className="px-3 py-2 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg border border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/50 disabled:opacity-50"
              title="Auto-categorize with AI"
            >
              {isAutoCategorizing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            </button>
          )}
        </div>

        {type !== 'transfer' && type !== 'withdrawal' && (
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {Object.values(Category).filter(c => c !== Category.TRANSFER).map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
              {!Object.values(Category).includes(category as Category) && (
                <option value={category}>{category}</option>
              )}
            </select>
          </div>
        )}
      </div>

      <button
        type="submit"
        className={`w-full text-white font-medium py-2.5 rounded-lg transition-colors shadow-sm active:transform active:scale-[0.98] ${
          type === 'withdrawal' 
            ? 'bg-amber-600 hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-700' 
            : 'bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600'
        }`}
      >
        {type === 'transfer' ? 'Execute Transfer' : type === 'withdrawal' ? 'Withdraw Cash' : 'Add Transaction'}
      </button>
    </form>
  );
};

export default TransactionForm;