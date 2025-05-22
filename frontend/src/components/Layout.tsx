import { Link, Outlet, useLocation } from 'react-router-dom';
import { Home, ShieldAlert, History, SettingsIcon, BarChart3 } from 'lucide-react';
import { cn } from "@/lib/utils";

const navItems = [
  { href: '/hosts', label: 'Hosts', icon: Home },
  { href: '/history', label: 'Scan History', icon: History },
  { href: '/vulnerabilities', label: 'Vulnerabilities', icon: ShieldAlert },
  { href: '/dashboard', label: 'Dashboard', icon: BarChart3 }, // Optional
  { href: '/settings', label: 'Settings', icon: SettingsIcon },
];

const Layout = () => {
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background text-foreground">
      <aside className="md:w-64 bg-panel p-4 border-r border-slate-700 flex flex-col">
        <div className="text-2xl font-bold text-accent mb-8">Aegis UI</div>
        <nav className="flex flex-col space-y-2">
          {navItems.map((item) => {
            // Handle /hosts/:hostId/containers active state correctly
            const isActive = item.href === '/hosts' 
                ? location.pathname.startsWith('/hosts') 
                : location.pathname.startsWith(item.href);
            return (
              <Link
                key={item.label}
                to={item.href}
                className={cn(
                  "flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-accent text-black"
                    : "hover:bg-slate-700 hover:text-accent"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto pt-4 text-xs text-gray-500">
            Aegis v0.1.0 {/* Placeholder version */}
        </div>
      </aside>
      <main className="flex-1 p-4 md:p-8 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout; 
