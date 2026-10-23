'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '../AuthContext';

type Notice = { tone: 'success' | 'error'; message: string } | null;

export default function AdminSettingsPage() {
  const { secret } = useParams<{ secret: string }>();
  const { logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pathPassword, setPathPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [rotatingPath, setRotatingPath] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [newAdminUrl, setNewAdminUrl] = useState('');

  const updateSettings = async (payload: Record<string, string>) => {
    const response = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (response.status === 401) {
      await logout();
      throw new Error('Your session expired. Please sign in again.');
    }
    if (!response.ok) throw new Error(data.error || 'The setting could not be changed.');
    return data;
  };

  const handlePasswordChange = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setChangingPassword(true);
    setNotice(null);
    try {
      const result = await updateSettings({
        action: 'change-password',
        currentPassword,
        newPassword,
        confirmPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setNotice({ tone: 'success', message: result.message || 'Password updated successfully.' });
    } catch (error) {
      setNotice({ tone: 'error', message: error instanceof Error ? error.message : 'Password could not be changed.' });
    } finally {
      setChangingPassword(false);
    }
  };

  const handlePathRotation = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setRotatingPath(true);
    setNotice(null);
    setNewAdminUrl('');
    try {
      const result = await updateSettings({
        action: 'rotate-path',
        currentPassword: pathPassword,
      });
      const url = new URL('/admin/' + encodeURIComponent(result.newPath) + '/settings', window.location.origin).toString();
      setNewAdminUrl(url);
      setPathPassword('');
      setNotice({ tone: 'success', message: result.message || 'Admin URL rotated. Save the new link now.' });
    } catch (error) {
      setNotice({ tone: 'error', message: error instanceof Error ? error.message : 'Admin URL could not be rotated.' });
    } finally {
      setRotatingPath(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '760px' }}>
      <div className="mb-8" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <p className="text-sm" style={{ textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Security</p>
          <h1 className="heading" style={{ fontSize: '30px' }}>Admin settings</h1>
          <p className="text-sm" style={{ marginTop: '8px' }}>Change your password or rotate the private workspace link.</p>
        </div>
        <Link href={`/admin/${secret}`} className="btn btn-secondary">Back to registry</Link>
      </div>

      {notice && (
        <div role="status" aria-live="polite" className={`badge ${notice.tone === 'error' ? 'badge-danger' : 'badge-success'} mb-6`}
          style={{ display: 'block', padding: '14px', whiteSpace: 'pre-wrap' }}>
          {notice.message}
        </div>
      )}

      <section className="card mb-6">
        <h2 className="heading" style={{ fontSize: '21px', marginBottom: '8px' }}>Change admin password</h2>
        <p className="text-sm mb-6">Choose a password you have not used elsewhere. Changing it signs out other existing admin sessions.</p>
        <form onSubmit={handlePasswordChange} style={{ display: 'grid', gap: '16px' }}>
          <div>
            <label htmlFor="current-password">Current password</label>
            <input id="current-password" name="currentPassword" type="password" autoComplete="current-password"
              className="input" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
              required minLength={1} maxLength={1024} />
          </div>
          <div>
            <label htmlFor="new-password">New password</label>
            <input id="new-password" name="newPassword" type="password" autoComplete="new-password"
              className="input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
              required minLength={12} maxLength={72} aria-describedby="password-help" />
            <p id="password-help" className="text-sm" style={{ marginTop: '6px' }}>At least 12 characters. Use a password manager; avoid a password based on NACOS or your name.</p>
          </div>
          <div>
            <label htmlFor="confirm-password">Confirm new password</label>
            <input id="confirm-password" name="confirmPassword" type="password" autoComplete="new-password"
              className="input" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
              required minLength={12} maxLength={72} />
          </div>
          <button type="submit" className="btn" disabled={changingPassword}
            style={{ minHeight: '46px', justifySelf: 'start' }}>
            {changingPassword ? 'Changing password…' : 'Change password'}
          </button>
        </form>
      </section>

      <section className="card">
        <h2 className="heading" style={{ fontSize: '21px', marginBottom: '8px' }}>Rotate private admin URL</h2>
        <p className="text-sm mb-6">
          This generates a new, random workspace link and immediately invalidates the previous one.
          It does not replace the admin password. Save the new link in your password manager before closing this page.
        </p>
        <form onSubmit={handlePathRotation} style={{ display: 'grid', gap: '16px' }}>
          <div>
            <label htmlFor="path-current-password">Confirm admin password</label>
            <input id="path-current-password" name="pathPassword" type="password" autoComplete="current-password"
              className="input" value={pathPassword} onChange={(e) => setPathPassword(e.target.value)}
              required maxLength={1024} />
          </div>
          <button type="submit" className="btn btn-secondary" disabled={rotatingPath}
            style={{ minHeight: '46px', justifySelf: 'start' }}>
            {rotatingPath ? 'Generating new link…' : 'Generate new admin URL'}
          </button>
        </form>

        {newAdminUrl && (
          <div className="mt-6" style={{ border: '1px solid var(--border)', padding: '16px', borderRadius: '8px' }}>
            <label htmlFor="new-admin-url">Your new admin URL — save it now</label>
            <input id="new-admin-url" className="input" readOnly value={newAdminUrl}
              onFocus={(e) => e.currentTarget.select()} style={{ marginTop: '8px', marginBottom: '12px' }} />
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-secondary" onClick={() => {
                void navigator.clipboard.writeText(newAdminUrl).then(
                  () => setNotice({ tone: 'success', message: 'New admin URL copied.' }),
                  () => setNotice({ tone: 'error', message: 'Copy was blocked by the browser. Select the link and copy it manually.' }),
                );
              }}>Copy URL</button>
              <a href={newAdminUrl} className="btn">Open new admin workspace</a>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
