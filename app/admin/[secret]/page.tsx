'use client';

import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { Plus, Download, LogOut, Ban, FileDown } from 'lucide-react';

export default function AdminDashboard() {
  const { logout } = useAuth();
  const { secret } = useParams<{secret: string}>();
  const [memos, setMemos] = useState<{id:string; serialNumber:string; title:string; status:string; createdAt:string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    fetchMemos();
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
    if (!confirm('Are you sure you want to revoke this memo? This cannot be undone.')) return;
    
    try {
      const res = await fetch(`/api/admin/memos/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'REVOKED' })
      });
      if (res.ok) {
        fetchMemos(); // refresh
      } else {
        alert('Failed to revoke');
      }
    } catch {
      alert('Error revoking memo');
    }
  };

  const downloadQR = (id: string, serial: string) => {
    const svg = document.getElementById(`qr-${id}`);
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `${serial.split('/').join('-')}-QR.png`;
      downloadLink.href = `${pngFile}`;
      downloadLink.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const downloadBackup = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(memos, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "memos_backup.json");
    document.body.appendChild(downloadAnchorNode); 
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  if (loading) {
    return (
      <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <div style={{ opacity: 0.5, fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase' }}>Loading Registry...</div>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: '1000px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <h2 style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '-0.5px' }}>Memo Registry</h2>
        <div style={{ display: 'flex', gap: '16px' }}>
          <button className="btn btn-secondary" onClick={downloadBackup}>
            <Download size={18} /> Backup
          </button>
          <Link href={`/admin/${secret}/create`} className="btn">
            <Plus size={18} /> New Memo
          </Link>
          <button className="btn btn-secondary" onClick={logout}>
            <LogOut size={18} /> Logout
          </button>
        </div>
      </div>

      {error && <div style={{ background: 'rgba(255,59,48,0.1)', color: 'var(--danger)', padding: '16px', borderRadius: '12px', marginBottom: '24px', fontWeight: 500 }}>{error}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {memos.length === 0 ? (
          <div className="glass" style={{ padding: '64px', textAlign: 'center', borderRadius: '24px' }}>
            <p style={{ opacity: 0.5, fontSize: '18px', fontWeight: 500 }}>No memos found in the registry.</p>
          </div>
        ) : (
          memos.map((memo: any) => {
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : '');
            const verifyUrl = `${baseUrl}/verify/${memo.publicId}`;
            const isActive = memo.status === 'PUBLISHED' || memo.status === 'ACTIVE';
            
            return (
              <div key={memo.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '32px' }}>
                <div style={{ flex: 1, paddingRight: '32px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: '18px', letterSpacing: '0.5px' }}>{memo.serialNumber}</div>
                    <span className={`badge ${isActive ? 'badge-success' : 'badge-danger'}`}>
                      {memo.status}
                    </span>
                  </div>
                  
                  <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '12px', lineHeight: 1.3 }}>{memo.title}</h3>
                  
                  <div style={{ color: 'var(--foreground)', opacity: 0.6, fontSize: '14px', marginBottom: '24px', display: 'flex', gap: '16px' }}>
                    <span>Issued: {new Date(memo.createdAt).toLocaleDateString()}</span>
                    <span>•</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 500, letterSpacing: '0.5px' }}>ID: {memo.publicId}</span>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <Link href={`/verify/${memo.publicId}`} target="_blank" className="btn btn-secondary" style={{ padding: '10px 16px', fontSize: '14px' }}>
                      Preview Public Page ↗
                    </Link>
                    {isActive && (
                      <button onClick={() => handleRevoke(memo.id)} className="btn btn-danger" style={{ padding: '10px 16px', fontSize: '14px' }}>
                        <Ban size={16} /> Revoke
                      </button>
                    )}
                  </div>
                </div>
                
                <div style={{ textAlign: 'center', background: 'var(--secondary)', padding: '24px', borderRadius: '20px', minWidth: '180px' }}>
                  <div style={{ background: 'white', padding: '12px', borderRadius: '12px', display: 'inline-block', marginBottom: '16px' }}>
                    <QRCodeSVG id={`qr-${memo.id}`} value={verifyUrl} size={112} level="H" />
                  </div>
                  <div>
                    <button onClick={() => downloadQR(memo.id, memo.serialNumber)} className="btn btn-secondary" style={{ padding: '8px 12px', fontSize: '13px', width: '100%' }}>
                      <FileDown size={14} /> Save QR Code
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
