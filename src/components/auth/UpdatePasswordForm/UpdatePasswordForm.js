'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import Input from '@/components/ui/Input/Input';
import Button from '@/components/ui/Button/Button';
import styles from './UpdatePasswordForm.module.css';

export default function UpdatePasswordForm() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitStatus, setSubmitStatus] = useState({ type: null, message: '' });
  
  const router = useRouter();
  const { showToast } = useToast();
  const supabase = createClient();

  const validate = () => {
    const newErrors = {};
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      return;
    }

    setLoading(true);
    setSubmitStatus({ type: null, message: '' });
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) {
        showToast({
          title: 'Error',
          message: updateError.message,
          variant: 'error',
        });
        setSubmitStatus({ type: 'error', message: updateError.message });
        return;
      }

      showToast({
        title: 'Password Updated',
        message: 'Your password has been successfully updated.',
        variant: 'success',
      });
      setSubmitStatus({ type: 'success', message: 'Password updated successfully! Redirecting...' });
      
      setTimeout(() => {
        router.push('/dashboard');
        router.refresh();
      }, 1500);
      
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
          id="update-password"
          label="New Password"
          type={showPassword ? 'text' : 'password'}
          icon={Lock}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          required
          autoComplete="new-password"
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
        <Input
          id="confirm-password"
          label="Confirm Password"
          type={showConfirmPassword ? 'text' : 'password'}
          icon={Lock}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={errors.confirmPassword}
          required
          autoComplete="new-password"
          rightElement={
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          }
        />
      </div>

      <Button
        type="submit"
        variant="primary"
        fullWidth
        loading={loading}
        size="lg"
      >
        Update Password
      </Button>
    </form>
  );
}
