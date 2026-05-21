import Navbar from '@/components/layout/Navbar/Navbar';
import Footer from '@/components/layout/Footer/Footer';
import styles from './layout.module.css';

export const metadata = {
  title: 'Dashboard',
};

export default function DashboardLayout({ children }) {
  return (
    <>
      <Navbar />
      <main className={styles.main}>
        <div className={styles.container}>
          {children}
        </div>
      </main>
      <Footer />
    </>
  );
}
