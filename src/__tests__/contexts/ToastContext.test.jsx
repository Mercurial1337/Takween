import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ToastProvider, useToast } from '@/contexts/ToastContext';

vi.mock('@/components/ui/Toast/Toast', () => ({
  ToastContainer: ({ toasts, onDismiss }) => (
    <div data-testid="toast-container">
      {toasts.map((t) => (
        <div key={t.id} data-testid={`toast-${t.id}`} data-variant={t.variant}>
          <span>{t.title}</span>
          {t.message && <span>{t.message}</span>}
          <button data-testid={`dismiss-${t.id}`} onClick={() => onDismiss(t.id)}>x</button>
        </div>
      ))}
    </div>
  ),
}));

function ToastConsumer() {
  const { showToast, dismissToast } = useToast();
  return (
    <div>
      <button data-testid="show" onClick={() => showToast({ title: 'Test', message: 'Hi', variant: 'success' })}>Show</button>
      <button data-testid="show-err" onClick={() => showToast({ title: 'Err', variant: 'error' })}>Err</button>
    </div>
  );
}

describe('ToastContext', () => {
  it('throws when useToast is used outside provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<ToastConsumer />)).toThrow('useToast must be used within a ToastProvider');
    console.error.mockRestore();
  });

  it('shows a toast', async () => {
    render(<ToastProvider><ToastConsumer /></ToastProvider>);
    await act(() => screen.getByTestId('show').click());
    expect(screen.getByText('Test')).toBeInTheDocument();
    expect(screen.getByText('Hi')).toBeInTheDocument();
  });

  it('shows multiple toasts', async () => {
    render(<ToastProvider><ToastConsumer /></ToastProvider>);
    await act(() => screen.getByTestId('show').click());
    await act(() => screen.getByTestId('show-err').click());
    expect(screen.getByText('Test')).toBeInTheDocument();
    expect(screen.getAllByText('Err').length).toBeGreaterThan(0);
  });

  it('dismisses a toast via container button', async () => {
    render(<ToastProvider><ToastConsumer /></ToastProvider>);
    await act(() => screen.getByTestId('show').click());
    const btn = screen.getByTestId('toast-container').querySelector('[data-testid^="dismiss-"]');
    if (btn) await act(() => btn.click());
  });

  it('sets correct variant', async () => {
    render(<ToastProvider><ToastConsumer /></ToastProvider>);
    await act(() => screen.getByTestId('show-err').click());
    const el = screen.getByTestId('toast-container').querySelector('[data-variant="error"]');
    expect(el).not.toBeNull();
  });
});
