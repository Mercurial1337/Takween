'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import RegisterForm from '@/components/auth/RegisterForm/RegisterForm';
import styles from './page.module.css';

export default function RegisterPage() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link href="/" className={styles.logo}>Takween</Link>
        <h1 className={styles.title}>Create your account</h1>
        <p className={styles.subtitle}>Join Takween and find your team</p>
      </div>

      <Suspense fallback={null}>
        <RegisterForm />
      </Suspense>

      <p className={styles.footer}>
        Already have an account?{' '}
        <Link href="/login" className={styles.link}>Sign In</Link>
      </p>
    </div>
  );
}
