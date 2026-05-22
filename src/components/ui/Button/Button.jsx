'use client';

import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import styles from './Button.module.css';

const Button = forwardRef(function Button(
  {
    variant = 'primary',
    size = 'md',
    children,
    disabled = false,
    loading = false,
    icon: Icon,
    iconPosition = 'left',
    fullWidth = false,
    className = '',
    type = 'button',
    onClick,
    ...rest
  },
  ref
) {
  const classNames = [
    styles.button,
    styles[variant],
    styles[size],
    fullWidth ? styles.fullWidth : '',
    disabled ? styles.disabled : '',
    loading ? styles.loading : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const iconSize = size === 'sm' ? 14 : size === 'lg' ? 20 : 16;

  const renderIcon = () => {
    if (loading) {
      return (
        <span className={styles.icon}>
          <Loader2 size={iconSize} className={styles.spinner} />
        </span>
      );
    }
    if (Icon) {
      return (
        <span className={styles.icon}>
          <Icon size={iconSize} />
        </span>
      );
    }
    return null;
  };

  return (
    <button
      ref={ref}
      type={type}
      className={classNames}
      disabled={disabled || loading}
      onClick={onClick}
      {...rest}
    >
      {(iconPosition === 'left' || loading) && renderIcon()}
      {children}
      {iconPosition === 'right' && !loading && Icon && (
        <span className={styles.icon}>
          <Icon size={iconSize} />
        </span>
      )}
    </button>
  );
});

export default Button;
