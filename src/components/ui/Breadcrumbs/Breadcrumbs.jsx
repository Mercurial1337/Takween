'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import styles from './Breadcrumbs.module.css';

const DEFAULT_LABELS = {
  dashboard: 'Dashboard',
  projects: 'Projects',
  teams: 'Teams',
  profile: 'Profile',
  notifications: 'Notifications',
  feedback: 'Feedback',
  students: 'Students',
  admin: 'Admin',
  departments: 'Departments',
  skills: 'Skills',
  levels: 'Levels',
  invites: 'Invites',
  audit: 'Audit Logs',
  settings: 'Settings',
};

function formatSegment(segment) {
  if (DEFAULT_LABELS[segment]) return DEFAULT_LABELS[segment];
  return segment
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function isUUID(segment) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment);
}

export default function Breadcrumbs({ customLabels = {}, items }) {
  const pathname = usePathname();

  // If explicit items are provided, use them directly
  let crumbs;
  if (items && items.length > 0) {
    crumbs = items.map((item, index) => ({
      href: item.href,
      label: item.label,
      isLast: index === items.length - 1,
    }));
  } else {
    const segments = pathname.split('/').filter(Boolean);

    if (segments.length <= 1) return null;

    crumbs = segments.map((segment, index) => {
      const href = '/' + segments.slice(0, index + 1).join('/');
      const isLast = index === segments.length - 1;

      let label;
      if (customLabels[segment]) {
        label = customLabels[segment];
      } else if (isUUID(segment)) {
        label = 'Details';
      } else {
        label = formatSegment(segment);
      }

      return { href, label, isLast };
    });
  }

  if (!crumbs || crumbs.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className={styles.breadcrumbs}>
      <ol className={styles.list}>
        {/* Home crumb */}
        <li className={styles.item}>
          <Link href="/dashboard" className={styles.link} title="Home">
            <Home size={14} />
          </Link>
        </li>

        {crumbs.map((crumb) => (
          <li key={crumb.href} className={styles.item}>
            <ChevronRight size={14} className={styles.separator} aria-hidden="true" />
            {crumb.isLast ? (
              <span className={styles.current} aria-current="page">
                {crumb.label}
              </span>
            ) : (
              <Link href={crumb.href} className={styles.link}>
                {crumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

