// src/app/found/page.tsx
import FoundItemForm from '@/components/FoundItemForm';
import Link from 'next/link';

interface PageProps {
  searchParams: { id?: string }
}

export default function FoundPage({ searchParams }: PageProps) {
  const { id } = searchParams;

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
        <FoundItemForm prefilledId={id} />
      </main>
    </div>
  );
}
