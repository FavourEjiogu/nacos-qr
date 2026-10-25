'use client';

import { useState } from 'react';
import { useAuth } from '../AuthContext';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { ISSUING_OFFICES } from '@/lib/offices';

export default function CreateMemo() {
  const { logout } = useAuth();
  const { secret } = useParams<{secret: string}>();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [title, setTitle] = useState('');
  const [documentType, setDocumentType] = useState('Internal Memorandum');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'CONFIDENTIAL'>('PUBLIC');
  const [officeCode, setOfficeCode] = useState('PRES');
  const [customOfficeCode, setCustomOfficeCode] = useState('');
  const [customOfficeName, setCustomOfficeName] = useState('');
  const [body, setBody] = useState('');
  const [issuer, setIssuer] = useState('');
  const [issuerPhone, setIssuerPhone] = useState('');
  const [addressedTo, setAddressedTo] = useState('');
  const [issuedAt, setIssuedAt] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  const [successData, setSuccessData] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const effectiveDate = effectiveFrom || issuedAt;

    try {
      const res = await fetch('/api/admin/memos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          documentType,
          visibility,
          officeCode,
          customOfficeCode: officeCode === 'OTHER' ? customOfficeCode : undefined,
          customOfficeName: officeCode === 'OTHER' ? customOfficeName : undefined,
          body,
          issuer,
          issuerPhone,
          addressedTo,
          issuedAt,
          effectiveFrom: effectiveDate,
          expiresAt: expiresAt || null,
        })
      });

      if (res.status === 401) {
        logout();
        return;
      }

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessData(data.memo);
      } else {
        setError(data.error || 'Failed to create memo');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const downloadQRSVG = (id: string, serial: string) => {
    const svg = document.getElementById(`qr-${id}`);
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');
    downloadLink.download = `${serial.replace(/\//g, '-')}-QR.svg`;
    downloadLink.href = url;
    downloadLink.click();
    URL.revokeObjectURL(url);
  };

  if (successData) {
    const baseUrl = process.env.NEXT_PUBLIC_VERIFY_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : '');
    const isPublic = successData.visibility === 'PUBLIC' && Boolean(successData.publicId);
    const verificationUrl = isPublic
      ? `${baseUrl}/verify/${successData.publicId}`
      : `${baseUrl}/verify/${encodeURIComponent(successData.serialNumber)}`;
    
    return (
      <div className="container" style={{ maxWidth: '800px' }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <h2 className="heading" style={{ color: 'var(--success)', fontSize: '28px', marginBottom: '24px', fontWeight: 600 }}>
            {isPublic ? 'PUBLIC MEMO ISSUED' : 'CONFIDENTIAL RECORD REGISTERED'}
          </h2>
          {!isPublic && (
            <p className="text-sm mb-6" role="status">
              This record is verifiable by its random reference. The reference and QR act as a bearer key: anyone who obtains them can view the record, so share them only with the intended recipient.
            </p>
          )}
          
          <div className="mb-8" style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '16px' }}>
            <div><span className="text-sm" style={{ textTransform: 'uppercase', marginRight: '8px' }}>Reference:</span> <span className="mono font-medium">{successData.serialNumber}</span></div>
            <div><span className="text-sm" style={{ textTransform: 'uppercase', marginRight: '8px' }}>Issuing Office:</span> <span className="font-medium">{successData.officeName} ({successData.officeCode})</span></div>
            <div><span className="text-sm" style={{ textTransform: 'uppercase', marginRight: '8px' }}>Classification:</span> <span className="font-medium">{isPublic ? 'Public verification' : 'Confidential — random-reference verification'}</span></div>
            {isPublic && <div><span className="text-sm" style={{ textTransform: 'uppercase', marginRight: '8px' }}>Verification ID:</span> <span className="mono font-medium">{successData.publicId}</span></div>}
            <div style={{ wordBreak: 'break-all' }}><span className="text-sm" style={{ textTransform: 'uppercase', marginRight: '8px' }}>Verification URL:</span> <span className="font-medium">{verificationUrl}</span></div>
          </div>

          <div style={{ background: '#fff', padding: '16px', display: 'inline-block', borderRadius: '4px', border: '1px solid #ccc', marginBottom: '32px' }}>
            <QRCodeSVG id={`qr-${successData.id}`} value={verificationUrl} size={200} level="H" />
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <>
              <button onClick={() => downloadQRSVG(successData.id, successData.serialNumber)} className="btn">
                Download verification QR
              </button>
              <button onClick={() => { void navigator.clipboard.writeText(verificationUrl); }} className="btn btn-secondary">
                Copy verification URL
              </button>
              <a href={verificationUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                Open verification page
              </a>
              {!isPublic && (
                <button onClick={() => { void navigator.clipboard.writeText(successData.serialNumber); }} className="btn btn-secondary">
                  Copy confidential reference
                </button>
              )}
            </>
            <Link href={`/admin/${secret}`} className="btn btn-secondary">
              Back to Registry
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: '800px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="mb-8">
        <h2 className="heading" style={{ fontSize: '24px' }}>
          Create Official Memo
        </h2>
        <Link href={`/admin/${secret}`} className="btn btn-secondary" style={{ padding: '8px 16px' }}>
          Back
        </Link>
      </div>

      <div className="card">
        {error && <div className="badge badge-danger mb-4" style={{ display: 'block', padding: '16px', textAlign: 'center' }}>{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="visibility">Publication & confidentiality</label>
            <select id="visibility" className="input" value={visibility} onChange={(e) => setVisibility(e.target.value as 'PUBLIC' | 'CONFIDENTIAL')} required>
              <option value="PUBLIC">Public — publish a QR verification record</option>
              <option value="CONFIDENTIAL">Confidential — verifiable by random reference/QR</option>
            </select>
            <p className="text-sm" style={{ marginTop: '6px' }}>
              Confidential records are excluded from public lookup even if someone learns their reference number. Do not select Public for private letters.
            </p>
          </div>

          <div>
            <label htmlFor="officeCode">Issuing office</label>
            <select id="officeCode" className="input" value={officeCode} onChange={(e) => setOfficeCode(e.target.value)} required>
              {ISSUING_OFFICES.map((office) => (
                <option key={office.code} value={office.code}>{office.label}{office.code !== 'OTHER' ? ` (${office.code})` : ''}</option>
              ))}
            </select>
          </div>
          {officeCode === 'OTHER' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <div>
                <label htmlFor="customOfficeCode">Office code (2–8 characters)</label>
                <input id="customOfficeCode" className="input" value={customOfficeCode} onChange={(e) => setCustomOfficeCode(e.target.value.toUpperCase())}
                  placeholder="e.g. COMMS" minLength={2} maxLength={8} pattern="[A-Z][A-Z0-9]{1,7}" required />
              </div>
              <div>
                <label htmlFor="customOfficeName">Official office name</label>
                <input id="customOfficeName" className="input" value={customOfficeName} onChange={(e) => setCustomOfficeName(e.target.value)}
                  placeholder="e.g. Committee on Communications" minLength={3} maxLength={120} required />
              </div>
            </div>
          )}

          <div>
            <label>Title</label>
            <input 
              className="input"
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              placeholder="e.g. Official Directive on Hackathon" 
              required 
            />
          </div>

          <div>
            <label>Document Type</label>
            <select
              className="input"
              value={documentType}
              onChange={e => setDocumentType(e.target.value)}
              required
            >
              <option value="Internal Memorandum">Internal Memorandum</option>
              <option value="External Communication">External Communication</option>
              <option value="Partnership / Sponsorship">Partnership / Sponsorship</option>
              <option value="Proposal">Proposal</option>
              <option value="Notice / Circular">Notice / Circular</option>
              <option value="Invitation">Invitation</option>
              <option value="Appointment / Designation">Appointment / Designation</option>
              <option value="Policy / Directive">Policy / Directive</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label>Official Text (Body)</label>
            <textarea 
              className="input"
              value={body} 
              onChange={e => setBody(e.target.value)} 
              placeholder="Enter the full authoritative text of the memo..." 
              required 
              style={{ minHeight: '200px', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label>Issued By</label>
              <input 
                className="input"
                value={issuer} 
                onChange={e => setIssuer(e.target.value)} 
                placeholder="e.g. Office of the President" 
                required 
              />
            </div>
            <div>
              <label>Issuer WhatsApp <span style={{ fontSize: '12px', fontWeight: 'normal', color: 'var(--foreground)', opacity: 0.7 }}>(Shown publicly to document verifiers)</span></label>
              <input 
                type="tel"
                className="input"
                value={issuerPhone} 
                onChange={e => setIssuerPhone(e.target.value)} 
                placeholder="e.g. +2348012345678" 
              />
            </div>
          </div>

          <div>
            <label>Addressed To</label>
            <input 
              className="input"
              value={addressedTo} 
              onChange={e => setAddressedTo(e.target.value)} 
              placeholder="e.g. All NACOSites / Faculty of Computing Students" 
              required 
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <div>
              <label>Date Issued</label>
              <input 
                type="date"
                className="input"
                value={issuedAt} 
                onChange={e => setIssuedAt(e.target.value)} 
                required 
              />
            </div>
            <div>
              <label>Effective Date (Optional)</label>
              <input 
                type="date"
                className="input"
                value={effectiveFrom} 
                onChange={e => setEffectiveFrom(e.target.value)} 
              />
            </div>
            <div>
              <label>Expiry Date (Optional)</label>
              <input 
                type="date"
                className="input"
                value={expiresAt} 
                onChange={e => setExpiresAt(e.target.value)} 
              />
            </div>
          </div>

          <hr />
          
          <button type="submit" disabled={loading} className="btn" style={{ width: '100%', padding: '16px', fontSize: '16px' }}>
            {loading ? 'Registering…' : visibility === 'PUBLIC' ? 'Issue public memo & generate QR' : 'Register confidential reference'}
          </button>
        </form>
      </div>
    </div>
  );
}
