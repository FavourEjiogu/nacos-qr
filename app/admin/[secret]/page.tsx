'use client';

import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';

export default function AdminDashboard() {
  const { logout } = useAuth();
  const { secret } = useParams<{secret: string}>();
  const [memos, setMemos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMemos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchMemos = async () => {
    try {
      const res = await fetch('/api/admin/memos');
      if (res.status === 401) {
        logout();
        return;
      }
      const data = await res.json();
      if (data.memos) {
        setMemos(data.memos);
      }
    } catch {
      setError('Failed to fetch memos');
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (id: string) => {
    const reason = prompt('Are you sure you want to revoke this memo? This cannot be undone. Enter revocation reason (optional):');
    if (reason === null) return; // User cancelled
    
    try {
      const res = await fetch(`/api/admin/memos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'REVOKED', revocationReason: reason || null })
      });
      if (res.ok) {
        fetchMemos();
      } else {
        alert('Failed to revoke');
      }
    } catch {
      alert('Error revoking memo');
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

  if (loading) {
    return <div className="container" style={{ textAlign: 'center' }}>Loading Registry...</div>;
  }

  const baseUrl = process.env.NEXT_PUBLIC_VERIFY_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : '');

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '4rem 1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="mb-8">
        <h2 className="heading" style={{ fontSize: '24px' }}>Memo Registry</h2>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link href={`/admin/${secret}/create`} className="btn">
            New Memo
          </Link>
          <button onClick={logout} className="btn btn-secondary">
            Logout
          </button>
        </div>
      </div>

      {error && <div className="badge badge-danger mb-4" style={{ display: 'block', padding: '12px', textAlign: 'center' }}>{error}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {memos.length === 0 ? (
          <div className="card" style={{ textAlign: 'center' }}>
            No memos found in the registry.
          </div>
        ) : (
          memos.map((memo) => {
            const verifyUrl = `${baseUrl}/verify/${memo.publicId}`;
            const isActive = memo.status === 'ACTIVE';
            
            return (
              <div key={memo.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', padding: '24px' }}>
                <div style={{ flex: 1, paddingRight: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <span className="mono" style={{ fontWeight: 500, fontSize: '18px' }}>{memo.serialNumber}</span>
                    <span className={`badge ${isActive ? 'badge-success' : 'badge-danger'}`}>
                      {memo.status}
                    </span>
                  </div>
                  
                  <h3 className="heading" style={{ fontSize: '18px', marginBottom: '4px' }}>{memo.title}</h3>
                  
                  <div className="text-sm" style={{ marginBottom: '8px' }}>
                    Type: <span style={{ fontWeight: 500 }}>{memo.documentType || 'Other'}</span>
                  </div>
                  
                  <div className="text-sm mb-4">
                    Issued: {new Date(memo.createdAt).toLocaleDateString()} | ID: <span className="mono">{memo.publicId}</span>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <Link href={`/verify/${memo.publicId}`} target="_blank" style={{ fontWeight: 500 }}>
                      View ↗
                    </Link>
                    <button 
                      onClick={() => { navigator.clipboard.writeText(verifyUrl); alert('URL copied'); }} 
                      style={{ fontWeight: 500, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '4px' }}
                    >
                      Copy URL
                    </button>
                    {isActive && (
                      <button 
                         onClick={() => handleRevoke(memo.id)} 
                         style={{ fontWeight: 500, cursor: 'pointer', color: 'var(--danger)', textDecoration: 'underline', textUnderlineOffset: '4px' }}
                      >
                         Revoke
                      </button>
                    )}
                  </div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', minWidth: '120px' }}>
                  <div style={{ background: '#fff', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}>
                    <QRCodeSVG id={`qr-${memo.id}`} value={verifyUrl} size={100} level="H" />
                  </div>
                  <button 
                    onClick={() => downloadQRSVG(memo.id, memo.serialNumber)} 
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                  >
                    Download QR
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
