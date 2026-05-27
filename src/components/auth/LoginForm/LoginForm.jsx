'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import Input from '@/components/ui/Input/Input';
import Button from '@/components/ui/Button/Button';
import styles from './LoginForm.module.css';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitStatus, setSubmitStatus] = useState({ type: null, message: '' });
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const supabase = createClient();

  const validate = () => {
    const newErrors = {};
    if (!email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Please enter a valid email';
    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      setSubmitStatus({ type: 'error', message: 'Please correct the errors in the form.' });
      return;
    }

    setLoading(true);
    setSubmitStatus({ type: null, message: '' });
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        showToast({
          title: 'Sign in failed',
          message: error.message,
          variant: 'error',
        });
        setSubmitStatus({ type: 'error', message: error.message });
        return;
      }

      showToast({
        title: 'Welcome back',
        message: 'You have been signed in successfully.',
        variant: 'success',
      });
      setSubmitStatus({ type: 'success', message: 'Welcome back! Redirecting...' });

      const redirect = searchParams.get('redirect') || '/projects';
      router.push(redirect);
      router.refresh();
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
          id="login-email"
          label="Email"
          type="email"
          icon={Mail}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          required
          autoComplete="email"
        />
        <Input
          id="login-password"
          label="Password"
          type={showPassword ? 'text' : 'password'}
          icon={Lock}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          required
          autoComplete="current-password"
          rightElement={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          }
        />
        <div className={styles.forgotPasswordWrapper}>
          <Link href="/forgot-password" className={styles.forgotPassword}>
            Forgot Password?
          </Link>
        </div>
      </div>

      <Button
        type="submit"
        variant="primary"
        fullWidth
        loading={loading}
        size="lg"
      >
        Sign In
      </Button>
    </form>
  );
}
