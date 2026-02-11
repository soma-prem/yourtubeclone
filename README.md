```markdown
# YouTube Clone (Full Stack)

## Project Info
A full-stack YouTube-style web application with a Next.js frontend and an Express backend.  
It supports video browsing and playback, channel pages, user engagement features, premium plans, and real-time calling.

## Core Features
- User authentication (Firebase-based auth flow with OTP/email integrations)
- Video upload and playback
- Comments, likes, watch later, and history
- Search and channel pages
- Premium plan purchase flow (Stripe checkout + webhook handling)
- Real-time 1:1 video call signaling over WebSocket
- Media storage integrations (Cloudinary / Google Cloud Storage support in backend libs)

## Tech Stack
- Frontend: Next.js 16, React 19, TypeScript, Tailwind CSS 4, Radix UI
- Backend: Express 5, Node.js, MongoDB with Mongoose, WebSocket (`ws`)
- Integrations: Stripe, Firebase, Nodemailer, Resend, Twilio, Cloudinary, Google Cloud Storage

## Project Structure
- `youtube/` - Frontend app (Next.js)
- `server/` - Backend API server (Express + WebSocket)

## Frontend Routes (high level)
- Home, Search, Watch page
- Channel page
- Liked, Watch Later, History, Downloads
- Premium page
- Call page

## Backend Route Groups
- `/user`
- `/video`
- `/comment`
- `/like`
- `/watch`
- `/history`
- `/create-checkout-session`
- `/webhook`

