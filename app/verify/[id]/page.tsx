// fix: use prisma singleton, remove direct PrismaClient instantiation
import { prisma } from '@/lib/prisma';
import { generateMemoHash } from '@/lib/crypto';
import { AlertTriangle, ShieldCheck, User, Phone, Link as LinkIcon, FileText } from 'lucide-react';

export default async function VerifyPage({ params }: { params: { id: string } }) {
  const memo = await prisma.memo.findUnique({
    where: { id: params.id }
  });

  if (!memo) {
    return (
      <div className="container" style={{ textAlign: 'center', marginTop: '20vh' }}>
        <AlertTriangle size={64} color="#ff3b30" style={{ marginBottom: '16px' }} />
        <h1>Memo Not Found</h1>
        <p style={{ color: '#666', marginTop: '16px' }}>The QR code you scanned is invalid or the memo has been removed from the system.</p>
      </div>
    );
  }

  // Verify the hash dynamically
  const expectedHash = generateMemoHash({
    serialNumber: memo.serialNumber,
    title: memo.title,
    content: memo.content,
    authors: memo.authors,
    phoneNumbers: memo.phoneNumbers,
    socialMediaLink: memo.socialMediaLink,
  });

  const isTampered = expectedHash !== memo.contentHash;
  const isRevoked = memo.status === 'REVOKED';

  return (
    <div className="container" style={{ maxWidth: '600px', paddingBottom: '64px' }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        {isRevoked ? (
          <>
            <AlertTriangle size={64} color="#ff3b30" style={{ marginBottom: '16px' }} />
            <h1 style={{ color: '#ff3b30' }}>Memo Revoked</h1>
            <p style={{ color: '#666', marginTop: '8px' }}>This official memo has been revoked by NACOS and is no longer valid.</p>
          </>
        ) : isTampered ? (
          <>
            <AlertTriangle size={64} color="#ff3b30" style={{ marginBottom: '16px' }} />
            <h1 style={{ color: '#ff3b30' }}>Data Integrity Error</h1>
            <p style={{ color: '#666', marginTop: '8px' }}>This memo has been tampered with. The verification signature does not match.</p>
          </>
        ) : (
          <>
            <ShieldCheck size={64} color="#34c759" style={{ marginBottom: '16px' }} />
            <h1 style={{ color: '#34c759' }}>Verified Authentic</h1>
            <p style={{ color: '#666', marginTop: '8px' }}>This is an official, tamper-free memo issued by NACOS.</p>
          </>
        )}
      </div>

      <div className="glass" style={{ padding: '32px', borderRadius: '24px', opacity: (isRevoked || isTampered) ? 0.7 : 1 }}>
        <div style={{ textAlign: 'center', marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '24px' }}>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px', letterSpacing: '1px', textTransform: 'uppercase' }}>Serial Number</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', fontFamily: 'monospace' }}>{memo.serialNumber}</div>
        </div>

        <h2 style={{ fontSize: '24px', marginBottom: '24px', lineHeight: 1.3 }}>{memo.title}</h2>
        
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', color: '#666', fontSize: '14px' }}>
          <FileText size={16} />
          <span>Issued on {new Date(memo.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>

        <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, marginBottom: '32px', fontSize: '16px' }}>
          {memo.content}
        </div>

        <div style={{ background: 'var(--secondary)', padding: '24px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#666', fontSize: '14px', marginBottom: '4px' }}>
              <User size={16} /> <strong>Authors</strong>
            </div>
            <div style={{ paddingLeft: '24px' }}>{JSON.parse(memo.authors).join(', ')}</div>
          </div>
          
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#666', fontSize: '14px', marginBottom: '4px' }}>
              <Phone size={16} /> <strong>Contact</strong>
            </div>
            <div style={{ paddingLeft: '24px' }}>{JSON.parse(memo.phoneNumbers).join(', ')}</div>
          </div>

          {memo.socialMediaLink && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#666', fontSize: '14px', marginBottom: '4px' }}>
                <LinkIcon size={16} /> <strong>Social Media</strong>
              </div>
              <div style={{ paddingLeft: '24px' }}>
                <a href={memo.socialMediaLink} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>
                  View Official Post
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div style={{ textAlign: 'center', marginTop: '32px', fontSize: '14px', color: '#999' }}>
        <p>Secured by NACOS QR</p>
      </div>
    </div>
  );
}
