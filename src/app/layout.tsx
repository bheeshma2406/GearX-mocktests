import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "@/styles/question-image.css";
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import TopBar from '@/components/TopBar';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GearX - Test Platform | JEE & UGEE Preparation",
  description: "Master your JEE and UGEE preparation with authentic question papers, detailed performance analysis, and comprehensive test practice.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <AuthProvider>
            <div className="min-h-dvh flex flex-col">
              <TopBar />
              <div className="flex-1">{children}</div>
            </div>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
