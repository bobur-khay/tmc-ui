import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Button from '@/app/_components/base/Button';
import Dropdown from '@/app/_components/base/Dropdown';
import { ErrorUI } from '@/app/_components/error/ErrorUI';

describe('Button', () => {
  it('renders the text prop, preferring children', () => {
    const { rerender } = render(<Button text="Save" />);
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();

    rerender(<Button text="Save">Store</Button>);
    expect(screen.getByRole('button', { name: 'Store' })).toBeInTheDocument();
  });

  it('calls onClick and flashes for the configured duration', async () => {
    vi.useFakeTimers();
    const onClick = vi.fn();
    render(<Button text="Save" onClick={onClick} flashDurationMs={150} />);
    const button = screen.getByRole('button');

    act(() => button.click());
    expect(onClick).toHaveBeenCalledOnce();
    expect(button).toHaveAttribute('data-flashing');

    act(() => void vi.advanceTimersByTime(150));
    expect(button).not.toHaveAttribute('data-flashing');
    vi.useRealTimers();
  });

  it('does not call onClick when disabled', async () => {
    const onClick = vi.fn();
    render(<Button text="Save" onClick={onClick} disabled />);

    await userEvent.setup().click(screen.getByRole('button'));

    expect(screen.getByRole('button')).toBeDisabled();
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe('Dropdown', () => {
  const options = [
    { key: '10', value: 'Ten' },
    { key: '20', value: 'Twenty' },
  ];

  it('shows the selected option, falling back to the first one', () => {
    const { rerender } = render(<Dropdown id="d" label="Size" options={options} value="20" />);
    expect(screen.getByRole('button', { name: 'Size' })).toHaveTextContent('Twenty');

    rerender(<Dropdown id="d" label="Size" options={options} value="unknown" />);
    expect(screen.getByRole('button', { name: 'Size' })).toHaveTextContent('Ten');
  });

  it('opens the list, reports the selected key and closes', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Dropdown id="d" label="Size" options={options} value="10" onChange={onChange} />);
    const trigger = screen.getByRole('button', { name: 'Size' });

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('option', { name: 'Ten' })).toHaveAttribute('aria-selected', 'true');

    await user.click(screen.getByRole('button', { name: 'Twenty' }));
    expect(onChange).toHaveBeenCalledWith('20');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('closes on Escape and on outside clicks', async () => {
    const user = userEvent.setup();
    render(<Dropdown id="d" label="Size" options={options} />);
    const trigger = screen.getByRole('button', { name: 'Size' });

    await user.click(trigger);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    await user.click(trigger);
    await user.click(document.body);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});

describe('ErrorUI', () => {
  it('renders defaults without an action', () => {
    render(<ErrorUI />);
    expect(screen.getByRole('heading', { name: 'An unknown error occurred' })).toBeInTheDocument();
    expect(screen.getByText('Please try again later')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders the action button and calls its handler', async () => {
    const onClick = vi.fn();
    render(<ErrorUI title="Nothing found" buttonText="Retry" buttonOnclick={onClick} />);

    await userEvent.setup().click(screen.getByRole('button', { name: 'Retry' }));

    expect(onClick).toHaveBeenCalledOnce();
  });
});
