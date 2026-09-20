import { AuthProvider } from './AuthContext';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <header className="glass" style={{ padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 600 }}>NACOS Admin</h1>
          {/* We could put a logout button here inside a client component if needed, or rely on AuthContext */}
        </header>
        <main style={{ flex: 1, padding: '32px' }}>
          {children}
        </main>
      </div>
    </AuthProvider>
  );
}
