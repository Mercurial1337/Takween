'use client';

import Link from 'next/link';
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm/ForgotPasswordForm';
import styles from '../login/page.module.css';

export default function ForgotPasswordClient() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link href="/" className={styles.logo}>Takween</Link>
        <h1 className={styles.title}>Reset Password</h1>
        <p className={styles.subtitle}>Enter your email to receive a reset link</p>
      </div>

      <ForgotPasswordForm />

      <p className={styles.footer}>
        Remembered your password?{' '}
        <Link href="/login" className={styles.link}>Sign In</Link>
      </p>
    </div>
  );
}
