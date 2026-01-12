import type { Metadata, Viewport } from "next";
import "./globals.css";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Monthly Expenses",
  description: "Manage your fixed and variable monthly expenses.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={cn("min-h-screen bg-black text-white antialiased flex justify-center bg-stone-950")}>
        <main className="w-full max-w-md min-h-screen bg-black shadow-2xl relative">
             {children}
        </main>
      </body>
    </html>
  );
}
