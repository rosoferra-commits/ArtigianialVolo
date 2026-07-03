// src/lib/stripe.ts
// Istanza Stripe server-side. Importa solo nelle API route (server).
import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})
