import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase/supabaseAdmin';
import { PRICE_IDS, type Plan } from '@/lib/billing';
import { reqEnv } from '@/lib/env';

export const runtime = 'nodejs';

const PRICE_TO_PLAN: Record<string, Plan> = {
  [PRICE_IDS.plus]: 'plus',
  [PRICE_IDS.pro ]: 'pro',
};

export async function POST(req: Request) {
  const signature = req.headers.get('stripe-signature');
  if (!signature) return new NextResponse('Missing signature', { status: 400 });

  const raw = Buffer.from(await req.arrayBuffer());
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(raw, signature, reqEnv('STRIPE_WEBHOOK_SECRET'));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid payload';
    return new NextResponse(`Webhook Error: ${message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object;

        // map price -> plan
        const firstItem = sub.items.data[0];
        const priceId = firstItem?.price?.id;
        const plan = priceId ? PRICE_TO_PLAN[priceId] ?? 'pro' : 'pro'; // safe fallback

        // find user id either via metadata or profiles lookup
        let supabaseUserId = sub.metadata?.supabase_user_id as string | undefined;
        if (!supabaseUserId && typeof sub.customer === 'string') {
          const { data } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('stripe_customer_id', sub.customer)
            .maybeSingle();
          supabaseUserId = data?.id;
        }

        if (supabaseUserId) {
          const periodEnd = firstItem?.current_period_end ?? 
                           ('current_period_end' in sub ? sub.current_period_end : null);
          
          await supabaseAdmin.from('profiles').update({
            stripe_subscription_id: sub.id,
            subscription_status: sub.status,
            plan,
            current_period_end: periodEnd
              ? new Date(periodEnd * 1000).toISOString()
              : null,
          }).eq('id', supabaseUserId);
        }
        break;
      }

      case 'invoice.payment_failed':
      case 'checkout.session.completed':
      default:
        // handled above or not needed for persistence
        break;
    }

    return NextResponse.json({ received: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unhandled error';
    return new NextResponse(`Webhook handler failed: ${message}`, { status: 500 });
  }
}