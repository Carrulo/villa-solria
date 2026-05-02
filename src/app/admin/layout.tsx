'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  LayoutDashboard,
  CalendarDays,
  CreditCard,
  DollarSign,
  Star,
  Settings,
  LogOut,
  Menu,
  X,
  BookOpen,
  ImageIcon,
  Mail,
  Inbox,
  Sparkles,
  ChevronsLeft,
  ChevronsRight,
  Compass,
  BarChart3,
} from 'lucide-react';
import NotificationBell from '@/components/admin/NotificationBell';
import '../globals.css';

const navGroups: { label: string | null; items: { href: string; label: string; icon: typeof LayoutDashboard }[] }[] = [
  {
    label: null,
    items: [{ href: '/admin', label: 'Painel', icon: LayoutDashboard }],
  },
  {
    label: 'Operações',
    items: [
      { href: '/admin/bookings', label: 'Reservas', icon: BookOpen },
      { href: '/admin/cleaning', label: 'Limpezas', icon: Sparkles },
      { href: '/admin/payments', label: 'Pagamentos', icon: CreditCard },
      { href: '/admin/pre-arrivals', label: 'Pre-arrival (guia)', icon: CalendarDays },
      { href: '/admin/review-requests', label: 'Pedidos de review', icon: Mail },
    ],
  },
  {
    label: 'Comunicação',
    items: [
      { href: '/admin/inbox', label: 'Mensagens', icon: Inbox },
      { href: '/admin/suggestions', label: 'Sugestões', icon: Sparkles },
      { href: '/admin/newsletter', label: 'Newsletter', icon: Mail },
    ],
  },
  {
    label: 'Conteúdo do site',
    items: [
      { href: '/admin/pricing', label: 'Épocas e Preços', icon: DollarSign },
      { href: '/admin/reviews', label: 'Avaliações publicadas', icon: Star },
      { href: '/admin/photos', label: 'Fotos', icon: ImageIcon },
      { href: '/admin/guide', label: 'Guia do hóspede', icon: Compass },
    ],
  },
  {
    label: 'Análise',
    items: [{ href: '/admin/analytics', label: 'Analytics', icon: BarChart3 }],
  },
  {
    label: 'Sistema',
    items: [{ href: '/admin/settings', label: 'Definições', icon: Settings }],
  },
];

const navItems = navGroups.flatMap((g) => g.items);

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('admin_sidebar_collapsed') : null;
    if (saved === '1') setCollapsed(true);
  }, []);

  function toggleCollapsed() {
    setCollapsed((v) => {
      const next = !v;
      try {
        localStorage.setItem('admin_sidebar_collapsed', next ? '1' : '0');
      } catch {}
      return next;
    });
  }

  // Don't apply admin layout or auth check to login/reset pages
  const isLoginPage = pathname === '/admin/login' || pathname === '/admin/reset-password';

  useEffect(() => {
    if (isLoginPage) {
      setLoading(false);
      return;
    }

    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/admin/login');
      } else {
        setLoading(false);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session && !isLoginPage) {
        router.push('/admin/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [router, isLoginPage]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/admin/login');
  };

  if (isLoginPage) {
    return (
      <html lang="pt">
        <body>{children}</body>
      </html>
    );
  }

  if (loading) {
    return (
      <html lang="pt">
        <body className="bg-[#1a1a2e] min-h-screen flex items-center justify-center">
          <div className="text-white">A carregar...</div>
        </body>
      </html>
    );
  }

  return (
    <html lang="pt">
      <body className="bg-[#1a1a2e] min-h-screen text-white">
        <div className="flex h-screen overflow-hidden">
          {/* Mobile sidebar overlay */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Sidebar */}
          <aside
            className={`fixed lg:static inset-y-0 left-0 z-50 bg-[#16213e] border-r border-white/5 flex flex-col transform transition-all lg:translate-x-0 ${
              sidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64'
            } ${collapsed ? 'lg:w-16' : 'lg:w-64'}`}
          >
            <div className={`border-b border-white/5 flex items-center justify-between ${collapsed ? 'p-3' : 'p-6'}`}>
              {!collapsed && (
                <div>
                  <h1 className="text-xl font-bold text-white">Villa Solria</h1>
                  <p className="text-xs text-gray-400 mt-1">Painel Admin</p>
                </div>
              )}
              <button
                onClick={toggleCollapsed}
                className="hidden lg:flex p-2 rounded-lg text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
                aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
                title={collapsed ? 'Expandir' : 'Recolher'}
              >
                {collapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
              </button>
            </div>

            <nav className={`flex-1 space-y-1 overflow-y-auto ${collapsed ? 'p-2' : 'p-4'}`}>
              {navGroups.map((group, gi) => (
                <div key={gi} className={gi > 0 ? 'mt-4 pt-3 border-t border-white/5' : ''}>
                  {group.label && !collapsed && (
                    <p className="px-4 mb-2 text-[10px] uppercase tracking-widest text-gray-500 font-semibold">
                      {group.label}
                    </p>
                  )}
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const isActive = pathname === item.href;
                      return (
                        <a
                          key={item.href}
                          href={item.href}
                          onClick={() => setSidebarOpen(false)}
                          title={collapsed ? item.label : undefined}
                          className={`flex items-center gap-3 rounded-xl text-sm font-medium transition-all ${
                            collapsed ? 'lg:justify-center lg:px-0 lg:py-3 px-4 py-3' : 'px-4 py-3'
                          } ${
                            isActive
                              ? 'bg-blue-600/20 text-blue-400'
                              : 'text-gray-400 hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          <item.icon size={18} />
                          <span className={collapsed ? 'lg:hidden' : ''}>{item.label}</span>
                        </a>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>

            <div className={`border-t border-white/5 ${collapsed ? 'p-2' : 'p-4'}`}>
              <button
                onClick={handleLogout}
                title={collapsed ? 'Sair' : undefined}
                className={`flex items-center gap-3 rounded-xl text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-white transition-all w-full ${
                  collapsed ? 'lg:justify-center lg:px-0 lg:py-3 px-4 py-3' : 'px-4 py-3'
                }`}
              >
                <LogOut size={18} />
                <span className={collapsed ? 'lg:hidden' : ''}>Sair</span>
              </button>
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <header className="h-16 border-b border-white/5 bg-[#16213e]/50 backdrop-blur-sm flex items-center justify-between px-6 shrink-0">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-gray-400 hover:text-white"
              >
                <Menu size={24} />
              </button>
              <div className="hidden lg:block text-sm text-gray-400">
                {navItems.find((i) => i.href === pathname)?.label || 'Painel'}
              </div>
              <div className="flex items-center gap-3">
                <NotificationBell />
                <div className="text-xs text-gray-500 hidden sm:block">
                  Villa Solria Admin
                </div>
              </div>
            </header>

            {/* Page content */}
            <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
