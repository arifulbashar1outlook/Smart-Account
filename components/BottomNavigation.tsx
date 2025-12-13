import React from 'react';
import { PlusCircle, ShoppingBag, FileClock, BarChartBig, Calendar, Receipt } from 'lucide-react';

interface BottomNavigationProps {
  activeTab: string;
  onTabChange: (tab: any) => void;
}

const BottomNavigation: React.FC<BottomNavigationProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-2 py-3 pb-safe z-50 transition-colors duration-200">
      <div className="max-w-md mx-auto flex justify-between items-center">
        
        <button
          onClick={() => onTabChange('input')}
          className={`flex flex-col items-center gap-1 transition-colors min-w-[3.5rem] ${
            activeTab === 'input' ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
          }`}
        >
          <div className={`p-1 rounded-full ${activeTab === 'input' ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}>
            <PlusCircle className={`w-6 h-6 ${activeTab === 'input' ? 'fill-indigo-600 text-white dark:fill-indigo-400 dark:text-gray-900' : ''}`} />
          </div>
          <span className="text-[10px] font-medium">Input</span>
        </button>

        <button
          onClick={() => onTabChange('bazar')}
          className={`flex flex-col items-center gap-1 transition-colors min-w-[3.5rem] ${
            activeTab === 'bazar' ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
          }`}
        >
          <div className={`p-1 rounded-full ${activeTab === 'bazar' ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}>
            <ShoppingBag className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-medium">Bazar</span>
        </button>

        <button
          onClick={() => onTabChange('bazar-report')}
          className={`flex flex-col items-center gap-1 transition-colors min-w-[3.5rem] ${
            activeTab === 'bazar-report' ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
          }`}
        >
          <div className={`p-1 rounded-full ${activeTab === 'bazar-report' ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}>
             <BarChartBig className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-medium">Bazar Report</span>
        </button>

        <button
          onClick={() => onTabChange('expense-report')}
          className={`flex flex-col items-center gap-1 transition-colors min-w-[3.5rem] ${
            activeTab === 'expense-report' ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
          }`}
        >
          <div className={`p-1 rounded-full ${activeTab === 'expense-report' ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}>
             <Receipt className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-medium">Expense Rpt</span>
        </button>

        <button
          onClick={() => onTabChange('dashboard')}
          className={`flex flex-col items-center gap-1 transition-colors min-w-[3.5rem] ${
            activeTab === 'dashboard' ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
          }`}
        >
          <div className={`p-1 rounded-full ${activeTab === 'dashboard' ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}>
             <Calendar className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-medium">Monthly</span>
        </button>

        <button
          onClick={() => onTabChange('history')}
          className={`flex flex-col items-center gap-1 transition-colors min-w-[3.5rem] ${
            activeTab === 'history' ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
          }`}
        >
          <div className={`p-1 rounded-full ${activeTab === 'history' ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}>
             <FileClock className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-medium">History</span>
        </button>

      </div>
    </div>
  );
};

export default BottomNavigation;