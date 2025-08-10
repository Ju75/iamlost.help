'use client';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function HomePage() {
  const [searchId, setSearchId] = useState('');
  const searchParams = useSearchParams();
  
  // Check for ID in URL parameters
  useEffect(() => {
    const urlId = searchParams.get('id');
    if (urlId) {
      // Auto-process the ID from URL
      setSearchId(urlId);
      handleFoundItemSearch(null, urlId);
    }
  }, [searchParams]);

  const handleFoundItemSearch = async (e?: React.FormEvent | null, urlProvidedId?: string) => {
    if (e) e.preventDefault();
    
    const idToProcess = urlProvidedId || searchId;
    if (!idToProcess.trim()) return;

    // Show loading state (optional - you can add a loading state to your homepage)
    try {
      // Call the lookup API to get the encrypted token
      const response = await fetch('/api/found-item/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayId: idToProcess.trim().toUpperCase() })
    });

    const data = await response.json();

    if (!response.ok) {
      // If ID not found, show error or redirect to found page with error
      alert(data.error || 'Invalid ID. Please check the ID and try again.');
      return;
    }

    // Redirect to encrypted URL
    window.location.href = `/found/${data.encryptedToken}`;

    } catch (error) {
      console.error('Search error:', error);
      alert('Error validating ID. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link href="/" className="text-2xl font-bold text-blue-600">
              iamlost.help
            </Link>
            
            <div className="hidden md:flex items-center space-x-8">
              <a href="#how-it-works" className="text-gray-600 hover:text-blue-600 transition-colors">How it Works</a>
              <a href="#pricing" className="text-gray-600 hover:text-blue-600 transition-colors">Pricing</a>
              <Link href="/contact" className="text-gray-600 hover:text-blue-600 transition-colors">Contact</Link>
              <Link href="/help" className="text-gray-600 hover:text-blue-600 transition-colors">FAQ</Link>
            </div>

            <div className="flex items-center space-x-4">
              <Link href="/login" className="text-gray-600 hover:text-blue-600 transition-colors">
                Login
              </Link>
              <Link 
                href="/register" 
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Content */}
            <div className="text-center lg:text-left">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                Never Lose Your{' '}
                <span className="text-blue-600">Important Items</span>{' '}
                Again
              </h1>
              
              <p className="mt-6 text-xl text-gray-600 leading-relaxed">
                Protect everything for less than one AirTag costs. QR codes that work on any phone, 
                unlimited items, instant notifications when found.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link 
                  href="/register" 
                  className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-8 py-4 rounded-lg text-lg transition-all transform hover:scale-105 shadow-lg"
                >
                  Start Protecting Items - $1.24/month
                </Link>
                <a 
                  href="#how-it-works" 
                  className="border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white font-semibold px-8 py-4 rounded-lg text-lg transition-all"
                >
                  How it Works
                </a>
              </div>

              <div className="mt-6 flex flex-wrap gap-6 text-sm text-gray-500 justify-center lg:justify-start">
                <span className="flex items-center">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Unlimited Items
                </span>
                <span className="flex items-center">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Any Smartphone
                </span>
                <span className="flex items-center">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Anonymous Contact
                </span>
              </div>
            </div>

            {/* Right Column - Demo Video/Image */}
            <div className="relative">
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl p-8 text-center text-white shadow-2xl">
                <div className="space-y-6">
                  <div className="text-6xl">📱</div>
                  <h3 className="text-2xl font-bold">See How It Works</h3>
                  <p className="text-blue-100">
                    Simple QR codes that anyone can scan to help return your lost items.
                  </p>
                  <div className="bg-white bg-opacity-20 rounded-lg p-4">
                    <div className="text-4xl mb-2">🔍</div>
                    <p className="text-sm">Scan → Report → Reunite</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Found Item Search Section */}
      <section className="bg-blue-50 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="text-4xl mb-4">🤝</div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Found Someone's Item?
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              Enter the ID from the sticker to help return it to its owner
            </p>
            
            <form onSubmit={handleFoundItemSearch} className="max-w-md mx-auto">
              <div className="flex gap-4">
                <input
                  type="text"
                  value={searchId}
                  onChange={(e) => setSearchId(e.target.value)}
                  className="flex-1 px-4 py-3 text-lg border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-center font-mono"
                  placeholder="Enter ID (e.g., ABC123)"
                  maxLength={6}
                />
                <button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
                >
                  Help Return Item
                </button>
              </div>
            </form>
            
            <p className="mt-4 text-sm text-gray-500">
              You're awesome for helping! The owner will be notified immediately.
            </p>
          </div>
        </div>
      </section>

      {/* Rest of your homepage content remains the same... */}
      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our simple 3-step process protects your items 24/7 with the help of millions of good people worldwide.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '1',
                icon: '🏷️',
                title: 'Attach Stickers',
                description: 'Subscribe and get unlimited QR codes. Print them at home or use our premium stickers. Attach to keys, wallet, bag - anything important.',
                color: 'blue'
              },
              {
                step: '2',
                icon: '📱',
                title: 'Someone Finds It',
                description: 'When your item is lost, anyone with a smartphone can scan the QR code or visit our website. No app required!',
                color: 'green'
              },
              {
                step: '3',
                icon: '🔔',
                title: 'Get Notified',
                description: 'You receive an instant email with the finder\'s message and contact info. Arrange pickup and get your item back!',
                color: 'orange'
              }
            ].map((item, index) => (
              <div key={index} className="text-center group">
                <div className={`w-20 h-20 mx-auto mb-6 rounded-full bg-${item.color}-100 flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <span className="text-3xl">{item.icon}</span>
                </div>
                
                <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full bg-${item.color}-600 text-white font-bold mb-4`}>
                  {item.step}
                </div>
                
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  {item.title}
                </h3>
                
                <p className="text-gray-600 leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Comparison */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Why Choose iamlost.help?
            </h2>
            <p className="text-xl text-gray-600">
              Compare us with expensive alternatives like AirTags
            </p>
          </div>

          <div className="overflow-hidden bg-white rounded-2xl shadow-lg">
            <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-gray-200">
              {/* Feature */}
              <div className="p-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Feature</h3>
                <div className="space-y-4 text-gray-600">
                  <div>Cost per item</div>
                  <div>Works with any phone</div>
                  <div>Items protected</div>
                  <div>Battery required</div>
                  <div>Range limitation</div>
                  <div>Privacy protection</div>
                </div>
              </div>

              {/* iamlost.help */}
              <div className="p-8 bg-blue-50">
                <h3 className="text-lg font-semibold text-blue-600 mb-6">
                  iamlost.help
                  <span className="ml-2 text-xs bg-green-500 text-white px-2 py-1 rounded-full">BEST VALUE</span>
                </h3>
                <div className="space-y-4">
                  <div className="text-green-600 font-semibold">$1.24/month unlimited</div>
                  <div className="text-green-600">✅ Any smartphone</div>
                  <div className="text-green-600">✅ Unlimited items</div>
                  <div className="text-green-600">✅ No battery needed</div>
                  <div className="text-green-600">✅ Global coverage</div>
                  <div className="text-green-600">✅ Anonymous contact</div>
                </div>
              </div>

              {/* AirTags */}
              <div className="p-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Apple AirTag</h3>
                <div className="space-y-4">
                  <div className="text-red-600">$29 each device</div>
                  <div className="text-red-600">❌ iPhone only</div>
                  <div className="text-red-600">❌ One per AirTag</div>
                  <div className="text-red-600">❌ Needs battery</div>
                  <div className="text-yellow-600">⚠️ Bluetooth range</div>
                  <div className="text-yellow-600">⚠️ Location tracking</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            {[
              { number: '13M+', label: 'Unique IDs Available' },
              { number: '24/7', label: 'Recovery Service' },
              { number: '100%', label: 'Privacy Protected' },
              { number: '195+', label: 'Countries Supported' }
            ].map((stat, index) => (
              <div key={index}>
                <div className="text-4xl font-bold mb-2">{stat.number}</div>
                <div className="text-blue-200">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Simple, Affordable Pricing
          </h2>
          <p className="text-xl text-gray-600 mb-12">
            All plans include unlimited QR codes and instant notifications
          </p>

          <div className="max-w-4xl mx-auto">
            <div className="bg-green-50 border border-green-200 rounded-2xl p-8 mb-8">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-2xl font-bold text-green-800 mb-2">
                Most Popular: 12 Months
              </h3>
              <div className="text-4xl font-bold text-green-600 mb-2">
                $14.90 <span className="text-lg text-green-500">total</span>
              </div>
              <p className="text-green-700 mb-6">
                That's only $1.24/month - less than a coffee!
              </p>
              <Link 
                href="/register"
                className="inline-block bg-green-600 hover:bg-green-700 text-white font-semibold px-8 py-3 rounded-lg transition-colors"
              >
                Start Protecting Items Now
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              {[
                { name: 'Monthly', price: '$5.90', period: '/month', savings: null },
                { name: '6 Months', price: '$9.90', period: 'total', savings: '72% off' },
                { name: '24 Months', price: '$19.90', period: 'total', savings: '86% off' }
              ].map((plan, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-2">{plan.name}</h4>
                  <div className="text-2xl font-bold text-blue-600 mb-1">
                    {plan.price}
                  </div>
                  <div className="text-sm text-gray-600 mb-2">{plan.period}</div>
                  {plan.savings && (
                    <div className="text-xs text-green-600 font-semibold mb-4">
                      {plan.savings}
                    </div>
                  )}
                  <Link 
                    href="/register"
                    className="block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition-colors"
                  >
                    Choose Plan
                  </Link>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-12 bg-blue-50 rounded-lg p-6 max-w-2xl mx-auto">
            <h4 className="font-semibold text-blue-800 mb-2">30-Day Money-Back Guarantee</h4>
            <p className="text-blue-700">
              Not satisfied? Get a full refund within 30 days, no questions asked.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold mb-6">
            Ready to Protect Your Items?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of people who never worry about losing their important belongings again.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/register"
              className="bg-white text-blue-600 hover:bg-gray-100 font-semibold px-8 py-4 rounded-lg text-lg transition-all transform hover:scale-105"
            >
              Get Started - $1.24/month
            </Link>
            <Link 
              href="/contact"
              className="border-2 border-white text-white hover:bg-white hover:text-blue-600 font-semibold px-8 py-4 rounded-lg text-lg transition-all"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">iamlost.help</h3>
              <p className="text-gray-400 mb-4">
                The smart way to protect your important items worldwide.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Service</h4>
              <div className="space-y-2 text-gray-400">
                <a href="#how-it-works" className="block hover:text-white transition-colors">How it Works</a>
                <Link href="/pricing" className="block hover:text-white transition-colors">Pricing</Link>
                <Link href="/help" className="block hover:text-white transition-colors">FAQ</Link>
                <Link href="/success-stories" className="block hover:text-white transition-colors">Success Stories</Link>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <div className="space-y-2 text-gray-400">
                <Link href="/contact" className="block hover:text-white transition-colors">Contact Us</Link>
                <Link href="/help" className="block hover:text-white transition-colors">Help Center</Link>
                <Link href="/privacy" className="block hover:text-white transition-colors">Privacy Policy</Link>
                <Link href="/terms" className="block hover:text-white transition-colors">Terms of Service</Link>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Account</h4>
              <div className="space-y-2 text-gray-400">
                <Link href="/login" className="block hover:text-white transition-colors">Login</Link>
                <Link href="/register" className="block hover:text-white transition-colors">Sign Up</Link>
                <Link href="/dashboard" className="block hover:text-white transition-colors">Dashboard</Link>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; 2025 iamlost.help. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
