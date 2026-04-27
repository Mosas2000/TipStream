import { render } from '@testing-library/react';
import { TipProvider } from '../context/TipContext';
import { DemoProvider } from '../context/DemoContext';

export function renderWithProviders(ui, options = {}) {
  const { providerProps = {}, ...renderOptions } = options;

  function Wrapper({ children }) {
    return (
      <DemoProvider>
        <TipProvider {...providerProps}>
          {children}
        </TipProvider>
      </DemoProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

export function createMockToast() {
  return vi.fn();
}

export * from '@testing-library/react';
