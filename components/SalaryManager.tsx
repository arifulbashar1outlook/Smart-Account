import React, { useState } from 'react';
import { Plus, ArrowDownCircle, Wallet, ArrowRight } from 'lucide-react';
import { Transaction, AccountType, Category } from '../types';

interface SalaryManagerProps {
  onAddTransaction: (t: Omit<Transaction, 'id'>) => void;
}

const SalaryManager: React.FC<SalaryManagerProps> = ({ onAddTransaction }) => {
  const [activeTab, setActiveTab] = useState<'salary' | 'received'>('salary');
  
  // Salary State
  const [salaryAmount, setSalaryAmount] = useState<string>('');

  // Received Money State
  const [receivedAmount, setReceivedAmount] = useState('');
  const [receivedDesc, setReceivedDesc] = useState('');
  const [receivedDestination, setReceivedDestination] = useState<AccountType>('cash');

  const handleAddSalary = () => {
    if (!salaryAmount) return;

    // Protection against accidental touches
    const confirmMsg = `Are you sure you want to add Tk ${parseFloat(salaryAmount).toLocaleString()} to your Salary Account?`;
    if (!window.confirm(confirmMsg)) {
        return;
    }

    onAddTransaction({
      amount: parseFloat(salaryAmount),
      type: 'income',
      category: Category.SALARY,
      description: 'Monthly Salary',
      date: new Date().toISOString().split('T')[0],
      accountId: 'salary' // Fixed to Salary Account as requested
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
      date: new Date().toISOString().split('T')[0],
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
               <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-2.5 text-gray-500 dark:text-gray-400 font-bold text-xs pt-0.5">Tk</span>
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
                    className="px-6 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-200 dark:shadow-none active:scale-[0.98] flex items-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    Add
                  </button>
               </div>
               <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 flex items-center gap-1">
                  <ArrowRight className="w-3 h-3" /> 
                  Will be added to <strong>Salary Account</strong>
               </p>
            </div>
          </div>
        )}

        {/* --- RECEIVED (GENERAL) TAB --- */}
        {activeTab === 'received' && (
          <div className="space-y-4">
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
                    <option value="cash">Cash 💵</option>
                    <option value="salary">Salary Account 🏦</option>
                    <option value="savings">Savings Account 🐷</option>
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