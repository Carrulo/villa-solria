'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Bell } from 'lucide-react';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export default function NotificationBell() {
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const unreadCount = items.filter((n) => !n.read_at).length;

  async function load() {
    const { data } = await supabase
      .from('notifications')
      .select('id, type, title, body, link, read_at, created_at')
      .order('created_at', { ascending: false })
      .limit(30);
    setItems((data || []) as Notification[]);
  }

  useEffect(() => {
    load();

    const channel = supabase
      .channel('notifications-admin')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          setItems((prev) => [payload.new as Notification, ...prev].slice(0, 30));
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications' },
        (payload) => {
          setItems((prev) =>
            prev.map((n) => (n.id === (payload.new as Notification).id ? (payload.new as Notification) : n))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  async function markAllRead() {
    const unreadIds = items.filter((n) => !n.read_at).map((n) => n.id);
    if (unreadIds.length === 0) return;
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => (unreadIds.includes(n.id) ? { ...n, read_at: now } : n)));
    await supabase.from('notifications').update({ read_at: now }).in('id', unreadIds);
  }

  async function handleClick(n: Notification) {
    if (!n.read_at) {
      const now = new Date().toISOString();
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read_at: now } : x)));
      await supabase.from('notifications').update({ read_at: now }).eq('id', n.id);
    }
    if (n.link) {
      window.location.href = n.link;
    } else {
      setOpen(false);
    }
  }

  function timeAgo(iso: string): string {
    const diff = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return 'agora';
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  }

  return (
    <div className="relative" ref={popoverRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-lg text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
        aria-label="Notificações"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 max-h-[70vh] overflow-y-auto bg-[#16213e] border border-white/10 rounded-xl shadow-2xl z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 sticky top-0 bg-[#16213e]">
            <h3 className="text-sm font-semibold text-white">Notificações</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                Marcar todas lidas
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500">
              Sem notificações
            </div>
          ) : (
            <ul className="divide-y divide-white/5">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => handleClick(n)}
                    className={`w-full text-left px-4 py-3 hover:bg-white/5 transition-colors flex gap-3 ${
                      n.read_at ? 'opacity-60' : ''
                    }`}
                  >
                    <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${n.read_at ? 'bg-transparent' : 'bg-blue-400'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-white truncate">{n.title}</p>
                        <span className="text-[10px] text-gray-500 shrink-0">{timeAgo(n.created_at)}</span>
                      </div>
                      {n.body && <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{n.body}</p>}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
