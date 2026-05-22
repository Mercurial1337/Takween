'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import styles from './CTASection.module.css';

export default function CTASection() {
  return (
    <section className={styles.section}>
      <div className={styles.pattern} />
      <div className={styles.content}>
        <h2 className={styles.title}>Ready to Find Your Team?</h2>
        <p className={styles.subtitle}>
          Join Takween today and connect with students who share your goals.
        </p>
        <Link href="/register" className={styles.button}>
          Create Free Account
          <ArrowRight size={18} />
        </Link>
      </div>
    </section>
  );
}
