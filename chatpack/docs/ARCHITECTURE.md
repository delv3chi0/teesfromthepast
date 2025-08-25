# ARCHITECTURE

Plain-English map of what this project is and how pieces fit.

---

## 1) What this app does

- A **Product Studio** where customers place art/text onto products (tees, hats, etc.), then export a **print-ready PNG** sized to the placement and add it to the cart.
- An **Admin Console** to manage **Users, Orders, Designs, Inventory, and Device Sessions**.
- A small set of **REST APIs** used by the frontend.

---

## 2) High-level layout

frontend/
src/
api/ ← Axios client (auth header helpers)
components/ ← Re-usable UI bits (InventoryPanel, etc.)
context/ ← Auth provider (useAuth)
data/ ← mockupsRegistry helpers (placements, colors, images)
pages/
admin/ ← AdminDashboard.jsx
AdminPage.jsx (tabs)
AdminAuditLogs.jsx
ProductStudio.jsx (editor/exporter)
backend/ ← Express API (not included here but referenced by API calls)

markdown
Copy
Edit

---

## 3) Frontend stack

- **React (hooks)** for UI
- **Chakra UI** for components and theming
- **fabric.js** on `ProductStudio` canvas
- **Axios** for HTTP
- **React Router** for routing

Theme keywords (used by Admin): `brand.primary`, `brand.paper`, `brand.cardBlue`, `brand.textLight`, etc.

---

## 4) Important flows

### 4.1 Auth & sessions
- Client stores JWT + a custom **`tftp_session_id`** in `localStorage`.
- Each axios request includes `Authorization: Bearer <token>` and `x-session-id: <id>`.
- **Admin → Devices tab** calls `/admin/sessions?page=…&limit=…&activeOnly=true`.
- Revoke current session → clears local storage and redirects to `/login?redirect=/admin`.

### 4.2 Designs
- Design objects may have:  
  `thumbUrl`, `publicUrl`, `imageDataUrl`, `settings` (with `mode`, `aspectRatio`, `cfgScale`, `steps`, `imageStrength`), voting info.

### 4.3 Product Studio export & upload
- **Placement math** comes from `data/mockupsRegistry` via `getPlacement({ slug, view, productType })` returning `{ x,y,w,h }` as fractions of the mockup image.
- **Export size** (pixels) from `getExportPixelSize(slug, view, productType)`; front/back default 4200×4800, sides 3600×3600 (can be tuned).
- We create an **offscreen fabric canvas** at export resolution, clone object layers into it, and export a **transparent PNG**.
- **Size estimation**: Client-side estimation warns at 80% of 22MB limit; server validates with structured 413 errors.
- Upload POST to `/upload/printfile` with `imageData` (base64) or `dataUrl` (full data URI) → returns `{ publicUrl, thumbUrl, publicId }` or structured error.
- We store a checkout line item with both **print file** and **preview**.

### 4.4 Checkout flows
- **Primary**: `POST /checkout/create-payment-intent` with items array and shipping address.
- **Alias**: `POST /checkout` (reuses same logic for simplified API access).
- Both validate required fields, calculate totals, and return Stripe client secret or 400 errors.

### 4.5 Orders
- Admin can set `orderStatus` among: Processing / Shipped / Delivered / Cancelled.
- `paymentStatus` shown as Tag (Succeeded / …).

---

## 5) Data shapes (simplified)

```ts
User {
  _id: string
  username: string
  email: string
  firstName?: string
  lastName?: string
  isAdmin: boolean
  createdAt: string
}

Order {
  _id: string
  user?: { email?: string }
  orderItems: Array<{ name: string; qty: number; price: number }>
  totalAmount: number // cents
  paymentStatus: 'Succeeded' | 'Pending' | 'Failed'
  orderStatus: 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled'
  createdAt: string
}

Design {
  _id: string
  prompt?: string
  thumbUrl?: string
  publicUrl?: string
  imageDataUrl?: string
  user?: { username?: string }
  settings?: {
    mode?: 't2i' | 'i2i'
    aspectRatio?: string
    cfgScale?: number
    steps?: number
    imageStrength?: number
  }
  isSubmittedForContest?: boolean
  contestSubmissionMonth?: 'YYYY-MM'
  votes?: number
  createdAt?: string
}

Session {
  jti: string
  user?: { _id?: string; username?: string; email?: string }
  ip?: string
  userAgent?: string
  client?: object
  createdAt: string
  lastSeenAt?: string
  expiresAt: string
  revokedAt?: string
}
6) Environment expectations
Frontend reads API base from the axios client. Backend must allow:

CORS for your Vercel origin

Authorization and x-session-id headers

JSON Content-Type

7) Where to tweak print placements
/frontend/src/data/mockupsRegistry.js (or similarly named):

images (mockup URLs)

available colors per product

getPlacement fractions per slug + view

8) Known styling constraints
Admin tables assume a light table body on a darker page background.

Readability fixes: session ID is shown as full, wrapped in a <Code> block; checkboxes use black when checked; “Auto-refresh” uses black text and white text inside the dropdown.

9) Bootstrap assumptions
If docs are empty, the checkpoint script writes starter content (this file and friends).

context.md is the single file to paste into a new chat when you want the assistant to be “caught up”
