'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import Button from '@/components/ui/Button/Button';
import styles from './error.module.css';

export default function ErrorBoundary({ error, reset }) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Captured runtime error:', error);
  }, [error]);

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.iconWrapper}>
          <AlertTriangle size={40} />
        </div>
        <h1 className={styles.title}>Something Went Wrong</h1>
        <p className={styles.description}>
          An unexpected error occurred while processing your request. Our team has been notified.
        </p>
        
        {error && (
          <div className={styles.errorDetails}>
            {error.message || 'Unknown application error'}
          </div>
        )}

        <div className={styles.actions}>
          <Button variant="primary" onClick={reset}>
            Try Again
          </Button>
          <Link href="/" passHref legacyBehavior>
            <Button variant="outline">Go to Home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
