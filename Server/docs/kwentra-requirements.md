# What to request from Kwentra (Prime Hospitality headless integration)

We already have from you:
- ✅ Individual Reservation **GET** v2 (list/filter)
- ✅ Individual Profile **GET/PUT** v3 + attachments
- ✅ Auth: Basic + `tenant_id`

Below is what we still need for the website exchanges to work cleanly.

---

## Architecture (Prime)

| Direction | Data | Source of truth |
|---|---|---|
| **PULL** | Destinations | Kwentra destinations |
| **PULL** | Projects inside destinations | Kwentra properties/projects → Prime compounds |
| **PULL** | Unit details (title, beds, rates, occupancy, description…) | Kwentra room types |
| **CMS only** | Destination / project cover images | Cloudinary via Prime CMS |
| **CMS only** | Unit photos | Google Drive folder links |
| **PULL** | Availability / blocked nights | Kwentra reservations (or a dedicated calendar API) |
| **PUSH** | Unit edits from our admin | → Kwentra room type |
| **PUSH** | Guest form + new reservation | → Kwentra profile + reservation (Expected) |
| **PUSH** | Money paid after on-site Paymob/Stripe | → Kwentra folio / payment on that reservation |

Guests **never** open Kwentra’s booking engine. All UX stays on primehospitality.com.

---

## 0. PULL — Destinations & Projects (REQUIRED)

Hierarchy we expect:

```
Destination (e.g. North Coast)
  └── Project / Property (e.g. Marassi, Fouka Bay)
        └── Room types / Units
```

Please provide:

1. **List destinations** — method, path, sample JSON (`id`, `name`, …)
2. **List projects/properties** — ideally filterable by `destination_id`
3. How a project links to its destination (field name)
4. How room types link to a project/property (field name)

Env once confirmed:
```
KWENTRA_PATH_DESTINATIONS=...
KWENTRA_PATH_PROJECTS=...
```

Prime CMS only overlays **cover images** (Cloudinary) + homepage flags for destinations/projects.

---

## 1. PULL — Units / room types (REQUIRED)

Please provide:

1. **List room types** for a tenant  
   - Method + full URL path  
   - Example response JSON (id, name/room_type, occupancy, rates, description, board types, etc.)
2. **Get one room type by id**
3. Field mapping notes (which field is rack rate, max guests, etc.)

We will call it with the same Basic auth + `tenant_id` as the Reservation API.

Prime will store only:
- `kwentraRoomTypeId` (link)
- Google Drive folder / gallery images
- Website flags (featured, published, sort order, compound)

Env we will set once you confirm the path:
`KWENTRA_PATH_ROOM_TYPES=...`

### 1b. Webhook on inventory changes (REQUIRED for instant listing)

When a room type, room, property or destination is **created, updated or deleted** in Kwentra, please send:

```
POST https://<prime-api-domain>/api/webhooks/kwentra
X-Kwentra-Secret: <shared secret we give you>
Content-Type: application/json

{ "event": "roomtype.created", "id": 123, "tenant_id": "…" }
```

Any JSON body works — Prime re-pulls the lists straight away (new units go live on the website within seconds).
Without the webhook, Prime checks for changes every 5 minutes (`KWENTRA_SYNC_MINUTES`).
List endpoints should support pagination via `next` links (DRF style) or `page_size`.

---

## 2. PULL — Availability (REQUIRED — nice if dedicated)

**Today:** we derive blocked nights from Reservation GET (`Expected` / `Checked In`) filtered by `room_type.id`.

**Better (please provide if available):**
- Calendar / availability API per room type for a date range  
  - Returns blocked dates, min stay, stop-sell, daily rates  
- Example: `GET .../availability?room_type_id=&from=&to=`

---

## 3. PUSH — Create reservation (REQUIRED)

We have **GET** reservation docs only. We need **POST create** so website bookings block inventory.

Please provide:
1. **POST create Individual Reservation** path + sample body  
2. How to set state to **Expected** (or equivalent) so dates block  
3. How to attach:
   - `name` / Individual Profile id  
   - `room_nights[]` with `room_type`, `rate`, `board_type`, `from_date`, `to_date`  
   - `arrival_date`, `departure_date`  
   - adults/children  
   - `voucher_no` / external reference (our `prime_…` id)  
4. Response: reservation `id` we must store

We already shape payloads like your GET examples (`room_nights`, `channel`, `source`, etc.).

Env:
`KWENTRA_PATH_CREATE_RESERVATION=...`

Also confirm IDs we must send for your tenant:
- `KWENTRA_SOURCE_ID` (direct website)
- `KWENTRA_CHANNEL_ID` (Individual)
- `KWENTRA_DEFAULT_RATE_ID`
- `KWENTRA_DEFAULT_BOARD_TYPE_ID`
- `KWENTRA_CURRENCY_ID`
- `KWENTRA_GUARANTEE_TYPE`

---

## 4. PUSH — Guest profile create (HELPFUL)

We have **PUT** (edit). Please confirm:
- **POST create Individual Profile** path + body (same fields as PUT)  
  OR how to create a guest when they first book from the website.

Env (already wired): `KWENTRA_PATH_CREATE_PROFILE` (default `/api/core/individualprofile/v3/`)

---

## 5. PUSH — Unit edits (REQUIRED)

When admin changes title/description/rates/occupancy in Prime CMS:

Please provide:
- **PUT/PATCH room type** by id  
- Allowed fields we may update  
- Whether rates are on the room type or a separate Rate API

Env: `KWENTRA_PATH_ROOM_TYPE=.../:id`

---

## 6. PUSH — Money paid (REQUIRED)

After Paymob/Stripe succeeds on our site:

Please provide:
- API to post **payment / deposit / folio charge** against a reservation id  
- Body: amount, currency, method, transaction reference, paid timestamp  
- Whether this auto-sets guarantee / reduces `balance`

Env: `KWENTRA_PATH_PAYMENT=.../:id/payment` (placeholder until you confirm)

---

## 7. Access checklist (send us)

| Item | Needed |
|---|---|
| Sandbox / demo `tenant_id` | ✅ |
| API username + password (Basic) | ✅ |
| Base URL (if not `https://manage.kwentra.com`) | ✅ |
| Docs or Postman for items 1–6 above | ✅ |
| Whitelist our server IP if required | maybe |
| Webhook on room type / room / property / destination changes (section 1b) | ✅ |
| Webhook from Kwentra on cancel/no-show (optional) | nice |

---

## What already works in Prime today

- Guest fills form on website → push Individual Profile  
- Calendar blocks from Reservation GET when `kwentraRoomTypeId` is set  
- CMS Drive folder for unit photos  
- Admin unit save attempts room-type push when path works  
- Direct book builds reservation payload + tries POST  
- After payment, tries payment push to Kwentra  
- Zero redirects (embedded Paymob / mock)

---

## Contact line you can forward to Kwentra

> We are building a headless direct-booking site. We will never use your hosted booking engine. We need Open API access to: (1) list destinations and projects/properties under them, (2) list/update room types, (3) create individual reservations that block availability, (4) post payments to those reservations, (5) a webhook to our endpoint whenever a room type, room, property or destination is created/updated/deleted, so new units appear on the website instantly — in addition to the Reservation GET and Profile GET/PUT docs you already shared. Please send paths, sample requests/responses, and sandbox credentials for tenant_id=…
