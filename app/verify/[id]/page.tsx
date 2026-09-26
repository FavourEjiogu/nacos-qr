import { prisma } from '@/lib/prisma';
import { verifyMemoHash } from '@/lib/crypto';
import { redirect } from 'next/navigation';

export const revalidate = 60; // Cache this page for 60 seconds

export default async function VerifyPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const decodedId = decodeURIComponent(params.id).trim();

  // If it contains a slash, it's a serial number. Redirect to canonical publicId URL.
  if (decodedId.includes('/')) {
    const memoBySerial = await prisma.memo.findUnique({
      where: { serialNumber: decodedId }
    });
    if (memoBySerial) {
      redirect(`/verify/${memoBySerial.publicId}`);
    }
  }

  const memo = await prisma.memo.findUnique({
    where: { publicId: decodedId },
    include: { links: true }
  });

  if (!memo) {
    return (
      <div style={{ textAlign: 'center', marginTop: '15vh', padding: '24px' }}>
        <h1 style={{ fontSize: '32px', marginBottom: '16px', color: 'var(--danger)' }}>RECORD NOT FOUND</h1>
        <p style={{ opacity: 0.7, fontSize: '18px' }}>No matching verification record exists.</p>
      </div>
    );
  }

  // Derive expired state dynamically
  let derivedStatus = memo.status;
  if (memo.status === 'ACTIVE' && memo.expiresAt && new Date(memo.expiresAt) < new Date()) {
    derivedStatus = 'EXPIRED';
  }

  const isTampered = !verifyMemoHash(memo, memo.contentHash);
  const isRevoked = memo.status === 'REVOKED';
  const isExpired = derivedStatus === 'EXPIRED';

  const isWarning = isExpired;
  const isDanger = isRevoked || isTampered;
  
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
      <div style={{ textAlign: 'center', marginBottom: '40px', marginTop: '24px' }}>
        {isRevoked ? (
          <>
            <h1 style={{ color: 'var(--danger)', fontSize: '28px', marginBottom: '12px', fontWeight: 700 }}>MEMO REVOKED</h1>
            <p style={{ opacity: 0.8, fontSize: '16px' }}>The record was issued by NACOS but has subsequently been withdrawn.</p>
            {memo.revocationReason && (
              <div style={{ marginTop: '16px', color: 'var(--danger)', fontWeight: 600 }}>
                Reason: {memo.revocationReason}
              </div>
            )}
          </>
        ) : isTampered ? (
          <>
            <h1 style={{ color: 'var(--danger)', fontSize: '28px', marginBottom: '12px', fontWeight: 700 }}>VERIFICATION FAILED</h1>
            <p style={{ opacity: 0.8, fontSize: '16px' }}>The stored record failed integrity validation.</p>
          </>
        ) : isExpired ? (
           <>
            <h1 style={{ color: 'var(--warning)', fontSize: '28px', marginBottom: '12px', fontWeight: 700 }}>VERIFIED — EXPIRED</h1>
            <p style={{ opacity: 0.8, fontSize: '16px' }}>The record exists and the integrity check passes, but its expiration date has passed.</p>
          </>
        ) : (
          <>
            <h1 style={{ color: 'var(--success)', fontSize: '28px', marginBottom: '12px', fontWeight: 700 }}>VERIFIED — ACTIVE</h1>
            <p style={{ opacity: 0.8, fontSize: '16px' }}>This memo matches an official NACOS record.</p>
          </>
        )}
      </div>

      <div style={{ 
        padding: '32px', 
        borderRadius: '8px', 
        border: '1px solid var(--border)', 
        background: 'var(--background)',
        opacity: (isDanger || isWarning) ? 0.9 : 1 
      }}>
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '12px', textTransform: 'uppercase', opacity: 0.6, fontWeight: 600 }}>Reference</div>
          <div style={{ fontSize: '18px', fontWeight: 600 }}>{memo.serialNumber}</div>
        </div>
        
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '12px', textTransform: 'uppercase', opacity: 0.6, fontWeight: 600 }}>Verification ID</div>
          <div style={{ fontSize: '18px', fontWeight: 600 }}>{memo.publicId}</div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '12px', textTransform: 'uppercase', opacity: 0.6, fontWeight: 600 }}>Title</div>
          <div style={{ fontSize: '20px', fontWeight: 700 }}>{memo.title}</div>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' }}>
          <div>
            <div style={{ fontSize: '12px', textTransform: 'uppercase', opacity: 0.6, fontWeight: 600 }}>Issued</div>
            <div style={{ fontWeight: 500 }}>{new Date(memo.issuedAt).toLocaleDateString()}</div>
          </div>
          <div>
            <div style={{ fontSize: '12px', textTransform: 'uppercase', opacity: 0.6, fontWeight: 600 }}>Issuer</div>
            <div style={{ fontWeight: 500 }}>{memo.issuer}</div>
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <div style={{ fontSize: '12px', textTransform: 'uppercase', opacity: 0.6, fontWeight: 600 }}>Department</div>
            <div style={{ fontWeight: 500 }}>{memo.department}</div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '32px', marginBottom: '32px' }}>
          <h3 style={{ fontSize: '14px', textTransform: 'uppercase', opacity: 0.6, marginBottom: '16px', fontWeight: 600 }}>Official Memo</h3>
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: '16px' }}>
            {memo.body}
          </div>
        </div>

        {memo.links && memo.links.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <h3 style={{ fontSize: '14px', textTransform: 'uppercase', opacity: 0.6, marginBottom: '12px', fontWeight: 600 }}>Links</h3>
            <ul style={{ paddingLeft: '20px' }}>
              {memo.links.map((link: { id: string, label: string, url: string }) => (
                <li key={link.id} style={{ marginBottom: '8px' }}>
                  <a href={link.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        <div style={{ 
          borderTop: '1px solid var(--border)', 
          paddingTop: '24px', 
          fontSize: '14px', 
          fontWeight: 600,
          background: 'rgba(0,0,0,0.02)',
          padding: '16px',
          borderRadius: '8px'
        }}>
          <h3 style={{ fontSize: '16px', marginBottom: '8px' }}>Compare with your document</h3>
          <p style={{ opacity: 0.8, lineHeight: 1.5 }}>
            Confirm that the title, reference number, date, issuer and contents shown here match the document you received. 
            If any important detail differs, do not rely on the document and contact NACOS.
          </p>
        </div>
      </div>
    </div>
  );
}
