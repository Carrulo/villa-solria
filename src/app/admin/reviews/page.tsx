'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Review } from '@/lib/supabase';
import { Plus, Trash2, Eye, EyeOff, X, Save, Star } from 'lucide-react';

const emptyReview = {
  guest_name: '',
  country: '',
  rating: 10,
  comment: '',
  source: 'Booking.com',
  visible: true,
};

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(emptyReview);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchReviews();
  }, []);

  async function fetchReviews() {
    const { data } = await supabase
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false });

    setReviews((data || []) as Review[]);
    setLoading(false);
  }

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function toggleVisibility(id: string, visible: boolean) {
    const { error } = await supabase.from('reviews').update({ visible: !visible }).eq('id', id);
    if (error) {
      showToast('Erro ao atualizar', 'error');
      return;
    }
    setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, visible: !visible } : r)));
    showToast(visible ? 'Avalia\u00e7\u00e3o oculta' : 'Avalia\u00e7\u00e3o vis\u00edvel', 'success');
  }

  async function handleDelete(id: string) {
    if (!confirm('Eliminar esta avalia\u00e7\u00e3o?')) return;
    const { error } = await supabase.from('reviews').delete().eq('id', id);
    if (error) {
      showToast('Erro ao eliminar', 'error');
      return;
    }
    showToast('Avalia\u00e7\u00e3o eliminada', 'success');
    fetchReviews();
  }

  async function handleAdd() {
    if (!form.guest_name || !form.comment) {
      showToast('Nome e coment\u00e1rio obrigat\u00f3rios', 'error');
      return;
    }

    const { error } = await supabase.from('reviews').insert(form);
    if (error) {
      showToast('Erro ao adicionar avalia\u00e7\u00e3o', 'error');
      return;
    }

    showToast('Avalia\u00e7\u00e3o adicionada', 'success');
    setForm(emptyReview);
    setAdding(false);
    fetchReviews();
  }

  if (loading) {
    return <div className="text-gray-400">A carregar avalia\u00e7\u00f5es...</div>;
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
        <h1 className="text-2xl font-bold text-white">Avalia\u00e7\u00f5es</h1>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          Adicionar Avalia\u00e7\u00e3o
        </button>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <div className="bg-[#16213e] rounded-2xl border border-white/5 p-12 text-center text-gray-500">
            Ainda sem avalia\u00e7\u00f5es
          </div>
        ) : (
          reviews.map((review) => (
            <div
              key={review.id}
              className={`bg-[#16213e] rounded-2xl border border-white/5 p-6 ${!review.visible ? 'opacity-50' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-white font-medium">{review.guest_name}</h3>
                    <span className="text-xs text-gray-400">{review.country}</span>
                    <div className="flex items-center gap-1 bg-yellow-500/10 px-2 py-0.5 rounded-full">
                      <Star size={12} className="text-yellow-400 fill-yellow-400" />
                      <span className="text-xs text-yellow-400 font-medium">{review.rating}</span>
                    </div>
                    <span className="text-xs px-2 py-0.5 bg-white/5 rounded-full text-gray-400">
                      {review.source}
                    </span>
                    {!review.visible && (
                      <span className="text-xs px-2 py-0.5 bg-red-500/10 text-red-400 rounded-full">Oculta</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-300 leading-relaxed">{review.comment}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(review.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-4 shrink-0">
                  <button
                    onClick={() => toggleVisibility(review.id, review.visible)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      review.visible
                        ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                        : 'bg-gray-500/10 text-gray-400 hover:bg-gray-500/20'
                    }`}
                    title={review.visible ? 'Ocultar' : 'Mostrar'}
                  >
                    {review.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                  <button
                    onClick={() => handleDelete(review.id)}
                    className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Review Modal */}
      {adding && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[#16213e] rounded-2xl p-8 w-full max-w-lg border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">Adicionar Avalia\u00e7\u00e3o</h2>
              <button onClick={() => setAdding(false)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Nome do H\u00f3spede</label>
                  <input
                    type="text"
                    value={form.guest_name}
                    onChange={(e) => setForm({ ...form, guest_name: e.target.value })}
                    placeholder="John D."
                    className="w-full px-4 py-2.5 bg-[#1a1a2e] border border-white/10 rounded-xl text-white text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Pa\u00eds</label>
                  <input
                    type="text"
                    value={form.country}
                    onChange={(e) => setForm({ ...form, country: e.target.value })}
                    placeholder="Reino Unido"
                    className="w-full px-4 py-2.5 bg-[#1a1a2e] border border-white/10 rounded-xl text-white text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Classifica\u00e7\u00e3o (1-10)</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    step={0.1}
                    value={form.rating}
                    onChange={(e) => setForm({ ...form, rating: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2.5 bg-[#1a1a2e] border border-white/10 rounded-xl text-white text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Origem</label>
                  <select
                    value={form.source}
                    onChange={(e) => setForm({ ...form, source: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#1a1a2e] border border-white/10 rounded-xl text-white text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 outline-none"
                  >
                    <option value="Booking.com">Booking.com</option>
                    <option value="Airbnb">Airbnb</option>
                    <option value="Google">Google</option>
                    <option value="Direct">Direto</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Coment\u00e1rio</label>
                <textarea
                  value={form.comment}
                  onChange={(e) => setForm({ ...form, comment: e.target.value })}
                  rows={4}
                  placeholder="Texto da avalia\u00e7\u00e3o do h\u00f3spede..."
                  className="w-full px-4 py-2.5 bg-[#1a1a2e] border border-white/10 rounded-xl text-white text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setAdding(false)}
                className="flex-1 py-2.5 bg-white/5 text-gray-300 rounded-xl text-sm font-medium hover:bg-white/10 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAdd}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Save size={16} />
                Adicionar Avalia\u00e7\u00e3o
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
