'use client';

import Link from 'next/link';
import { ArrowRight, Users } from 'lucide-react';
import styles from './HeroSection.module.css';

export default function HeroSection() {
  return (
    <section className={styles.hero}>
      <div className={styles.decorCircle1} />
      <div className={styles.decorCircle2} />
      <div className={styles.decorCircle3} />

      <div className={styles.content}>
        <h1 className={styles.heading}>
          Find Your Team,
          <span className={styles.headingAccent}> Build Together</span>
        </h1>
        <p className={styles.subheading}>
          Takween connects university students with teammates for course and graduation projects.
          Browse open teams, send a request, and start collaborating.
        </p>
        <div className={styles.actions}>
          <Link href="/projects" className={styles.primaryBtn}>
            <Users size={18} />
            Browse Projects
          </Link>
          <Link href="/register" className={styles.secondaryBtn}>
            Get Started
            <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </section>
  );
}
