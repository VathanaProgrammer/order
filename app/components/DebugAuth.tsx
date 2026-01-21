// // components/DebugAuth.tsx
// "use client";
// import { useEffect } from 'react';
// import { useAuth } from '@/context/AuthContext';
// import { isSafari, getAuthToken } from '@/api/api';

// export default function DebugAuth() {
//   const { user, loading } = useAuth();
  
//   useEffect(() => {
//     console.log('=== DEBUG AUTH ===');
//     console.log('Loading:', loading);
//     console.log('User:', user);
//     console.log('Is Safari:', isSafari());
//     console.log('Token exists:', !!getAuthToken());
    
//     // Test endpoints
//     const testEndpoints = async () => {
//       const endpoints = ['/user', '/api/user'];
      
//       for (const endpoint of endpoints) {
//         try {
//           const response = await fetch(endpoint, {
//             headers: isSafari() && getAuthToken() 
//               ? { 'Authorization': `Bearer ${getAuthToken()}` }
//               : {}
//           });
//           console.log(`${endpoint}: ${response.status}`);
//         } catch (error) {
//           console.log(`${endpoint}: Failed`);
//         }
//       }
//     };
    
//     testEndpoints();
//   }, [user, loading]);
  
//   return null; // This component doesn't render anything
// }