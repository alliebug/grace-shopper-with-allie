const router = require('express').Router();
module.exports = router;

require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_PRIVATE_KEY);
const endpointSecret = process.env.END_POINT_SECRET;

const fulfillOrder = (lineItems) => {
  // TODO: fill me in
  console.log('Fulfilling order', lineItems);
};

// POST /api/stripe/checkout-session
router.post('/create-checkout-session', async (req, res, next) => {
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: req.body.map((item) => {
        return {
          price_data: {
            currency: 'usd',
            product_data: {
              name: item.product.name,
            },
            unit_amount: parseFloat(item.product.price) * 100,
          },
          quantity: item.num_items,
        };
      }),
      success_url: `${process.env.SERVER_URL}/checkout/confirmation`,
      cancel_url: `${process.env.SERVER_URL}/shop`,
    });

    // res.redirect(303, session.url);
    res.json({ url: session.url });
  } catch (e) {
    next(e);
  }
});

// POST /api/stripe/webhook
router.post(
  '/webhook',
  //   bodyParser.raw({ type: 'application/json' }),
  async (request, response) => {
    const payload = request.rawBody;
    const sig = request.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(payload, sig, endpointSecret);
    } catch (err) {
      return response.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
      const data = event.data.object;

      // Retrieve the session. If you require line items in the response, you may include them by expanding line_items.
      const sessionWithLineItems = await stripe.checkout.sessions.retrieve(
        event.data.object.id,
        {
          expand: ['line_items'],
        }
      );
      const lineItems = sessionWithLineItems.line_items;

      // Fulfill the purchase...
      fulfillOrder(lineItems);
    }

    response.status(200).end();
  }
);
