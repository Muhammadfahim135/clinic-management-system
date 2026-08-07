import { createContext, useState, useEffect, useContext, type ReactNode } from 'react';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Doctor' | 'Receptionist' | string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  apiFetch: (endpoint: string, options?: RequestInit) => Promise<any>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_URL = 'http://localhost:5000/api';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('clinic_token'));
  const [loading, setLoading] = useState<boolean>(true);
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);

  // Initialize and check current token session on boot
  useEffect(() => {
    const checkSession = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();

        if (response.ok && data.success) {
          setUser(data.user);
        } else {
          // Token is invalid/expired
          handleSessionClear();
        }
      } catch (err) {
        console.error('Failed to authenticate token session:', err);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, [token]);

  // Inactivity / Idle Timer for GDPR & HIPAA Compliance (15 minutes limit)
  useEffect(() => {
    if (!token || !user) {
      setShowTimeoutWarning(false);
      return;
    }

    let lastActive = Date.now();

    const resetTimer = () => {
      // If warning modal is already showing, we require explicit click to reset
      if (!showTimeoutWarning) {
        lastActive = Date.now();
      }
    };

    // Events to monitor activity
    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);
    window.addEventListener('mousedown', resetTimer);
    window.addEventListener('scroll', resetTimer);
    window.addEventListener('click', resetTimer);

    const checkInterval = setInterval(() => {
      const elapsed = Date.now() - lastActive;
      const warningLimit = 14.5 * 60 * 1000; // 14.5 minutes warning threshold
      const logoutLimit = 15 * 60 * 1000; // 15 minutes auto-logout threshold

      if (elapsed >= logoutLimit) {
        clearInterval(checkInterval);
        logout();
      } else if (elapsed >= warningLimit) {
        setShowTimeoutWarning(true);
      } else {
        setShowTimeoutWarning(false);
      }
    }, 1000);

    return () => {
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      window.removeEventListener('mousedown', resetTimer);
      window.removeEventListener('scroll', resetTimer);
      window.removeEventListener('click', resetTimer);
      clearInterval(checkInterval);
    };
  }, [token, user, showTimeoutWarning]);

  const keepSessionAlive = () => {
    setShowTimeoutWarning(false);
    // Trigger reset by dispatching interaction
    const event = new MouseEvent('click', { bubbles: true });
    window.dispatchEvent(event);
  };

  const handleSessionClear = () => {
    localStorage.removeItem('clinic_token');
    setToken(null);
    setUser(null);
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        localStorage.setItem('clinic_token', data.token);
        setToken(data.token);
        setUser(data.user);
        return { success: true, message: data.message };
      } else {
        return { success: false, message: data.message || 'Login failed.' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Could not connect to the server. Please try again.' };
    }
  };

  const logout = async () => {
    // Notify the backend (optional, fire-and-forget)
    if (token) {
      fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }).catch(err => console.error('Logout error notification failed', err));
    }
    handleSessionClear();
  };

  // Helper for all API calls: automatically attaches token and handles auth errors
  const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    };

    const config = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
      
      // Auto-logout if unauthorized (401) or forbidden (403)
      if (response.status === 401) {
        handleSessionClear();
        throw new Error('Session expired. Please log in again.');
      }

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'An error occurred during the request.');
      }

      return data;
    } catch (error: any) {
      console.error(`API Fetch Error [${endpoint}]:`, error);
      throw error;
    }
  };

  const refreshUser = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setUser(data.user);
      }
    } catch (err) {
      console.error('refreshUser error:', err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, apiFetch, refreshUser }}>
      {children}
      
      {showTimeoutWarning && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modal-card" style={{ maxWidth: '400px', textAlign: 'center', padding: '2rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg className="animate-pulse" style={{ color: 'var(--color-danger)', width: '24px', height: '24px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'white', marginBottom: '0.5rem' }}>
                  Inactivity Timeout Warning
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                  To comply with HIPAA security regulations, your session will automatically terminate in 30 seconds due to inactivity.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '1rem', width: '100%', marginTop: '1rem' }}>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  style={{ flex: 1, fontSize: '0.85rem', padding: '0.5rem' }} 
                  onClick={logout}
                >
                  Log Out Now
                </button>
                <button 
                  type="button" 
                  className="btn-primary" 
                  style={{ flex: 1, fontSize: '0.85rem', padding: '0.5rem', width: 'auto' }} 
                  onClick={keepSessionAlive}
                >
                  Stay Logged In
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
