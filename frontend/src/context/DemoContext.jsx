import { createContext, useContext, useState, useEffect } from 'react';
import { isDemo, getDemo, setDemoMode, loadDemoPreference } from '../config/demo';

const DemoContext = createContext(null);

export function useDemoMode() {
  const context = useContext(DemoContext);
  if (!context) {
    throw new Error('useDemoMode must be used within DemoProvider');
  }
  return context;
}

export function DemoProvider({ children }) {
  const [demoEnabled, setDemoEnabled] = useState(() => {
    loadDemoPreference();
    return isDemo();
  });

  const toggleDemo = (enabled) => {
    setDemoMode(enabled);
    setDemoEnabled(enabled);
  };

  const getDemoData = () => {
    return getDemo();
  };

  const value = {
    demoEnabled,
    toggleDemo,
    getDemoData,
  };

  return (
    <DemoContext.Provider value={value}>
      {children}
    </DemoContext.Provider>
  );
}
