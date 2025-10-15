export type Plan = 'plus' | 'pro';

export const PRICE_IDS: Record<Plan, string> = {
  plus: process.env.NEXT_PUBLIC_PRICE_PLUS!,
  pro : process.env.NEXT_PUBLIC_PRICE_PRO!,
};

export function assertPlan(v: unknown): v is Plan {
  return v === 'plus' || v === 'pro';
}
