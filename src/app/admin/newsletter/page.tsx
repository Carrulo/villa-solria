'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Trash2, Download, Send, Users, UserPlus, Globe, Search } from 'lucide-react';

interface Subscriber {
  id: string;
  email: string;
  locale: string;
  created_at: string;
}

interface NewsletterTemplate {
  id: string;
  label: string;
  subject: string;
  body: string;
}

const TEMPLATES: NewsletterTemplate[] = [
  {
    id: 'ultima_hora',
    label: 'Oferta Ultima Hora',
    subject: 'Disponibilidade de Ultima Hora -- Villa Solria',
    body: 'Temos disponibilidade para as proximas semanas! Aproveite precos especiais para estadias de ultima hora na Villa Solria, em Cabanas de Tavira.\n\nReserve agora em villasolria.com',
  },
  {
    id: 'epoca_baixa',
    label: 'Desconto Epoca Baixa',
    subject: 'Desconto Especial Epoca Baixa -- Villa Solria',
    body: 'A epoca baixa e a melhor altura para descobrir o Algarve sem multidoes. Estamos com precos especiais a partir de XX\u20ac/noite.\n\nReserve ja e aproveite a tranquilidade da Ria Formosa.',
  },
  {
    id: 'novidades',
    label: 'Novidades Villa Solria',
    subject: 'Novidades na Villa Solria',
    body: 'Temos novidades para partilhar!\n\n[Escreva aqui as suas novidades]',
  },
  {
    id: 'repeat_guest',
    label: 'Oferta Especial Repeat Guest',
    subject: 'Oferta Especial para Si -- Villa Solria',
    body: 'Como nosso hospede especial, temos uma oferta exclusiva para si. Volte a visitar-nos e beneficie de um desconto especial na sua proxima estadia.',
  },
  {
    id: 'boas_festas',
    label: 'Boas Festas',
    subject: 'Boas Festas da Villa Solria',
    body: 'A equipa da Villa Solria deseja-lhe Boas Festas e um excelente Ano Novo! Esperamos recebe-lo novamente em 2027.',
  },
  {
    id: 'personalizado',
    label: 'Personalizado',
    subject: '',
    body: '',
  },
];

