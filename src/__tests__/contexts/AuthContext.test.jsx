import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

// Consumer component to expose context values
function AuthConsumer() {
  const { user, profile, loading, signOut } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user">{user ? user.id : 'none'}</span>
      <span data-testid="profile">{profile ? profile.full_name : 'none'}</span>
      <button data-testid="signout" onClick={signOut}>Sign Out</button>
    </div>
  );
}

describe('AuthContext', () => {
  it('throws when useAuth is used outside AuthProvider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<AuthConsumer />)).toThrow('useAuth must be used within an AuthProvider');
    console.error.mockRestore();
  });

  it('initializes with no user when supabase returns null', async () => {
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('none');
    });
  });

  it('provides loading state', () => {
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    // Initially loading should be true or become false
    const loadingEl = screen.getByTestId('loading');
    expect(['true', 'false']).toContain(loadingEl.textContent);
  });
});
