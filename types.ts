export type TransactionType = 'income' | 'expense' | 'transfer';
export type AccountType = string;

export interface Account {
  id: string;
  name: string;
  emoji: string;
  isDefault?: boolean;
}

export enum Category {
  FOOD = 'Food & Dining',
  BAZAR = 'Bazar & Groceries',
  TRANSPORT = 'Transportation',
  UTILITIES = 'Utilities',
  HOUSING = 'Housing',
  ENTERTAINMENT = 'Entertainment',
  SHOPPING = 'Shopping',
  HEALTH = 'Health',
  SALARY = 'Salary',
  INVESTMENT = 'Investment',
  TRANSFER = 'Transfer',
  LENDING = 'Lending & Debt',
  SEND_HOME = 'Send Home',
  OTHER = 'Other'
}

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  category: Category | string;
  description: string;
  date: string; // ISO String
  accountId: AccountType;
  targetAccountId?: AccountType; // Only for transfers
}

export interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  savingsRate: number;
  // Specific balances are now handled dynamically via accountBalances map
}