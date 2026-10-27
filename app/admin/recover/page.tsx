'use client';

import { useState } from 'react';

export default function RecoverAdminAccessPage() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [newUrl, setNewUrl] = useState('');

  const recover = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setNewUrl('');
    try {
      const loginResponse = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ password }),
      });
      const loginData = await loginResponse.json();
      if (!loginResponse.ok || !loginData.success) {
        throw new Error(loginData.error || 'Sign-in failed.');
      }

      const rotateResponse = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ action: 'rotate-path', currentPassword: password }),
      });
      const rotateData = await rotateResponse.json();
      if (!rotateResponse.ok || !rotateData.success) {
        throw new Error(rotateData.error || 'Admin link could not be regenerated.');
      }
      const url = new URL('/admin/' + encodeURIComponent(rotateData.newPath), window.location.origin).toString();
      setNewUrl(url);
      setPassword('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Admin access could not be recovered.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container" style={{ maxWidth: '480px', marginTop: '10vh' }}>
      <section className="card">
        <p className="text-sm" style={{ textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>NACOS QR</p>
        <h1 className="heading" style={{ fontSize: '28px', marginBottom: '12px' }}>Recover admin link</h1>
        <p className="text-sm mb-6">Enter the admin password to generate a fresh private workspace URL. Your password is checked by the server and is not stored by this page.</p>
        {error && <div role="alert" className="badge badge-danger mb-4" style={{ display: 'block', padding: '12px' }}>{error}</div>}
        <form onSubmit={recover} style={{ display: 'grid', gap: '14px' }}>
          <div>
            <label htmlFor="recovery-password">Admin password</label>
            <input id="recovery-password" name="password" type="password" autoComplete="current-password"
              className="input" value={password} onChange={(e) => setPassword(e.target.value)}
              required maxLength={1024} />
          </div>
          <button type="submit" className="btn" disabled={loading} style={{ minHeight: '46px' }}>
            {loading ? 'Verifying and generating…' : 'Generate new admin link'}
          </button>
        </form>
        {newUrl && (
          <div className="mt-6" role="status" aria-live="polite" style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '14px' }}>
            <p style={{ fontWeight: 600, marginBottom: '8px' }}>New admin link — save it now</p>
            <input aria-label="New admin URL" className="input" readOnly value={newUrl}
              onFocus={(e) => e.currentTarget.select()} />
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '12px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => {
                void navigator.clipboard.writeText(newUrl).then(
                  () => setError('New admin URL copied.'),
                  () => setError('Copy was blocked; select the link and copy it manually.'),
                );
              }}>Copy link</button>
              <a className="btn" href={newUrl}>Open admin workspace</a>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