export default function AdminNewsletterPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Search / filter
  const [searchTerm, setSearchTerm] = useState('');

  // Send form
  const [selectedTemplate, setSelectedTemplate] = useState('personalizado');
  const [subject, setSubject] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [localeFilter, setLocaleFilter] = useState('all');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchSubscribers();
  }, []);

  async function fetchSubscribers() {
    const { data } = await supabase
      .from('newsletter')
      .select('*')
      .order('created_at', { ascending: false });

    setSubscribers((data || []) as Subscriber[]);
    setLoading(false);
  }

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }

  // Stats
  const totalSubscribers = subscribers.length;

  const newThisMonth = useMemo(() => {
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    return subscribers.filter((s) => s.created_at >= firstOfMonth).length;
  }, [subscribers]);

  const localeBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    subscribers.forEach((s) => {
      const loc = (s.locale || 'N/A').toUpperCase();
      counts[loc] = (counts[loc] || 0) + 1;
    });
    return counts;
  }, [subscribers]);

  // Filtered list
  const filteredSubscribers = useMemo(() => {
    let list = subscribers;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter((s) => s.email.toLowerCase().includes(term));
    }
    return list;
  }, [subscribers, searchTerm]);

  // Preview count for send
  const previewCount = useMemo(() => {
    if (localeFilter === 'all') return subscribers.length;
    return subscribers.filter((s) => (s.locale || '').toLowerCase() === localeFilter.toLowerCase()).length;
  }, [subscribers, localeFilter]);

  // Template change handler
  function handleTemplateChange(templateId: string) {
    setSelectedTemplate(templateId);
    const tpl = TEMPLATES.find((t) => t.id === templateId);
    if (tpl) {
      setSubject(tpl.subject);
      setMessageBody(tpl.body);
    }
  }

  // Delete subscriber
  async function handleDelete(id: string) {
    if (!confirm('Tem a certeza que quer remover este subscritor?')) return;

    const { error } = await supabase.from('newsletter').delete().eq('id', id);
    if (error) {
      showToast('Erro ao remover subscritor', 'error');
      return;
    }

    setSubscribers((prev) => prev.filter((s) => s.id !== id));
    showToast('Subscritor removido', 'success');
  }

  // Export CSV
  function handleExportCSV() {
    const header = 'Email,Idioma,Data Subscricao\n';
    const rows = subscribers
      .map((s) => `${s.email},${s.locale || ''},${s.created_at}`)
      .join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `newsletter_subscribers_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('CSV exportado', 'success');
  }

  // Send newsletter
  async function handleSend() {
    if (!subject.trim()) {
      showToast('Preencha o assunto', 'error');
      return;
    }
    if (!messageBody.trim()) {
      showToast('Preencha a mensagem', 'error');
      return;
    }
    if (previewCount === 0) {
      showToast('Nenhum subscritor para o filtro selecionado', 'error');
      return;
    }

    const confirmMsg = `Enviar newsletter para ${previewCount} subscritor${previewCount > 1 ? 'es' : ''}?`;
    if (!confirm(confirmMsg)) return;

    setSending(true);

    try {
      // Convert plain text body to HTML paragraphs
      const htmlBody = messageBody
        .split('\n')
        .map((line) => (line.trim() ? `<p>${line}</p>` : ''))
        .join('');

      const res = await fetch('/api/newsletter/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          html: htmlBody,
          locale_filter: localeFilter === 'all' ? null : localeFilter,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || 'Erro ao enviar newsletter', 'error');
        return;
      }

      showToast(`Newsletter enviada para ${data.sent} subscritor${data.sent > 1 ? 'es' : ''}`, 'success');
    } catch {
      showToast('Erro de rede ao enviar newsletter', 'error');
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return <div className="text-gray-400">A carregar subscritores...</div>;
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

      <h1 className="text-2xl font-bold text-white">Newsletter</h1>

      {/* Section 1: Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Users size={20} />} label="Total Subscritores" value={totalSubscribers} />
        <StatCard icon={<UserPlus size={20} />} label="Novos este mes" value={newThisMonth} />
        {Object.entries(localeBreakdown)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 2)
          .map(([loc, count]) => (
            <StatCard key={loc} icon={<Globe size={20} />} label={loc} value={count} />
          ))}
      </div>

      {/* Locale breakdown (full) */}
      {Object.keys(localeBreakdown).length > 2 && (
        <div className="bg-[#16213e] rounded-2xl border border-white/5 p-6">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Por Idioma
          </h2>
          <div className="flex flex-wrap gap-3">
            {Object.entries(localeBreakdown)
              .sort(([, a], [, b]) => b - a)
              .map(([loc, count]) => (
                <span
                  key={loc}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 text-sm"
                >
                  <span className="text-gray-300 font-medium">{loc}</span>
                  <span className="text-gray-500">{count}</span>
                </span>
              ))}
          </div>
        </div>
      )}

      {/* Section 2: Subscriber List */}
      <div className="bg-[#16213e] rounded-2xl border border-white/5 overflow-hidden">
        <div className="p-6 border-b border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
            Subscritores
          </h2>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filtrar por email..."
                className="pl-9 pr-4 py-2 bg-[#1a1a2e] border border-white/10 rounded-xl text-white text-sm placeholder-gray-500 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 outline-none w-64"
              />
            </div>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 text-gray-300 rounded-xl text-sm font-medium hover:bg-white/10 transition-colors"
            >
              <Download size={14} />
              Exportar CSV
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-gray-400 uppercase tracking-wider border-b border-white/5">
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Idioma</th>
                <th className="px-6 py-4">Data subscricao</th>
                <th className="px-6 py-4">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredSubscribers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    Nenhum subscritor encontrado
                  </td>
                </tr>
              ) : (
                filteredSubscribers.map((sub, i) => (
                  <tr key={sub.id} className={`hover:bg-white/[0.02] ${i % 2 === 1 ? 'bg-white/[0.01]' : ''}`}>
                    <td className="px-6 py-4 text-sm text-white">{sub.email}</td>
                    <td className="px-6 py-4">
                      <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium border bg-blue-500/10 text-blue-300 border-blue-500/20">
                        {(sub.locale || 'N/A').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {new Date(sub.created_at).toLocaleDateString('pt-PT', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleDelete(sub.id)}
                        className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                        title="Remover subscritor"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 3: Send Newsletter */}
      <div className="bg-[#16213e] rounded-2xl border border-white/5 p-6 space-y-5">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
          Enviar Newsletter
        </h2>

        <p className="text-xs text-gray-500">
          Limite: 100 emails/dia no plano gratuito Resend
        </p>

        {/* Template select */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            Template
          </label>
          <select
            value={selectedTemplate}
            onChange={(e) => handleTemplateChange(e.target.value)}
            className="w-full px-4 py-2.5 bg-[#1a1a2e] border border-white/10 rounded-xl text-white text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 outline-none"
          >
            {TEMPLATES.map((tpl) => (
              <option key={tpl.id} value={tpl.id}>
                {tpl.label}
              </option>
            ))}
          </select>
        </div>

        {/* Subject */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            Assunto
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Assunto do email..."
            className="w-full px-4 py-2.5 bg-[#1a1a2e] border border-white/10 rounded-xl text-white text-sm placeholder-gray-500 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 outline-none"
          />
        </div>

        {/* Message body */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            Mensagem
          </label>
          <textarea
            value={messageBody}
            onChange={(e) => setMessageBody(e.target.value)}
            rows={8}
            placeholder="Corpo do email..."
            className="w-full px-4 py-2.5 bg-[#1a1a2e] border border-white/10 rounded-xl text-white text-sm placeholder-gray-500 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 outline-none resize-y"
          />
        </div>

        {/* Locale filter */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            Filtrar por idioma
          </label>
          <select
            value={localeFilter}
            onChange={(e) => setLocaleFilter(e.target.value)}
            className="w-full px-4 py-2.5 bg-[#1a1a2e] border border-white/10 rounded-xl text-white text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 outline-none"
          >
            <option value="all">Todos os idiomas</option>
            <option value="pt">PT</option>
            <option value="en">EN</option>
            <option value="es">ES</option>
            <option value="de">DE</option>
          </select>
        </div>

        {/* Preview count + send */}
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-gray-400">
            Sera enviado para <span className="text-white font-medium">{previewCount}</span> subscritor{previewCount !== 1 ? 'es' : ''}
          </p>
          <button
            onClick={handleSend}
            disabled={sending}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60"
          >
            <Send size={16} />
            {sending ? 'A enviar...' : 'Enviar Newsletter'}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="bg-[#16213e] rounded-2xl border border-white/5 p-6">
      <div className="flex items-center gap-3">
        <div className="text-blue-400">{icon}</div>
        <div>
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-xs text-gray-400">{label}</p>
        </div>
      </div>
    </div>
  );
}
