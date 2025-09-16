'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

function b64urlToObj(b64url: string) {
  const pad = (s: string) => s + '='.repeat((4 - (s.length % 4)) % 4);
  const s = pad(b64url).replace(/-/g, '+').replace(/_/g, '/');
  try {
    return JSON.parse(typeof window !== 'undefined'
      ? atob(s)
      : Buffer.from(s, 'base64').toString('utf8'));
  } catch {
    return {};
  }
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState('Completing sign-in…');

  useEffect(() => {
    try {
      const hash = window.location.hash.replace(/^#/, '');
      const p = new URLSearchParams(hash);

      const err = p.get('error');
      if (err) {
        setMessage(`Authentication error: ${p.get('error_description') || err}`);
        return;
      }

      const accessToken = p.get('access_token');
      const idToken     = p.get('id_token');
      const expiresIn   = parseInt(p.get('expires_in') || '0', 10);
      const state       = p.get('state');

      if (!accessToken || !idToken || !expiresIn || !state) {
        setMessage('Authentication failed: missing token(s).');
        return;
      }

      // Verify state
      const expectedState = sessionStorage.getItem('ai_recruiting_agent_oauth_state');
      if (expectedState && state !== expectedState) {
        setMessage('Authentication failed: state mismatch.');
        return;
      }

      // Verify nonce in id_token
      const payload = b64urlToObj((idToken.split('.')[1] || ''));
      const expectedNonce = sessionStorage.getItem('ai_recruiting_agent_oauth_nonce');
      if (expectedNonce && (payload as any)?.nonce !== expectedNonce) {
        setMessage('Authentication failed: nonce mismatch.');
        return;
      }

      // Persist token
      const token = {
        accessToken,
        idToken,
        expiresAt: Date.now() + expiresIn * 1000,
      };
      try { localStorage.setItem('ai_recruiting_agent_auth', JSON.stringify(token)); } catch {}

      // Cleanup and route to the app
      sessionStorage.removeItem('ai_recruiting_agent_oauth_state');
      sessionStorage.removeItem('ai_recruiting_agent_oauth_nonce');

      router.replace('/panel');
    } catch (e: any) {
      setMessage(`Authentication failed: ${e?.message || 'unknown error'}`);
    }
  }, [router]);

  return (
    <div style={{display:'flex',height:'100vh',alignItems:'center',justifyContent:'center',fontFamily:'system-ui,sans-serif'}}>
      <div style={{fontSize:14,color:'#555'}}>Completing sign-in…</div>
    </div>
  );
}