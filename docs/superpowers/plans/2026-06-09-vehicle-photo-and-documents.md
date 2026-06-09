# Vehicle Photo Upload & Paper Documents Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add single-photo upload/replace/delete to the vehicle detail page and a new Paper Documents panel that stores uploaded PDFs and images per vehicle.

**Architecture:** The backend gains a new `VehicleDocument` Prisma model with its own upload/delete endpoints on the existing vehicles controller; the frontend gets two new client components (`VehiclePhoto`, `VehicleDocuments`) that manage their state locally after initial server hydration, replacing the static photo placeholder and splitting the right-column panel.

**Tech Stack:** NestJS 10, Prisma v7, Next.js 15 App Router, React 19, Multer (memory storage), Tailwind CSS v4 / inline styles matching app CSS variables.

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Modify | `apps/api/prisma/schema.prisma` | Add `VehicleDocument` model + relations |
| Modify | `apps/api/src/vehicles/vehicles.service.ts` | `addDocument`, `deleteDocument`, extend `findOne` |
| Modify | `apps/api/src/vehicles/vehicles.service.spec.ts` | Tests for new service methods |
| Modify | `apps/api/src/vehicles/vehicles.controller.ts` | `POST :id/documents`, `DELETE :vehicleId/documents/:documentId` |
| Modify | `apps/web/lib/api-client.ts` | `VehicleDocument` interface, upload helpers, api methods |
| Create | `apps/web/components/vehicles/VehiclePhoto.tsx` | Photo upload/replace/delete UI |
| Create | `apps/web/components/vehicles/VehicleDocuments.tsx` | Document list + upload UI |
| Modify | `apps/web/app/(dashboard)/vehicles/[id]/page.tsx` | Wire up new components, split right column |

---

## Task 1: Prisma Schema — Add VehicleDocument Model

**Files:**
- Modify: `apps/api/prisma/schema.prisma`

- [ ] **Step 1: Add the VehicleDocument model and update relations**

In `apps/api/prisma/schema.prisma`, add `documents VehicleDocument[]` to the `Vehicle` model (after the `photos` line), add `vehicleDocs VehicleDocument[]` to the `User` model (after `vehicleHistory`), and append the new model at the end of the file:

```prisma
// In Vehicle model — add after:  photos  VehiclePhoto[]
documents    VehicleDocument[]

// In User model — add after:  vehicleHistory VehicleHistory[]
vehicleDocs  VehicleDocument[]

// New model — append before the final blank line
model VehicleDocument {
  id           String   @id @default(cuid())
  vehicleId    String
  url          String
  filename     String
  originalName String
  mimeType     String
  size         Int
  uploadedById String
  createdAt    DateTime @default(now())

  vehicle    Vehicle @relation(fields: [vehicleId], references: [id], onDelete: Cascade)
  uploadedBy User    @relation(fields: [uploadedById], references: [id])
}
```

- [ ] **Step 2: Push the schema**

Run from the repo root:
```powershell
npm run db:push
```

Expected: `Your database is now in sync with your Prisma schema.`

- [ ] **Step 3: Verify the table was created**

```powershell
npm run db:studio
```

Open Prisma Studio and confirm `VehicleDocument` appears in the left sidebar. Then close Studio (`Ctrl+C`).

- [ ] **Step 4: Commit**

```bash
git add apps/api/prisma/schema.prisma
git commit -m "feat(db): add VehicleDocument model for paper document uploads"
```

---

## Task 2: VehiclesService — Document Methods + Extend findOne

**Files:**
- Modify: `apps/api/src/vehicles/vehicles.service.ts`
- Modify: `apps/api/src/vehicles/vehicles.service.spec.ts`

- [ ] **Step 1: Add `vehicleDocument` and fs mocks to the spec file**

In `apps/api/src/vehicles/vehicles.service.spec.ts`, check if `jest.mock('node:fs/promises', ...)` already exists at the top. If not, add it after the imports:

