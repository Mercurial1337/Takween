import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginForm from '@/components/auth/LoginForm/LoginForm';
import { ToastProvider } from '@/contexts/ToastContext';

// Mock Toast component
vi.mock('@/components/ui/Toast/Toast', () => ({
  ToastContainer: () => null,
}));

function renderLoginForm() {
  return render(
    <ToastProvider>
      <LoginForm />
    </ToastProvider>
  );
}

describe('LoginForm', () => {
  it('renders email and password fields', () => {
    renderLoginForm();
    expect(screen.getByLabelText(/^email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
  });

  it('renders submit button', () => {
    renderLoginForm();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('shows error when submitting empty form', async () => {
    const user = userEvent.setup();
    renderLoginForm();

    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    expect(screen.getByText(/password is required/i)).toBeInTheDocument();
  });

  it('shows error for invalid email', async () => {
    const user = userEvent.setup();
    renderLoginForm();

    await user.type(screen.getByLabelText(/^email/i), 'notanemail');
    await user.type(screen.getByLabelText(/^password/i), '123456');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(screen.getByText(/please enter a valid email/i)).toBeInTheDocument();
  });

  it('shows error for short password', async () => {
    const user = userEvent.setup();
    renderLoginForm();

    await user.type(screen.getByLabelText(/^email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^password/i), '12345');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(screen.getByText(/password must be at least 6 characters/i)).toBeInTheDocument();
  });
});
