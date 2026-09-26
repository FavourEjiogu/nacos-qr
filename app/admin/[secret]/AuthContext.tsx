'use client';

import { createContext, useContext, useState, useEffect } from 'react';

type AuthContextType = {
  isAuthenticated: boolean;
  login: (password: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [initialCheckDone, setInitialCheckDone] = useState(false);

  useEffect(() => {
    fetch('/api/admin/me')
      .then(res => res.json())
      .then(data => {
        setIsAuthenticated(data.authenticated === true);
        setInitialCheckDone(true);
      })
      .catch(() => setInitialCheckDone(true));
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
        setIsAuthenticated(true);
      } else {
        setError(data.error || 'Invalid password');
      }
    } catch {
      setError('Network error or server unavailable');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await fetch('/api/admin/me', { method: 'POST' });
    setIsAuthenticated(false);
  };

  if (!initialCheckDone) return <div className="container" style={{textAlign:'center', marginTop:'20vh'}}>Loading...</div>;

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {isAuthenticated ? (
        children
      ) : (
        <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '10vh' }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px', textAlign: 'center' }}>
            <h2 className="heading mb-8">Admin Login</h2>
            {error && <div className="badge badge-danger mb-4" style={{ display: 'block', padding: '12px' }}>{error}</div>}
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
