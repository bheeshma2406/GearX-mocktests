'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Landing redirector:
 * - If signed in  -> /jee-tests
 * - If guest      -> /auth
 *
 * We render nothing and just redirect when auth state is known.
 */
export default function HomeRedirect() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (user) router.replace('/jee-tests');
    else router.replace('/auth');
  }, [loading, user, router]);

  // Optional: tiny blank screen while deciding
  return null;
}
