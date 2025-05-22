import Link from "next/link";
import { usePathname } from "next/navigation";
import { LucideShield } from "lucide-react";

const Navbar = () => {
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname === path
      ? "bg-primary text-primary-foreground"
      : "hover:bg-secondary";
  };

  return (
    <header className="sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b bg-background px-4 dark:border-neutral-800">
      <div className="flex items-center space-x-2">
        <LucideShield className="h-8 w-8 text-primary" />
        <span className="text-xl font-bold">Aegis</span>
      </div>
      <nav className="flex space-x-2">
        <Link
          href="/"
          className={`rounded-md px-3 py-2 ${isActive("/")}`}
        >
          Хосты
        </Link>
        <Link
          href="/containers"
          className={`rounded-md px-3 py-2 ${isActive("/containers")}`}
        >
          Контейнеры
        </Link>
        <Link
          href="/scan-history"
          className={`rounded-md px-3 py-2 ${isActive("/scan-history")}`}
        >
          История сканирований
        </Link>
        <Link
          href="/vulnerabilities"
          className={`rounded-md px-3 py-2 ${isActive("/vulnerabilities")}`}
        >
          Уязвимости
        </Link>
      </nav>
      <div>
        <button
          className="rounded-full bg-secondary p-2"
          title="Переключить тему"
        >
          🌙
        </button>
      </div>
    </header>
  );
};

export default Navbar; 
