# Stripe Webhook Setup

## Why you need it

- **Production:** Stripe sends `checkout.session.completed` to your server so the subscription is activated even if the user closes the tab before the success page loads.
- **Local development:** Optional. The **payment success page** calls `POST /api/payment/confirm` with the session ID and activates the subscription from the session, so **checkout works locally without webhooks**. Use webhooks locally if you want to test the full flow (e.g. delayed events).

## Getting a webhook secret for local testing

1. **Install the Stripe CLI**  
   - macOS: `brew install stripe/stripe-cli/stripe`  
   - Or: https://stripe.com/docs/stripe-cli#install

2. **Log in** (one time):
   ```bash
   stripe login
   ```

3. **Forward webhooks to your app** (run in a separate terminal while dev server is running):
   ```bash
   stripe listen --forward-to localhost:3001/api/stripe/webhook
   ```

4. **Copy the signing secret**  
   The CLI will print something like:
   ```text
   Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

5. **Set it in `.env.local`**:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

6. Restart your Next.js dev server so it picks up the new env.

The CLI will show each webhook event (e.g. `checkout.session.completed`) when you complete a test payment.

## Production

1. In [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks), click **Add endpoint**.
2. **Endpoint URL:** `https://your-domain.com/api/stripe/webhook`
3. **Events to send:** `checkout.session.completed`
4. After creating, open the endpoint and reveal **Signing secret**.
5. Set `STRIPE_WEBHOOK_SECRET` in your production environment to that value.
