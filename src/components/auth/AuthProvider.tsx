// src/components/auth/AuthProvider.tsx - Enhanced with status-based access control
'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface User {
  id: number;
  email: string;
  firstName?: string;
  lastName?: string;
  preferredLanguage: string;
  status: 'ACTIVE' | 'PENDING' | 'EXPIRED' | 'SUSPENDED' | 'DELETED';
  registrationStep: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  getAccessLevel: () => AccessLevel;
  getStatusMessage: () => StatusMessage | null;
  canAccessDashboard: () => boolean;
  shouldRedirectToPricing: () => boolean;
}

interface RegisterData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  preferredLanguage?: string;
}

interface AccessLevel {
  canAccessDashboard: boolean;
  canAccessPricing: boolean;
  canAccessSubscriptionManagement: boolean;
  requiresSpecialPage: boolean;
  specialPageUrl?: string;
}

interface StatusMessage {
  text: string;
  color: 'orange' | 'red' | 'blue' | 'green';
  weight: 'normal' | 'bold';
  priority: 'low' | 'medium' | 'high';
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check authentication status on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUser(data.user);
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include'
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }

    if (data.success) {
      setUser(data.user);
    }
  };

  const register = async (registerData: RegisterData) => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(registerData),
      credentials: 'include'
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Registration failed');
    }

    if (data.success) {
      setUser(data.user);
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout request failed:', error);
    } finally {
      setUser(null);
      // Redirect to home page
      window.location.href = '/';
    }
  };

  const refreshUser = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Refresh user failed:', error);
      setUser(null);
    }
  };

  // Determine access level based on user status
  const getAccessLevel = (): AccessLevel => {
    if (!user) {
      return {
        canAccessDashboard: false,
        canAccessPricing: true,
        canAccessSubscriptionManagement: false,
        requiresSpecialPage: false
      };
    }

    switch (user.status) {
      case 'ACTIVE':
        return {
          canAccessDashboard: true,
          canAccessPricing: true,
          canAccessSubscriptionManagement: true,
          requiresSpecialPage: false
        };

      case 'PENDING':
        return {
          canAccessDashboard: false,
          canAccessPricing: true,
          canAccessSubscriptionManagement: false,
          requiresSpecialPage: false
        };

      case 'EXPIRED':
        return {
          canAccessDashboard: true, // Limited access
          canAccessPricing: true,
          canAccessSubscriptionManagement: true,
          requiresSpecialPage: false
        };

      case 'SUSPENDED':
        return {
          canAccessDashboard: false,
          canAccessPricing: false,
          canAccessSubscriptionManagement: false,
          requiresSpecialPage: true,
          specialPageUrl: '/account/suspended'
        };

      case 'DELETED':
        return {
          canAccessDashboard: false,
          canAccessPricing: false,
          canAccessSubscriptionManagement: false,
          requiresSpecialPage: true,
          specialPageUrl: '/account/deleted'
        };

      default:
        return {
          canAccessDashboard: false,
          canAccessPricing: false,
          canAccessSubscriptionManagement: false,
          requiresSpecialPage: false
        };
    }
  };

  // Get status message for UI display
  const getStatusMessage = (): StatusMessage | null => {
    if (!user) return null;

    switch (user.status) {
      case 'PENDING':
        return {
          text: 'Complete your registration',
          color: 'orange',
          weight: 'normal',
          priority: 'medium'
        };

      case 'EXPIRED':
        return {
          text: 'Subscription expired',
          color: 'red',
          weight: 'bold',
          priority: 'high'
        };

      case 'SUSPENDED':
        return {
          text: 'ID suspended - re-subscribe or your ID will be deleted',
          color: 'red',
          weight: 'bold',
          priority: 'high'
        };

      case 'DELETED':
        return {
          text: 'Account deleted - contact support for reactivation',
          color: 'red',
          weight: 'bold',
          priority: 'high'
        };

      default:
        return null;
    }
  };

  const canAccessDashboard = (): boolean => {
    return getAccessLevel().canAccessDashboard;
  };

  const shouldRedirectToPricing = (): boolean => {
    if (!user) return false;
    return user.status === 'PENDING' || user.status === 'EXPIRED';
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    refreshUser,
    getAccessLevel,
    getStatusMessage,
    canAccessDashboard,
    shouldRedirectToPricing
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Higher-order component for protected routes with status-based access
export function withStatusBasedAuth<P extends object>(
  Component: React.ComponentType<P>,
  requiredAccess?: keyof AccessLevel
) {
  return function StatusBasedAuthComponent(props: P) {
    const { user, loading, getAccessLevel, getStatusMessage } = useAuth();

    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading...</p>
          </div>
        </div>
      );
    }

    if (!user) {
      // Redirect to login
      window.location.href = '/login';
      return null;
    }

    const accessLevel = getAccessLevel();
    const statusMessage = getStatusMessage();

    // Check if user needs special page
    if (accessLevel.requiresSpecialPage && accessLevel.specialPageUrl) {
      window.location.href = accessLevel.specialPageUrl;
      return null;
    }

    // Check specific access requirement
    if (requiredAccess && !accessLevel[requiredAccess]) {
      // Redirect based on status
      if (user.status === 'PENDING' || user.status === 'EXPIRED') {
        window.location.href = '/pricing';
        return null;
      }
      
      // For other statuses, show access denied
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">🚫</div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-4">
              {statusMessage?.text || 'You do not have permission to access this page.'}
            </p>
            <button 
              onClick={() => window.location.href = '/'}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Go Home
            </button>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };
}
