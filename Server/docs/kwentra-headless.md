# Kwentra headless integration (from Reservation & Guest Profile APIs.docx)

## Auth
- Scheme: HTTP Basic (`Authorization: Basic base64(user:pass)`)
- Query: `tenant_id=<hotel>`
- Base: `https://manage.kwentra.com`

## Documented APIs
| Method | Path | Use |
|---|---|---|
| GET | `/api/reservation/individualreservation/v2` | List/filter reservations |
| GET | `/api/core/individualprofile/v3/:id` | Guest profile |
| PUT | `/api/core/individualprofile/v3/:id/` | Update guest (send full GET body) |
| POST | `/api/core/individualprofile/v3/:id/attachments` | Upload attachment |

## Not in this doc pack
- Create / confirm / cancel reservation
- Dedicated availability or rates calendar
- Unit catalog

## Website → Kwentra guest flow
1. Guest fills **BookingForm** on Prime (name, email, phone, notes, dates).
2. `POST /api/book-direct` calls `sendGuestFromWebsite()`:
   - **New guest** → `POST /api/core/individualprofile/v3/`
   - **Existing profileId** → GET + PUT (documented edit flow)
3. Stay notes / dates are stored on `guest_preferences`.
4. Local booking + embedded payment continue on-site.
5. Reservation **create** still needs `KWENTRA_PATH_CREATE_RESERVATION` when Kwentra documents it.

Also: `POST /api/kwentra/guests` pushes guest form data alone (no payment).

## Env
```
KWENTRA_API_BASE_URL=https://manage.kwentra.com
KWENTRA_TENANT_ID=394
KWENTRA_USERNAME=...
KWENTRA_PASSWORD=...
```

## CMS field
Set each unit’s `kwentraRoomTypeId` to Kwentra `room_type.id` so calendars filter correctly.
