// components/ProtectedRoute.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if we're coming back from sign-in
    const fromSignIn = sessionStorage.getItem('fromSignIn');
    const attemptedRoute = sessionStorage.getItem('attemptedRoute');
    
    if (fromSignIn === 'true' && attemptedRoute) {
      // Clear the flags
      sessionStorage.removeItem('fromSignIn');
      sessionStorage.removeItem('attemptedRoute');
      
      // If user is now authenticated, redirect to attempted route
      if (user && pathname === '/sign-in') {
        router.push(attemptedRoute);
        return;
      }
    }
  }, [user, pathname, router]);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // Store the attempted route before redirecting
        if (pathname !== '/sign-in') {
          sessionStorage.setItem('attemptedRoute', pathname + searchParams.toString());
        }
        
        // Set a flag that we're going to sign-in
        sessionStorage.setItem('redirectingToSignIn', 'true');
        
        // Use push instead of replace to preserve history
        router.push(`/sign-in?from=${encodeURIComponent(pathname)}`);
      } else {
        setIsAuthenticated(true);
      }
    }
  }, [user, loading, router, pathname, searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : null;
}