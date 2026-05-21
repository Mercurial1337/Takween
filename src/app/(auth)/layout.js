import styles from './layout.module.css';

export const metadata = {
  title: 'Takween',
};

export default function AuthLayout({ children }) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        {children}
      </div>
    </div>
  );
}
