import { ShieldCheck, QrCode } from 'lucide-react';

export default function Home() {
  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', textAlign: 'center' }}>
      <div className="glass" style={{ padding: '64px 40px', borderRadius: '32px', maxWidth: '600px' }}>
        <ShieldCheck size={80} color="var(--primary)" style={{ marginBottom: '24px' }} />
        <h1 style={{ fontSize: '36px', marginBottom: '16px', letterSpacing: '-0.5px' }}>NACOS QR</h1>
        <p style={{ color: '#666', fontSize: '18px', marginBottom: '40px', lineHeight: 1.6 }}>
          The official system for verifying cryptographic tamper-proof memos for NACOS.
        </p>
        
        <div style={{ background: 'var(--card-bg, #fff)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border-color, #eaeaea)' }}>
          <QrCode size={48} color="var(--primary)" style={{ marginBottom: '16px' }} />
          <h3 style={{ fontSize: '20px', marginBottom: '8px' }}>How to verify a memo</h3>
          <p style={{ color: '#666', fontSize: '15px', lineHeight: 1.5 }}>
            To verify the authenticity of a NACOS memo, simply point your smartphone camera at the QR code printed on the official document.
          </p>
          <p style={{ color: '#666', fontSize: '15px', lineHeight: 1.5, marginTop: '8px' }}>
            You will be securely redirected to the original digital record to confirm its integrity and check for any tampering.
          </p>
        </div>
      </div>
    </div>
  );
}
