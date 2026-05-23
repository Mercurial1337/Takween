import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import RegisterForm from '@/components/auth/RegisterForm/RegisterForm';
import { ToastProvider } from '@/contexts/ToastContext';

vi.mock('@/components/ui/Toast/Toast', () => ({
  ToastContainer: () => null,
}));

function renderRegisterForm() {
  return render(
    <ToastProvider>
      <RegisterForm />
    </ToastProvider>
  );
}

describe('RegisterForm', () => {
  it('renders all required fields', () => {
    renderRegisterForm();
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/whatsapp/i)).toBeInTheDocument();
  });

  it('renders create account button', () => {
    renderRegisterForm();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('renders skills section', () => {
    renderRegisterForm();
    expect(screen.getByText(/skills/i)).toBeInTheDocument();
  });

  it('renders optional links section', () => {
    renderRegisterForm();
    expect(screen.getByText(/links/i)).toBeInTheDocument();
  });
});
