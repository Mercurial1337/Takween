'use client';

import { useState } from 'react';
import styles from './Avatar.module.css';

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export default function Avatar({
  src,
  alt = '',
  name,
  size = 'md',
  className = '',
  ...rest
}) {
  const [imgError, setImgError] = useState(false);
  const showImage = src && !imgError;

  const classNames = [styles.avatar, styles[size], className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classNames} aria-label={alt || name || 'Avatar'} {...rest}>
      {showImage ? (
        <img
          className={styles.image}
          src={src}
          alt={alt || name || 'Avatar'}
          onError={() => setImgError(true)}
        />
      ) : (
        <span className={styles.fallback}>{getInitials(name)}</span>
      )}
    </div>
  );
}
