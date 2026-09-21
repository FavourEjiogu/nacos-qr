'use client';

import { createContext, useContext, useState, useEffect } from 'react';

type AuthContextType = {
  token: string | null;
  login: (password: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType>({
  token: null,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('admin_token');
    if (saved) setToken(saved);
  }, []);

  const login = async (password: string) => {
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        localStorage.setItem('admin_token', password);
        setToken(password);
      } else {
        setError(data.error || 'Invalid password');
      }
    } catch {
      setError('Network error or server unavailable');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('admin_token');
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ token, login, logout }}>
      {token ? (
        children
      ) : (
        <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '20vh' }}>
          <div className="glass" style={{ padding: '40px', borderRadius: '24px', width: '100%', maxWidth: '400px', textAlign: 'center' }}>
            <h2 style={{ marginBottom: '24px' }}>Admin Login</h2>
            {error && <div style={{ color: 'red', marginBottom: '16px' }}>{error}</div>}
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              login(formData.get('password') as string);
            }}>
              <input 
                name="password" 
                type="password" 
                className="input" 
                placeholder="Enter Admin Password" 
                disabled={loading}
                required 
              />
              <button type="submit" className="btn" style={{ width: '100%' }} disabled={loading}>
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </form>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
