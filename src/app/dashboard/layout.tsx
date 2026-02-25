'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  Layout, 
  Menu, 
  LogOut, 
  User as UserIcon, 
  ChevronRight, 
  Search,
  Plus,
  Moon,
  Sun,
  Bell
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    setMounted(true);
    
    const restoreSession = async () => {
      if (!user) {
        try {
          const { data } = await api.get('/auth/me');
          useAuthStore.getState().setAuth(data, '');
        } catch (e) {
          router.push('/login');
        }
      }
    };

    restoreSession();
  }, [user, router]);

  if (!mounted || !user) return null;

  const navItems = [
    { name: 'Projects', href: '/dashboard', icon: Layout },
    { name: 'Activity', href: '/dashboard/activity', icon: Bell },
    { name: 'Profile', href: '/dashboard/profile', icon: UserIcon },
  ];

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.error('Logout failed', e);
    } finally {
      logout();
      router.push('/login');
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex overflow-hidden">
      {/* Sidebar */}
      <aside 
        className={`bg-card border-r border-border transition-all duration-300 relative z-40 ${
          isSidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        <div className="h-full flex flex-col p-4">
          <div className="flex items-center gap-3 mb-10 px-2">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
              <Layout className="text-primary-foreground w-6 h-6" />
            </div>
            {isSidebarOpen && (
              <span className="font-bold text-xl tracking-tight truncate">PMS.</span>
            )}
          </div>

          <nav className="flex-1 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${
                  pathname === item.href 
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/10' 
                    : 'hover:bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {isSidebarOpen && <span className="font-medium">{item.name}</span>}
              </Link>
            ))}
          </nav>

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 mt-auto rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all w-full group overflow-hidden"
          >
            <LogOut className="w-5 h-5 shrink-0 group-hover:-translate-x-1 transition-transform" />
            {isSidebarOpen && <span className="font-medium whitespace-nowrap">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-border bg-card/50 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-30">
          <div className="flex items-center gap-4">
             <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-secondary rounded-lg transition-colors md:block hidden"
             >
                <Menu className="w-5 h-5" />
             </button>
             <div className="relative group">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input 
                  type="text" 
                  placeholder="Universal search..." 
                  className="bg-secondary/50 border-none rounded-lg pl-10 pr-4 py-1.5 w-64 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all focus:w-80"
                />
             </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-secondary rounded-lg transition-colors relative">
               <Bell className="w-5 h-5" />
               <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full border-2 border-card" />
            </button>
            <div className="flex items-center gap-3 pl-2 border-l border-border">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold leading-none">{user.name || user.email.split('@')[0]}</p>
                <p className="text-xs text-muted-foreground mt-1 capitalize">{user.role}</p>
              </div>
              <div className="w-8 h-8 bg-primary/20 rounded-full border border-primary/30 flex items-center justify-center text-primary text-xs font-bold">
                {user.email[0].toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Content */}
        <div className="flex-1 overflow-auto bg-background p-6 kanban-scrollbar">
          {children}
        </div>
      </main>
    </div>
  );
}
