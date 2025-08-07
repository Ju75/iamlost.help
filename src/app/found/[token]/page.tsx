// src/app/found/[token]/page.tsx
import FoundItemForm from '@/components/FoundItemForm';
import Link from 'next/link';

interface PageProps {
  params: { token: string }
}

export default function QRFoundPage({ params }: PageProps) {
  const { token } = params;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link href="/" className="text-2xl font-bold text-blue-600">
            iamlost.help
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-8">
        <FoundItemForm encryptedToken={token} />
      </main>
    </div>
  );
}
