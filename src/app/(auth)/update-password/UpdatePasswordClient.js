'use client';

import Link from 'next/link';
import UpdatePasswordForm from '@/components/auth/UpdatePasswordForm/UpdatePasswordForm';
import styles from '../login/page.module.css';

export default function UpdatePasswordClient() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link href="/" className={styles.logo}>Takween</Link>
        <h1 className={styles.title}>Update Password</h1>
        <p className={styles.subtitle}>Please enter your new password below</p>
      </div>

      <UpdatePasswordForm />
    </div>
  );
}
