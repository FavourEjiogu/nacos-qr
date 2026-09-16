import { prisma } from '@/lib/prisma';
import { generateMemoHash } from '@/lib/crypto';
import { AlertTriangle, ShieldCheck, User, Building, CalendarClock } from 'lucide-react';

export const revalidate = 60; // Cache this page for 60 seconds to easily support 1k+ concurrent DAU without DB strain

export default async function VerifyPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const memo = await prisma.memo.findUnique({
    where: { publicId: params.id },
    include: { links: true }
  });

  if (!memo) {
    return (
      <div className="container" style={{ textAlign: 'center', marginTop: '15vh' }}>
        <AlertTriangle size={80} color="var(--danger)" style={{ marginBottom: '24px' }} />
        <h1 style={{ fontSize: '32px', marginBottom: '16px', color: 'var(--danger)' }}>Record Not Found</h1>
        <p style={{ color: 'var(--foreground)', opacity: 0.7, fontSize: '18px' }}>NACOS could not verify this reference. Do not rely on this document as official communication.</p>
      </div>
    );
  }

  const expectedHash = generateMemoHash({
    publicId: memo.publicId,
    serialNumber: memo.serialNumber,
    title: memo.title,
    body: memo.body,
    issuer: memo.issuer,
    department: memo.department,
    issuedAt: memo.issuedAt,
    effectiveFrom: memo.effectiveFrom,
  });

  const isTampered = expectedHash !== memo.contentHash;
  const isRevoked = memo.status === 'REVOKED';
  const isSuperseded = memo.status === 'SUPERSEDED';
  const isExpired = memo.status === 'EXPIRED';

  const isWarning = isSuperseded || isExpired;
  const isDanger = isRevoked || isTampered;
  
  return (
    <div className="container">
      <div style={{ textAlign: 'center', marginBottom: '40px', marginTop: '24px' }}>
        {isRevoked ? (
          <>
            <AlertTriangle size={80} color="var(--danger)" style={{ marginBottom: '20px' }} />
            <h1 style={{ color: 'var(--danger)', fontSize: '36px', marginBottom: '12px' }}>Memo Revoked</h1>
            <p style={{ color: 'var(--foreground)', opacity: 0.7, fontSize: '18px' }}>This memo was genuinely issued but has subsequently been withdrawn.</p>
            {memo.revocationReason && (
              <div style={{ marginTop: '24px', display: 'inline-block' }}>
                <div className="badge badge-danger">Revocation Reason</div>
                <p style={{ marginTop: '8px', fontWeight: 500, color: 'var(--danger)' }}>{memo.revocationReason}</p>
              </div>
            )}
          </>
        ) : isTampered ? (
          <>
            <AlertTriangle size={80} color="var(--danger)" style={{ marginBottom: '20px' }} />
            <h1 style={{ color: 'var(--danger)', fontSize: '36px', marginBottom: '12px' }}>Verification Failed</h1>
            <p style={{ color: 'var(--foreground)', opacity: 0.7, fontSize: '18px' }}>This memo has been tampered with. The verification signature does not match.</p>
          </>
        ) : isWarning ? (
           <>
            <AlertTriangle size={80} color="var(--warning)" style={{ marginBottom: '20px' }} />
            <h1 style={{ color: 'var(--warning)', fontSize: '36px', marginBottom: '12px' }}>{isSuperseded ? 'Superseded' : 'Expired'}</h1>
            <p style={{ color: 'var(--foreground)', opacity: 0.7, fontSize: '18px' }}>This memo is authentic but is no longer the current instruction.</p>
          </>
        ) : (
          <>
            <ShieldCheck size={80} color="var(--success)" style={{ marginBottom: '20px' }} />
            <h1 style={{ color: 'var(--success)', fontSize: '36px', marginBottom: '12px' }}>Verified — Active</h1>
            <p style={{ color: 'var(--foreground)', opacity: 0.7, fontSize: '18px' }}>This record matches an official memo issued by NACOS.</p>
          </>
        )}
      </div>

      <div className="glass" style={{ padding: '40px', borderRadius: '32px', opacity: (isDanger || isWarning) ? 0.8 : 1 }}>
        <div style={{ textAlign: 'center', marginBottom: '32px', borderBottom: '1px solid var(--border)', paddingBottom: '32px' }}>
          <div style={{ fontSize: '13px', color: 'var(--foreground)', opacity: 0.5, marginBottom: '12px', letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 600 }}>Official Reference</div>
          <div style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-sans)', letterSpacing: '1px', marginBottom: '8px' }}>{memo.serialNumber}</div>
          <div style={{ fontSize: '14px', fontFamily: 'monospace', color: 'var(--foreground)', opacity: 0.6 }}>Memo ID: {memo.publicId}</div>
        </div>

        <h2 style={{ fontSize: '28px', marginBottom: '24px', lineHeight: 1.25, fontWeight: 700 }}>{memo.title}</h2>
        {memo.summary && <p style={{ fontSize: '18px', color: 'var(--foreground)', opacity: 0.7, marginBottom: '32px', lineHeight: 1.6 }}>{memo.summary}</p>}
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '40px', color: 'var(--foreground)', fontSize: '15px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', background: 'var(--secondary)', padding: '16px', borderRadius: '16px' }}>
            <CalendarClock size={20} style={{ opacity: 0.5 }} />
            <div>
              <div style={{ fontSize: '12px', opacity: 0.5, textTransform: 'uppercase', fontWeight: 600, marginBottom: '2px' }}>Issued</div>
              <div style={{ fontWeight: 500 }}>{new Date(memo.issuedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', background: 'var(--secondary)', padding: '16px', borderRadius: '16px' }}>
            <User size={20} style={{ opacity: 0.5 }} />
            <div>
              <div style={{ fontSize: '12px', opacity: 0.5, textTransform: 'uppercase', fontWeight: 600, marginBottom: '2px' }}>Issuer</div>
              <div style={{ fontWeight: 500 }}>{memo.issuer}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', background: 'var(--secondary)', padding: '16px', borderRadius: '16px' }}>
            <Building size={20} style={{ opacity: 0.5 }} />
            <div>
              <div style={{ fontSize: '12px', opacity: 0.5, textTransform: 'uppercase', fontWeight: 600, marginBottom: '2px' }}>Department</div>
              <div style={{ fontWeight: 500 }}>{memo.department}</div>
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '40px 0', marginBottom: '40px' }}>
          <div style={{ fontSize: '13px', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--foreground)', opacity: 0.4, marginBottom: '24px', textAlign: 'center', fontWeight: 600 }}>Document Content</div>
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, fontSize: '17px', color: 'var(--foreground)' }}>
            {memo.body}
          </div>
        </div>

        {memo.links && memo.links.length > 0 && (
          <div style={{ background: 'var(--secondary)', padding: '24px', borderRadius: '20px', display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
            <h3 style={{ fontSize: '17px', fontWeight: 600 }}>Additional Resources</h3>
            {memo.links.map((link: { id: string, label: string, url: string }) => (
              <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', fontWeight: 500 }}>
                {link.label} ↗
              </a>
            ))}
          </div>
        )}
        
        <div style={{ textAlign: 'center', background: 'var(--secondary)', padding: '20px', borderRadius: '16px', fontSize: '15px', color: 'var(--foreground)', opacity: 0.8, fontWeight: 500 }}>
          Compare the title, reference number, date and contents shown here with the document you received. If they differ, the document has been altered.
        </div>
      </div>
    </div>
  );
}
