// src/app/found/[token]/page.tsx - FIXED VERSION
import FoundItemForm from '@/app/found/components/FoundItemForm';

interface Props {
  params: Promise<{ token: string }>;
}

export default async function FoundTokenPage({ params }: Props) {
  const { token: encryptedToken } = await params;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="text-2xl font-bold text-blue-600">
              iamlost.help
            </div>
            <div className="text-sm text-gray-500">
              🔒 Secure QR Code Scan
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-8">
        {/* Pass token and force showing form directly */}
        <FoundItemForm 
          encryptedToken={encryptedToken} 
          showFormDirectly={true}
        />
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
