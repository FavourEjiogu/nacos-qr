import { notFound } from 'next/navigation';
import { AuthProvider } from './AuthContext';

export default async function AdminLayout(props: { children: React.ReactNode, params: Promise<{ secret: string }> }) {
  const { children } = props;
  const params = await props.params;
  if (params.secret !== process.env.ADMIN_ROUTE_SECRET) {
    notFound();
  }

  return (
    <AuthProvider>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <header style={{ padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
          <h1 className="heading" style={{ fontSize: '20px', fontWeight: 600 }}>NACOS Admin</h1>
        </header>
        <main style={{ flex: 1, padding: '32px' }}>
          {children}
        </main>
      </div>
    </AuthProvider>
  );
}
