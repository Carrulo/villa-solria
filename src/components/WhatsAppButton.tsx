'use client';

import { MessageCircle } from 'lucide-react';

type Props = {
  phoneNumber?: string;
  message?: string;
};

export default function WhatsAppButton({
  phoneNumber = '351912345678',
  message = "Hello, I'm interested in Villa Solria",
}: Props) {
  const clean = phoneNumber.replace(/[^\d]/g, '');
  const href = `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-whatsapp rounded-full flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-200"
      aria-label="Contact via WhatsApp"
    >
      <MessageCircle size={28} className="text-white" fill="white" />
    </a>
  );
}
