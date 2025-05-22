import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Layout from "@/components/layout/Layout";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Aegis - Сканирование уязвимостей Docker",
  description: "Система для сканирования уязвимостей Docker контейнеров на локальных и удаленных хостах",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className={inter.className}>
        <Layout>{children}</Layout>
      </body>
    </html>
  );
}
