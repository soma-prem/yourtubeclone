import Stripe from "stripe";
import User from "../models/User.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const createCheckoutSession = async (req, res) => {
  try {
    const { userId, email, plan } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const prices = {
      BRONZE: 10,
      SILVER: 50,
      GOLD: 100,
    };

    if (!prices[plan]) {
      return res.status(400).json({ message: "Invalid plan selected" });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      customer_email: email,
      line_items: [{
        price_data: {
          currency: "inr",
          product_data: { name: `${plan} Plan` },
          unit_amount: prices[plan] * 100, 
        },
        quantity: 1,
      }],
      mode: "payment",
      success_url: `https://yourtubeclone-c1ohy3vlf-financeaiadvisors-projects.vercel.app/premium`, 
      cancel_url: `https://yourtubeclone-c1ohy3vlf-financeaiadvisors-projects.vercel.app/premium`,
    });

    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ message: "Payment session failed" });
  }
};
