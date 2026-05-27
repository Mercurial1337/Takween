'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Bell, ChevronDown, LogOut, User, LayoutDashboard, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationsContext';
import Avatar from '@/components/ui/Avatar/Avatar';
import styles from './Navbar.module.css';

export default function Navbar() {
  const { user, profile, loading, signOut } = useAuth();
  const { unreadCount } = useNotifications();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setMobileMenuOpen(false);
    setProfileMenuOpen(false);
  }

  // Close profile menu when clicking outside
  useEffect(() => {
    if (!profileMenuOpen) return;
    const handleClick = (e) => {
      if (!e.target.closest(`.${styles.profileMenu}`)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [profileMenuOpen]);

  const navLinks = [
    { href: '/projects', label: 'Projects' },
  ];

  const isActive = (href) => pathname === href || pathname.startsWith(href + '/');

  return (
    <header className={`${styles.header} ${scrolled ? styles.scrolled : ''}`}>
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          {/* Logo */}
          <Link href="/" className={styles.logo}>
            <span className={styles.logoText}>Takween</span>
          </Link>

          {/* Desktop Nav Links */}
          <div className={styles.desktopLinks}>
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`${styles.navLink} ${isActive(link.href) ? styles.navLinkActive : ''}`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right Side */}
          <div className={styles.rightSection}>
            {loading ? (
              <div className={styles.loadingDot} />
            ) : user ? (
              <>
                {/* Notification Bell */}
                <Link href="/notifications" className={styles.bellButton} aria-label="Notifications">
                  <Bell size={20} />
                  {unreadCount > 0 && (
                    <span className={styles.badge}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Link>

                {/* Profile Dropdown */}
                <div className={styles.profileMenu}>
                  <button
                    className={styles.profileButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      setProfileMenuOpen(!profileMenuOpen);
                    }}
                    aria-expanded={profileMenuOpen}
                    aria-haspopup="true"
                  >
                    <Avatar
                      src={profile?.avatar_url}
                      name={profile?.full_name || 'User'}
                      size="sm"
                    />
                    <span className={styles.profileName}>
                      {profile?.full_name?.split(' ')[0] || 'User'}
                    </span>
                    <ChevronDown size={16} className={`${styles.chevron} ${profileMenuOpen ? styles.chevronOpen : ''}`} />
                  </button>

                  {profileMenuOpen && (
                    <div className={styles.dropdown}>
                      <Link href="/dashboard" className={styles.dropdownItem}>
                        <LayoutDashboard size={16} />
                        Dashboard
                      </Link>
                      <Link href="/profile" className={styles.dropdownItem}>
                        <User size={16} />
                        Profile
                      </Link>
                      {profile?.role === 'admin' && (
                        <Link href="/admin" className={styles.dropdownItem}>
                          <Settings size={16} />
                          Admin Panel
                        </Link>
                      )}
                      <div className={styles.dropdownDivider} />
                      <button onClick={signOut} className={styles.dropdownItem}>
                        <LogOut size={16} />
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className={styles.authLinks}>
                <Link href="/login" className={styles.loginLink}>
                  Sign In
                </Link>
                <Link href="/register" className={styles.registerButton}>
                  Get Started
                </Link>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <button
              className={styles.mobileToggle}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className={styles.mobileMenu}>
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`${styles.mobileLink} ${isActive(link.href) ? styles.mobileLinkActive : ''}`}
              >
                {link.label}
              </Link>
            ))}
            {!user && !loading && (
              <>
                <div className={styles.mobileDivider} />
                <Link href="/login" className={styles.mobileLink}>
                  Sign In
                </Link>
                <Link href="/register" className={styles.mobileLink}>
                  Get Started
                </Link>
              </>
            )}
          </div>
        )}
      </nav>
    </header>
  );
}
