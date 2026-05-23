import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { NotificationsProvider, useNotifications } from '@/contexts/NotificationsContext';
import { AuthProvider } from '@/contexts/AuthContext';

function NotifConsumer() {
  const { notifications, loading, unreadCount, markAsRead, markAllRead } = useNotifications();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="count">{notifications.length}</span>
      <span data-testid="unread">{unreadCount}</span>
    </div>
  );
}

describe('NotificationsContext', () => {
  it('throws when useNotifications is used outside provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<NotifConsumer />)).toThrow(
      'useNotifications must be used within a NotificationsProvider'
    );
    console.error.mockRestore();
  });

  it('initializes with empty notifications when no user', async () => {
    render(
      <AuthProvider>
        <NotificationsProvider>
          <NotifConsumer />
        </NotificationsProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('count').textContent).toBe('0');
      expect(screen.getByTestId('unread').textContent).toBe('0');
    });
  });

  it('sets loading to false after init', async () => {
    render(
      <AuthProvider>
        <NotificationsProvider>
          <NotifConsumer />
        </NotificationsProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
  });
});
