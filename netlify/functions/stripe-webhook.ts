import type { Handler } from '@netlify/functions'
export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' }
  console.log('Stripe webhook received:', event.body)
  return { statusCode: 200, body: JSON.stringify({ received: true }) }
}
