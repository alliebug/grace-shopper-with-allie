const router = require('express').Router();

module.exports = router;

require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_PRIVATE_KEY);

// POST /api/stripe/checkout-session
router.post('/create-checkout-session', async (req, res, next) => {
  try {
    console.log('here');

    console.log(req.body);
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
