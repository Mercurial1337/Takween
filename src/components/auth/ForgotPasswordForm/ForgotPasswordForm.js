'use client';

import { useState } from 'react';
import { Mail } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import Input from '@/components/ui/Input/Input';
import Button from '@/components/ui/Button/Button';
import styles from './ForgotPasswordForm.module.css';

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitStatus, setSubmitStatus] = useState({ type: null, message: '' });
  const { showToast } = useToast();
  const supabase = createClient();

  const validate = () => {
    if (!email) {
      setError('Email is required');
      return false;
    } else if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError('Please enter a valid email');
      return false;
    }
    setError('');
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      return;
    }

    setLoading(true);
    setSubmitStatus({ type: null, message: '' });
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/api/auth/callback?next=/update-password`,
      });

      if (resetError) {
        showToast({
          title: 'Error',
          message: resetError.message,
          variant: 'error',
        });
        setSubmitStatus({ type: 'error', message: resetError.message });
        return;
      }

      showToast({
        title: 'Check your email',
        message: 'A password reset link has been sent to your email address.',
        variant: 'success',
      });
      setSubmitStatus({ type: 'success', message: 'Password reset link sent! Please check your email.' });
    } catch (err) {
      showToast({
        title: 'Something went wrong',
        message: 'Please try again later.',
        variant: 'error',
      });
      setSubmitStatus({ type: 'error', message: 'Something went wrong. Please try again later.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form} noValidate>
      {submitStatus.message && (
        <div style={{
          padding: 'var(--space-md)',
          borderRadius: 'var(--radius-md)',
          backgroundColor: submitStatus.type === 'error' ? 'var(--color-error-bg)' : 'var(--color-success-bg)',
          border: `1px solid ${submitStatus.type === 'error' ? 'var(--color-error)' : 'var(--color-success)'}`,
          color: submitStatus.type === 'error' ? 'var(--color-error)' : 'var(--color-success)',
          fontSize: 'var(--text-sm)',
          fontWeight: 'var(--font-semibold)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-sm)',
          marginBottom: 'var(--space-md)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <span>{submitStatus.message}</span>
        </div>
      )}
      <div className={styles.fields}>
        <Input
          id="reset-email"
          label="Email"
          type="email"
          icon={Mail}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={error}
          required
          autoComplete="email"
        />
      </div>

      <Button
        type="submit"
        variant="primary"
        fullWidth
        loading={loading}
        size="lg"
      >
        Send Reset Link
      </Button>
    </form>
  );
}
