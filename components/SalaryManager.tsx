import React, { useState } from 'react';
import { Plus, ArrowDownCircle, Wallet, ArrowRight, CalendarDays } from 'lucide-react';
import { Transaction, AccountType, Category, Account } from '../types';

interface SalaryManagerProps {
  onAddTransaction: (t: Omit<Transaction, 'id'>) => void;
  accounts: Account[];
}

const SalaryManager: React.FC<SalaryManagerProps> = ({ onAddTransaction, accounts }) => {
  const [activeTab, setActiveTab] = useState<'salary' | 'received'>('salary');
  
  // Salary State
  const [salaryAmount, setSalaryAmount] = useState<string>('');
  
  // Default salary to the 'salary' id if present, else first account
  const defaultSalaryAcc = accounts.find(a => a.id === 'salary')?.id || accounts[0]?.id;
  const [salaryTarget, setSalaryTarget] = useState<string>(defaultSalaryAcc || '');

  // Received Money State
  const [receivedAmount, setReceivedAmount] = useState('');
  const [receivedDesc, setReceivedDesc] = useState('');
  const [receivedDestination, setReceivedDestination] = useState<AccountType>(accounts.find(a => a.id === 'cash')?.id || accounts[0]?.id);

  // Shared Date State
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const handleAddSalary = () => {
    if (!salaryAmount) return;

    const accName = accounts.find(a => a.id === salaryTarget)?.name || 'Salary Account';

    // Protection against accidental touches
    const confirmMsg = `Are you sure you want to add Tk ${parseFloat(salaryAmount).toLocaleString()} to ${accName}?`;
    if (!window.confirm(confirmMsg)) {
        return;
    }

    onAddTransaction({
      amount: parseFloat(salaryAmount),
      type: 'income',
      category: Category.SALARY,
      description: 'Monthly Salary',
      date: date,
      accountId: salaryTarget 
    });

    setSalaryAmount(''); // Clear input after adding
  };

  const handleAddReceivedMoney = () => {
    if (!receivedAmount) return;
    onAddTransaction({
      amount: parseFloat(receivedAmount),
      type: 'income',
      category: Category.OTHER,
      description: receivedDesc || 'Received Money',
      date: date,
      accountId: receivedDestination
    });
    setReceivedAmount('');
    setReceivedDesc('');
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden mb-6 transition-colors duration-200">
      {/* Tabs */}
      <div className="flex border-b border-gray-100 dark:border-gray-700 overflow-x-auto">
        <button
          onClick={() => setActiveTab('salary')}
          className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors min-w-[100px] ${
            activeTab === 'salary' 
              ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400' 
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
          }`}
        >
          <Wallet className="w-4 h-4" />
          Salary
        </button>
        <button
          onClick={() => setActiveTab('received')}
          className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors min-w-[100px] ${
            activeTab === 'received' 
              ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-600 dark:border-emerald-400' 
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
          }`}
        >
          <ArrowDownCircle className="w-4 h-4" />
          Receive
        </button>
      </div>

      <div className="p-6">
        {/* --- SALARY TAB --- */}
        {activeTab === 'salary' && (
          <div className="space-y-4">
            <div>
               <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Enter Monthly Salary</label>
               <div className="flex flex-col sm:flex-row gap-2">
                  <input 
                      type="date" 
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-3 text-gray-500 dark:text-gray-400 font-bold text-xs pt-0.5">Tk</span>
                    <input
                        type="number"
                        value={salaryAmount}
                        onChange={(e) => setSalaryAmount(e.target.value)}
                        placeholder="e.g. 50000"
                        className="w-full pl-9 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-lg font-semibold"
                    />
                  </div>
                  <button
                    onClick={handleAddSalary}
                    disabled={!salaryAmount}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-200 dark:shadow-none active:scale-[0.98] flex items-center justify-center gap-2 sm:w-auto w-full"
                  >
                    <Plus className="w-5 h-5" />
                    Add
                  </button>
               </div>
               <div className="mt-2">
                   <label className="text-xs text-gray-500 dark:text-gray-400 mr-2">Target Account:</label>
                   <select 
                     value={salaryTarget}
                     onChange={(e) => setSalaryTarget(e.target.value)}
                     className="text-xs border-none bg-transparent outline-none font-medium text-gray-700 dark:text-gray-300"
                   >
                       {accounts.map(a => (
                           <option key={a.id} value={a.id}>{a.emoji} {a.name}</option>
                       ))}
                   </select>
               </div>
            </div>
          </div>
        )}

        {/* --- RECEIVED (GENERAL) TAB --- */}
        {activeTab === 'received' && (
          <div className="space-y-4">
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                 <div>
                   <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Date</label>
                   <input 
                      type="date" 
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                   />
                 </div>
                 <div>
                   <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Amount</label>
                   <div className="relative">
                      <span className="absolute left-3 top-2.5 text-gray-500 dark:text-gray-400 font-bold text-xs pt-0.5">Tk</span>
                      <input
                        type="number"
                        value={receivedAmount}
                        onChange={(e) => setReceivedAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-9 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                   </div>
                 </div>
             </div>

             <div className="grid grid-cols-2 gap-3">
               <div className="col-span-2">
                 <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Description (Optional)</label>
                 <input
                    type="text"
                    value={receivedDesc}
                    onChange={(e) => setReceivedDesc(e.target.value)}
                    placeholder="e.g. Gift, Bonus"
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
               </div>
               <div className="col-span-2">
                 <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Deposit To</label>
                 <select
                    value={receivedDestination}
                    onChange={(e) => setReceivedDestination(e.target.value as AccountType)}
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  >
                    {accounts.map(a => (
                        <option key={a.id} value={a.id}>{a.emoji} {a.name}</option>
                    ))}
                  </select>
               </div>
             </div>

             <button
              onClick={handleAddReceivedMoney}
              disabled={!receivedAmount}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-3 rounded-xl hover:bg-emerald-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-emerald-200 dark:shadow-none active:scale-[0.98] transform mt-2"
            >
              <Wallet className="w-5 h-5" />
              Receive Money
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SalaryManager;