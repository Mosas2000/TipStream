import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TipFilterControls from '../components/TipFilterControls';

const CATEGORY_LABELS = {
  0: 'General', 1: 'Content Creation', 2: 'Open Source',
  3: 'Community Help', 4: 'Appreciation', 5: 'Education', 6: 'Bug Bounty',
};

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'amount-high', label: 'Highest amount' },
  { value: 'amount-low', label: 'Lowest amount' },
];

const defaultProps = {
  showFilters: false,
  setShowFilters: vi.fn(),
  hasActiveFilters: false,
  onClear: vi.fn(),
  categoryFilter: 'all',
  setCategoryFilter: vi.fn(),
  sortBy: 'newest',
  setSortBy: vi.fn(),
  minAmount: '',
  setMinAmount: vi.fn(),
  maxAmount: '',
  setMaxAmount: vi.fn(),
  categoryLabels: CATEGORY_LABELS,
  sortOptions: SORT_OPTIONS,
};

describe('TipFilterControls', () => {
  it('renders filter toggle button', () => {
    render(<TipFilterControls {...defaultProps} />);
    expect(screen.getByText('Filters')).toBeInTheDocument();
  });

  it('hides filter panel when showFilters is false', () => {
    render(<TipFilterControls {...defaultProps} showFilters={false} />);
    expect(screen.queryById('tip-filter-panel')).not.toBeInTheDocument();
  });

  it('shows filter panel when showFilters is true', () => {
    render(<TipFilterControls {...defaultProps} showFilters={true} />);
    expect(screen.getByLabelText('Category')).toBeInTheDocument();
    expect(screen.getByLabelText('Min STX')).toBeInTheDocument();
    expect(screen.getByLabelText('Max STX')).toBeInTheDocument();
    expect(screen.getByLabelText('Sort')).toBeInTheDocument();
  });

  it('shows clear button when filters are active', () => {
    render(<TipFilterControls {...defaultProps} hasActiveFilters={true} />);
    expect(screen.getByText('Clear')).toBeInTheDocument();
  });

  it('hides clear button when no filters are active', () => {
    render(<TipFilterControls {...defaultProps} hasActiveFilters={false} />);
    expect(screen.queryByText('Clear')).not.toBeInTheDocument();
  });

  it('calls setShowFilters when filter button is clicked', async () => {
    const user = userEvent.setup();
    const setShowFilters = vi.fn();
    render(<TipFilterControls {...defaultProps} setShowFilters={setShowFilters} />);
    await user.click(screen.getByText('Filters'));
    expect(setShowFilters).toHaveBeenCalledOnce();
  });

  it('calls onClear when clear button is clicked', async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    render(<TipFilterControls {...defaultProps} hasActiveFilters={true} onClear={onClear} />);
    await user.click(screen.getByText('Clear'));
    expect(onClear).toHaveBeenCalledOnce();
  });

  it('calls setCategoryFilter when category is changed', async () => {
    const user = userEvent.setup();
    const setCategoryFilter = vi.fn();
    render(<TipFilterControls {...defaultProps} showFilters={true} setCategoryFilter={setCategoryFilter} />);
    const select = screen.getByLabelText('Category');
    await user.selectOptions(select, '5');
    expect(setCategoryFilter).toHaveBeenCalled();
  });

  it('calls setSortBy when sort is changed', async () => {
    const user = userEvent.setup();
    const setSortBy = vi.fn();
    render(<TipFilterControls {...defaultProps} showFilters={true} setSortBy={setSortBy} />);
    const select = screen.getByLabelText('Sort');
    await user.selectOptions(select, 'oldest');
    expect(setSortBy).toHaveBeenCalled();
  });
});
