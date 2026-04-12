import Link from 'next/link';

export default function NotFound() {
  return (
    <html lang="pt">
      <body className="min-h-screen flex flex-col bg-[#F5F0EB] text-[#1E3A5F] antialiased">
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <h1 className="text-7xl font-bold mb-4" style={{ color: '#1E3A5F' }}>
              404
            </h1>
            <h2
              className="text-2xl font-semibold mb-2"
              style={{ color: '#1E3A5F' }}
            >
              Villa Solria
            </h2>
            <p className="text-lg mb-2" style={{ color: '#6B7280' }}>
              P\u00e1gina n\u00e3o encontrada / Page not found
            </p>
            <p className="text-sm mb-8" style={{ color: '#9CA3AF' }}>
              A p\u00e1gina que procura n\u00e3o existe ou foi movida.
              <br />
              The page you are looking for does not exist or has been moved.
            </p>
            <Link
              href="/"
              style={{
                display: 'inline-block',
                padding: '12px 32px',
                backgroundColor: '#2563EB',
                color: '#ffffff',
                fontWeight: 600,
                borderRadius: '12px',
                textDecoration: 'none',
                fontSize: '14px',
              }}
            >
              Voltar ao in\u00edcio / Back to homepage
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
