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
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading Registry...</div>;
  }

  const baseUrl = process.env.NEXT_PUBLIC_VERIFY_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : '');

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 700 }}>Memo Registry</h2>
        <div style={{ display: 'flex', gap: '16px' }}>
          <Link href={`/admin/${secret}/create`} style={{ background: 'var(--primary)', color: '#fff', padding: '8px 16px', borderRadius: '4px', textDecoration: 'none', fontWeight: 600 }}>
            New Memo
          </Link>
          <button onClick={logout} style={{ background: 'var(--secondary)', border: '1px solid var(--border)', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>
            Logout
          </button>
        </div>
      </div>

      {error && <div style={{ color: 'var(--danger)', padding: '12px', background: 'rgba(255,0,0,0.1)', borderRadius: '4px', marginBottom: '24px' }}>{error}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {memos.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', border: '1px solid var(--border)', borderRadius: '8px' }}>
            No memos found in the registry.
          </div>
        ) : (
          memos.map((memo) => {
            const verifyUrl = `${baseUrl}/verify/${memo.publicId}`;
            const isActive = memo.status === 'ACTIVE';
            
            return (
              <div key={memo.id} style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '24px', display: 'flex', justifyContent: 'space-between', background: 'var(--background)' }}>
                <div style={{ flex: 1, paddingRight: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 700, fontSize: '18px' }}>{memo.serialNumber}</span>
                    <span style={{ 
                      padding: '4px 8px', 
                      borderRadius: '4px', 
                      fontSize: '12px', 
                      fontWeight: 600,
                      background: isActive ? 'var(--success)' : 'var(--danger)',
                      color: '#fff'
                    }}>
                      {memo.status}
                    </span>
                  </div>
                  
                  <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>{memo.title}</h3>
                  
                  <div style={{ fontSize: '14px', opacity: 0.7, marginBottom: '16px' }}>
                    Issued: {new Date(memo.createdAt).toLocaleDateString()} | ID: {memo.publicId}
                  </div>
                  
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <Link href={`/verify/${memo.publicId}`} target="_blank" style={{ textDecoration: 'none', color: 'var(--primary)', fontWeight: 600 }}>
                      Open Page ↗
                    </Link>
                    <button 
                      onClick={() => { navigator.clipboard.writeText(verifyUrl); alert('URL copied'); }} 
                      style={{ border: 'none', background: 'none', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Copy URL
                    </button>
                    {isActive && (
                      <button 
                        onClick={() => handleRevoke(memo.id)} 
                        style={{ border: 'none', background: 'none', color: 'var(--danger)', fontWeight: 600, cursor: 'pointer' }}
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
                    style={{ background: 'var(--secondary)', border: '1px solid var(--border)', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '14px' }}
                  >
                    Download QR SVG
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
