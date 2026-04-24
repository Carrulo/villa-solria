import type { Metadata } from 'next';
import '../globals.css';

export const metadata: Metadata = {
  title: 'Limpezas — Villa Solria',
};

export default function CleaningLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <body>{children}</body>
    </html>
  );
}
