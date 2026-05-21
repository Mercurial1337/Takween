'use client';

import { Layers, Shield, Target, Zap } from 'lucide-react';
import styles from './FeaturesSection.module.css';

const features = [
  {
    icon: Layers,
    title: 'Easy Team Formation',
    description: 'Create or join a team in seconds. No complicated setup required.',
  },
  {
    icon: Shield,
    title: 'Privacy First',
    description: 'Your contact details are only shared with accepted team members.',
  },
  {
    icon: Target,
    title: 'Skill Matching',
    description: 'Browse teams by skills, department, and project to find the perfect match.',
  },
  {
    icon: Zap,
    title: 'Quick Onboarding',
    description: 'Add team members manually without requiring them to register.',
  },
];

export default function FeaturesSection() {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>Why Takween?</h2>
        </div>

        <div className={styles.grid}>
          {features.map((feature) => (
            <div key={feature.title} className={styles.card}>
              <div className={styles.iconContainer}>
                <feature.icon size={24} className={styles.icon} />
              </div>
              <div>
                <h3 className={styles.cardTitle}>{feature.title}</h3>
                <p className={styles.cardDescription}>{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
