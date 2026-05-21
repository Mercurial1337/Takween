'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, FolderOpen, Building2, GraduationCap, Sparkles, Users, UserPlus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import styles from './layout.module.css';

const adminLinks = [
  { href: '/admin', icon: LayoutDashboard, label: 'Overview' },
  { href: '/admin/projects', icon: FolderOpen, label: 'Projects' },
  { href: '/admin/departments', icon: Building2, label: 'Departments' },
  { href: '/admin/levels', icon: GraduationCap, label: 'Levels' },
  { href: '/admin/skills', icon: Sparkles, label: 'Skills' },
  { href: '/admin/teams', icon: Users, label: 'Teams' },
  { href: '/admin/invites', icon: UserPlus, label: 'Invites' },
];

export default function AdminLayout({ children }) {
  const { profile, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && profile && profile.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [profile, loading, router]);

  if (loading) return null;
  if (profile?.role !== 'admin') return null;

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <Link href="/" className={styles.logo}>Takween</Link>
          <span className={styles.adminBadge}>Admin</span>
        </div>
        <nav className={styles.nav}>
          {adminLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`${styles.navLink} ${pathname === link.href ? styles.active : ''}`}
            >
              <link.icon size={18} />
              {link.label}
            </Link>
          ))}
        </nav>
        <div className={styles.sidebarFooter}>
          <Link href="/dashboard" className={styles.backLink}>
            Back to Dashboard
          </Link>
        </div>
      </aside>
      <main className={styles.main}>
        <div className={styles.content}>
          {children}
        </div>
      </main>
    </div>
  );
}
