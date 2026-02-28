'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

export function Nav() {
  const { user, signOut } = useAuth();

  return (
    <nav className="nav">
      <Link href="/" className="nav-brand">Poli</Link>
      <div className="nav-links">
        {user ? (
          <>
            <Link href="/">Bills</Link>
            <Link href="/survey">Survey</Link>
            <Link href="/notifications">Alerts</Link>
            <Link href="/profile">Profile</Link>
            <button className="btn btn-ghost btn-sm" onClick={signOut}>Sign Out</button>
          </>
        ) : (
          <Link href="/auth">Sign In</Link>
        )}
      </div>
    </nav>
  );
}