```typescript
jest.mock('node:fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
  unlink: jest.fn().mockResolvedValue(undefined),
}));
```

Then add `vehicleDocument` to `mockPrisma` (after the `vehiclePhoto` block):

```typescript
vehicleDocument: {
  create: jest.fn().mockResolvedValue({
    id: 'doc-1',
    vehicleId: 'v-1',
    url: '/static/v-1/docs/abc.pdf',
    filename: 'abc.pdf',
    originalName: 'test.pdf',
    mimeType: 'application/pdf',
    size: 1024,
    uploadedById: 'user-1',
    createdAt: new Date(),
  }),
  findFirst: jest.fn(),
  delete: jest.fn().mockResolvedValue({}),
},
```

Also add this constant near `mockVehicle`:

```typescript
const mockFile: Express.Multer.File = {
  fieldname: 'file',
  originalname: 'test.pdf',
  encoding: '7bit',
  mimetype: 'application/pdf',
  size: 1024,
  buffer: Buffer.from('fake-content'),
  stream: null as any,
  destination: '',
  filename: '',
  path: '',
};
```

- [ ] **Step 2: Write failing tests for addDocument**

At the end of `vehicles.service.spec.ts`, inside the `describe('VehiclesService', ...)` block, add:

```typescript
describe('addDocument', () => {
  it('throws NotFoundException when vehicle not found', async () => {
    mockPrisma.vehicle.findUnique.mockResolvedValueOnce(null);
    await expect(service.addDocument('missing', mockFile, 'user-1')).rejects.toThrow(NotFoundException);
  });

  it('creates a VehicleDocument record and returns it', async () => {
    mockPrisma.vehicle.findUnique.mockResolvedValueOnce(mockVehicle);
    const result = await service.addDocument('v-1', mockFile, 'user-1');
    expect(result.id).toBe('doc-1');
    expect(mockPrisma.vehicleDocument.create).toHaveBeenCalled();
  });
});

describe('deleteDocument', () => {
  it('throws NotFoundException when document not found', async () => {
    mockPrisma.vehicleDocument.findFirst.mockResolvedValueOnce(null);
    await expect(service.deleteDocument('doc-missing', 'v-1')).rejects.toThrow(NotFoundException);
  });

  it('deletes the document record and returns message', async () => {
    mockPrisma.vehicleDocument.findFirst.mockResolvedValueOnce({
      id: 'doc-1', vehicleId: 'v-1', filename: 'abc.pdf',
    });
    const result = await service.deleteDocument('doc-1', 'v-1');
    expect(result).toEqual({ message: 'Document deleted' });
    expect(mockPrisma.vehicleDocument.delete).toHaveBeenCalledWith({ where: { id: 'doc-1' } });
  });
});
```

- [ ] **Step 3: Run tests to confirm they fail**

```bash
cd apps/api && npx jest vehicles.service.spec.ts --no-coverage 2>&1 | tail -20
```

Expected: failures mentioning `addDocument is not a function` or similar.

- [ ] **Step 4: Add addDocument and deleteDocument to VehiclesService**

In `apps/api/src/vehicles/vehicles.service.ts`, add these two methods and a private helper **before** the existing `serialize` method (around line 264):

```typescript
async addDocument(vehicleId: string, file: Express.Multer.File, userId: string) {
  const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle) throw new NotFoundException(`Vehicle ${vehicleId} not found`);

  const ext = path.extname(file.originalname).toLowerCase() || this.mimeToExt(file.mimetype);
  const filename = `${crypto.randomUUID()}${ext}`;
  const dir = path.join(UPLOAD_BASE, vehicleId, 'docs');
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, filename), file.buffer);

  return this.prisma.vehicleDocument.create({
    data: {
      vehicleId,
      url: `/static/${vehicleId}/docs/${filename}`,
      filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      uploadedById: userId,
    },
  });
}

async deleteDocument(documentId: string, vehicleId: string) {
  const doc = await this.prisma.vehicleDocument.findFirst({
    where: { id: documentId, vehicleId },
  });
  if (!doc) throw new NotFoundException('Document not found');

  const filePath = path.join(UPLOAD_BASE, vehicleId, 'docs', doc.filename);
  await fs.unlink(filePath).catch(() => null);
  await this.prisma.vehicleDocument.delete({ where: { id: documentId } });
  return { message: 'Document deleted' };
}

private mimeToExt(mime: string): string {
  const map: Record<string, string> = {
    'application/pdf': '.pdf',
    'image/jpeg': '.jpg',
    'image/png': '.png',
  };
  return map[mime] ?? '';
}
```

