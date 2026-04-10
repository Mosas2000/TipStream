import { useDemoMode } from '../context/DemoContext';

export function DemoIndicator() {
  const { demoEnabled, toggleDemo } = useDemoMode();

  if (!demoEnabled) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-amber-100 dark:bg-amber-900 border border-amber-400 dark:border-amber-700 rounded-lg p-3 text-sm text-amber-900 dark:text-amber-100 shadow-md z-50">
      <div className="flex items-center gap-2">
        <span className="inline-block w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
        <span className="font-medium">Demo Mode</span>
        <button
          onClick={() => toggleDemo(false)}
          className="ml-auto text-xs bg-amber-500 hover:bg-amber-600 text-white px-2 py-1 rounded transition-colors"
        >
          Exit
        </button>
      </div>
    </div>
  );
}
