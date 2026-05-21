'use client';

import { X } from 'lucide-react';
import styles from './Tag.module.css';

export default function Tag({
  children,
  onRemove,
  variant = 'default',
  className = '',
  ...rest
}) {
  const classNames = [styles.tag, styles[variant], className]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classNames} {...rest}>
      {children}
      {onRemove && (
        <button
          className={styles.removeButton}
          onClick={onRemove}
          aria-label="Remove tag"
          type="button"
        >
          <X size={12} />
        </button>
      )}
    </span>
  );
}
