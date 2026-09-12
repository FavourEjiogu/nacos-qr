'use client';

import { useState } from 'react';
import { useAuth } from '../AuthContext';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { FilePlus, ArrowLeft, Send } from 'lucide-react';

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
    <div className="container" style={{ maxWidth: '800px', paddingBottom: '64px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <h2 style={{ fontSize: '28px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <FilePlus size={28} style={{ color: 'var(--primary)' }} />
          Create Official Memo
        </h2>
        <Link href={`/admin/${secret}`} className="btn btn-secondary">
          <ArrowLeft size={18} /> Back
        </Link>
      </div>

      <div className="card" style={{ padding: '40px' }}>
        {error && <div style={{ background: 'rgba(255,59,48,0.1)', color: 'var(--danger)', padding: '16px', borderRadius: '12px', marginBottom: '24px', fontWeight: 500 }}>{error}</div>}
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '10px', fontWeight: 600, fontSize: '15px' }}>Document Title</label>
            <input 
              className="input" 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              placeholder="e.g. Official Directive on Hackathon" 
              required 
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '10px', fontWeight: 600, fontSize: '15px' }}>Summary (Optional)</label>
            <input 
              className="input" 
              value={summary} 
              onChange={e => setSummary(e.target.value)} 
              placeholder="A brief 1-sentence summary" 
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '10px', fontWeight: 600, fontSize: '15px' }}>Official Text (Body)</label>
            <textarea 
              className="input" 
              value={body} 
              onChange={e => setBody(e.target.value)} 
              placeholder="Enter the full authoritative text of the memo..." 
              style={{ minHeight: '220px', resize: 'vertical' }}
              required 
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '10px', fontWeight: 600, fontSize: '15px' }}>Issued By</label>
              <input 
                className="input" 
                value={issuer} 
                onChange={e => setIssuer(e.target.value)} 
                placeholder="e.g. Office of the President" 
                required 
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '10px', fontWeight: 600, fontSize: '15px' }}>Department</label>
              <input 
                className="input" 
                value={department} 
                onChange={e => setDepartment(e.target.value)} 
                placeholder="e.g. NACOS Bingham University" 
                required 
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '10px', fontWeight: 600, fontSize: '15px' }}>Date Issued</label>
              <input 
                className="input" 
                type="date"
                value={issuedAt} 
                onChange={e => setIssuedAt(e.target.value)} 
                required 
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '10px', fontWeight: 600, fontSize: '15px' }}>Effective Date</label>
              <input 
                className="input" 
                type="date"
                value={effectiveFrom} 
                onChange={e => setEffectiveFrom(e.target.value)} 
                required 
              />
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', margin: '16px 0 0 0', paddingTop: '32px' }}>
            <button type="submit" className="btn" disabled={loading} style={{ width: '100%', padding: '16px', fontSize: '16px' }}>
              {loading ? 'Publishing securely...' : <><Send size={18} /> Publish Official Record & Generate QR</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
