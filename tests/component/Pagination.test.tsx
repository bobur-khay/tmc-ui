import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Pagination from '@/app/_components/Pagination';

const pageLabels = () =>
  within(screen.getByRole('navigation', { name: 'Pagination' }))
    .getAllByRole('button')
    .map((button) => button.textContent)
    .filter(Boolean);

describe('Pagination', () => {
  it('renders nothing for a single page', () => {
    const { container } = render(<Pagination page={1} totalPages={1} onPageChange={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('lists every page when there are at most seven', () => {
    render(<Pagination page={1} totalPages={7} onPageChange={vi.fn()} />);
    expect(pageLabels()).toEqual(['1', '2', '3', '4', '5', '6', '7']);
  });

  it.each([
    [1, ['1', '2', '3', '4', '5', '20']],
    [10, ['1', '9', '10', '11', '20']],
    [19, ['1', '16', '17', '18', '19', '20']],
  ])('collapses distant pages around page %i', (page, expected) => {
    render(<Pagination page={page} totalPages={20} onPageChange={vi.fn()} />);
    expect(pageLabels()).toEqual(expected);
  });

  it('marks the current page', () => {
    render(<Pagination page={3} totalPages={5} onPageChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: '3' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: '2' })).not.toHaveAttribute('aria-current');
  });

  it('disables backward navigation on the first page and forward on the last', () => {
    const { rerender } = render(<Pagination page={1} totalPages={5} onPageChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Go to first page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Go to previous page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeEnabled();

    rerender(<Pagination page={5} totalPages={5} onPageChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Go to last page' })).toBeDisabled();
  });

  it('hides the first/last shortcuts for two pages', () => {
    render(<Pagination page={1} totalPages={2} onPageChange={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Go to first page' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Go to last page' })).not.toBeInTheDocument();
  });

  it('reports the requested page', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(<Pagination page={5} totalPages={20} onPageChange={onPageChange} />);

    await user.click(screen.getByRole('button', { name: 'Next page' }));
    await user.click(screen.getByRole('button', { name: 'Go to previous page' }));
    await user.click(screen.getByRole('button', { name: 'Go to first page' }));
    await user.click(screen.getByRole('button', { name: 'Go to last page' }));
    await user.click(screen.getByRole('button', { name: '4' }));

    expect(onPageChange.mock.calls.map(([page]) => page)).toEqual([6, 4, 1, 20, 4]);
  });
});
