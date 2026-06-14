import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TipSearchInput from '../components/TipSearchInput';

describe('TipSearchInput', () => {
  it('renders input with placeholder', () => {
    render(<TipSearchInput value="" onChange={vi.fn()} onClear={vi.fn()} placeholder="Search tips..." />);
    expect(screen.getByLabelText('Search tips')).toBeInTheDocument();
  });

  it('displays current value', () => {
    render(<TipSearchInput value="hello" onChange={vi.fn()} onClear={vi.fn()} />);
    expect(screen.getByLabelText('Search tips')).toHaveValue('hello');
  });

  it('calls onChange when typing', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TipSearchInput value="" onChange={onChange} onClear={vi.fn()} />);
    const input = screen.getByLabelText('Search tips');
    await user.type(input, 'test');
    expect(onChange).toHaveBeenCalled();
  });

  it('shows clear button when value is present', () => {
    render(<TipSearchInput value="query" onChange={vi.fn()} onClear={vi.fn()} />);
    expect(screen.getByLabelText('Clear search')).toBeInTheDocument();
  });

  it('hides clear button when value is empty', () => {
    render(<TipSearchInput value="" onChange={vi.fn()} onClear={vi.fn()} />);
    expect(screen.queryByLabelText('Clear search')).not.toBeInTheDocument();
  });

  it('calls onClear when clear button is clicked', async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    render(<TipSearchInput value="test" onChange={vi.fn()} onClear={onClear} />);
    await user.click(screen.getByLabelText('Clear search'));
    expect(onClear).toHaveBeenCalledOnce();
  });
});