- [ ] **Step 5: Extend findOne to include documents**

In `vehicles.service.ts`, find the `findOne` method. Inside the `prisma.vehicle.findUnique` `include` object (around line 82), add the `documents` line:

```typescript
include: {
  photos: { orderBy: { createdAt: 'asc' } },
  documents: { orderBy: { createdAt: 'desc' } },   // ← add this line
  registeredBy: { select: { name: true } },
  history: {
    orderBy: { createdAt: 'desc' },
    include: { performedBy: { select: { name: true } } },
  },
  sale: {
    select: {
      id: true,
      dateSold: true,
      buyerName: true,
      sellingPrice: true,
      modeOfSale: true,
      isReversed: true,
    },
  },
},
```

- [ ] **Step 6: Run tests — all should pass**

```bash
cd apps/api && npx jest vehicles.service.spec.ts --no-coverage 2>&1 | tail -20
```

Expected: all tests pass, no failures.

- [ ] **Step 7: Commit**

```bash
cd apps/api
git add src/vehicles/vehicles.service.ts src/vehicles/vehicles.service.spec.ts
git commit -m "feat(vehicles): add addDocument, deleteDocument service methods; extend findOne"
```

---

## Task 3: VehiclesController — Document Endpoints

**Files:**
- Modify: `apps/api/src/vehicles/vehicles.controller.ts`

- [ ] **Step 1: Add the document upload interceptor constant**

In `apps/api/src/vehicles/vehicles.controller.ts`, after the existing `photoUploadInterceptor` constant (around line 34), add:

```typescript
const documentUploadInterceptor = FileInterceptor('file', {
  storage: memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^(application\/pdf|image\/(jpeg|png))$/.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, JPG, and PNG files are allowed'), false);
    }
  },
});
```

- [ ] **Step 2: Add the two document endpoints**

After the `deletePhoto` endpoint (around line 104), add:

```typescript
@Post(':id/documents')
@ApiOperation({ summary: 'Upload a paper document for a vehicle (PDF/JPG/PNG, max 10 MB)' })
@ApiConsumes('multipart/form-data')
@UseInterceptors(documentUploadInterceptor)
addDocument(
  @Param('id') id: string,
  @UploadedFile() file: Express.Multer.File,
  @CurrentUser() user: AuthUser,
) {
  return this.vehicles.addDocument(id, file, user.id);
}

@Delete(':vehicleId/documents/:documentId')
@ApiOperation({ summary: 'Delete a vehicle paper document' })
deleteDocument(
  @Param('vehicleId') vehicleId: string,
  @Param('documentId') documentId: string,
) {
  return this.vehicles.deleteDocument(documentId, vehicleId);
}
```

- [ ] **Step 3: Start the API and verify the endpoints appear in Swagger**

```powershell
taskkill /F /IM node.exe
npm run dev
```

Open http://localhost:3001/api/docs and confirm:
- `POST /vehicles/{id}/documents` appears under Vehicles
- `DELETE /vehicles/{vehicleId}/documents/{documentId}` appears under Vehicles

