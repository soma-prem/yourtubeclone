# YouTube Clone (Full Stack)

A full-stack YouTube-style platform with video browsing, channels, likes, comments, watch later, premium payments, and real-time video calling with screen sharing and recording.

## Project Structure
- `youtube/` — Next.js frontend
- `server/` — Express backend + WebSocket signaling server

## Tech Stack
- Frontend: Next.js, React, Tailwind, Radix UI, Firebase Auth
- Backend: Express, MongoDB (Mongoose), Stripe, Resend/Twilio (OTP), WebSocket (ws)

## Getting Started

### 1) Install dependencies
```bash
cd server
npm install

cd ../youtube
npm install
```

### 2) Environment variables

Create `server/.env`:
```bash
PORT=5000
DB_URL=your_mongodb_connection_string
CLIENT_URL=http://localhost:3000

GCS_PROJECT_ID=your_gcp_project_id
GCS_CLIENT_EMAIL=your_service_account_email
GCS_PRIVATE_KEY=your_service_account_private_key
GCS_BUCKET=your_gcs_bucket_name

STRIPE_SECRET_KEY=your_stripe_secret
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

EMAIL_USER=your_email_user
EMAIL_PASS=your_email_password

RESEND_API_KEY=your_resend_api_key
RESEND_FROM=your_resend_from_address

TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_FROM_NUMBER=your_twilio_from_number
```

Create `youtube/.env.local`:
```bash
BACKEND_URL=http://localhost:5000
NEXT_PUBLIC_WS_URL=ws://localhost:5000
```

### 3) Run the app

Start the backend:
```bash
cd server
npm run dev
```

Start the frontend:
```bash
cd youtube
npm run dev
```

The app will be available at `http://localhost:3000`.

## Notes
- WebRTC calls use a WebSocket signaling server on the backend (`ws://localhost:5000` by default).
- Screen sharing for YouTube works best in Chromium browsers; enable “Share audio” in the picker.
- Uploaded files are stored in `server/uploads/` locally.

## Build (Frontend)
```bash
cd youtube
npm run build
npm run start
```
