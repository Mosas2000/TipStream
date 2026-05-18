import { useState } from 'react';
import RefundHistory from './RefundHistory';
import { useDemoMode } from '../context/DemoContext';

export default function RefundManager({ userAddress, addToast }) {
  const { demoEnabled } = useDemoMode();
  const [activeTab, setActiveTab] = useState('history');

  const address = demoEnabled ? null : userAddress;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Refunds</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Manage refund requests for tips you have sent or received. Refunds must be requested within 24 hours of the tip.
        </p>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'history'
              ? 'bg-gray-900 dark:bg-amber-500 text-white dark:text-black'
              : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          Refund History
        </button>
      </div>

      {activeTab === 'history' && (
        <RefundHistory userAddress={address} />
      )}
    </div>
  );
}
