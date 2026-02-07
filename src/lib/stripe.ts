import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {});

/**
 * TODO:
 * - Store stripeCustomerId on Client
 * - Reuse customers for saved cards & autopay
 */