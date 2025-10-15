import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { createClientRoute } from '@/lib/supabase/route';
import { PRICE_IDS, assertPlan, type Plan } from '@/lib/billing';
import { reqEnv } from '@/lib/env';

export const runtime = 'nodejs';

type Body = { plan: Plan };

export async function POST(req: Request) {
  // --- parse & validate body (no zod needed)
  const body = (await req.json()) as Partial<Body>;
  if (!assertPlan(body.plan)) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
  }
  const plan = body.plan;

  // --- auth via SSR client
  const supabase = await createClientRoute();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // --- get or create Stripe customer
  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single();

  let customerId = profile?.stripe_customer_id ?? null;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;
    await supabase.from('profiles')
      .update({ stripe_customer_id: customerId })
      .eq('id', user.id);
  }

  // --- single multi-currency price id
  const price = PRICE_IDS[plan];

  // --- create checkout session
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId!,
    line_items: [{ price, quantity: 1 }],
    allow_promotion_codes: true,
    success_url: `${reqEnv('NEXT_PUBLIC_APP_URL')}/settings/billing?status=success`,
    cancel_url : `${reqEnv('NEXT_PUBLIC_APP_URL')}/settings/billing?status=cancel`,
    subscription_data: {
      metadata: { supabase_user_id: user.id, plan },
    },
    metadata: { plan },
  } satisfies Stripe.Checkout.SessionCreateParams);

  return NextResponse.json({ url: session.url });
}
