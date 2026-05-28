import "./globals.css";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { NotificationsProvider } from "@/contexts/NotificationsContext";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || 
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  ),
  title: {
    default: "Takween | Assemble your team",
    template: "%s | Takween",
  },
  description:
    "Takween helps university students find teammates for course and graduation projects. Browse projects, form teams, and connect with your future collaborators.",
  keywords: [
    "team matching",
    "university projects",
    "find teammates",
    "group projects",
    "student collaboration",
  ],
  openGraph: {
    title: "Takween | Find Your Team",
    description:
      "Takween helps university students find teammates for course and graduation projects.",
    type: "website",
    images: [
      {
        url: "/link-preview.jpg",
        width: 1024,
        height: 559,
        alt: "Takween Link Preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Takween | Find Your Team",
    description:
      "Takween helps university students find teammates for course and graduation projects.",
    images: ["/link-preview.jpg"],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable} data-scroll-behavior="smooth" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AuthProvider>
          <NotificationsProvider>
            <ToastProvider>{children}</ToastProvider>
          </NotificationsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
