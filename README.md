# PADEL 93 Finance Frontend — Phase 2

Phase 2 adds the complete mobile-first STAFF workflow on top of the Phase 1 foundation.

## Run

```powershell
npm install
```

Copy `.env.example` to `.env` and point it to the existing backend:

```text
VITE_API_URL=http://localhost:3000/api/v1
```

Start the app:

```powershell
npm run dev
```

The backend must be running first.

## Staff routes

```text
/app
/app/staff
/app/staff/appointments
/app/staff/appointments/:id
/app/staff/quick-add
/app/staff/expenses
/app/staff/handover
/app/staff/shifts/:id/close
/app/staff/records
/app/staff/notifications
/app/profile
```

## Phase 2 behavior

- Staff home loads the current shift, monthly goal, and today's appointments.
- Open-shift uses a stable clientRequestId and does not optimistically change money state.
- Close-shift is a blind count: the expected amount is never shown before submission.
- After closing, the server response shows variance and unresolved bookings.
- Appointment details support payment recording and red-flag submission.
- Visa/InstaPay require a receipt; receipt images are validated and compressed client-side where the browser can decode them.
- Expense recording uses active expense categories and optional receipts.
- Handover is always created as the backend's STAFF -> ACCOUNTANT flow.
- The receiver's count remains a receiver-side backend operation; STAFF only submits and can cancel while pending.
- My Records uses cursor pagination for income, expense, exception, and transfer feeds.
- Notifications poll every 30 seconds and can be marked read/read-all.
- Profile allows self-editing and password change; the new token from `/auth/change-password` replaces the old one.

## Security and API rules

All application API traffic goes through one RTK Query slice. JWTs are kept in Redux memory and mirrored in sessionStorage for refresh continuity. The API layer adds the Authorization header and converts 401 responses into a logout plus login redirect.

Money remains integer piasters at the API boundary. EGP text inputs are converted by `toPiasters()` on submission, and no optimistic money updates are performed.

Idempotent creation forms create a UUID when mounted and keep using it through retries. The identifier is regenerated only after a successful write.

## Design correction from Phase 1

Tailwind dark mode now uses class mode rather than the operating-system media query. Phase 1 light cards therefore remain light with navy text, and the login language switcher remains visible. Dark brand sections use explicit navy/night backgrounds rather than accidental system-dark overrides.

The supplied PADEL 93 logo remains unchanged.
