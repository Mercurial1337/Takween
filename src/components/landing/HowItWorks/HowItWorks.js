'use client';

import { Search, UserPlus, Users } from 'lucide-react';
import styles from './HowItWorks.module.css';

const steps = [
  {
    icon: Search,
    number: '01',
    title: 'Browse',
    description: 'Explore available projects and see which teams are forming. Find the right fit for your skills.',
  },
  {
    icon: UserPlus,
    number: '02',
    title: 'Join',
    description: 'Send a request to join a team. Share your skills and introduce yourself to the team owner.',
  },
  {
    icon: Users,
    number: '03',
    title: 'Connect',
    description: 'Once accepted, see your teammates\u0027 contact details and start building together.',
  },
];

export default function HowItWorks() {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>How It Works</h2>
          <p className={styles.subtitle}>Three simple steps to find your perfect team</p>
        </div>

        <div className={styles.grid}>
          {steps.map((step, index) => (
            <div key={step.number} className={styles.card} style={{ animationDelay: `${index * 100}ms` }}>
              <div className={styles.iconContainer}>
                <step.icon size={28} className={styles.icon} />
              </div>
              <span className={styles.stepNumber}>{step.number}</span>
              <h3 className={styles.cardTitle}>{step.title}</h3>
              <p className={styles.cardDescription}>{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
