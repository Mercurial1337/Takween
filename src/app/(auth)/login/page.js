'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import LoginForm from '@/components/auth/LoginForm/LoginForm';
import styles from './page.module.css';

export default function LoginPage() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link href="/" className={styles.logo}>Takween</Link>
        <h1 className={styles.title}>Welcome back</h1>
        <p className={styles.subtitle}>Sign in to your account</p>
      </div>

      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>

      <p className={styles.footer}>
        Don&apos;t have an account?{' '}
        <Link href="/register" className={styles.link}>Get Started</Link>
      </p>
    </div>
  );
}
