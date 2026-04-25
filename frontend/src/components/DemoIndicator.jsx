import { useDemoMode } from '../context/DemoContext';
import { Info, X, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ROUTE_SEND } from '../config/routes';

export function DemoIndicator() {
  const { demoEnabled, toggleDemo, resetDemoState, demoBalance } = useDemoMode();
  const navigate = useNavigate();

  if (!demoEnabled) {
    return null;
  }

  const handleReset = () => {
    resetDemoState();
    navigate(ROUTE_SEND);
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border border-amber-200 dark:border-amber-900/50 rounded-2xl p-4 text-sm text-gray-900 dark:text-gray-100 shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-8 duration-500">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Zap className="w-5 h-5 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base">Sandbox Demo Mode</span>
              <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 text-[10px] font-bold uppercase tracking-wider rounded-full border border-amber-200 dark:border-amber-800/50">Active</span>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
              Exploring TipStream with a mock balance of <span className="font-semibold text-gray-900 dark:text-white">{demoBalance} STX</span>. No real funds are used.
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="hidden sm:flex items-center gap-2 px-3 py-2 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-semibold rounded-xl hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-all text-xs"
            title="Reset sandbox state"
          >
            Reset
          </button>
          <button
            onClick={() => navigate(ROUTE_SEND)}
            className="hidden md:flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-black font-semibold rounded-xl hover:opacity-90 transition-all text-xs"
          >
            Try a Tip
          </button>
          <button
            onClick={() => toggleDemo(false)}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all text-xs"
            title="Exit Demo Mode"
          >
            <X className="w-3.5 h-3.5" />
            <span>Exit</span>
          </button>
        </div>

      </div>
    </div>
  );
}

