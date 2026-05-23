'use client';

import styles from './EmptyState.module.css';

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = '',
  ...rest
}) {
  const classNames = [styles.emptyState, className].filter(Boolean).join(' ');

  return (
    <div className={classNames} {...rest}>
      {Icon && (
        <div className={styles.iconWrapper}>
          <Icon size={28} />
        </div>
      )}

      {title && <h3 className={styles.title}>{title}</h3>}

      {description && <p className={styles.description}>{description}</p>}

      {action && (
        <button className={styles.actionButton} onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
}
