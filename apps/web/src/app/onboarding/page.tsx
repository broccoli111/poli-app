'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
];

export default function OnboardingPage() {
  const { user, refreshAddress } = useAuth();
  const [line1, setLine1] = useState('');
  const [line2, setLine2] = useState('');
  const [city, setCity] = useState('');
  const [stateCode, setStateCode] = useState('');
  const [zip, setZip] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  if (!user) {
    router.replace('/auth');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error: insertError } = await supabase.from('addresses').insert({
        user_id: user.id,
        line1,
        line2: line2 || null,
        city,
        state_code: stateCode,
        zip,
        is_primary: true,
        federal_house: 'at-large',
      });

      if (insertError) throw insertError;
      await refreshAddress();
      router.replace('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save address');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: 500, marginTop: 40 }}>
      <h1 style={{ marginBottom: 8 }}>Welcome to Poli</h1>
      <p className="text-secondary mb-4">
        We need your address to show relevant bills and representatives for your area.
      </p>
      <div className="card">
        <form onSubmit={handleSubmit}>
          <label className="label">Street Address</label>
          <input className="input" value={line1} onChange={(e) => setLine1(e.target.value)} required />

          <label className="label">Address Line 2 (optional)</label>
          <input className="input" value={line2} onChange={(e) => setLine2(e.target.value)} />

          <div className="flex gap-2">
            <div style={{ flex: 1 }}>
              <label className="label">City</label>
              <input className="input" value={city} onChange={(e) => setCity(e.target.value)} required />
            </div>
            <div style={{ width: 100 }}>
              <label className="label">State</label>
              <select className="input" value={stateCode} onChange={(e) => setStateCode(e.target.value)} required>
                <option value="">--</option>
                {US_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <label className="label">ZIP Code</label>
          <input className="input" value={zip} onChange={(e) => setZip(e.target.value)} required maxLength={10} />

          {error && <p className="error-text">{error}</p>}

          <button className="btn btn-primary w-full mt-2" type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save Address & Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
