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
      <div className="container" style={{ maxWidth: '800px' }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <h2 className="heading" style={{ color: 'var(--success)', fontSize: '28px', marginBottom: '24px', fontWeight: 600 }}>MEMO PUBLISHED</h2>
          
          <div className="mb-8" style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '16px' }}>
            <div><span className="text-sm" style={{ textTransform: 'uppercase', marginRight: '8px' }}>Reference:</span> <span className="mono font-medium">{successData.serialNumber}</span></div>
            <div><span className="text-sm" style={{ textTransform: 'uppercase', marginRight: '8px' }}>Verification ID:</span> <span className="mono font-medium">{successData.publicId}</span></div>
            <div style={{ wordBreak: 'break-all' }}><span className="text-sm" style={{ textTransform: 'uppercase', marginRight: '8px' }}>Verification URL:</span> <span className="font-medium">{verifyUrl}</span></div>
          </div>

          <div style={{ background: '#fff', padding: '16px', display: 'inline-block', borderRadius: '4px', border: '1px solid #ccc', marginBottom: '32px' }}>
            <QRCodeSVG id={`qr-${successData.id}`} value={verifyUrl} size={200} level="H" />
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <button onClick={() => downloadQRSVG(successData.id, successData.serialNumber)} className="btn">
              Download QR
            </button>
            <button onClick={() => { navigator.clipboard.writeText(verifyUrl); alert('URL copied'); }} className="btn btn-secondary">
              Copy URL
            </button>
            <a href={`/verify/${successData.publicId}`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
              Open Page
            </a>
            <Link href={`/admin/${secret}`} className="btn btn-secondary">
              Back to Registry
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: '800px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="mb-8">
        <h2 className="heading" style={{ fontSize: '24px' }}>
          Create Official Memo
        </h2>
        <Link href={`/admin/${secret}`} className="btn btn-secondary" style={{ padding: '8px 16px' }}>
          Back
        </Link>
      </div>

      <div className="card">
        {error && <div className="badge badge-danger mb-4" style={{ display: 'block', padding: '16px', textAlign: 'center' }}>{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div>
            <label>Title</label>
            <input 
              className="input"
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              placeholder="e.g. Official Directive on Hackathon" 
              required 
            />
          </div>

          <div>
            <label>Official Text (Body)</label>
            <textarea 
              className="input"
              value={body} 
              onChange={e => setBody(e.target.value)} 
              placeholder="Enter the full authoritative text of the memo..." 
              required 
              style={{ minHeight: '200px', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label>Issuer</label>
              <input 
                className="input"
                value={issuer} 
                onChange={e => setIssuer(e.target.value)} 
                placeholder="e.g. Office of the President" 
                required 
              />
            </div>
            <div>
              <label>Department</label>
              <input 
                className="input"
                value={department} 
                onChange={e => setDepartment(e.target.value)} 
                placeholder="e.g. NACOS Bingham University" 
                required 
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <div>
              <label>Date Issued</label>
              <input 
                type="date"
                className="input"
                value={issuedAt} 
                onChange={e => setIssuedAt(e.target.value)} 
                required 
              />
            </div>
            <div>
              <label>Effective Date (Optional)</label>
              <input 
                type="date"
                className="input"
                value={effectiveFrom} 
                onChange={e => setEffectiveFrom(e.target.value)} 
              />
            </div>
            <div>
              <label>Expiry Date (Optional)</label>
              <input 
                type="date"
                className="input"
                value={expiresAt} 
                onChange={e => setExpiresAt(e.target.value)} 
              />
            </div>
          </div>

          <hr />
          
          <button type="submit" disabled={loading} className="btn" style={{ width: '100%', padding: '16px', fontSize: '16px' }}>
            {loading ? 'Publishing...' : 'Publish Memo & Generate QR'}
          </button>
        </form>
      </div>
    </div>
  );
}
