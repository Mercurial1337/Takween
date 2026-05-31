import Breadcrumbs from '@/components/ui/Breadcrumbs/Breadcrumbs';
import styles from './PageHeader.module.css';

export default function PageHeader({ title, description, customLabels, breadcrumbItems, children }) {
  return (
    <div className={styles.header}>
      <div className={styles.content}>
        <Breadcrumbs customLabels={customLabels} items={breadcrumbItems} />
        <h1 className={styles.title}>{title}</h1>
        {description && (
          <p className={styles.description}>{description}</p>
        )}
      </div>
      {children && (
        <div className={styles.actions}>
          {children}
        </div>
      )}
    </div>
  );
}
