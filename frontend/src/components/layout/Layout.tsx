import { ReactNode } from "react";
import Navbar from "./Navbar";
import { Toaster } from "sonner";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1 p-4 md:p-6">{children}</main>
      <footer className="border-t p-4 text-center text-sm text-muted-foreground">
        <p>© 2024 Aegis. Система для сканирования уязвимостей Docker-контейнеров.</p>
      </footer>
      <Toaster position="top-right" />
    </div>
  );
};

export default Layout; 
