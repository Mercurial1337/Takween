import Link from 'next/link';
import { Compass } from 'lucide-react';
import Button from '@/components/ui/Button/Button';
import styles from './not-found.module.css';

export default function NotFound() {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.iconWrapper}>
          <Compass size={40} />
        </div>
        <h1 className={styles.errorCode}>404</h1>
        <h2 className={styles.title}>Page Not Found</h2>
        <p className={styles.description}>
          The page you are looking for might have been moved, had its name changed,
          or is temporarily unavailable. Let's get you back on track.
        </p>
        <div className={styles.actions}>
          <Link href="/" passHref legacyBehavior>
            <Button variant="primary">Go to Home</Button>
          </Link>
          <Link href="/projects" passHref legacyBehavior>
            <Button variant="outline">Browse Projects</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
