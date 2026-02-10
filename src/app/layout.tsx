import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import { tr } from "@/i18n/tr";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: tr.meta_default_title,
    template: `%s – ${tr.meta_default_title}`,
  },
  description: tr.meta_default_description,
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-[100dvh] antialiased`}
      >
        <LocaleProvider>
          <ToastProvider>{children}</ToastProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
