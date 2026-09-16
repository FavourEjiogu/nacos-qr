'use client';

import { ShieldCheck, QrCode, Search, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function Home() {
  const router = useRouter();
  const [memoId, setMemoId] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (memoId.trim()) {
      router.push(`/verify/${memoId.trim()}`);
    }
  };

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '85vh', textAlign: 'center' }}>
      <div className="glass" style={{ padding: '64px 48px', borderRadius: '40px', maxWidth: '640px', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
          <div style={{ background: 'var(--secondary)', padding: '24px', borderRadius: '32px', boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.02)' }}>
            <ShieldCheck size={72} color="var(--primary)" />
          </div>
        </div>
        
        <h1 style={{ fontSize: '42px', fontWeight: 700, marginBottom: '16px', letterSpacing: '-1px', lineHeight: 1.1 }}>
          NACOS Registry
        </h1>
        
        <p style={{ color: 'var(--foreground)', opacity: 0.6, fontSize: '19px', marginBottom: '40px', lineHeight: 1.6, maxWidth: '480px', margin: '0 auto 40px' }}>
          The authoritative cryptographic system for verifying tamper-proof official memos.
        </p>

        {/* Verification Form Section */}
        <div style={{ marginBottom: '48px' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px', maxWidth: '400px', margin: '0 auto' }}>
            <input 
              type="text" 
              placeholder="Enter Memo ID (e.g. 7Y2KF94Q)" 
              value={memoId}
              onChange={(e) => setMemoId(e.target.value)}
              className="input"
              style={{ margin: 0, flex: 1, borderRadius: '24px', paddingLeft: '24px' }}
              required
            />
            <button type="submit" className="btn" style={{ padding: '0 24px', borderRadius: '24px' }}>
              <Search size={18} />
            </button>
          </form>
        </div>
        
        <div className="card" style={{ padding: '32px', borderRadius: '24px', textAlign: 'left', display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
          <div style={{ background: 'rgba(0, 113, 227, 0.1)', padding: '16px', borderRadius: '20px', color: 'var(--primary)' }}>
            <QrCode size={36} />
          </div>
          <div>
            <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>Scan to Verify</h3>
            <p style={{ color: 'var(--foreground)', opacity: 0.6, fontSize: '15px', lineHeight: 1.6, marginBottom: '12px' }}>
              Open your smartphone camera and point it at the QR code printed on the official NACOS document.
            </p>
            <p style={{ color: 'var(--foreground)', opacity: 0.6, fontSize: '15px', lineHeight: 1.6 }}>
              It will take you directly to the secure record. No typing required.
            </p>
          </div>
        </div>
        
        <div style={{ marginTop: '48px', display: 'flex', justifyContent: 'center', gap: '16px' }}>
          <Link href="/admin/admin_secret_local" className="btn btn-secondary" style={{ padding: '14px 28px', fontSize: '16px', borderRadius: '28px' }}>
            Admin Portal <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </div>
  );
}
