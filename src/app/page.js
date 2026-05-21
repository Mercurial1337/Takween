import Navbar from '@/components/layout/Navbar/Navbar';
import Footer from '@/components/layout/Footer/Footer';
import HeroSection from '@/components/landing/HeroSection/HeroSection';
import HowItWorks from '@/components/landing/HowItWorks/HowItWorks';
import FeaturesSection from '@/components/landing/FeaturesSection/FeaturesSection';
import CTASection from '@/components/landing/CTASection/CTASection';
import styles from './page.module.css';

export const metadata = {
  title: 'Takween | Assemble your team',
  description: 'Ditch messy WhatsApp groups. Discover active teams, match by skills, and form graduation or course project groups smoothly.',
};


export default function HomePage() {
  return (
    <>
      <Navbar />
      <main className={styles.main}>
        <HeroSection />
        <HowItWorks />
        <FeaturesSection />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
