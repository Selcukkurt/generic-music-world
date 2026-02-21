import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import { tr } from "@/i18n/tr";

export const metadata: Metadata = {
  title: {
    default: tr.meta_default_title,
    template: `%s – ${tr.meta_default_title}`,
  },
  description: tr.meta_default_description,
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: tr.meta_default_title,
    description: tr.meta_default_description,
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className="min-h-[100dvh] antialiased">
        <LocaleProvider>
          <ToastProvider>{children}</ToastProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
