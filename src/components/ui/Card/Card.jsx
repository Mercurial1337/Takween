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

  const Tag = onClick ? 'button' : 'div';

  return (
    <Tag
      className={classNames}
      onClick={onClick}
      tabIndex={onClick ? 0 : undefined}
      {...rest}
    >
      {children}
    </Tag>
  );
}
