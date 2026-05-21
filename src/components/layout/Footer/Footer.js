import Link from 'next/link';
import { Heart } from 'lucide-react';
import styles from './Footer.module.css';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.top}>
          <div className={styles.brand}>
            <Link href="/" className={styles.logo}>
              <span className={styles.logoText}>Takween</span>
            </Link>
            <p className={styles.tagline}>
              Find your team, build together.
            </p>
          </div>

          <div className={styles.links}>
            <div className={styles.linkGroup}>
              <h4 className={styles.linkGroupTitle}>Platform</h4>
              <Link href="/projects" className={styles.link}>Browse Projects</Link>
              <Link href="/register" className={styles.link}>Join Takween</Link>
            </div>
            <div className={styles.linkGroup}>
              <h4 className={styles.linkGroupTitle}>Account</h4>
              <Link href="/login" className={styles.link}>Sign In</Link>
              <Link href="/dashboard" className={styles.link}>Dashboard</Link>
            </div>
          </div>
        </div>

        <div className={styles.bottom}>
          <p className={styles.copyright}>
            {currentYear} Takween. Built with <Heart size={14} className={styles.heart} /> for students.
          </p>
        </div>
      </div>
    </footer>
  );
}
