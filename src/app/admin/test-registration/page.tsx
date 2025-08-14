// src/app/admin/test-registration/page.tsx - Registration Testing Suite
'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';

interface TestUser {
  id: number;
  email: string;
  firstName: string;
  status: string;
  registrationStep: string;
  createdAt: string;
}

export default function RegistrationTestingSuite() {
  const { user } = useAuth();
  const [testUsers, setTestUsers] = useState<TestUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  // Test scenarios
  const testScenarios = [
    {
      id: 'pending_user',
      name: 'Pending User (INFO_COLLECTED)',
      description: 'User who completed step 1 but hasn\'t selected a plan',
      status: 'PENDING',
      registrationStep: 'INFO_COLLECTED'
    },
    {
      id: 'plan_selected_user',
      name: 'Plan Selected User',
      description: 'User who selected a plan but hasn\'t completed payment',
      status: 'PENDING',
      registrationStep: 'PLAN_SELECTED'
    },
    {
      id: 'active_user',
      name: 'Active User',
      description: 'User who completed the entire registration process',
      status: 'ACTIVE',
      registrationStep: 'COMPLETED'
    },
    {
      id: 'expired_user',
      name: 'Expired User',
      description: 'User whose subscription has expired',
      status: 'EXPIRED',
      registrationStep: 'COMPLETED'
    },
    {
      id: 'suspended_user',
      name: 'Suspended User',
      description: 'User whose account has been suspended',
      status: 'SUSPENDED',
      registrationStep: 'COMPLETED'
    },
    {
      id: 'deleted_user',
      name: 'Deleted User',
      description: 'User whose account has been deleted',
      status: 'DELETED',
      registrationStep: 'COMPLETED'
    }
  ];

  useEffect(() => {
    if (user && user.id === 1) { // Only allow admin user
      loadTestUsers();
    }
  }, [user]);

  const loadTestUsers = async () => {
    try {
      const response = await fetch('/api/admin/test-users', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setTestUsers(data.users || []);
      }
    } catch (error) {
      console.error('Failed to load test users:', error);
    }
  };

  const createTestUser = async (scenario: any) => {
    setLoading(true);
    try {
      const testEmail = `test-${scenario.id}-${Date.now()}@example.com`;
      
      const response = await fetch('/api/admin/create-test-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          firstName: `Test ${scenario.name}`,
          lastName: 'User',
          password: 'TestPassword123!',
          status: scenario.status,
          registrationStep: scenario.registrationStep
        }),
        credentials: 'include'
      });

      const data = await response.json();
      if (data.success) {
        setResults(prev => [...prev, {
          scenario: scenario.name,
          email: testEmail,
          password: 'TestPassword123!',
          status: 'Created',
          userId: data.userId,
          timestamp: new Date().toISOString()
        }]);
        await loadTestUsers();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      setResults(prev => [...prev, {
        scenario: scenario.name,
        status: 'Failed',
        error: error.message,
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const runFullRegistrationTest = async () => {
    setLoading(true);
    setResults([]);

    try {
      const testEmail = `full-test-${Date.now()}@example.com`;
      const password = 'TestPassword123!';

      // Step 1: Register user
      const step1Response = await fetch('/api/auth/register-step1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: 'Full',
          lastName: 'Test',
          email: testEmail,
          emailConfirmation: testEmail,
          password: password,
          confirmPassword: password,
          agreeToTerms: true
        })
      });

      const step1Data = await step1Response.json();
      if (!step1Data.success) throw new Error('Step 1 failed: ' + step1Data.error);

      setResults(prev => [...prev, {
        step: 'Step 1 - Info Collection',
        status: 'Success',
        userId: step1Data.userId,
        timestamp: new Date().toISOString()
      }]);

      // Step 2: Select plan
      const step2Response = await fetch('/api/auth/register-step2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: step1Data.userId,
          selectedPlanId: '12months'
        })
      });

      const step2Data = await step2Response.json();
      if (!step2Data.success) throw new Error('Step 2 failed: ' + step2Data.error);

      setResults(prev => [...prev, {
        step: 'Step 2 - Plan Selection',
        status: 'Success',
        selectedPlan: '12months',
        timestamp: new Date().toISOString()
      }]);

      // Step 3: Complete registration (this will either create Stripe session or complete directly)
      const step3Response = await fetch('/api/auth/register-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: step1Data.userId,
          completeRegistration: true // Force completion without Stripe
        })
      });

      const step3Data = await step3Response.json();
      if (!step3Data.success) throw new Error('Step 3 failed: ' + step3Data.error);

      setResults(prev => [...prev, {
        step: 'Step 3 - Registration Complete',
        status: 'Success',
        uniqueId: step3Data.uniqueId,
        timestamp: new Date().toISOString()
      }]);

      setResults(prev => [...prev, {
        step: 'Full Test Summary',
        status: 'Complete',
        email: testEmail,
        password: password,
        loginUrl: `/login`,
        dashboardUrl: `/dashboard`,
        timestamp: new Date().toISOString()
      }]);

    } catch (error) {
      setResults(prev => [...prev, {
        step: 'Full Test',
        status: 'Failed',
        error: error.message,
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setLoading(false);
      await loadTestUsers();
    }
  };

  const testLogin = async (email: string, password: string = 'TestPassword123!') => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include'
      });

      const data = await response.json();
      if (data.success) {
        // Open dashboard in new tab
        window.open('/dashboard', '_blank');
        setResults(prev => [...prev, {
          action: 'Test Login',
          email: email,
          status: 'Success - Dashboard opened',
          timestamp: new Date().toISOString()
        }]);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      setResults(prev => [...prev, {
        action: 'Test Login',
        email: email,
        status: 'Failed',
        error: error.message,
        timestamp: new Date().toISOString()
      }]);
    }
  };

  const changeUserStatus = async (userId: number, newStatus: string) => {
    try {
      const response = await fetch('/api/admin/change-user-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, status: newStatus }),
        credentials: 'include'
      });

      const data = await response.json();
      if (data.success) {
        await loadTestUsers();
        setResults(prev => [...prev, {
          action: 'Status Change',
          userId: userId,
          newStatus: newStatus,
          status: 'Success',
          timestamp: new Date().toISOString()
        }]);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      setResults(prev => [...prev, {
        action: 'Status Change',
        userId: userId,
        status: 'Failed',
        error: error.message,
        timestamp: new Date().toISOString()
      }]);
    }
  };

  const cleanupTestUsers = async () => {
    if (!confirm('Are you sure you want to delete all test users? This cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch('/api/admin/cleanup-test-users', {
        method: 'DELETE',
        credentials: 'include'
      });

      const data = await response.json();
      if (data.success) {
        setTestUsers([]);
        setResults(prev => [...prev, {
          action: 'Cleanup',
          status: 'Success',
          deletedCount: data.deletedCount,
          timestamp: new Date().toISOString()
        }]);
      }
    } catch (error) {
      setResults(prev => [...prev, {
        action: 'Cleanup',
        status: 'Failed',
        error: error.message,
        timestamp: new Date().toISOString()
      }]);
    }
  };

  if (!user || user.id !== 1) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">🚫</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Admin Access Required</h2>
          <p className="text-gray-600">This page is only accessible to administrators.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Registration Testing & Debugging Suite
          </h1>
          <p className="text-gray-600">
            Comprehensive testing tools for the registration process and user status behaviors
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <button
            onClick={runFullRegistrationTest}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Running...' : '🧪 Run Full Registration Test'}
          </button>

          <button
            onClick={() => window.open('/register', '_blank')}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors"
          >
            🔗 Open Registration Page
          </button>

          <button
            onClick={cleanupTestUsers}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors"
          >
            🗑️ Cleanup Test Users
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Test Scenarios */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              User Status Test Scenarios
            </h2>
            <div className="space-y-4">
              {testScenarios.map((scenario) => (
                <div key={scenario.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-800">{scenario.name}</h3>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      scenario.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                      scenario.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                      scenario.status === 'EXPIRED' ? 'bg-orange-100 text-orange-800' :
                      scenario.status === 'SUSPENDED' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {scenario.status}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm mb-3">{scenario.description}</p>
                  <button
                    onClick={() => createTestUser(scenario)}
                    disabled={loading}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded text-sm transition-colors disabled:opacity-50"
                  >
                    Create Test User
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Existing Test Users */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Existing Test Users ({testUsers.length})
            </h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {testUsers.map((user) => (
                <div key={user.id} className="border rounded-lg p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-medium text-gray-800">{user.firstName}</div>
                      <div className="text-sm text-gray-600">{user.email}</div>
                    </div>
                    <div className="text-right">
                      <div className={`px-2 py-1 rounded text-xs font-medium mb-1 ${
                        user.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                        user.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                        user.status === 'EXPIRED' ? 'bg-orange-100 text-orange-800' :
                        user.status === 'SUSPENDED' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {user.status}
                      </div>
                      <div className="text-xs text-gray-500">{user.registrationStep}</div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => testLogin(user.email)}
                      className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs transition-colors"
                    >
                      Test Login
                    </button>
                    
                    {/* Status change buttons */}
                    {user.status !== 'ACTIVE' && (
                      <button
                        onClick={() => changeUserStatus(user.id, 'ACTIVE')}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs transition-colors"
                      >
                        → Active
                      </button>
                    )}
                    
                    {user.status !== 'EXPIRED' && (
                      <button
                        onClick={() => changeUserStatus(user.id, 'EXPIRED')}
                        className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded text-xs transition-colors"
                      >
                        → Expired
                      </button>
                    )}
                    
                    {user.status !== 'SUSPENDED' && (
                      <button
                        onClick={() => changeUserStatus(user.id, 'SUSPENDED')}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs transition-colors"
                      >
                        → Suspended
                      </button>
                    )}
                  </div>
                </div>
              ))}
              
              {testUsers.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No test users created yet. Use the scenarios on the left to create test users.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Test Results */}
        {results.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Test Results</h2>
              <button
                onClick={() => setResults([])}
                className="text-gray-500 hover:text-gray-700 text-sm"
              >
                Clear Results
              </button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {results.slice().reverse().map((result, index) => (
                <div key={index} className={`p-3 rounded-lg border-l-4 ${
                  result.status === 'Success' || result.status === 'Complete' || result.status === 'Created' 
                    ? 'bg-green-50 border-green-400' 
                    : 'bg-red-50 border-red-400'
                }`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-gray-800">
                        {result.scenario || result.step || result.action || 'Test'}
                      </div>
                      {result.email && (
                        <div className="text-sm text-gray-600">Email: {result.email}</div>
                      )}
                      {result.password && (
                        <div className="text-sm text-gray-600">Password: {result.password}</div>
                      )}
                      {result.uniqueId && (
                        <div className="text-sm text-gray-600">Unique ID: {result.uniqueId}</div>
                      )}
                      {result.error && (
                        <div className="text-sm text-red-600">Error: {result.error}</div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className={`px-2 py-1 rounded text-xs font-medium ${
                        result.status === 'Success' || result.status === 'Complete' || result.status === 'Created'
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {result.status}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(result.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
