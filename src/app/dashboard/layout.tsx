'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Layout,
  Menu,
  LogOut,
  User as UserIcon,
  Search,
  Bell,
  Users,
  Folder,
  Settings,
  ChevronRight,
  Shield,
  Building2,
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

  const isPrivileged = user.role === 'ADMIN' || user.role === 'SUB_ADMIN';

  const navGroups = [
    {
      label: null,
      items: [
        { name: 'Organizations', href: '/dashboard', icon: Building2 },

        { name: 'Profile',   href: '/dashboard/profile',  icon: UserIcon },
      ],
    },
    ...(isPrivileged
      ? [
          {
            label: 'Admin',
            items: [
              { name: 'Organizations',      href: '/dashboard/admin/organizations', icon: Building2 },
              { name: 'User Management',    href: '/dashboard/admin/users',         icon: Users     },
              { name: 'Project Management', href: '/dashboard/admin/projects',      icon: Folder    },
            ],
          },
        ]
      : []),
  ];

  // Active check — exact match for /dashboard, prefix match for all others
  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === href : pathname.startsWith(href);

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
    <div className="h-screen bg-background text-foreground flex overflow-hidden">
      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside
        className={`bg-card border-r border-border transition-all duration-300 relative z-40 flex flex-col shrink-0 h-full ${
          isSidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        <div className="flex-1 flex flex-col p-4 overflow-y-auto overflow-x-hidden">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8 px-2 shrink-0">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
              <Layout className="text-primary-foreground w-6 h-6" />
            </div>
            {isSidebarOpen && (
              <span className="font-black text-xl tracking-tight truncate">PMS.</span>
            )}
          </div>

          {/* Nav groups */}
          <nav className="flex-1 space-y-6">
            {navGroups.map((group, gi) => (
              <div key={gi} className="space-y-1">
                {/* Group label */}
                {group.label && isSidebarOpen && (
                  <div className="flex items-center gap-2 px-3 mb-2">
                    <Shield className="w-3 h-3 text-primary shrink-0" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                      {group.label}
                    </span>
                  </div>
                )}
                {group.label && !isSidebarOpen && (
                  <div className="border-t border-border/50 mx-2 pt-4" />
                )}

                {group.items.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={!isSidebarOpen ? item.name : undefined}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group relative ${
                        active
                          ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                          : 'hover:bg-secondary text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <item.icon className="w-5 h-5 shrink-0" />
                      {isSidebarOpen && (
                        <span className="font-medium truncate">{item.name}</span>
                      )}
                      {isSidebarOpen && active && (
                        <ChevronRight className="w-4 h-4 ml-auto opacity-60 shrink-0" />
                      )}
                      {/* Tooltip when collapsed */}
                      {!isSidebarOpen && (
                        <div className="absolute left-full ml-3 px-3 py-1.5 bg-card border border-border rounded-xl text-xs font-semibold text-foreground whitespace-nowrap shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                          {item.name}
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

        {/* User footer */}
        <div className="p-4 border-t border-border shrink-0">
          {isSidebarOpen ? (
            <div className="flex items-center gap-3 px-2 mb-3">
              <div className="w-8 h-8 bg-primary/15 rounded-xl border border-primary/20 flex items-center justify-center text-primary text-xs font-black shrink-0">
                {user.email[0].toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate leading-none">
                  {user.name || user.email.split('@')[0]}
                </p>
                <p className="text-xs text-muted-foreground capitalize mt-0.5">{user.role.toLowerCase()}</p>
              </div>
            </div>
          ) : null}

          <button
            onClick={handleLogout}
            className={`flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all group ${
              !isSidebarOpen ? 'justify-center' : ''
            }`}
            title={!isSidebarOpen ? 'Logout' : undefined}
          >
            <LogOut className="w-5 h-5 shrink-0 group-hover:-translate-x-0.5 transition-transform text-red-500 hover:text-red-600 " />
            {isSidebarOpen && <span className="font-medium text-red-500 hover:text-red-600">Logout</span>}
          </button>
        </div>
      </aside>

      {/* ── Main Content ─────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-border bg-card/50 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-30 shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-secondary rounded-lg transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="relative group">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input
                type="text"
                placeholder="Search…"
                className="bg-secondary/50 border-none rounded-lg pl-10 pr-4 py-1.5 w-56 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all focus:w-72"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/dashboard/settings" title="Settings" className="p-2 hover:bg-secondary text-muted-foreground hover:text-foreground rounded-lg transition-colors relative">
              <Settings className="w-5 h-5" />
            </Link>

            <button className="p-2 hover:bg-secondary rounded-lg transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full border-2 border-card" />
            </button>

            <Link
              href="/dashboard/profile"
              className="flex items-center gap-3 pl-2 border-l border-border hover:opacity-80 transition-opacity"
            >
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold leading-none">
                  {user.name || user.email.split('@')[0]}
                </p>
                <p className="text-xs text-muted-foreground mt-1 capitalize">{user.role.toLowerCase()}</p>
              </div>
              <div className="w-8 h-8 bg-primary/20 rounded-full border border-primary/30 flex items-center justify-center text-primary text-xs font-black">
                {user.email[0].toUpperCase()}
              </div>
            </Link>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-auto bg-background p-6 kanban-scrollbar">
          {children}
        </div>
      </main>
    </div>
  );
}
