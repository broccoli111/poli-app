'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, address, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/auth');
    } else if (!address) {
      router.replace('/onboarding');
    }
  }, [user, address, loading, router]);

  if (loading) return <div className="loading">Loading...</div>;
  if (!user || !address) return null;
  return <>{children}</>;
}
