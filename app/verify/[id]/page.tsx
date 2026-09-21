import { prisma } from '@/lib/prisma';
import { generateMemoHash } from '@/lib/crypto';
import { AlertTriangle, ShieldCheck, User, Building, FileText, CalendarClock } from 'lucide-react';

export default async function VerifyPage({ params }: { params: { id: string } }) {
  // id in the URL is now the publicId (e.g. 7Y2KF94Q)
  const memo = await prisma.memo.findUnique({
    where: { publicId: params.id },
    include: { links: true }
  });

  if (!memo) {
    return (
      <div className="container" style={{ textAlign: 'center', marginTop: '20vh' }}>
        <AlertTriangle size={64} color="#ff3b30" style={{ marginBottom: '16px' }} />
        <h1>Verification Failed</h1>
        <p style={{ color: '#666', marginTop: '16px' }}>NACOS could not verify this reference. Do not rely on this document as official communication.</p>
      </div>
    );
  }

  // Verify the hash dynamically
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
    <div className="container" style={{ maxWidth: '600px', paddingBottom: '64px' }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        {isRevoked ? (
          <>
            <AlertTriangle size={64} color="#ff3b30" style={{ marginBottom: '16px' }} />
            <h1 style={{ color: '#ff3b30' }}>Memo Revoked</h1>
            <p style={{ color: '#666', marginTop: '8px' }}>This memo was genuinely issued but has subsequently been withdrawn.</p>
            {memo.revocationReason && (
              <p style={{ marginTop: '16px', background: '#ffebee', padding: '12px', borderRadius: '8px', color: '#c62828' }}>
                <strong>Reason:</strong> {memo.revocationReason}
              </p>
            )}
          </>
        ) : isTampered ? (
          <>
            <AlertTriangle size={64} color="#ff3b30" style={{ marginBottom: '16px' }} />
            <h1 style={{ color: '#ff3b30' }}>Verification Failed</h1>
            <p style={{ color: '#666', marginTop: '8px' }}>This memo has been tampered with. The verification signature does not match.</p>
          </>
        ) : isWarning ? (
           <>
            <AlertTriangle size={64} color="#ffcc00" style={{ marginBottom: '16px' }} />
            <h1 style={{ color: '#ffcc00' }}>{isSuperseded ? 'Superseded' : 'Expired'}</h1>
            <p style={{ color: '#666', marginTop: '8px' }}>This memo is authentic but is no longer the current instruction.</p>
          </>
        ) : (
          <>
            <ShieldCheck size={64} color="#34c759" style={{ marginBottom: '16px' }} />
            <h1 style={{ color: '#34c759' }}>Verified — Active</h1>
            <p style={{ color: '#666', marginTop: '8px' }}>This record matches an official memo issued by NACOS Bingham University.</p>
          </>
        )}
      </div>

      <div className="glass" style={{ padding: '32px', borderRadius: '24px', opacity: (isDanger || isWarning) ? 0.7 : 1 }}>
        <div style={{ textAlign: 'center', marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '24px' }}>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px', letterSpacing: '1px', textTransform: 'uppercase' }}>Reference</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', fontFamily: 'monospace' }}>{memo.serialNumber}</div>
        </div>

        <h2 style={{ fontSize: '24px', marginBottom: '24px', lineHeight: 1.3 }}>{memo.title}</h2>
        {memo.summary && <p style={{ fontSize: '18px', color: '#666', marginBottom: '24px' }}>{memo.summary}</p>}
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px', color: '#666', fontSize: '14px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <CalendarClock size={16} />
            <span><strong>Issued:</strong> {new Date(memo.issuedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <User size={16} />
            <span><strong>Issued by:</strong> {memo.issuer}</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Building size={16} />
            <span><strong>Department:</strong> {memo.department}</span>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '32px 0', marginBottom: '32px' }}>
          <div style={{ fontSize: '12px', letterSpacing: '1px', textTransform: 'uppercase', color: '#999', marginBottom: '16px', textAlign: 'center' }}>Official Memo</div>
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: '16px' }}>
            {memo.body}
          </div>
        </div>

        {memo.links && memo.links.length > 0 && (
          <div style={{ background: 'var(--secondary)', padding: '24px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', marginBottom: '8px' }}>More Information</h3>
            {memo.links.map((link: { id: string, label: string, url: string }) => (
              <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>
                {link.label}
              </a>
            ))}
          </div>
        )}
        
        <div style={{ textAlign: 'center', background: '#f8f9fa', padding: '16px', borderRadius: '12px', fontSize: '14px', color: '#666' }}>
          Compare the title, reference number, date and contents shown here with the document you received. If they differ, the document has been altered.
        </div>
      </div>
    </div>
  );
}
