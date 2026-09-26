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
      <div className="container" style={{ textAlign: 'center', marginTop: '15vh' }}>
        <h1 className="heading" style={{ fontSize: '32px', marginBottom: '16px', color: 'var(--danger)' }}>RECORD NOT FOUND</h1>
        <p className="text-sm">No matching verification record exists.</p>
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
    <div className="container">
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h2 className="heading text-sm mb-2" style={{ fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          NACOS
        </h2>
        {isRevoked ? (
          <>
            <h1 className="heading" style={{ color: 'var(--danger)', fontSize: '28px', marginBottom: '12px', fontWeight: 600 }}>MEMO REVOKED</h1>
            <p className="text-sm">The record was issued by NACOS but has subsequently been withdrawn.</p>
            {memo.revocationReason && (
              <div style={{ marginTop: '16px', color: 'var(--danger)', fontWeight: 500 }}>
                Reason: {memo.revocationReason}
              </div>
            )}
          </>
        ) : isTampered ? (
          <>
            <h1 className="heading" style={{ color: 'var(--danger)', fontSize: '28px', marginBottom: '12px', fontWeight: 600 }}>VERIFICATION FAILED</h1>
            <p className="text-sm">The stored record failed integrity validation.</p>
          </>
        ) : isExpired ? (
           <>
            <h1 className="heading" style={{ color: 'var(--warning)', fontSize: '28px', marginBottom: '12px', fontWeight: 600 }}>VERIFIED — EXPIRED</h1>
            <p className="text-sm">The record exists and the integrity check passes, but its expiration date has passed.</p>
          </>
        ) : (
          <>
            <h1 className="heading" style={{ color: 'var(--success)', fontSize: '28px', marginBottom: '12px', fontWeight: 600 }}>VERIFIED — ACTIVE</h1>
            <p className="text-sm">This memo matches an official NACOS record.</p>
          </>
        )}
      </div>

      <div className="card" style={{ opacity: (isDanger || isWarning) ? 0.9 : 1 }}>
        <div className="mb-8">
          <div className="text-sm mb-1" style={{ textTransform: 'uppercase', fontWeight: 500 }}>Reference</div>
          <div className="mono" style={{ fontSize: '16px', fontWeight: 500 }}>{memo.serialNumber}</div>
        </div>
        
        <div className="mb-8">
          <div className="text-sm mb-1" style={{ textTransform: 'uppercase', fontWeight: 500 }}>Verification ID</div>
          <div className="mono" style={{ fontSize: '16px', fontWeight: 500 }}>{memo.publicId}</div>
        </div>

        <div className="mb-8">
          <div className="text-sm mb-1" style={{ textTransform: 'uppercase', fontWeight: 500 }}>Title</div>
          <div className="heading" style={{ fontSize: '20px', fontWeight: 500 }}>{memo.title}</div>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }} className="mb-8">
          <div>
            <div className="text-sm mb-1" style={{ textTransform: 'uppercase', fontWeight: 500 }}>Issued</div>
            <div style={{ fontWeight: 500 }}>{new Date(memo.issuedAt).toLocaleDateString()}</div>
          </div>
          <div>
            <div className="text-sm mb-1" style={{ textTransform: 'uppercase', fontWeight: 500 }}>Issuer</div>
            <div style={{ fontWeight: 500 }}>{memo.issuer}</div>
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <div className="text-sm mb-1" style={{ textTransform: 'uppercase', fontWeight: 500 }}>Department</div>
            <div style={{ fontWeight: 500 }}>{memo.department}</div>
          </div>
        </div>

        <hr />
        
        <div className="mb-8">
          <h3 className="heading text-sm mb-4" style={{ textTransform: 'uppercase', fontWeight: 500 }}>Official Memo</h3>
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: '15px' }}>
            {memo.body}
          </div>
        </div>

        {memo.links && memo.links.length > 0 && (
          <div className="mb-8">
            <h3 className="heading text-sm mb-2" style={{ textTransform: 'uppercase', fontWeight: 500 }}>Links</h3>
            <ul style={{ paddingLeft: '20px' }}>
              {memo.links.map((link: { id: string, label: string, url: string }) => (
                <li key={link.id} className="mb-2">
                  <a href={link.url} target="_blank" rel="noopener noreferrer">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        <hr />
        
        <div style={{ background: 'var(--secondary)', padding: '24px', borderRadius: '4px' }}>
          <h3 className="heading" style={{ fontSize: '15px', marginBottom: '8px', fontWeight: 500 }}>COMPARE WITH YOUR DOCUMENT</h3>
          <p className="text-sm">
            Check that the reference number, title, date, issuer and contents shown here match the document you received.
            If important details differ, do not rely on the document.
          </p>
        </div>
      </div>
    </div>
  );
}
