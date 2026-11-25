import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { AuthenticationForm } from '@/app/_components/auth/AuthenticationForm';

type FormProps = ComponentProps<typeof AuthenticationForm>;

function renderForm(props: Partial<FormProps> = {}) {
  const handlers = {
    onClientIdChange: vi.fn(),
    onClientSecretChange: vi.fn(),
    onSubmit: vi.fn(),
  };
  render(
    <AuthenticationForm
      eyebrow="API authentication"
      title="Enter API credentials"
      description="Description"
      clientId="id"
      clientSecret="secret"
      submitText="Continue"
      {...handlers}
      {...props}
    />,
  );
  return handlers;
}

describe('AuthenticationForm', () => {
  it('renders the heading, description and labelled inputs', () => {
    renderForm();
    expect(screen.getByRole('heading', { name: 'Enter API credentials' })).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByLabelText('Client ID')).toHaveValue('id');
    expect(screen.getByLabelText('Client Secret')).toHaveAttribute('type', 'password');
  });

  it.each([
    { clientId: '', clientSecret: 'secret' },
    { clientId: 'id', clientSecret: '  ' },
    { actionsDisabled: true },
    { isSubmitting: true },
  ])('disables submit for %j', (props) => {
    renderForm(props);
    expect(screen.getByRole('button', { name: /Continue|Saving/ })).toBeDisabled();
  });

  it('shows a saving label while submitting', () => {
    renderForm({ isSubmitting: true });
    expect(screen.getByRole('button', { name: 'Saving...' })).toBeInTheDocument();
  });

  it('submits the form', async () => {
    const { onSubmit } = renderForm();

    await userEvent.setup().click(screen.getByRole('button', { name: 'Continue' }));

    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it('unlocks the inputs after the autofill guard and reports changes', async () => {
    const { onClientIdChange, onClientSecretChange } = renderForm({
      clientId: '',
      clientSecret: '',
    });
    const clientId = screen.getByLabelText('Client ID');
    expect(clientId).toHaveAttribute('readonly');

    await vi.waitFor(() => expect(clientId).not.toHaveAttribute('readonly'));
    const user = userEvent.setup();
    await user.type(clientId, 'a');
    await user.type(screen.getByLabelText('Client Secret'), 'b');

    expect(onClientIdChange).toHaveBeenCalledWith('a');
    expect(onClientSecretChange).toHaveBeenCalledWith('b');
  });

  it('shows the authentication error', () => {
    renderForm({ errorMessage: 'invalid_client' });
    expect(screen.getByText(/Authentication failed/)).toBeInTheDocument();
    expect(screen.getByText('invalid_client')).toBeInTheDocument();
  });

  it('renders Discard only with a handler and calls it', async () => {
    renderForm();
    expect(screen.queryByRole('button', { name: 'Discard' })).not.toBeInTheDocument();

    const onDiscard = vi.fn();
    renderForm({ onDiscard, title: 'Update API credentials' });
    await userEvent.setup().click(screen.getByRole('button', { name: 'Discard' }));

    expect(onDiscard).toHaveBeenCalledOnce();
  });
});
