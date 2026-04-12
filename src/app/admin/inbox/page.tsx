'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Inbox,
  Mail,
  MailOpen,
  Send,
  Clock,
  User,
  MessageSquare,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react';

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  email_sent: boolean;
  status: string | null;
  created_at: string;
}

interface BookingMessage {
  id: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string | null;
  message: string | null;
  checkin_date: string;
  checkout_date: string;
  status: string;
  created_at: string;
}

type InboxItem = {
  id: string;
  type: 'contact' | 'booking';
  name: string;
  email: string;
  phone: string | null;
  message: string;
  status: string;
  created_at: string;
  // booking-specific
  checkin_date?: string;
  checkout_date?: string;
  booking_status?: string;
};

export default function AdminInboxPage() {
  const [contactMessages, setContactMessages] = useState<ContactMessage[]>([]);
  const [bookingMessages, setBookingMessages] = useState<BookingMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchMessages();
  }, []);

  async function fetchMessages() {
    const [contactRes, bookingRes] = await Promise.all([
      supabase
        .from('contact_messages')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase
        .from('bookings')
        .select('id, guest_name, guest_email, guest_phone, message, checkin_date, checkout_date, status, created_at')
        .not('message', 'is', null)
        .neq('message', '')
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

    setContactMessages((contactRes.data || []) as ContactMessage[]);
    setBookingMessages((bookingRes.data || []) as BookingMessage[]);
    setLoading(false);
  }

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }

  // Merge contact messages and booking messages into a unified list
  const inboxItems: InboxItem[] = useMemo(() => {
    const contacts: InboxItem[] = contactMessages.map((m) => ({
      id: `contact-${m.id}`,
      type: 'contact' as const,
      name: m.name,
      email: m.email,
      phone: m.phone,
      message: m.message,
      status: m.status || 'new',
      created_at: m.created_at,
    }));

    const bookings: InboxItem[] = bookingMessages.map((b) => ({
      id: `booking-${b.id}`,
      type: 'booking' as const,
      name: b.guest_name,
      email: b.guest_email,
      phone: b.guest_phone,
      message: b.message || '',
      status: 'booking',
      created_at: b.created_at,
      checkin_date: b.checkin_date,
      checkout_date: b.checkout_date,
      booking_status: b.status,
    }));

    return [...contacts, ...bookings].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [contactMessages, bookingMessages]);

  const unreadCount = useMemo(
    () => inboxItems.filter((m) => m.status === 'new').length,
    [inboxItems],
  );

  const selectedItem = selectedId ? inboxItems.find((m) => m.id === selectedId) : null;

  async function handleReply() {
    if (!selectedItem) return;
    if (!replyBody.trim()) {
      showToast('Escreva uma resposta', 'error');
      return;
    }

    setSending(true);
    try {
      const res = await fetch('/api/inbox/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to_email: selectedItem.email,
          subject: `Re: Mensagem de ${selectedItem.name} - Villa Solria`,
          body: replyBody,
          message_id: selectedItem.type === 'contact' ? selectedItem.id.replace('contact-', '') : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Erro ao enviar resposta', 'error');
        return;
      }

      showToast('Resposta enviada com sucesso', 'success');
      setReplyBody('');

      // Update local state to mark as replied
      if (selectedItem.type === 'contact') {
        setContactMessages((prev) =>
          prev.map((m) =>
            m.id === selectedItem.id.replace('contact-', '')
              ? { ...m, status: 'replied' }
              : m,
          ),
        );
      }
    } catch {
      showToast('Erro de rede ao enviar resposta', 'error');
    } finally {
      setSending(false);
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'new':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
            <Mail size={10} />
            Nova
          </span>
        );
      case 'replied':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-300 border border-green-500/30">
            <MailOpen size={10} />
            Respondida
          </span>
        );
      case 'booking':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30">
            <MessageSquare size={10} />
            Reserva
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400 border border-gray-500/30">
            {status}
          </span>
        );
    }
  }

  if (loading) {
    return <div className="text-gray-400">A carregar mensagens...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-xl text-sm font-medium shadow-lg ${
            toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-white">Mensagens</h1>
          {unreadCount > 0 && (
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-400">
          <span>{inboxItems.length} mensagem{inboxItems.length !== 1 ? 'ns' : ''}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#16213e] rounded-2xl border border-white/5 p-5">
          <div className="flex items-center gap-3">
            <div className="text-blue-400"><Inbox size={20} /></div>
            <div>
              <p className="text-2xl font-bold text-white">{inboxItems.length}</p>
              <p className="text-xs text-gray-400">Total</p>
            </div>
          </div>
        </div>
        <div className="bg-[#16213e] rounded-2xl border border-white/5 p-5">
          <div className="flex items-center gap-3">
            <div className="text-blue-400"><Mail size={20} /></div>
            <div>
              <p className="text-2xl font-bold text-white">{unreadCount}</p>
              <p className="text-xs text-gray-400">Por ler</p>
            </div>
          </div>
        </div>
        <div className="bg-[#16213e] rounded-2xl border border-white/5 p-5">
          <div className="flex items-center gap-3">
            <div className="text-green-400"><MailOpen size={20} /></div>
            <div>
              <p className="text-2xl font-bold text-white">
                {inboxItems.filter((m) => m.status === 'replied').length}
              </p>
              <p className="text-xs text-gray-400">Respondidas</p>
            </div>
          </div>
        </div>
      </div>

      {/* Split view */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Message list */}
        <div className={`lg:col-span-2 bg-[#16213e] rounded-2xl border border-white/5 overflow-hidden ${selectedItem ? 'hidden lg:block' : ''}`}>
          <div className="p-4 border-b border-white/5">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              Caixa de Entrada
            </h2>
          </div>
          <div className="divide-y divide-white/5 max-h-[calc(100vh-340px)] overflow-y-auto">
            {inboxItems.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-500">
                Nenhuma mensagem
              </div>
            ) : (
              inboxItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  className={`w-full text-left px-4 py-4 hover:bg-white/[0.03] transition-colors ${
                    selectedId === item.id ? 'bg-white/[0.05] border-l-2 border-blue-500' : ''
                  } ${item.status === 'new' ? 'bg-blue-500/[0.03]' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <User size={14} className="text-gray-500 shrink-0" />
                      <span className={`text-sm truncate ${item.status === 'new' ? 'font-semibold text-white' : 'text-gray-300'}`}>
                        {item.name}
                      </span>
                    </div>
                    <ChevronRight size={14} className="text-gray-600 shrink-0 mt-0.5" />
                  </div>
                  <p className="text-xs text-gray-500 truncate mb-2">{item.message}</p>
                  <div className="flex items-center justify-between">
                    {getStatusBadge(item.status)}
                    <span className="text-xs text-gray-600 flex items-center gap-1">
                      <Clock size={10} />
                      {formatDate(item.created_at)}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Message detail + reply */}
        <div className={`lg:col-span-3 ${!selectedItem ? 'hidden lg:block' : ''}`}>
          {selectedItem ? (
            <div className="bg-[#16213e] rounded-2xl border border-white/5 overflow-hidden">
              {/* Detail header */}
              <div className="p-5 border-b border-white/5">
                <button
                  onClick={() => setSelectedId(null)}
                  className="lg:hidden flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-3"
                >
                  <ArrowLeft size={16} />
                  Voltar
                </button>
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-white">{selectedItem.name}</h2>
                    <p className="text-sm text-gray-400">{selectedItem.email}</p>
                    {selectedItem.phone && (
                      <p className="text-sm text-gray-500">{selectedItem.phone}</p>
                    )}
                  </div>
                  <div className="text-right">
                    {getStatusBadge(selectedItem.status)}
                    <p className="text-xs text-gray-500 mt-1">{formatDate(selectedItem.created_at)}</p>
                  </div>
                </div>
                {selectedItem.type === 'booking' && selectedItem.checkin_date && (
                  <div className="mt-3 px-3 py-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
                    <p className="text-xs text-purple-300">
                      Reserva: {selectedItem.checkin_date} - {selectedItem.checkout_date}
                      {selectedItem.booking_status && ` (${selectedItem.booking_status})`}
                    </p>
                  </div>
                )}
              </div>

              {/* Message body */}
              <div className="p-5 border-b border-white/5">
                <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {selectedItem.message}
                </p>
              </div>

              {/* Reply form */}
              <div className="p-5 space-y-4">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                  Responder
                </h3>
                <textarea
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  rows={5}
                  placeholder="Escreva a sua resposta..."
                  className="w-full px-4 py-3 bg-[#1a1a2e] border border-white/10 rounded-xl text-white text-sm placeholder-gray-500 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 outline-none resize-y"
                />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    Enviado de reservas@villasolria.com
                  </p>
                  <button
                    onClick={handleReply}
                    disabled={sending || !replyBody.trim()}
                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60"
                  >
                    <Send size={16} />
                    {sending ? 'A enviar...' : 'Enviar Resposta'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#16213e] rounded-2xl border border-white/5 flex items-center justify-center h-64">
              <div className="text-center text-gray-500">
                <Inbox size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Selecione uma mensagem para ver</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
