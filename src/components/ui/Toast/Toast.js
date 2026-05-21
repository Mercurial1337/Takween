'use client';

import { useEffect, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import styles from './Toast.module.css';

const variantIcons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

function ToastItem({ id, title, message, variant = 'info', onDismiss }) {
  const [exiting, setExiting] = useState(false);
  const Icon = variantIcons[variant] || Info;

  const handleDismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => onDismiss(id), 200);
  }, [id, onDismiss]);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleDismiss();
    }, 5000);
    return () => clearTimeout(timer);
  }, [handleDismiss]);

  const toastClasses = [
    styles.toast,
    styles[variant],
    exiting ? styles.exiting : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={toastClasses} role="alert">
      <span className={styles.iconWrapper}>
        <Icon size={18} />
      </span>
      <div className={styles.content}>
        {title && <p className={styles.title}>{title}</p>}
        {message && <p className={styles.message}>{message}</p>}
      </div>
      <button
        className={styles.closeButton}
        onClick={handleDismiss}
        aria-label="Dismiss toast"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function ToastContainer({ toasts, onDismiss }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className={styles.container}>
      {toasts.map((toast) => (
        <ToastItem key={toast.id} {...toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

export default ToastItem;
