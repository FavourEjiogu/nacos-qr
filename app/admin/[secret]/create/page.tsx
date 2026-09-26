'use client';

import { useState } from 'react';
import { useAuth } from '../AuthContext';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';

export default function CreateMemo() {
  const { logout } = useAuth();
  const { secret } = useParams<{secret: string}>();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [issuer, setIssuer] = useState('');
  const [department, setDepartment] = useState('');
  const [issuedAt, setIssuedAt] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  const [successData, setSuccessData] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const effectiveDate = effectiveFrom || issuedAt;

    try {
      const res = await fetch('/api/admin/memos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          body,
          issuer,
          department,
          issuedAt,
          effectiveFrom: effectiveDate,
          expiresAt: expiresAt || null,
        })
      });

      if (res.status === 401) {
        logout();
        return;
      }

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessData(data.memo);
      } else {
        setError(data.error || 'Failed to create memo');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const downloadQRSVG = (id: string, serial: string) => {
    const svg = document.getElementById(`qr-${id}`);
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');
    downloadLink.download = `${serial.replace(/\//g, '-')}-QR.svg`;
    downloadLink.href = url;
    downloadLink.click();
    URL.revokeObjectURL(url);
  };

  if (successData) {
    const baseUrl = process.env.NEXT_PUBLIC_VERIFY_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : '');
    const verifyUrl = `${baseUrl}/verify/${successData.publicId}`;
    
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
        <div style={{ padding: '40px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--background)', textAlign: 'center' }}>
          <h2 style={{ color: 'var(--success)', fontSize: '28px', marginBottom: '24px', fontWeight: 700 }}>Memo Published</h2>
          
          <div style={{ marginBottom: '32px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '18px' }}>
            <div><strong>Reference:</strong> {successData.serialNumber}</div>
            <div><strong>Verification ID:</strong> {successData.publicId}</div>
            <div style={{ wordBreak: 'break-all' }}><strong>Verification URL:</strong> {verifyUrl}</div>
          </div>

          <div style={{ background: '#fff', padding: '16px', display: 'inline-block', borderRadius: '8px', border: '1px solid #ccc', marginBottom: '32px' }}>
            <QRCodeSVG id={`qr-${successData.id}`} value={verifyUrl} size={200} level="H" />
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <button onClick={() => downloadQRSVG(successData.id, successData.serialNumber)} style={{ background: 'var(--primary)', color: '#fff', padding: '12px 24px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
              Download QR
            </button>
            <button onClick={() => { navigator.clipboard.writeText(verifyUrl); alert('URL copied'); }} style={{ background: 'var(--secondary)', border: '1px solid var(--border)', padding: '12px 24px', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>
              Copy Verification URL
            </button>
            <a href={`/verify/${successData.publicId}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', background: 'var(--secondary)', border: '1px solid var(--border)', padding: '12px 24px', borderRadius: '4px', textDecoration: 'none', color: 'var(--foreground)', fontWeight: 600 }}>
              Open Verification Page
            </a>
            <Link href={`/admin/${secret}`} style={{ display: 'inline-block', background: 'transparent', border: '1px solid var(--border)', padding: '12px 24px', borderRadius: '4px', textDecoration: 'none', color: 'var(--foreground)', fontWeight: 600 }}>
              Back to Registry
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 700 }}>
          Create Official Memo
        </h2>
        <Link href={`/admin/${secret}`} style={{ background: 'var(--secondary)', border: '1px solid var(--border)', padding: '8px 16px', borderRadius: '4px', textDecoration: 'none', color: 'var(--foreground)', fontWeight: 600 }}>
          Back
        </Link>
      </div>

      <div style={{ padding: '32px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--background)' }}>
        {error && <div style={{ background: 'rgba(255,0,0,0.1)', color: 'var(--danger)', padding: '16px', borderRadius: '4px', marginBottom: '24px', fontWeight: 500 }}>{error}</div>}
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Title</label>
            <input 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              placeholder="e.g. Official Directive on Hackathon" 
              required 
              style={{ width: '100%', padding: '12px', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '16px', background: 'var(--background)', color: 'var(--foreground)' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Official Text (Body)</label>
            <textarea 
              value={body} 
              onChange={e => setBody(e.target.value)} 
              placeholder="Enter the full authoritative text of the memo..." 
              required 
              style={{ width: '100%', padding: '12px', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '16px', minHeight: '200px', resize: 'vertical', background: 'var(--background)', color: 'var(--foreground)' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Issuer</label>
              <input 
                value={issuer} 
                onChange={e => setIssuer(e.target.value)} 
                placeholder="e.g. Office of the President" 
                required 
                style={{ width: '100%', padding: '12px', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '16px', background: 'var(--background)', color: 'var(--foreground)' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Department</label>
              <input 
                value={department} 
                onChange={e => setDepartment(e.target.value)} 
                placeholder="e.g. NACOS Bingham University" 
                required 
                style={{ width: '100%', padding: '12px', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '16px', background: 'var(--background)', color: 'var(--foreground)' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Date Issued</label>
              <input 
                type="date"
                value={issuedAt} 
                onChange={e => setIssuedAt(e.target.value)} 
                required 
                style={{ width: '100%', padding: '12px', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '16px', background: 'var(--background)', color: 'var(--foreground)' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Effective Date (Optional)</label>
              <input 
                type="date"
                value={effectiveFrom} 
                onChange={e => setEffectiveFrom(e.target.value)} 
                style={{ width: '100%', padding: '12px', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '16px', background: 'var(--background)', color: 'var(--foreground)' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Expiry Date (Optional)</label>
              <input 
                type="date"
                value={expiresAt} 
                onChange={e => setExpiresAt(e.target.value)} 
                style={{ width: '100%', padding: '12px', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '16px', background: 'var(--background)', color: 'var(--foreground)' }}
              />
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '24px', marginTop: '8px' }}>
            <button type="submit" disabled={loading} style={{ width: '100%', padding: '16px', fontSize: '16px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>
              {loading ? 'Publishing...' : 'Publish Memo & Generate QR'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
