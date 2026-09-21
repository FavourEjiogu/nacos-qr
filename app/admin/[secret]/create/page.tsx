'use client';

import { useState } from 'react';
import { useAuth } from '../AuthContext';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

export default function CreateMemo() {
  const { logout } = useAuth();
  const router = useRouter();
  const { secret } = useParams<{secret: string}>();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [body, setBody] = useState('');
  const [issuer, setIssuer] = useState('');
  const [department, setDepartment] = useState('');
  const [issuedAt, setIssuedAt] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/memos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title,
          summary,
          body,
          issuer,
          department,
          issuedAt,
          effectiveFrom,
        })
      });

      if (res.status === 401) {
        logout();
        return;
      }

      const data = await res.json();
      if (res.ok && data.success) {
        router.push(`/admin/${secret}`);
      } else {
        setError(data.error || 'Failed to create memo');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '800px', paddingBottom: '40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h2>Create Official Memo</h2>
        <Link href={`/admin/${secret}`} className="btn btn-secondary">Back to Dashboard</Link>
      </div>

      <div className="glass" style={{ padding: '32px', borderRadius: '24px' }}>
        {error && <div style={{ color: 'red', marginBottom: '16px' }}>{error}</div>}
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Document Title</label>
            <input 
              className="input" 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              placeholder="e.g. Official Directive on Hackathon" 
              required 
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Summary (Optional)</label>
            <input 
              className="input" 
              value={summary} 
              onChange={e => setSummary(e.target.value)} 
              placeholder="A brief 1-sentence summary" 
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Official Text (Body)</label>
            <textarea 
              className="input" 
              value={body} 
              onChange={e => setBody(e.target.value)} 
              placeholder="Enter the full authoritative text of the memo..." 
              style={{ minHeight: '200px', resize: 'vertical' }}
              required 
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Issued By</label>
              <input 
                className="input" 
                value={issuer} 
                onChange={e => setIssuer(e.target.value)} 
                placeholder="e.g. Office of the President" 
                required 
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Department</label>
              <input 
                className="input" 
                value={department} 
                onChange={e => setDepartment(e.target.value)} 
                placeholder="e.g. NACOS Bingham University" 
                required 
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Date Issued</label>
              <input 
                className="input" 
                type="date"
                value={issuedAt} 
                onChange={e => setIssuedAt(e.target.value)} 
                required 
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Effective Date</label>
              <input 
                className="input" 
                type="date"
                value={effectiveFrom} 
                onChange={e => setEffectiveFrom(e.target.value)} 
                required 
              />
            </div>
          </div>

          <button type="submit" className="btn" disabled={loading} style={{ marginTop: '16px' }}>
            {loading ? 'Publishing...' : 'Publish Official Record & Generate QR'}
          </button>
        </form>
      </div>
    </div>
  );
}
