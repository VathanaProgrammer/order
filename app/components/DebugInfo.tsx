// components/DebugInfo.tsx
"use client";
import { useEffect, useState } from 'react';
import { isSafari } from '@/api/api';

export default function DebugInfo() {
  const [info, setInfo] = useState<any>({});
  
  useEffect(() => {
    console.log('🔍 === DEBUG INFO ===');
    
    const debugData = {
      // Browser info
      userAgent: navigator.userAgent,
      isSafari: isSafari(),
      
      // Auth info
      localStorageToken: localStorage.getItem('auth_token'),
      localStorageKeys: Object.keys(localStorage),
      
      // Cookie info
      cookies: document.cookie,
      
      // URL info
      currentUrl: window.location.href,
      apiBaseUrl: process.env.NEXT_PUBLIC_API_URL,
    };
    
    console.log('📊 Debug Data:', debugData);
    setInfo(debugData);
    
    // Test /user endpoint directly
    const testUserEndpoint = async () => {
      const token = localStorage.getItem('auth_token');
      console.log('🔑 Token for test:', token);
      
      try {
        const response = await fetch('/user', {
          headers: isSafari() && token 
            ? { 'Authorization': `Bearer ${token}` }
            : {}
        });
        
        console.log('🧪 /user endpoint test:');
        console.log('Status:', response.status);
        console.log('Status Text:', response.statusText);
        
        if (response.ok) {
          const data = await response.json();
          console.log('✅ User data:', data);
        } else {
          console.log('❌ Failed to fetch user');
        }
      } catch (error) {
        console.log('❌ /user endpoint error:', error);
      }
    };
    
    testUserEndpoint();
    
  }, []);
  
  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      right: '10px',
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '10px',
      fontSize: '12px',
      zIndex: 9999,
      maxWidth: '300px',
      maxHeight: '200px',
      overflow: 'auto'
    }}>
      <div><strong>Debug Info:</strong></div>
      <div>Is Safari: {info.isSafari ? '✅ Yes' : '❌ No'}</div>
      <div>Token: {info.localStorageToken ? '✅ Found' : '❌ Missing'}</div>
      <div>Cookies: {info.cookies || 'None'}</div>
    </div>
  );
}