import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClientRoute } from '@/lib/supabase/route';
import { reqEnv } from '@/lib/env';

export const runtime = 'nodejs';

export async function POST() {
  const supabase = await createClientRoute();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single();

  if (!profile?.stripe_customer_id) {
    return NextResponse.json({ error: 'No Stripe customer' }, { status: 400 });
  }

  const portal = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: reqEnv('STRIPE_PORTAL_RETURN_URL'),
  });

  return NextResponse.json({ url: portal.url });
}
