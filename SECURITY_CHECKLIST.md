# Security Checklist — Sprint #1 Hardening

> Internal tool, max 5 users. Roles: **admin** (full), **owner** (read-only, own cats).

---

## 1. What Was Fixed

### 1.1 Environment Validation (`lib/env.ts`)
- **Eager validation**: env vars are now validated at module load (not lazily on first access). The app refuses to start if `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` is missing.
- **Service role key guard**: if `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` is set, the app throws immediately. The service role key must never be exposed in the client bundle.

### 1.2 Centralized Auth Guards (`lib/auth.ts`)
- Consolidated `requireAdmin()` from separate `lib/action-auth.ts` into `lib/auth.ts`.
- Added `requireUser()` — throws if caller is not authenticated.
- Added `requireOwnerOrAdmin(catId)` — allows admin unconditionally, or owner only for their own cat.
- Deleted `lib/action-auth.ts` to eliminate duplicated auth logic.
- All 5 server action files updated to import from `lib/auth.ts`.

### 1.3 Redirect Security (`lib/validation.ts`)
- `isSafeRedirectPath()` now rejects:
  - Paths not starting with `/`
  - Paths starting with `//` (protocol-relative)
  - Paths containing `http:` or `https:` **anywhere** in the string (not just at start)
  - Paths containing backslash `\` (browser normalisation attack vector)
  - Paths containing null bytes `\0`
- Login page already uses this function; middleware sets `redirectTo` from a trusted source (pathname).

### 1.4 Strict Enum & Input Validation
- Added `VaccineType` enum (`F3 | F4 | RABIES`) to `lib/constants.ts`.
- `getJsonStringArray()` now **throws** if any array element is not a string (previously silently filtered).
- `addActivityForm()` now **throws** on any invalid time slot, location, or category value (previously silently filtered invalid values from arrays).
- `setVisitStatus()` now validates the `date` parameter format and that `visited` is a boolean.
- `deleteActivity()` now validates the `id` parameter is a non-empty string.
- `deleteActivities()` now throws on empty array, validates all elements, enforces `BULK_MAX_IDS` limit.

### 1.5 Silent Failure Cleanup
- `getMonthActivitySummary()` now calls `requireUser()` and throws if not authenticated (previously returned `[]`).
- `getDayActivities()` now calls `requireUser()` and throws if not authenticated (previously returned empty data).
- `getMonthActivitySummary()` now validates `year`/`month` parameters (integer bounds check).
- `getDayActivities()` now validates `date` parameter format.
- Query errors in `getMonthActivitySummary()` now throw instead of returning fallback empty data.
- `deleteActivities()` now throws on empty `ids` array instead of returning silently.

### 1.6 URL & File Validation
- `isValidPhotoUrl()` enforces HTTPS-only (rejects `http:`, `data:`, `file:`, `javascript:`, etc.).
- Photo upload in `updateCat()` already validates file size (5MB max) and MIME type server-side.
- Constants for photo validation (`PHOTO_MAX_BYTES`, `PHOTO_ALLOWED_MIME_TYPES`) are centralized in `lib/constants.ts`.

### 1.7 RLS Hardening
- Full audit of all 11 tables confirmed RLS is enabled on every table.
- Policy model verified: admin gets full access, owner gets SELECT only (scoped to own data).
- No missing or weak policies found.
- Created `supabase/migrations/20250226300000_rls_hardening_audit.sql` with verification documentation.

---

## 2. What Was Tightened

| Area | Before | After |
|------|--------|-------|
| Env validation | Lazy (on first access) | Eager (at module load) |
| Service role key | No guard | Throws if `NEXT_PUBLIC_` prefixed |
| Auth guard location | Split across 2 files | Single `lib/auth.ts` |
| Auth guard functions | `requireAdmin()` only | `requireUser()`, `requireAdmin()`, `requireOwnerOrAdmin()` |
| Redirect validation | Protocol check at start only | Protocol check anywhere, + backslash, + null byte |
| Array input validation | Silent filtering of invalid values | Explicit throw on any invalid value |
| Read-action auth | Silent empty return if unauthenticated | Throws `"Not authenticated."` |
| Date/id parameter validation | None on direct params | Validated format and type |
| Bulk action: empty array | Silent return | Throws error |

---

## 3. Manual Verification Steps

### 3.1 As Admin

1. **Login**: Sign in with admin credentials → should redirect to `/dashboard`.
2. **Create cat**: Go to Cats → Add cat → should succeed.
3. **Update cat**: Edit a cat's status/location → should succeed.
4. **Bulk update**: Select multiple cats → bulk change status → should succeed.
5. **Add health log**: Go to a cat detail → add health log → should succeed.
6. **Inventory**: Add/adjust/delete inventory items → should all succeed.
7. **Activity**: Add daily activity → set visit status → delete activity → should all succeed.
8. **Breeds**: Create/update/delete breed → should all succeed.

### 3.2 As Owner

1. **Login**: Sign in with owner credentials → should redirect to `/dashboard`.
2. **View own cats**: Should see only cats assigned to this owner.
3. **View other cats**: Should NOT see cats belonging to other owners.
4. **Mutation attempts**: Any create/update/delete action should fail with "Not authorized."
5. **Health logs**: Should only see health logs for own cats.
6. **Inventory**: Should be able to view (read-only) inventory items.
7. **Activity calendar**: Should be able to view (read-only).

### 3.3 Unauthenticated

1. **Direct URL access**: Navigate to `/dashboard` without login → should redirect to `/login`.
2. **Server action call**: Calling any server action without session → should throw "Not authenticated."

### 3.4 Redirect Security

1. **Normal redirect**: `/login?redirectTo=/cats` → after login, should go to `/cats`.
2. **Protocol injection**: `/login?redirectTo=https://evil.com` → after login, should go to `/dashboard`.
3. **Protocol-relative**: `/login?redirectTo=//evil.com` → after login, should go to `/dashboard`.
4. **Backslash**: `/login?redirectTo=/\evil.com` → after login, should go to `/dashboard`.
5. **Embedded protocol**: `/login?redirectTo=/foo?next=https://evil.com` → after login, should go to `/dashboard`.

