import React, { useState, useEffect } from 'react';
import { Save, AlertCircle, X, Database } from 'lucide-react';
import { saveFirebaseConfig, getStoredFirebaseConfig, clearFirebaseConfig, isInitialized } from '../services/firebase';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ConfigModal: React.FC<ConfigModalProps> = ({ isOpen, onClose }) => {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
        const current = getStoredFirebaseConfig();
        if (current) {
            setInput(JSON.stringify(current, null, 2));
        }
    }
  }, [isOpen]);

  const parseInput = (text: string) => {
    try {
        // 1. Try JSON parse first
        return JSON.parse(text);
    } catch (e) {
        // 2. Try to parse JS Object syntax (e.g. const firebaseConfig = { ... })
        // We clean up the string to extract just the object part
        let cleaned = text.trim();
        
        // Remove "const firebaseConfig =" or similar
        if (cleaned.includes('=')) {
            cleaned = cleaned.substring(cleaned.indexOf('=') + 1);
        }
        // Remove trailing semicolon
        if (cleaned.endsWith(';')) {
            cleaned = cleaned.substring(0, cleaned.length - 1);
        }
        
        cleaned = cleaned.trim();

        try {
            // Use Function constructor to safely evaluate the object literal
            // This allows unquoted keys like { apiKey: "..." }
            const fn = new Function(`return ${cleaned}`);
            const result = fn();
            if (typeof result === 'object' && result !== null) {
                return result;
            }
        } catch (e2) {
            throw new Error("Could not parse configuration. Please ensure it is a valid JSON or JavaScript object.");
        }
    }
    throw new Error("Invalid format.");
  };

  const handleSave = () => {
    setError('');
    try {
        if (!input.trim()) {
            setError("Configuration cannot be empty");
            return;
        }

        const config = parseInput(input);
        
        // Basic validation
        if (!config.apiKey || !config.projectId) {
            throw new Error("Missing required fields (apiKey, projectId)");
        }

        saveFirebaseConfig(config);
        onClose();
    } catch (err: any) {
        setError(err.message || "Invalid configuration format");
    }
  };

  const handleDisconnect = () => {
      if (confirm("Are you sure you want to disconnect? This will remove the configuration from this device.")) {
          clearFirebaseConfig();
          onClose();
      }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Database className="w-5 h-5 text-indigo-500" />
                Connect Database
            </h2>
            <button 
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
                <X className="w-6 h-6" />
            </button>
        </div>
        
        <div className="p-6 overflow-y-auto">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
                Paste your Firebase configuration object below. You can copy it directly from the Firebase Console project settings.
            </p>

            {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-sm text-red-700 dark:text-red-400">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                </div>
            )}

            <div className="relative">
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={`const firebaseConfig = {\n  apiKey: "AIzaSy...",\n  authDomain: "..."\n};`}
                    className="w-full h-64 p-4 font-mono text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-gray-800 dark:text-gray-200"
                    spellCheck={false}
                />
            </div>
        </div>

        <div className="p-5 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-between gap-3">
             {isInitialized ? (
                 <button
                    onClick={handleDisconnect}
                    className="px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-sm font-medium transition-colors"
                 >
                     Disconnect
                 </button>
             ) : (
                 <div></div> 
             )}
             <div className="flex gap-3">
                <button
                    onClick={onClose}
                    className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors"
                >
                    Cancel
                </button>
                <button
                    onClick={handleSave}
                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium shadow-sm flex items-center gap-2 transition-colors"
                >
                    <Save className="w-4 h-4" />
                    Save & Connect
                </button>
             </div>
        </div>
      </div>
    </div>
  );
};

export default ConfigModal;