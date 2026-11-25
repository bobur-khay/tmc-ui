import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Search } from '@/app/_components/data-controls/Search';
import { FilterOptions } from '@/app/_components/filters/FilterOptions';

describe('FilterOptions', () => {
  it('shows the message instead of options', () => {
    render(
      <FilterOptions
        sectionId="author"
        options={{ message: 'Loading...' }}
        onOptionChange={vi.fn()}
      />,
    );
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('lists checked options first, then alphabetically', () => {
    render(
      <FilterOptions
        sectionId="author"
        options={[
          { value: 'beta', checked: false },
          { value: 'gamma', checked: true },
          { value: 'alpha', checked: false },
        ]}
        onOptionChange={vi.fn()}
      />,
    );

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.map((checkbox) => (checkbox as HTMLInputElement).value)).toEqual([
      'gamma',
      'alpha',
      'beta',
    ]);
    expect(screen.getByRole('checkbox', { name: 'gamma' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'alpha' })).not.toBeChecked();
  });

  it('reports the toggled option', async () => {
    const onOptionChange = vi.fn();
    render(
      <FilterOptions
        sectionId="manufacturer"
        options={[{ value: 'omnicorp', checked: false }]}
        onOptionChange={onOptionChange}
      />,
    );

    await userEvent.setup().click(screen.getByRole('checkbox', { name: 'omnicorp' }));

    expect(onOptionChange).toHaveBeenCalledWith('manufacturer', 'omnicorp');
  });

  it('shows repository names without the hash suffix', () => {
    render(
      <FilterOptions
        sectionId="repository"
        options={[{ value: 'example-catalog-a32da3c49684', checked: false }]}
        onOptionChange={vi.fn()}
      />,
    );

    const group = screen.getByLabelText('repository options');
    expect(within(group).getByRole('checkbox', { name: 'example-catalog' })).toHaveAttribute(
      'value',
      'example-catalog-a32da3c49684',
    );
  });
});

describe('Search', () => {
  it('reports typed text', async () => {
    const onSearch = vi.fn();
    render(<Search query="" progressState={0} onSearch={onSearch} />);

    await userEvent.setup().type(screen.getByRole('textbox', { name: 'Search inventory' }), 'l');

    expect(onSearch).toHaveBeenCalledWith('l');
  });

  it('offers the search hint only for an empty query', () => {
    const { rerender } = render(<Search query="" progressState={0} onSearch={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Search information' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument();

    rerender(<Search query="light" progressState={0} onSearch={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Search information' })).not.toBeInTheDocument();
  });

  it('clears the query', async () => {
    const onSearch = vi.fn();
    render(<Search query="light" progressState={100} onSearch={onSearch} />);

    await userEvent.setup().click(screen.getByRole('button', { name: 'Clear search' }));

    expect(onSearch).toHaveBeenCalledWith('');
  });

  it('hides the clear button while a search is running', () => {
    render(<Search query="light" progressState={80} onSearch={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument();
  });
});
