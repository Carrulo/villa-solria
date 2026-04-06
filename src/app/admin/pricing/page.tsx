'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Season } from '@/lib/supabase';
import { Plus, Pencil, Trash2, X, Save } from 'lucide-react';

const DAY_NAMES: Record<number, string> = {
  1: 'Seg', 2: 'Ter', 3: 'Qua', 4: 'Qui', 5: 'Sex', 6: 'Sáb', 0: 'Dom'
};
const DAY_IDS = [1, 2, 3, 4, 5, 6, 0]; // Mon-Sun order for UI
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

const emptySeason: Omit<Season, 'id' | 'created_at'> = {
  name: '',
  start_date: '',
  end_date: '',
  price_per_night: 0,
  min_nights: 2,
  allowed_checkin_days: ALL_DAYS,
  cleaning_fee: 50,
  weekly_discount: 0,
};

export default function AdminPricingPage() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Omit<Season, 'created_at'> & { id?: string } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchSeasons();
  }, []);

  async function fetchSeasons() {
    const { data } = await supabase
      .from('seasons')
      .select('*')
      .order('start_date', { ascending: true });

    setSeasons((data || []) as Season[]);
    setLoading(false);
  }

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleSave() {
    if (!editing) return;

    const payload = {
      name: editing.name,
      start_date: editing.start_date,
      end_date: editing.end_date,
      price_per_night: editing.price_per_night,
      min_nights: editing.min_nights,
      allowed_checkin_days: editing.allowed_checkin_days,
      cleaning_fee: editing.cleaning_fee,
      weekly_discount: editing.weekly_discount,
    };

    if (editing.id) {
      const { error } = await supabase.from('seasons').update(payload).eq('id', editing.id);
      if (error) {
        showToast('Erro ao atualizar época', 'error');
        return;
      }
      showToast('Época atualizada', 'success');
    } else {
      const { error } = await supabase.from('seasons').insert(payload);
      if (error) {
        showToast('Erro ao criar época', 'error');
        return;
      }
      showToast('Época criada', 'success');
    }

    setEditing(null);
    fetchSeasons();
  }

  async function handleDelete(id: string) {
    if (!confirm('Eliminar esta época?')) return;
    const { error } = await supabase.from('seasons').delete().eq('id', id);
    if (error) {
      showToast('Erro ao eliminar', 'error');
      return;
    }
    showToast('Época eliminada', 'success');
    fetchSeasons();
  }

  function toggleDay(dayId: number) {
    if (!editing) return;
    const days = (editing.allowed_checkin_days || []) as number[];
    setEditing({
      ...editing,
      allowed_checkin_days: days.includes(dayId) ? days.filter((d) => d !== dayId) : [...days, dayId],
    });
  }

  if (loading) {
    return <div className="text-gray-400">A carregar épocas...</div>;
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
        <h1 className="text-2xl font-bold text-white">Épocas e Preços</h1>
        <button
          onClick={() => setEditing({ ...emptySeason } as Omit<Season, 'created_at'> & { id?: string })}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          Adicionar Época
        </button>
      </div>

      {/* Seasons List */}
      <div className="bg-[#16213e] rounded-2xl border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-gray-400 uppercase tracking-wider border-b border-white/5">
                <th className="px-6 py-4">Nome</th>
                <th className="px-6 py-4">Datas</th>
                <th className="px-6 py-4">Preço/Noite</th>
                <th className="px-6 py-4">Noites Mín.</th>
                <th className="px-6 py-4">Dias de Check-in</th>
                <th className="px-6 py-4">Taxa de Limpeza</th>
                <th className="px-6 py-4">Desconto Semanal</th>
                <th className="px-6 py-4">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {seasons.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    Nenhuma época configurada
                  </td>
                </tr>
              ) : (
                seasons.map((season, i) => (
                  <tr key={season.id} className={`hover:bg-white/[0.02] ${i % 2 === 1 ? 'bg-white/[0.01]' : ''}`}>
                    <td className="px-6 py-4 text-sm font-medium text-white">{season.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      {season.start_date} - {season.end_date}
                    </td>
                    <td className="px-6 py-4 text-sm text-white font-medium">{season.price_per_night}EUR</td>
                    <td className="px-6 py-4 text-sm text-gray-300">{season.min_nights}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1 flex-wrap">
                        {((season.allowed_checkin_days || ALL_DAYS) as number[]).map((d) => (
                          <span key={d} className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded text-[10px] font-medium">
                            {DAY_NAMES[d] || d}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">{season.cleaning_fee}EUR</td>
                    <td className="px-6 py-4 text-sm text-gray-300">{season.weekly_discount}%</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditing({ ...season })}
                          className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(season.id)}
                          className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit/Add Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[#16213e] rounded-2xl p-8 w-full max-w-lg border border-white/10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">
                {editing.id ? 'Editar Época' : 'Adicionar Época'}
              </h2>
              <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Nome</label>
                <input
                  type="text"
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  placeholder="ex: Época Alta"
                  className="w-full px-4 py-2.5 bg-[#1a1a2e] border border-white/10 rounded-xl text-white text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Data Início</label>
                  <input
                    type="date"
                    value={editing.start_date}
                    onChange={(e) => setEditing({ ...editing, start_date: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#1a1a2e] border border-white/10 rounded-xl text-white text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Data Fim</label>
                  <input
                    type="date"
                    value={editing.end_date}
                    onChange={(e) => setEditing({ ...editing, end_date: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#1a1a2e] border border-white/10 rounded-xl text-white text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Preço/Noite (EUR)</label>
                  <input
                    type="number"
                    value={editing.price_per_night}
                    onChange={(e) => setEditing({ ...editing, price_per_night: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2.5 bg-[#1a1a2e] border border-white/10 rounded-xl text-white text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Noites Mín.</label>
                  <input
                    type="number"
                    value={editing.min_nights}
                    onChange={(e) => setEditing({ ...editing, min_nights: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-2.5 bg-[#1a1a2e] border border-white/10 rounded-xl text-white text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Taxa de Limpeza (EUR)</label>
                  <input
                    type="number"
                    value={editing.cleaning_fee}
                    onChange={(e) => setEditing({ ...editing, cleaning_fee: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2.5 bg-[#1a1a2e] border border-white/10 rounded-xl text-white text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Desconto Semanal (%)</label>
                  <input
                    type="number"
                    value={editing.weekly_discount}
                    onChange={(e) => setEditing({ ...editing, weekly_discount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2.5 bg-[#1a1a2e] border border-white/10 rounded-xl text-white text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Dias de Check-in Permitidos</label>
                <div className="flex flex-wrap gap-2">
                  {DAY_IDS.map((dayId) => {
                    const days = (editing.allowed_checkin_days || []) as number[];
                    const selected = days.includes(dayId);
                    return (
                      <button
                        key={dayId}
                        type="button"
                        onClick={() => toggleDay(dayId)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          selected
                            ? 'bg-blue-600 text-white'
                            : 'bg-white/5 text-gray-400 hover:bg-white/10'
                        }`}
                      >
                        {DAY_NAMES[dayId]}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setEditing(null)}
                className="flex-1 py-2.5 bg-white/5 text-gray-300 rounded-xl text-sm font-medium hover:bg-white/10 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Save size={16} />
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
