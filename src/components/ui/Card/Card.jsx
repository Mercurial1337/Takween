'use client';

import styles from './Card.module.css';

const paddingMap = {
  sm: styles.paddingSm,
  md: styles.paddingMd,
  lg: styles.paddingLg,
};

export default function Card({
  children,
  className = '',
  variant = 'default',
  hoverable = false,
  padding = 'md',
  onClick,
  ...rest
}) {
  const classNames = [
    styles.card,
    styles[variant],
    paddingMap[padding],
    hoverable ? styles.hoverable : '',
    onClick ? styles.clickable : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const handleKeyDown = onClick ? (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(e);
    }
  } : undefined;

  return (
    <div
      className={classNames}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      {...rest}
    >
      {children}
    </div>
  );
}
