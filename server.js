// server.js
require('dotenv').config();
const express = require('express');
const app = express();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const bodyParser = require('body-parser');
const path = require('path');

// Use raw body for webhook verification
app.use(express.json());

// Create Checkout Session for subscription
app.post('/create-checkout-session', async (req, res) => {
  try {
    const { email, metadata } = req.body;
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      subscription_data: {
        metadata: metadata || {}
      },
      success_url: `${process.env.DOMAIN}/download?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.DOMAIN}/?canceled=true`,
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// Download endpoint: verifies session and subscription then serves the file or link
app.get('/download', async (req, res) => {
  const sessionId = req.query.session_id;
  if (!sessionId) return res.status(400).send('Missing session_id.');

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    // session.subscription is the subscription id (string)
    if (!session || !session.subscription) {
      return res.status(403).send('Payment not found. Please complete subscription to download.');
    }

    // Retrieve subscription to check status
    const subscription = await stripe.subscriptions.retrieve(session.subscription);
    if (!subscription || (subscription.status !== 'active' && subscription.status !== 'trialing')) {
      return res.status(403).send('Subscription not active. Please contact support.');
    }

    // At this point, subscription is active — serve the prepared CV file.
    // In a real app, you would fetch the user's optimized CV from storage (S3 / filesystem / DB)
    // For demo, we will return a simple file response or redirect to a signed URL.
    const demoFilePath = path.join(__dirname, 'demo-optimized-cv.pdf'); // replace with actual file
    return res.download(demoFilePath, 'Optimized-CV.pdf', (err) => {
      if (err) console.error('Download error', err);
    });
  } catch (err) {
    console.error(err);
    return res.status(500).send('Server error.');
  }
});

// Stripe webhook endpoint to listen for subscription events (optional but recommended)
app.post('/webhook', bodyParser.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.log(`Webhook signature verification failed.`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle relevant events
  switch (event.type) {
    case 'checkout.session.completed':
      // A Checkout session has been successfully completed.
      // You can grant access here or record subscription in DB.
      const session = event.data.object;
      console.log('Checkout session completed:', session.id);
      break;
    case 'invoice.paid':
      // recurring payment succeeded
      break;
    case 'invoice.payment_failed':
      // notify user, retry logic
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

const PORT = process.env.PORT || 4242;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
