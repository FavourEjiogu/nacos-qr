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
  
  const whatsappUrl = memo.issuerPhone 
    ? `https://wa.me/${memo.issuerPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello, I am contacting you regarding NACOS document ${memo.serialNumber}. I would like to ask about this document.`)}` 
    : null;

  return (
    <div className="container" style={{ maxWidth: '700px' }}>
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

        <div style={{ marginTop: '16px', padding: '16px', background: 'var(--secondary)', borderRadius: '4px', textAlign: 'left' }}>
          <p className="text-sm" style={{ fontWeight: 500 }}>This is the official NACOS record associated with this verification ID.</p>
          {!isDanger && !isWarning && (
            <p className="text-sm" style={{ marginTop: '8px' }}>Compare the details on this page with the document you received before relying on it.</p>
          )}
        </div>
      </div>

      <div className="card" style={{ opacity: (isDanger || isWarning) ? 0.9 : 1 }}>
        <div className="mb-6">
          <div className="text-sm mb-1" style={{ textTransform: 'uppercase', fontWeight: 500 }}>Reference</div>
          <div className="mono" style={{ fontSize: '16px', fontWeight: 500 }}>{memo.serialNumber}</div>
        </div>
        
        <div className="mb-6">
          <div className="text-sm mb-1" style={{ textTransform: 'uppercase', fontWeight: 500 }}>Verification ID</div>
          <div className="mono" style={{ fontSize: '16px', fontWeight: 500 }}>{memo.publicId}</div>
        </div>

        <div className="mb-6">
          <div className="text-sm mb-1" style={{ textTransform: 'uppercase', fontWeight: 500 }}>Document Type</div>
          <div style={{ fontSize: '16px', fontWeight: 500 }}>{memo.documentType || 'Other'}</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }} className="mb-6">
          <div>
            <div className="text-sm mb-1" style={{ textTransform: 'uppercase', fontWeight: 500 }}>Issued</div>
            <div style={{ fontWeight: 500 }}>{new Date(memo.issuedAt).toLocaleDateString()}</div>
          </div>
          <div>
            <div className="text-sm mb-1" style={{ textTransform: 'uppercase', fontWeight: 500 }}>Issued By</div>
            <div style={{ fontWeight: 500 }}>{memo.issuer}</div>
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <div className="text-sm mb-1" style={{ textTransform: 'uppercase', fontWeight: 500 }}>Addressed To</div>
            <div style={{ fontWeight: 500 }}>{memo.addressedTo}</div>
          </div>
        </div>

        {memo.issuerPhone && (
          <div className="mb-8">
            <div className="text-sm mb-1" style={{ textTransform: 'uppercase', fontWeight: 500 }}>WhatsApp Contact</div>
            <a href={whatsappUrl!} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', fontWeight: 500, color: 'var(--foreground)', textDecoration: 'underline' }}>
              Contact Issuer on WhatsApp ↗
            </a>
          </div>
        )}

        <hr />
        
        <div className="mb-8">
          <h3 className="heading mb-4" style={{ fontSize: '20px', fontWeight: 500 }}>{memo.title}</h3>
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
        
        <div style={{ background: 'var(--secondary)', padding: '24px', borderRadius: '4px', marginBottom: '24px' }}>
          <h3 className="heading" style={{ fontSize: '15px', marginBottom: '8px', fontWeight: 500 }}>COMPARE WITH YOUR DOCUMENT</h3>
          <p className="text-sm">
            Compare the information shown here with the document you received. Check the reference, document type, dates, issuer, recipient, and contents. If important details differ, do not rely on the document.
          </p>
        </div>

        {memo.issuerPhone && (
          <div style={{ border: '1px solid var(--border)', padding: '24px', borderRadius: '4px', textAlign: 'center' }}>
            <h3 className="heading" style={{ fontSize: '16px', marginBottom: '8px', fontWeight: 500 }}>Found a problem with this document?</h3>
            <p className="text-sm mb-4">
              Contact the issuing person or office on WhatsApp to report a discrepancy or ask a question.
            </p>
            <a href={whatsappUrl!} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ display: 'inline-block' }}>
              Contact Issuer on WhatsApp
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
