'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

// Define admin user emails (you can expand this or use a database later)
const ADMIN_EMAILS = [
  'admin@gearx.com',
  'bheeshma@gearx.com', // Add your email here
  'zoro11112004@gmail.com', // Your current email added as admin
  // Add more admin emails as needed
];

export function useAdminAuth() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      // Not signed in, redirect to auth
      router.push('/auth?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }

    // Check if user email is in admin list
    const userIsAdmin = user.email ? ADMIN_EMAILS.includes(user.email) : false;
    setIsAdmin(userIsAdmin);
    setChecking(false);

    if (!userIsAdmin) {
      // Not an admin, redirect to home
      router.push('/');
      return;
    }
  }, [user, loading, router]);

  return {
    isAdmin,
    user,
    loading: loading || checking
  };
}

// Helper function to check if an email is admin
export function isAdminEmail(email: string | null | undefined): boolean {
  return email ? ADMIN_EMAILS.includes(email) : false;
}