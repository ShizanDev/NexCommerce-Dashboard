---
Task ID: 5
Agent: Main Agent
Task: Major dashboard enhancement — WooCommerce webhook integration, OTP auth, connection UX, and polish

Work Log:
- Updated Prisma schema: Added OtpRecord model (email, otp, purpose, verified, expiresAt), fixed Product model (added regularPrice, salePrice, stockStatus, category fields), added emailVerified to AuthUser
- Fixed Products API route: Changed `wooProductId` → `wooId` and all other field names to match corrected Prisma schema
- Fixed Customers API route: Changed `o.total` → `o.totalAmount`, removed SQLite-unsupported `mode: 'insensitive'`
- Created OTP API route at `/api/auth/otp`: POST with action=send generates 6-digit OTP with 5-min expiry, 60s rate limit; action=verify validates and marks verified
- Updated `/api/auth/setup` route: Removed WC credential fields, now requires OTP verification before creating account
- Updated `/api/auth/login` route: Added OTP verification step — user must provide valid OTP along with email/password
- Redesigned login page: Multi-step flow (choose → form → OTP verify), removed WC API key fields from signup, clean UI with step navigation, OTP auto-complete on 6 digits, resend timer, toast notifications
- Updated Settings API: Added `action=disconnect` to remove WC credentials, added `wc_last_sync` tracking on every sync/test connection/webhook event
- Redesigned Settings view: Connection status banner (Connected/Failed/Not Connected), last sync time with relative time display, Sync Now button, Disconnect button with AlertDialog confirmation, webhook security info, improved setup guide
- Updated Sidebar: Auto-refreshing connection status (every 30s), Connected/Not Connected indicator with last sync time, version badge v2.2.0
- Updated main page: User avatar with initials dropdown menu, proper sign-out flow, improved header
- Cleared demo data from database (orders, customers, products, OTP records)
- Build verified: All 13 routes compile successfully
- Lint verified: 0 errors, 0 warnings
- Browser verified: Login page renders, signup form (clean, no WC fields), login form, OTP verification page all verified

Stage Summary:
- 14 files modified/created
- Complete OTP email verification system implemented (send + verify + rate limiting)
- WooCommerce connection UX fully implemented (Connected/Disconnected states, last sync time, disconnect action)
- Demo data cleared, login page redesigned, production-ready auth flow
- All code verified via ESLint (clean), Next.js build (successful), API tests (passing), browser rendering (verified)
