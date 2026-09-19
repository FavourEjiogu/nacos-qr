'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [memoId, setMemoId] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = memoId.trim();
    if (query) {
      router.push(`/verify/${encodeURIComponent(query)}`);
    }
  };

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '85vh', maxWidth: '480px' }}>
      <h1 className="heading" style={{ fontSize: '24px', marginBottom: '4px' }}>
        NACOS
      </h1>
      <h2 className="heading text-sm mb-8" style={{ fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Official Document Verification
      </h2>
      
      <p className="mb-8 text-sm">
        Scan the QR code printed on a NACOS document or enter its Verification ID or Reference Number.
      </p>

      <form onSubmit={handleSearch}>
        <input 
          type="text" 
          className="input mono"
          placeholder="Verification ID / Reference Number" 
          value={memoId}
          onChange={(e) => setMemoId(e.target.value)}
          required
        />
        <button type="submit" className="btn" style={{ width: '100%' }}>
          Verify
        </button>
      </form>
      
      <div className="mt-8 text-sm" style={{ textAlign: 'center', opacity: 0.8 }}>
        <p className="mb-4">No account is required.</p>
        <p className="mb-4" style={{ fontWeight: 500 }}>
          After verification, compare the official record shown on this site with the document you received.
        </p>
        <p className="mono" style={{ fontSize: '11px', letterSpacing: '0.05em' }}>
          SCAN OR ENTER ID → VIEW OFFICIAL RECORD → COMPARE WITH DOCUMENT
        </p>
      </div>
    </div>
  );
}
