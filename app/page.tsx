import Link from 'next/link';
import { ShieldCheck, QrCode } from 'lucide-react';

export default function Home() {
  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', textAlign: 'center' }}>
      <div className="glass" style={{ padding: '64px 40px', borderRadius: '32px', maxWidth: '600px' }}>
        <ShieldCheck size={80} color="var(--primary)" style={{ marginBottom: '24px' }} />
        <h1 style={{ fontSize: '36px', marginBottom: '16px', letterSpacing: '-0.5px' }}>NACOS QR</h1>
        <p style={{ color: '#666', fontSize: '18px', marginBottom: '40px', lineHeight: 1.6 }}>
          The official system for generating and verifying cryptographic tamper-proof memos for NACOS QR.
        </p>
        
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
          <Link href="/admin" className="btn">
            Admin Dashboard
          </Link>
          <div className="btn btn-secondary" style={{ cursor: 'default' }}>
            <QrCode size={20} /> Scan a QR code to verify
          </div>
        </div>
      </div>
      
      <p style={{ marginTop: '40px', color: '#999', fontSize: '14px' }}>
        Designed for IOS/APPLE aesthetic standards.
      </p>
    </div>
  );
}
