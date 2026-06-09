# Vehicle Photo Upload & Paper Documents — Design Spec

**Date:** 2026-06-09
**Scope:** Vehicle detail page (`/vehicles/[id]`) — two UI features:
1. Single vehicle photo with upload / replace / delete
2. Paper documents panel (new) with upload / download / delete

---

## 1. Vehicle Photo Upload

### Current State
The image area is a static placeholder (car emoji) with no interactivity. The existing API already supports photo upload (`POST /vehicles/:id/photos`) and deletion (`DELETE /vehicles/:id/photos/:photoId`), but the frontend has no UI for it.

### Behaviour

**State A — No photo uploaded**
- Display a dashed upload zone with a faint car emoji and "No vehicle photo" label.
- Show a red "**+ Upload Photo**" button centred in the zone.
- Accepted: JPG, PNG, max 5 MB.
- On file selection → POST to `/vehicles/:id/photos` with `cover=true` → on success, switch to State B.

**State B — Photo uploaded**
- Render the photo as a full-bleed image inside the zone.
- The "Upload Photo" button is **gone**.
- Two buttons are overlaid in the top-right corner of the image:
  - **✏️ Replace** — opens a file picker. On file selection → POST new photo first (so there's never a gap) → then DELETE old photo → refresh image.
  - **🗑 Delete** — shows a confirmation prompt. On confirm → DELETE photo → revert to State A.
- Only one photo is supported per vehicle (the cover photo).

### API Endpoints Used (existing)
- `POST /vehicles/:id/photos?cover=true` — multipart/form-data, field `file`
- `DELETE /vehicles/:id/photos/:photoId`

### Component Boundary
All photo state and upload logic lives in a new `VehiclePhoto` client component extracted from the vehicle detail page. It receives `vehicleId`, `initialPhoto` (the existing cover photo or null), and `token` as props.

---

## 2. Paper Documents Panel

### Current State
The right-hand column contains only "Vehicle History". There is no document concept on the frontend or backend.

### Layout Change
The right column is split into two stacked panels:
- **Top — Vehicle History** (existing, unchanged)
- **Bottom — Paper Documents** (new)

Both panels share equal visual weight. If there are many history entries, the history panel scrolls internally rather than pushing documents off screen.

### Paper Documents Behaviour

**Document list**
- Each uploaded document shown as a row: file-type icon (📄 for PDF, 🖼️ for image) + filename + file size + upload date.
- Two icon buttons per row: **⬇️ Download** (an `<a href={url} target="_blank">` to the static file URL — browser handles PDF/image natively) and **🗑 Delete** (user must confirm → DELETE endpoint → remove from list).

**Upload**
- "**+ Upload Document**" button always visible at the bottom of the list.
- Accepted: PDF, JPG, PNG. Max 10 MB per file (enforced server-side).
- Multiple documents allowed (no cap).
- On file selection → POST to new endpoint → prepend to list on success.

### New API Endpoint

`POST /vehicles/:id/documents` — multipart/form-data, field `file`
- Accepted MIME types: `application/pdf`, `image/jpeg`, `image/png`
- Max size: 10 MB
- Stores file to `/uploads/{vehicleId}/docs/{uuid}.{ext}`
- Serves via `/static/{vehicleId}/docs/{filename}`
- Returns the created `VehicleDocument` record

`GET /vehicles/:id` — extend response to include `documents: VehicleDocument[]`

`DELETE /vehicles/:id/documents/:documentId`

### New Prisma Model

```prisma
model VehicleDocument {
  id            String   @id @default(cuid())
  vehicleId     String
  vehicle       Vehicle  @relation(fields: [vehicleId], references: [id], onDelete: Cascade)
  url           String
  filename      String
  originalName  String
  mimeType      String
  size          Int
  uploadedById  String
  uploadedBy    User     @relation(fields: [uploadedById], references: [id])
  createdAt     DateTime @default(now())
}
```

### Component Boundary
A new `VehicleDocuments` client component. Receives `vehicleId`, `initialDocuments`, and `token` as props. Manages document list state locally, reflecting server responses optimistically where safe.

---

## 3. Architecture Summary

| Concern | Location |
|---|---|
| Photo upload UI | New `VehiclePhoto` client component |
| Documents UI | New `VehicleDocuments` client component |
| Documents API | New `VehicleDocumentsController` + `VehicleDocumentsService` (or extend existing vehicles module) |
| DB model | New `VehicleDocument` Prisma model + migration |
| File storage | `/uploads/{vehicleId}/docs/` on existing local filesystem |
| Static serving | Existing `/static/` route already configured |
| Shared types | `VehicleDocument` interface added to `packages/types` |

---

## 4. Out of Scope
- Document previews / inline rendering
- Document renaming
- Access control differences between SUPER_ADMIN and SECRETARY (both can upload/delete documents)
- Cloud storage (S3 etc.) — local filesystem only, consistent with existing photo storage
