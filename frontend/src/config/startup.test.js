import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateConfigAtStartup, reportValidationErrors } from './startup.js';

vi.mock('./contracts.js', () => ({
  CONTRACT_ADDRESS: 'SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T',
  CONTRACT_NAME: 'tipstream',
  STACKS_API_BASE: 'https://api.hiro.so',
  NETWORK_NAME: 'mainnet',
  APP_URL: 'https://tipstream-silk.vercel.app'
}));

describe('validateConfigAtStartup', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_NETWORK', 'mainnet');
    vi.stubEnv('VITE_APP_URL', 'https://tipstream-silk.vercel.app');
  });

  it('should return success for valid configuration', () => {
    const results = validateConfigAtStartup();
    expect(results.success).toBe(true);
    expect(results.errors).toHaveLength(0);
  });

  it('should include contract validation results', () => {
    const results = validateConfigAtStartup();
    expect(results.success).toBe(true);
  });
});

describe('reportValidationErrors', () => {
  let consoleErrorSpy;
  let consoleWarnSpy;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  it('should log errors to console', () => {
    const results = {
      success: false,
      errors: [new Error('Test error')],
      warnings: []
    };
    
    reportValidationErrors(results);
    expect(console.error).toHaveBeenCalled();
  });

  it('should log warnings to console', () => {
    const results = {
      success: true,
      errors: [],
      warnings: ['Test warning']
    };
    
    reportValidationErrors(results);
    expect(console.warn).toHaveBeenCalled();
  });

  it('should not log when no errors or warnings', () => {
    const results = {
      success: true,
      errors: [],
      warnings: []
    };
    
    reportValidationErrors(results);
    expect(console.error).not.toHaveBeenCalled();
    expect(console.warn).not.toHaveBeenCalled();
  });
});
