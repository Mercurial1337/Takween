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
  title: {
    default: "Takween — Find Your Team",
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
    title: "Takween — Find Your Team",
    description:
      "Takween helps university students find teammates for course and graduation projects.",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <AuthProvider>
          <NotificationsProvider>
            <ToastProvider>{children}</ToastProvider>
          </NotificationsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