Stop the server (`Ctrl+C`).

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/vehicles/vehicles.controller.ts
git commit -m "feat(vehicles): add document upload and delete endpoints"
```

---

## Task 4: api-client.ts — Types and Upload Helpers

**Files:**
- Modify: `apps/web/lib/api-client.ts`

- [ ] **Step 1: Add the VehicleDocument interface**

In `apps/web/lib/api-client.ts`, after the `VehicleHistoryEntry` interface (around line 113), add:

```typescript
export interface VehicleDocument {
  id: string;
  vehicleId: string;
  url: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
}
```

- [ ] **Step 2: Add documents field to the Vehicle interface**

In the `Vehicle` interface (around line 101), add after the `history?` line:

```typescript
documents?: VehicleDocument[];
```

- [ ] **Step 3: Add the apiUpload helper function**

After the `apiRequest` function (around line 47), add:

```typescript
async function apiUpload<T>(path: string, token: string, formData: FormData): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
    credentials: 'include',
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new ApiError(res.status, errorBody);
  }
  return res.json() as Promise<T>;
}
```

Note: do **not** set `Content-Type` — the browser sets it automatically with the multipart boundary.

- [ ] **Step 4: Add photo and document methods to vehiclesApi**

In the `vehiclesApi` object (around line 224), add after the `update` method:

```typescript
uploadPhoto: (token: string, vehicleId: string, file: File) => {
  const fd = new FormData();
  fd.append('photo', file);
  return apiUpload<{ id: string; url: string; isCover: boolean }>(
    `/vehicles/${vehicleId}/photos?cover=true`,
    token,
    fd,
  );
},

deletePhoto: (token: string, vehicleId: string, photoId: string) =>
  apiRequest<{ message: string }>(`/vehicles/${vehicleId}/photos/${photoId}`, {
    method: 'DELETE',
    token,
  }),

uploadDocument: (token: string, vehicleId: string, file: File) => {
  const fd = new FormData();
  fd.append('file', file);
  return apiUpload<VehicleDocument>(`/vehicles/${vehicleId}/documents`, token, fd);
},

deleteDocument: (token: string, vehicleId: string, documentId: string) =>
  apiRequest<{ message: string }>(`/vehicles/${vehicleId}/documents/${documentId}`, {
    method: 'DELETE',
    token,
  }),
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/api-client.ts
git commit -m "feat(api-client): add VehicleDocument type, upload helpers, photo/document methods"
```

---

## Task 5: VehiclePhoto Component

**Files:**
- Create: `apps/web/components/vehicles/VehiclePhoto.tsx`

- [ ] **Step 1: Create the component file**

Create `apps/web/components/vehicles/VehiclePhoto.tsx` with the following content:

```typescript
'use client';

import { useRef, useState } from 'react';
import { vehiclesApi } from '@/lib/api-client';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

interface Photo {
  id: string;
  url: string;
}

interface Props {
  vehicleId: string;
  initialPhoto: Photo | null;
  token: string;
}

const API_HOST = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1').replace('/api/v1', '');

