# cylinder-booking-system

Full-stack LPG cylinder booking and delivery management system built with Node.js, React, and PostgreSQL — supporting multi-role workflows across customers, delivery partners, and admins.

---

## Problem

LPG cylinder distribution relies on manual coordination between customers, distributors, and delivery personnel — causing delays in order tracking, no transparency in delivery status, and no structured refund or payment audit trail.

## Solution

A role-based web platform that handles the complete lifecycle of a cylinder order: booking, payment, OTP-verified delivery, partner auto-assignment, and refund processing — with each role scoped to its own workflow interface.

---

## How It Works

1. **Input:** Customer places an order and completes UPI or cash payment
2. **Processing:**
   - Backend assigns an available delivery partner automatically via `assignmentService`
   - Partner receives the order and navigates to the delivery address
   - OTP is generated and verified at the point of delivery to confirm handoff
   - On cancellation (UPI orders), a refund record is created and processed via cron job
3. **Output:** Confirmed delivery with audit log (OTP record, payment record, refund status) stored in PostgreSQL

---

## Features

- Customer order placement with UPI and cash payment modes
- UPI retry logic with fallback to cash after three failed attempts
- OTP-based delivery confirmation with immutable verification audit log
- Auto-assignment of delivery partners with re-queuing on cancellation
- Refund lifecycle for cancelled UPI orders with cron-based processing
- Admin dashboard with delivery partner management and assignment monitoring
- Role-scoped interfaces for Customer, Delivery Partner, and Admin
- Invoice generation on order completion

---

## Tech Stack

**Frontend:** React, TypeScript, Vite, Tailwind CSS, React Leaflet  
**Backend:** Node.js, Express, TypeScript  
**Database:** PostgreSQL, Prisma ORM  
**Auth:** JWT-based role authentication, OTP verification  
**Utilities:** node-cron (refund processing), Twilio / Fast2SMS (SMS), bcrypt, dotenv

---

## Roles

| Role | Capabilities |
|---|---|
| Customer | Book orders, track delivery, retry payment, view refund status |
| Delivery Partner | Accept assignments, update delivery stages, verify OTP |
| Admin | Manage partners, monitor assignment queue, view all orders |

---

## Setup

```bash
# Clone the repository
git clone https://github.com/RemyAthisayaa17/cylinder-booking-system.git
cd cylinder-booking-system

# Backend setup
cd backend
npm install
npx prisma migrate dev
npm run dev

# Frontend setup
cd ../frontend
npm install
npm run dev
```

Configure environment variables in `backend/.env`:

```env
DATABASE_URL=
JWT_SECRET=
SMS_MODE=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
```

---

## Database

Schema managed via Prisma. Key models: `User`, `Order`, `Payment`, `OtpVerification`, `DeliveryPartner`, `Invoice`.

```bash
npx prisma studio   # inspect data
npx prisma migrate dev --name migration_name
```

---

## Future Improvements

- Replace mock UPI gateway with a live payment provider integration (Razorpay / PhonePe)
- Add push notifications for order status transitions
- Expose an admin analytics endpoint for delivery SLA tracking
- Implement refresh token rotation for long-lived sessions
