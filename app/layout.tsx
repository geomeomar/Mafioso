import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
});

export const metadata: Metadata = {
  title: "مافيوزو - لعبة الجريمة",
  description: "لعبة اجتماعية للتحقيق والاتهام - اكتشف مين المافيوزو",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${cairo.variable} font-[family-name:var(--font-cairo)] antialiased`}>
        <main className="min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