export function VehiclePhoto({ vehicleId, initialPhoto, token }: Props) {
  const [photo, setPhoto] = useState<Photo | null>(initialPhoto);
  const [uploading, setUploading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const uploadRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const newPhoto = await vehiclesApi.uploadPhoto(token, vehicleId, file);
      setPhoto(newPhoto);
    } finally {
      setUploading(false);
    }
  }

  async function handleReplace(file: File) {
    if (!photo) return;
    setUploading(true);
    try {
      const newPhoto = await vehiclesApi.uploadPhoto(token, vehicleId, file);
      await vehiclesApi.deletePhoto(token, vehicleId, photo.id);
      setPhoto(newPhoto);
    } finally {
      setUploading(false);
      if (replaceRef.current) replaceRef.current.value = '';
    }
  }

  async function handleDelete() {
    if (!photo) return;
    setUploading(true);
    try {
      await vehiclesApi.deletePhoto(token, vehicleId, photo.id);
      setPhoto(null);
    } finally {
      setUploading(false);
      setShowConfirm(false);
    }
  }

  const containerStyle: React.CSSProperties = {
    background: 'var(--color-bg-elevated)',
    borderRadius: '8px',
    height: '220px',
    overflow: 'hidden',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  if (!photo) {
    return (
      <>
        <div
          style={{
            ...containerStyle,
            flexDirection: 'column',
            gap: '10px',
            border: '2px dashed var(--color-border)',
          }}
        >
          <span style={{ fontSize: '48px', opacity: 0.35 }}>🚗</span>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', margin: 0 }}>No vehicle photo</p>
          <button
            onClick={() => uploadRef.current?.click()}
            disabled={uploading}
            style={{
              background: uploading ? 'var(--color-bg-elevated)' : '#ef4444',
              color: '#fff',
              border: 'none',
              padding: '7px 18px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: uploading ? 'default' : 'pointer',
            }}
          >
            {uploading ? 'Uploading…' : '+ Upload Photo'}
          </button>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '11px', margin: 0 }}>
            JPG · PNG · max 5 MB
          </p>
        </div>
        <input
          ref={uploadRef}
          type="file"
          accept="image/jpeg,image/png"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleUpload(f);
            e.target.value = '';
          }}
        />
      </>
    );
  }

  return (
    <>
      <div style={containerStyle}>
        <img
          src={`${API_HOST}${photo.url}`}
          alt="Vehicle"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 6 }}>
          <button
            onClick={() => replaceRef.current?.click()}
            disabled={uploading}
            style={{
              background: 'rgba(15,23,42,0.8)',
              color: '#cbd5e0',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '5px',
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ✏️ Replace
          </button>
          <button
            onClick={() => setShowConfirm(true)}
            disabled={uploading}
            style={{
              background: 'rgba(185,28,28,0.85)',
              color: '#fff',
              border: '1px solid rgba(255,100,100,0.2)',
              borderRadius: '5px',
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            🗑 Delete
          </button>
        </div>
      </div>
      <input
        ref={replaceRef}
        type="file"
        accept="image/jpeg,image/png"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleReplace(f);
          e.target.value = '';
        }}
      />
      {showConfirm && (
        <ConfirmModal
          title="Delete Photo"
          message="Remove the vehicle photo? You can upload a new one afterwards."
          confirmLabel="Delete"
          danger
          onConfirm={handleDelete}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/vehicles/VehiclePhoto.tsx
git commit -m "feat(vehicles): add VehiclePhoto component with upload/replace/delete"
```

---

## Task 6: VehicleDocuments Component

**Files:**
- Create: `apps/web/components/vehicles/VehicleDocuments.tsx`

- [ ] **Step 1: Create the component file**

Create `apps/web/components/vehicles/VehicleDocuments.tsx`:

```typescript
'use client';

import { useRef, useState } from 'react';
import { vehiclesApi, VehicleDocument } from '@/lib/api-client';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { formatDate } from '@/lib/utils';

interface Props {
  vehicleId: string;
  initialDocuments: VehicleDocument[];
  token: string;
}

const API_HOST = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1').replace('/api/v1', '');

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function docIcon(mimeType: string): string {
  return mimeType === 'application/pdf' ? '📄' : '🖼️';
}

export function VehicleDocuments({ vehicleId, initialDocuments, token }: Props) {
  const [docs, setDocs] = useState<VehicleDocument[]>(initialDocuments);
  const [uploading, setUploading] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const doc = await vehiclesApi.uploadDocument(token, vehicleId, file);
      setDocs((prev) => [doc, ...prev]);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleDelete() {
    if (!confirmId) return;
    await vehiclesApi.deleteDocument(token, vehicleId, confirmId);
    setDocs((prev) => prev.filter((d) => d.id !== confirmId));
    setConfirmId(null);
  }

  const panelStyle: React.CSSProperties = {
    background: 'var(--color-bg-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: '12px',
    overflow: 'hidden',
  };

  return (
    <>
      <div style={panelStyle}>
        <h2
          style={{
            fontSize: '14px',
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            padding: '16px 20px',
            borderBottom: '1px solid var(--color-border)',
            margin: 0,
          }}
        >
          📄 Paper Documents
        </h2>
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {docs.length === 0 && (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', margin: 0 }}>
              No documents yet
            </p>
          )}
          {docs.map((doc) => (
            <div
              key={doc.id}
              style={{
                background: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                <span style={{ fontSize: '20px', flexShrink: 0 }}>{docIcon(doc.mimeType)}</span>
                <div style={{ minWidth: 0 }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'var(--color-text-primary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {doc.originalName}
                  </p>
                  <p style={{ margin: 0, fontSize: '11px', color: 'var(--color-text-muted)' }}>
                    {formatBytes(doc.size)} · {formatDate(doc.createdAt)}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '4px', flexShrink: 0, marginLeft: 8 }}>
                <a
                  href={`${API_HOST}${doc.url}`}
                  target="_blank"
                  rel="noreferrer"
                  title="Download"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--color-text-muted)',
                    fontSize: '16px',
                    cursor: 'pointer',
                    padding: '4px 6px',
                    borderRadius: '4px',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  ⬇️
                </a>
                <button
                  onClick={() => setConfirmId(doc.id)}
                  title="Delete"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--color-text-muted)',
                    fontSize: '16px',
                    cursor: 'pointer',
                    padding: '4px 6px',
                    borderRadius: '4px',
                  }}
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{
              width: '100%',
              padding: '9px',
              border: '1.5px dashed var(--color-border)',
              background: 'transparent',
              color: uploading ? 'var(--color-text-muted)' : 'var(--color-text-secondary)',
              borderRadius: '6px',
              fontSize: '13px',
              cursor: uploading ? 'default' : 'pointer',
              marginTop: '4px',
            }}
          >
            {uploading ? 'Uploading…' : '+ Upload Document'}
          </button>
          <p style={{ margin: 0, fontSize: '11px', color: 'var(--color-text-muted)', textAlign: 'center' }}>
            PDF · JPG · PNG · max 10 MB
          </p>
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,image/jpeg,image/png"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleUpload(f);
        }}
      />
      {confirmId && (
        <ConfirmModal
          title="Delete Document"
          message="Permanently delete this document? This cannot be undone."
          confirmLabel="Delete"
          danger
          onConfirm={handleDelete}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/vehicles/VehicleDocuments.tsx
git commit -m "feat(vehicles): add VehicleDocuments component with upload/download/delete"
```

---

## Task 7: Update Vehicle Detail Page

**Files:**
- Modify: `apps/web/app/(dashboard)/vehicles/[id]/page.tsx`

- [ ] **Step 1: Update imports**

At the top of `apps/web/app/(dashboard)/vehicles/[id]/page.tsx`, add two imports after the existing import block:

```typescript
import { VehiclePhoto } from '@/components/vehicles/VehiclePhoto';
import { VehicleDocuments } from '@/components/vehicles/VehicleDocuments';
```

Remove the `selectedPhoto` state since `VehiclePhoto` manages it internally. The `useState` import stays (still used for `vehicle`, `loading`, `error`). Remove these lines:

```typescript
const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
```

And in the `useEffect`, remove the `setSelectedPhoto` call so it becomes:

```typescript
vehiclesApi.get(token, id)
  .then((v) => { setVehicle(v); })
  .catch(() => setError('Failed to load vehicle'))
  .finally(() => setLoading(false));
```

- [ ] **Step 2: Replace the photo gallery section**

Find the photo gallery block (lines 61–80 approximately):

```tsx
{/* Photo gallery */}
<div style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '16px' }}>
  <div style={{ background: 'var(--color-bg-elevated)', borderRadius: '8px', height: '220px', ... }}>
    ...
  </div>
  {(vehicle.photos?.length ?? 0) > 1 && (
    ...thumbnails...
  )}
</div>
```

Replace the entire block with:

```tsx
{/* Photo */}
<div style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '16px' }}>
  <VehiclePhoto
    vehicleId={vehicle.id}
    initialPhoto={
      (() => {
        const p = vehicle.photos?.find((ph) => ph.isCover) ?? vehicle.photos?.[0] ?? null;
        return p ? { id: p.id, url: p.url } : null;
      })()
    }
    token={token}
  />
</div>
```

- [ ] **Step 3: Replace the right column with the split layout**

Find the right column block (lines 116–143 approximately):

```tsx
{/* Right column — history timeline */}
<div style={{ background: 'var(--color-bg-surface)', ... }}>
  <h2 ...>Vehicle History</h2>
  ...timeline...
</div>
```

Replace the entire right column `<div>` with:

```tsx
{/* Right column — history + documents */}
<div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
  {/* Vehicle History */}
  <div style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '20px' }}>
    <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '16px' }}>Vehicle History</h2>
    {(vehicle.history?.length ?? 0) === 0 ? (
      <p style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>No history yet</p>
    ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
        {vehicle.history!.map((entry, i) => (
          <div key={entry.id} style={{ display: 'flex', gap: '12px', position: 'relative', paddingBottom: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                {EVENT_ICONS[entry.event] ?? '•'}
              </div>
              {i < vehicle.history!.length - 1 && (
                <div style={{ width: 1, flex: 1, background: 'var(--color-border)', marginTop: 4 }} />
              )}
            </div>
            <div style={{ paddingTop: '4px' }}>
              <p style={{ fontSize: '13px', color: 'var(--color-text-primary)', fontWeight: 500 }}>{entry.description}</p>
              <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '3px' }}>
                {formatDate(entry.createdAt)} · {entry.performedBy?.name}
              </p>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>

  {/* Paper Documents */}
  <VehicleDocuments
    vehicleId={vehicle.id}
    initialDocuments={vehicle.documents ?? []}
    token={token}
  />
</div>
```

- [ ] **Step 4: Start the full stack and test manually**

```powershell
taskkill /F /IM node.exe
npm run dev
```

Open http://localhost:3000 and log in (`admin@zextjv.com` / `Admin@1234`). Navigate to Inventory → any vehicle. Verify:

1. Photo zone shows the dashed placeholder with "Upload Photo" button (or the existing photo if one was seeded)
2. Upload a JPG/PNG → confirm the image appears, button disappears, Replace + Delete buttons are visible top-right
3. Click Replace → pick a new file → old photo swapped
4. Click Delete → ConfirmModal appears → confirm → photo zone resets to placeholder
5. Right column has two panels: Vehicle History (top) and Paper Documents (bottom)
6. Click "+ Upload Document" → upload a PDF → row appears with name, size, date, download + delete icons
7. Click ⬇️ → document opens in new tab
8. Click 🗑 → ConfirmModal → confirm → row removed

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/"(dashboard)"/vehicles/"[id]"/page.tsx
git commit -m "feat(vehicles): wire VehiclePhoto and VehicleDocuments into detail page"
```

---

## Self-Review Checklist

- [x] Spec: photo upload/replace/delete — covered by Tasks 1–5, 7
- [x] Spec: replace POSTs first then DELETEs old — implemented in `handleReplace`
- [x] Spec: VehicleDocument Prisma model — Task 1
- [x] Spec: `POST /vehicles/:id/documents`, `DELETE /vehicles/:vehicleId/documents/:documentId` — Task 3
- [x] Spec: `GET /vehicles/:id` extends to include documents — Task 2 Step 5
- [x] Spec: right column split into history + documents — Task 7
- [x] Spec: download as anchor to static URL — `VehicleDocuments` uses `<a href={API_HOST + doc.url}>`
- [x] Spec: PDF · JPG · PNG accepted, max 10 MB — document interceptor in Task 3
- [x] Type consistency: `VehicleDocument` interface used consistently in api-client, VehicleDocuments component, and Vehicle interface
- [x] `vehiclesApi.uploadPhoto / deletePhoto / uploadDocument / deleteDocument` — defined in Task 4 and consumed in Tasks 5–6
