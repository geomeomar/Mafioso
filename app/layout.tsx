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
  icons: {
    icon: "/Mafia.png",
    apple: "/Mafia.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${cairo.variable} font-[family-name:var(--font-cairo)] antialiased`}>
        <main className="min-h-screen pb-10">
          {children}
        </main>
        <footer className="fixed bottom-0 left-0 right-0 py-2 text-center">
          <p className="text-xs text-muted-foreground/40">Developed By Omar Badr</p>
        </footer>
      </body>
    </html>
  );
}
