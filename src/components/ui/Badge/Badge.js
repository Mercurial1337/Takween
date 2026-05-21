'use client';

import styles from './Badge.module.css';

export default function Badge({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  ...rest
}) {
  const classNames = [
    styles.badge,
    styles[variant],
    styles[size],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classNames} {...rest}>
      {children}
    </span>
  );
}
