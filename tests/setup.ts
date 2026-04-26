import { beforeAll, afterAll } from 'vitest';

const originalConsoleLog = console.log;

beforeAll(() => {
  if (process.env.VERBOSE === 'true') return;
  
  // Monkey-patch console.log to drop heavy contract event logs BEFORE they cross IPC
  console.log = (...args) => {
    if (args.length > 0 && typeof args[0] === 'string') {
      const log = args[0].trim();
      if (
        log.startsWith('{') && 
        log.includes('event: "') && 
        log.includes(' (tipstream')
      ) {
        return; // Drop high-volume contract event print
      }
    }
    originalConsoleLog(...args);
  };
});

afterAll(() => {
  console.log = originalConsoleLog;
});
