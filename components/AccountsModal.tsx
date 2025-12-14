import React, { useState } from 'react';
import { X, Plus, Edit2, Check, Save } from 'lucide-react';
import { Account } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface AccountsModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  onUpdateAccounts: (accounts: Account[]) => void;
}

const AccountsModal: React.FC<AccountsModalProps> = ({ isOpen, onClose, accounts, onUpdateAccounts }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmoji, setEditEmoji] = useState('');

  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountEmoji, setNewAccountEmoji] = useState('💰');

  const handleStartEdit = (acc: Account) => {
    setEditingId(acc.id);
    setEditName(acc.name);
    setEditEmoji(acc.emoji);
  };

  const handleSaveEdit = () => {
    if (!editName.trim()) return;
    const updated = accounts.map(acc => 
      acc.id === editingId ? { ...acc, name: editName, emoji: editEmoji } : acc
    );
    onUpdateAccounts(updated);
    setEditingId(null);
  };

  const handleAddAccount = () => {
    if (!newAccountName.trim()) return;
    const newAccount: Account = {
      id: uuidv4(),
      name: newAccountName,
      emoji: newAccountEmoji
    };
    onUpdateAccounts([...accounts, newAccount]);
    setNewAccountName('');
    setNewAccountEmoji('💰');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Manage Accounts</h2>
            <button 
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
                <X className="w-6 h-6" />
            </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
            {/* Add New Section */}
            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Add New Account</h3>
                <div className="flex gap-2">
                    <input 
                      type="text"
                      value={newAccountEmoji}
                      onChange={(e) => setNewAccountEmoji(e.target.value)}
                      className="w-12 text-center text-xl p-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Emoji"
                    />
                    <input 
                      type="text"
                      value={newAccountName}
                      onChange={(e) => setNewAccountName(e.target.value)}
                      className="flex-1 p-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      placeholder="Account Name (e.g. Bkash)"
                    />
                    <button 
                      onClick={handleAddAccount}
                      disabled={!newAccountName}
                      className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Your Accounts</h3>
                {accounts.map(acc => (
                    <div key={acc.id} className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl">
                        {editingId === acc.id ? (
                           <>
                             <input 
                                value={editEmoji}
                                onChange={(e) => setEditEmoji(e.target.value)}
                                className="w-10 text-center p-1 border rounded bg-transparent dark:text-white"
                             />
                             <input 
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="flex-1 p-1 border rounded bg-transparent dark:text-white text-sm"
                                autoFocus
                             />
                             <button onClick={handleSaveEdit} className="text-green-600 p-1">
                                 <Check className="w-5 h-5" />
                             </button>
                           </>
                        ) : (
                           <>
                             <div className="w-10 h-10 flex items-center justify-center bg-gray-50 dark:bg-gray-700 rounded-full text-xl">
                                 {acc.emoji}
                             </div>
                             <div className="flex-1">
                                 <p className="font-medium text-gray-900 dark:text-white text-sm">{acc.name}</p>
                             </div>
                             <button onClick={() => handleStartEdit(acc)} className="text-gray-400 hover:text-indigo-600 p-2">
                                 <Edit2 className="w-4 h-4" />
                             </button>
                           </>
                        )}
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};

export default AccountsModal;