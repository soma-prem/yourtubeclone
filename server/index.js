import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import multer from "multer";
import path from "path";
import Stripe from "stripe"; 
import nodemailer from "nodemailer"; 

const users = (await import("./Modals/Auth.js")).default;


import userroutes from "./routes/auth.js";
import videoroutes from "./routes/video.js"
import likeroutes from "./routes/like.js"
import watchlaterroutes from "./routes/watchlater.js";
import historyrroutes from "./routes/history.js";
import commentroutes from "./routes/comment.js";

dotenv.config();


const app = express();
const server = http.createServer(app);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY); 


console.log("--- CONFIG CHECK ---");
console.log("Stripe Key Exists:", !!process.env.STRIPE_SECRET_KEY);
console.log("Email User:", process.env.EMAIL_USER ? "Set" : "Missing");
console.log("Email Pass:", process.env.EMAIL_PASS ? "Set" : "Missing");
console.log("--------------------");


const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});


const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());




app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  console.log("🔔 Webhook received!"); 

  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    console.log(`✅ Webhook signature verified. Event Type: ${event.type}`); 
  } catch (err) {
    console.error(`❌ Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata.userId; 
    const plan = session.metadata.plan; 
    const customerEmail = session.customer_email || session.metadata.email;

    console.log(`💰 Payment succeeded for User: ${userId}, Plan: ${plan}, Email: ${customerEmail}`); 

    if (!plan) {
        console.error("❌ ERROR: Missing plan in metadata");
        return res.status(400).end();
    }

    try {
      const users = (await import("./Modals/Auth.js")).default;
      
      
      const updatedUser = await users.findByIdAndUpdate(userId, { 
        plan: plan, 
        downloadsToday: 0 
      }, { new: true });
      
      console.log(`💾 Database updated. New Plan: ${updatedUser?.plan}`); 

      
      
      console.log(`📧 Attempting to send email to ${customerEmail}...`);

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: customerEmail,
        subject: `Payment Receipt: ${plan} Plan Activated`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              /* Mobile adjustments */
              @media only screen and (max-width: 600px) {
                .container { width: 100% !important; }
                .receipt-table { display: block; width: 100% !important; }
                .receipt-table td { display: block; width: 100% !important; box-sizing: border-box; padding: 10px 0; }
              }
            </style>
          </head>
          <body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f7f6;">
            
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f7f6; padding: 40px 0;">
              <tr>
                <td align="center">
                  
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" class="container" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); overflow: hidden;">
                    
                    <tr>
                      <td style="background-color: #cc0000; padding: 30px; text-align: center;">
                        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 1px;">YouTube Clone</h1>
                        <p style="color: #ffebeb; margin: 5px 0 0 0; font-size: 14px;">Premium Subscription</p>
                      </td>
                    </tr>

                    <tr>
                      <td style="padding: 40px 30px;">
                        <h2 style="color: #333333; margin-top: 0; font-size: 20px;">Thanks for upgrading!</h2>
                        <p style="color: #666666; font-size: 16px; line-height: 24px; margin-bottom: 30px;">
                          Your payment was successful. You have been upgraded to the <strong style="color: #cc0000;">${plan} Plan</strong>. You can now enjoy uninterrupted viewing according to your new limit.
                        </p>

                        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 6px;">
                          <tr>
                            <td style="padding: 20px;">
                              <table role="presentation" width="100%" style="border-collapse: collapse;">
                                <tr>
                                  <td style="padding: 8px 0; color: #666666; font-size: 14px;">Plan Type</td>
                                  <td style="padding: 8px 0; color: #333333; font-weight: bold; font-size: 14px; text-align: right;">${plan}</td>
                                </tr>
                                <tr>
                                  <td style="padding: 8px 0; color: #666666; font-size: 14px;">Amount Paid</td>
                                  <td style="padding: 8px 0; color: #333333; font-weight: bold; font-size: 14px; text-align: right;">₹${session.amount_total / 100}</td>
                                </tr>
                                <tr>
                                  <td style="padding: 8px 0; border-bottom: 1px solid #ddd; color: #666666; font-size: 14px;">Transaction ID</td>
                                  <td style="padding: 8px 0; border-bottom: 1px solid #ddd; color: #333333; font-weight: bold; font-size: 14px; text-align: right;">${session.payment_intent.slice(-10)}...</td>
                                </tr>
                                <tr>
                                  <td style="padding-top: 15px; color: #666666; font-size: 14px;"><strong>New Benefit</strong></td>
                                  <td style="padding-top: 15px; color: #28a745; font-weight: bold; font-size: 14px; text-align: right;">${getPlanBenefits(plan)}</td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>

                        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 30px;">
                          <tr>
                            <td align="center">
                              <a href="${process.env.CLIENT_URL ||"https://yourtubeclone-sp103-gqsn2rkck-financeaiadvisors-projects.vercel.app/premium"}" style="display: inline-block; padding: 14px 30px; background-color: #cc0000; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">Start Watching Now</a>
                            </td>
                          </tr>
                        </table>

                      </td>
                    </tr>

                    <tr>
                      <td style="background-color: #f1f3f5; padding: 20px; text-align: center; border-top: 1px solid #e9ecef;">
                        <p style="color: #999999; font-size: 12px; margin: 0;">
                          © ${new Date().getFullYear()} YouTube Clone. All rights reserved.<br>
                          This is an automated receipt. Please do not reply.
                        </p>
                      </td>
                    </tr>

                  </table>
                  </td>
              </tr>
            </table>
          </body>
          </html>
        `
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error("❌ Email Send Error:", error); 
        } else {
          console.log("✅ Email Sent Successfully:", info.response); 
        }
      });

    } catch (err) {
      console.error("❌ Processing failed:", err);
    }
  } else {
    console.log(`ℹ️ Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
});

function getPlanBenefits(plan) {
    switch(plan) {
      case 'BRONZE': return '7 minutes of watching time';
      case 'SILVER': return '10 minutes of watching time';
      case 'GOLD': return 'Unlimited watching time';
      default: return 'Standard benefits';
    }
}




app.use(express.json({ limit: "30mb", extended: true }));
app.use(express.urlencoded({ limit: "30mb", extended: true }));





app.get("/", (req, res) => {
  res.send("Server is running");
});

app.use("/user", userroutes);
app.use("/like", likeroutes);
app.use("/watch", watchlaterroutes);
app.use("/history", historyrroutes);
app.use("/comment", commentroutes);
app.use("/video", upload.single("file"), videoroutes);









app.post('/create-checkout-session', async (req, res) => {
  const { userId, email, plan } = req.body; 
  
  
  const validPlan = plan ? plan.toUpperCase() : "";

  console.log(`💳 Creating checkout session for: ${email}, Plan: ${validPlan}`);

  
  const plans = {
    BRONZE: 50,   
    SILVER: 100,  
    GOLD: 200     
  };

  
  if (!plans[validPlan]) {
    console.error(`❌ Invalid Plan Request: ${plan} (Parsed as: ${validPlan})`);
    return res.status(400).json({ error: "Invalid plan selected" });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'inr',
            product_data: {
              
              name: `${validPlan} Plan - YouTube Clone`, 
            },
            
            unit_amount: plans[validPlan] * 100, 
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      
      success_url: `${process.env.CLIENT_URL || "http://localhost:3000"}/premium`,
      cancel_url: `${process.env.CLIENT_URL || "http://localhost:3000"}/premium`,
      customer_email: email,
      metadata: {
        userId: userId,
        plan: validPlan, 
        email: email
      },
    });

    console.log(`🔗 Session created: ${session.id}`);
    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error("❌ Stripe Checkout Error:", error);
    res.status(500).json({ error: error.message });
  }
});



const PORT = process.env.PORT || 5000;
const DB_URL = process.env.DB_URL;

mongoose.connect(DB_URL)
  .then(() => {
    console.log("Database connected successfully");
  })
  .catch((err) => {
    console.log("Database connection failed", err);
  });




const wss = new WebSocketServer({ server });
const rooms = new Map(); 

const getRoom = (roomId) => {
  if (!rooms.has(roomId)) rooms.set(roomId, new Set());
  return rooms.get(roomId);
};

wss.on("connection", (ws) => {
  ws.on("message", (data) => {
    let msg;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      return;
    }
    const { type, roomId, payload } = msg || {};
    if (!roomId) return;

    if (type === "join") {
      const room = getRoom(roomId);
      if (room.size >= 2) {
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({ type: "room-full", roomId }));
        }
        return;
      }
      room.add(ws);
      ws.roomId = roomId;

      
      const peers = Array.from(room);
      peers.forEach((peer) => {
        if (peer.readyState === peer.OPEN) {
          const isInitiator = peer === ws && room.size === 2;
          peer.send(
            JSON.stringify({
              type: "room-info",
              roomId,
              payload: { count: room.size, isInitiator }
            })
          );
        }
      });
      return;
    }

    if (type === "signal") {
      const room = rooms.get(roomId);
      if (!room) return;
      room.forEach((peer) => {
        if (peer !== ws && peer.readyState === peer.OPEN) {
          peer.send(JSON.stringify({ type: "signal", roomId, payload }));
        }
      });
      return;
    }
  });

  ws.on("close", () => {
    const roomId = ws.roomId;
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;
    room.delete(ws);
    if (room.size === 0) rooms.delete(roomId);
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
