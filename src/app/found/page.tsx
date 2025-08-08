// src/app/found/page.tsx
import FoundItemForm from '@/components/FoundItemForm';

interface Props {
  searchParams: { id?: string };
}

export default function FoundPage({ searchParams }: Props) {
  const uniqueId = searchParams.id;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="text-2xl font-bold text-blue-600">
              iamlost.help
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-8">
        <FoundItemForm prefilledId={uniqueId} />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-500">
            <p className="mb-2">🌍 Helping people reunite with their belongings worldwide</p>
            <p className="text-sm">
              By using this service, you agree to our{' '}
              <a href="/terms" className="text-blue-600 hover:underline">Terms</a>
              {' '}and{' '}
              <a href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
