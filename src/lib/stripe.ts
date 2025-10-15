import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});

export const getRegionalPriceId = (plan: 'plus'|'pro') => {
  const key = `NEXT_PUBLIC_PRICE_${plan.toUpperCase()}}`;
  const id = process.env[key];
  if (!id) throw new Error(`Missing env ${key}`);
  return id;
};