### 3.5 Input Validation

1. **Invalid enum**: Submit a cat status like "invalid_status" → should get explicit error message.
2. **Invalid array element**: Send a time_slots array with an invalid value → should throw with the invalid value named.
3. **Empty bulk action**: Attempt bulk delete with empty array → should get error.

### 3.6 RLS Verification (SQL Editor)

```sql
-- Verify all tables have RLS enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- List all policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

---

## 4. Files Changed

| File | Change |
|------|--------|
| `lib/env.ts` | Eager validation + service role key exposure guard |
| `lib/auth.ts` | Added `requireUser()`, `requireAdmin()`, `requireOwnerOrAdmin()` |
| `lib/action-auth.ts` | **Deleted** (merged into `lib/auth.ts`) |
| `lib/constants.ts` | Added `VACCINE_TYPES` enum |
| `lib/validation.ts` | Hardened `isSafeRedirectPath()`, fixed `getJsonStringArray()` silent filter |
| `app/actions/activity.ts` | Auth guards, input validation, silent failure fixes |
| `app/actions/cats.ts` | Updated import path |
| `app/actions/logs.ts` | Updated import path |
| `app/actions/inventory.ts` | Updated import path |
| `app/actions/breeds.ts` | Updated import path |
| `supabase/migrations/20250226300000_rls_hardening_audit.sql` | RLS audit + verification queries |
| `SECURITY_CHECKLIST.md` | This document |

---

## 5. Remaining Risks / Considerations

1. **No rate limiting**: Server actions have no rate limiting. For 5 internal users this is low risk, but if exposed to the internet, consider adding rate limiting middleware.

2. **No CSRF token**: Next.js Server Actions include built-in CSRF protection via the `Origin` header check, but this relies on the framework version. Verify your Next.js version includes this.

3. **Session management**: Sessions are managed by Supabase Auth. Token expiry and refresh are handled by the middleware cookie flow. Consider setting short JWT expiry times in Supabase dashboard.

4. **Audit logging**: There is no audit trail for admin mutations. For an internal tool with 5 users this is acceptable, but consider adding `created_by`/`updated_by` columns if accountability is needed.

5. **Profile management**: The `profiles` table has no INSERT/UPDATE/DELETE RLS policies. This is intentional — profiles should only be managed via Supabase Auth hooks or service role. Ensure no server action writes to the profiles table.

6. **Photo URL trust**: `isValidPhotoUrl()` enforces HTTPS-only. Photo URLs from Supabase Storage are trusted (generated server-side). Externally-provided URLs are validated but not fetched/scanned.

7. **Service role key**: No code uses the service role key. Ensure it is never added with a `NEXT_PUBLIC_` prefix (the env guard will catch this at startup).

8. **Database constraints**: The database has CHECK constraints on `cats.status`, `cats.location`, `daily_activities.activity_type`, `daily_activities.time_slots`, and `daily_activities.locations`. These provide a second layer of validation after the application layer.
