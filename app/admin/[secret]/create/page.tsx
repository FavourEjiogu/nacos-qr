'use client';

import { useState } from 'react';
import { useAuth } from '../AuthContext';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

export default function CreateMemo() {
  const { token, logout } = useAuth();
  const router = useRouter();
  const { secret } = useParams<{secret: string}>();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [authors, setAuthors] = useState('');
  const [phoneNumbers, setPhoneNumbers] = useState('');
  const [socialLink, setSocialLink] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/memos', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title,
          content,
          authors: authors.split(',').map(s => s.trim()).filter(Boolean),
          phoneNumbers: phoneNumbers.split(',').map(s => s.trim()).filter(Boolean),
          socialMediaLink: socialLink
        })
      });

      if (res.status === 401) {
        logout();
        return;
      }

      const data = await res.json();
      if (res.ok && data.success) {
        router.push(`/admin/${secret}`);
      } else {
        setError(data.error || 'Failed to create memo');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '800px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h2>Create New Memo</h2>
        <Link href={`/admin/${secret}`} className="btn btn-secondary">Back to Dashboard</Link>
      </div>

      <div className="glass" style={{ padding: '32px', borderRadius: '24px' }}>
        {error && <div style={{ color: 'red', marginBottom: '16px' }}>{error}</div>}
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Memo Title</label>
            <input 
              className="input" 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              placeholder="e.g. Official Directive on Hackathon" 
              required 
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Memo Content (Text or Markdown)</label>
            <textarea 
              className="input" 
              value={content} 
              onChange={e => setContent(e.target.value)} 
              placeholder="Enter the full text of the memo..." 
              style={{ minHeight: '200px', resize: 'vertical' }}
              required 
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Authors (comma separated)</label>
            <input 
              className="input" 
              value={authors} 
              onChange={e => setAuthors(e.target.value)} 
              placeholder="e.g. John Doe, Jane Smith" 
              required 
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Phone Numbers (comma separated)</label>
            <input 
              className="input" 
              value={phoneNumbers} 
              onChange={e => setPhoneNumbers(e.target.value)} 
              placeholder="e.g. +234 800 000 0000" 
              required 
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Social Media Link (Optional)</label>
            <input 
              className="input" 
              type="url"
              value={socialLink} 
              onChange={e => setSocialLink(e.target.value)} 
              placeholder="https://twitter.com/nacos..." 
            />
          </div>

          <button type="submit" className="btn" disabled={loading} style={{ marginTop: '16px' }}>
            {loading ? 'Generating...' : 'Create Memo & Generate QR'}
          </button>
        </form>
      </div>
    </div>
  );
}
