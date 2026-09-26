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
      // Encode to handle slashes in reference numbers (e.g., NACOSBHU/26/09/0001)
      router.push(`/verify/${encodeURIComponent(query)}`);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '85vh', textAlign: 'center', padding: '24px' }}>
      <div style={{ maxWidth: '400px', width: '100%' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '8px', lineHeight: 1.2 }}>
          NACOS
        </h1>
        <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '24px', opacity: 0.8 }}>
          Official Document Verification
        </h2>
        
        <p style={{ fontSize: '16px', marginBottom: '32px', lineHeight: 1.5, opacity: 0.9 }}>
          Scan the QR code on a NACOS memo, or enter its Verification ID or Reference Number.
        </p>

        <form onSubmit={handleSearch} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
          <input 
            type="text" 
            placeholder="Verification ID or Reference Number" 
            value={memoId}
            onChange={(e) => setMemoId(e.target.value)}
            style={{ 
              padding: '12px 16px', 
              fontSize: '16px', 
              borderRadius: '8px', 
              border: '1px solid var(--border)', 
              background: 'var(--background)',
              color: 'var(--foreground)'
            }}
            required
          />
          <button 
            type="submit" 
            style={{ 
              padding: '12px 24px', 
              fontSize: '16px', 
              fontWeight: 600, 
              borderRadius: '8px', 
              background: 'var(--primary)', 
              color: 'var(--background)',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Verify
          </button>
        </form>
        
        <p style={{ fontSize: '14px', opacity: 0.6 }}>
          No account is required.
        </p>
      </div>
    </div>
  );
}
