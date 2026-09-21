'use client';

import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';

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
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", "memos_backup.json");
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="container" style={{ maxWidth: '1000px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h2>Manage Memos</h2>
        <div style={{ display: 'flex', gap: '16px' }}>
          <button className="btn btn-secondary" onClick={downloadBackup}>Export Backup</button>
          <Link href={`/admin/${secret}/create`} className="btn">Create New Memo</Link>
          <button className="btn btn-secondary" onClick={logout}>Logout</button>
        </div>
      </div>

      {error && <div style={{ color: 'red', marginBottom: '16px' }}>{error}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {memos.length === 0 ? (
          <div className="glass" style={{ padding: '32px', textAlign: 'center', borderRadius: '16px' }}>
            No memos found. Create one to get started.
          </div>
        ) : (
          memos.map((memo: any) => {
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : '');
            const verifyUrl = `${baseUrl}/verify/${memo.publicId}`;
            return (
              <div key={memo.id} className="glass" style={{ padding: '24px', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ marginBottom: '8px' }}>{memo.title}</h3>
                  <div style={{ color: '#666', fontSize: '14px', marginBottom: '8px' }}>
                    <strong>Serial:</strong> {memo.serialNumber} <br/>
                    <strong>Status:</strong> <span style={{ color: memo.status === 'PUBLISHED' || memo.status === 'ACTIVE' ? 'green' : 'red' }}>{memo.status}</span><br/>
                    <strong>Date:</strong> {new Date(memo.createdAt).toLocaleDateString()}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                    <Link href={`/verify/${memo.publicId}`} target="_blank" className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '14px' }}>View Public Page</Link>
                    {(memo.status === 'PUBLISHED' || memo.status === 'ACTIVE') && (
                      <button onClick={() => handleRevoke(memo.id)} className="btn" style={{ padding: '8px 16px', fontSize: '14px', background: '#ff3b30' }}>
                        Revoke
                      </button>
                    )}
                  </div>
                </div>
                
                <div style={{ textAlign: 'center' }}>
                  <div style={{ background: 'white', padding: '16px', borderRadius: '12px', display: 'inline-block' }}>
                    <QRCodeSVG id={`qr-${memo.id}`} value={verifyUrl} size={128} />
                  </div>
                  <div style={{ marginTop: '8px' }}>
                    <button onClick={() => downloadQR(memo.id, memo.serialNumber)} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>
                      Download QR
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
