import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Villa Solria',
  description: 'Your retreat on the Ria Formosa',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
