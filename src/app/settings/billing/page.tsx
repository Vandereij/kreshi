'use client';

import { useState } from 'react';

type Plan = 'plus' | 'pro';

export default function BillingPage() {
  const [loading, setLoading] = useState<Plan | null>(null);

  const startCheckout = async (plan: Plan) => {
    setLoading(plan);
    try {
      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url; // redirect to Stripe Checkout
      } else {
        alert(data.error || 'Failed to start checkout');
      }
    } finally {
      setLoading(null);
    }
  };

  const openPortal = async () => {
    const res = await fetch('/api/stripe/portal', { method: 'POST' });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  };

  return (
    <main className="max-w-4xl mx-auto py-16 px-4">
      <h1 className="text-3xl font-bold mb-8 text-center">Subscription Plans</h1>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Free */}
        <div className="rounded-2xl p-6 border shadow-sm">
          <h3 className="text-xl font-semibold mb-2">Free</h3>
          <p className="text-gray-500 mb-4">Core journaling features</p>
          <p className="text-2xl font-bold mb-4">$0 / mo</p>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>✓ Unlimited text entries</li>
            <li>✓ Basic AI prompts</li>
            <li>✓ 30-day mood trends</li>
          </ul>
          <button className="mt-6 w-full py-2 rounded-xl bg-gray-200 text-gray-700">
            Current
          </button>
        </div>

        {/* Plus */}
        <div className="rounded-2xl p-6 border shadow-md border-indigo-500">
          <h3 className="text-xl font-semibold mb-2">Plus</h3>
          <p className="text-gray-500 mb-4">Personal Growth Companion</p>
          <p className="text-2xl font-bold mb-4">$7.99 / mo</p>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>✓ Advanced prompts</li>
            <li>✓ Smart themes & insights</li>
            <li>✓ Voice-to-text</li>
          </ul>
          <button
            onClick={() => startCheckout('plus')}
            disabled={loading === 'plus'}
            className="mt-6 w-full py-2 rounded-xl bg-indigo-600 text-white disabled:opacity-60"
          >
            {loading === 'plus' ? 'Loading...' : 'Upgrade to Plus'}
          </button>
        </div>

        {/* Pro */}
        <div className="rounded-2xl p-6 border shadow-sm">
          <h3 className="text-xl font-semibold mb-2">Pro</h3>
          <p className="text-gray-500 mb-4">Deep Insight & Analytics</p>
          <p className="text-2xl font-bold mb-4">$12.99 / mo</p>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>✓ AI-generated monthly reports</li>
            <li>✓ Correlation & pattern analysis</li>
            <li>✓ Advanced graphs & exports</li>
          </ul>
          <button
            onClick={() => startCheckout('pro')}
            disabled={loading === 'pro'}
            className="mt-6 w-full py-2 rounded-xl bg-black text-white disabled:opacity-60"
          >
            {loading === 'pro' ? 'Loading...' : 'Upgrade to Pro'}
          </button>

          <button
            onClick={openPortal}
            className="mt-3 w-full py-2 rounded-xl border text-gray-700"
          >
            Manage billing
          </button>
        </div>
      </div>
    </main>
  );
}
