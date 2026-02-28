# Reliability & Error Handling Checklist — Sprint #2

> No new features. Focus: consistent errors, user-friendly messages, validation consistency, bulk robustness.

---

## 1. What Was Done

### 1.1 Consistent Error Pattern (`lib/errors.ts`)
- **AppError** class with `code`, `message`, optional `details` (logs only).
- **Error codes**: `NOT_AUTHENTICATED`, `NOT_AUTHORIZED`, `VALIDATION_ERROR`, `DB_ERROR`.
- **getFriendlyMessage(err)**:
  - `NOT_AUTHENTICATED` → "Session expired. Please log in again."
  - `NOT_AUTHORIZED` → "You don't have permission to do that."
  - Otherwise uses `AppError.message` or `Error.message`; never exposes stack or `details`.

### 1.2 Auth Throwing AppError
- `lib/auth.ts`: `requireUser()` / `requireAdmin()` / `requireOwnerOrAdmin()` throw `AppError(NOT_AUTHENTICATED)` or `AppError(NOT_AUTHORIZED)` instead of generic `Error`.

### 1.3 Server Actions Use AppError
- **Cats**: createCat, updateCat, bulkUpdateCats, acceptSuggestedStatus — validation and DB errors throw `AppError(VALIDATION_ERROR)` or `AppError(DB_ERROR)`.
- **Activity**: getMonthActivitySummary, getDayActivities, setVisitStatus, addActivityForm, deleteActivity, deleteActivities — same pattern.
- **Logs**: addHealthLog, bulkAddHealthLog, addWeightLog, addGroomingLog, updateGroomingLog, bulkSetGroomingDate, setNextDueDate, bulkSetNextDueDate, bulkSetLastPreventiveDate, updateHealthLogDate — all throw AppError where applicable.
- **Inventory**: adjustInventoryStock, createInventoryCategory, deleteInventoryCategory, createInventoryItem, deleteInventoryItem — same.
- **Breeds**: createBreed, updateBreed, deleteBreed — DB errors as AppError.

### 1.4 UI Error Display
- **Activity**: ActivityDayPanel shows inline error and bulk delete report ("X succeeded, Y failed" with copyable failed IDs). AddActivityDialog and ActivityContent use getFriendlyMessage.
- **Cats**: CatsTable bulk form shows bulkError; EditCatForm uses updateCatWithState which returns getFriendlyMessage in state.
- **Inventory**: InventoryContent uses useFormState with *WithState actions; each form shows state.error.
- **Health**: SetNextDueDialog, SetLastDateDialog show inline error on failure.
- **Breeds**: BreedsTable and EditBreedDialog show inline error.
- No raw stack traces or technical messages are shown to the user.

### 1.5 Centralized Validation (Zod Schemas)
- **lib/schemas/cat.ts**: createCatSchema, updateCatSchema, bulkUpdateCatsSchema, acceptSuggestedStatusSchema (status/location enums).
- **lib/schemas/activity.ts**: addActivitySchema, visitStatusSchema, deleteActivitySchema, deleteActivitiesSchema (date, time_slots, locations, categories, ids).
- **lib/schemas/inventory.ts**: inventoryMovementSchema (item_id, delta, reason, date).
- **lib/schemas/parse.ts**: parseWithAppError(schema, data) for use in actions; formDataToObject helper.
- Server actions still use existing getString/validate helpers; schemas are in place for gradual migration or strict validation where needed.

### 1.6 Bulk Actions Robustness
- **deleteActivities(ids)**:
  - Validates max length (BULK_MAX_IDS), non-empty array, all elements non-empty strings.
  - Per-id try/catch; returns **{ successCount, failed: { id, reason }[] }**.
  - UI shows "X berhasil dihapus, Y gagal" and a copyable list of failed IDs.

### 1.7 Inventory Form State
- **WithState** wrappers: createInventoryCategoryWithState, deleteInventoryCategoryWithState, createInventoryItemWithState, deleteInventoryItemWithState, adjustInventoryStockWithState.
- Each returns `{ error: string | null }`; forms use useFormState and display state.error. Refresh after success via useEffect when state transitions from error to null.

---

## 2. Files Changed

| File | Change |
|------|--------|
| **lib/errors.ts** | New: AppError, ErrorCode, getFriendlyMessage, isAppError |
| **lib/schemas/cat.ts** | New: Zod schemas for cat create/update/bulk/acceptSuggestedStatus |
| **lib/schemas/activity.ts** | New: Zod schemas for activity add, visit status, delete(s) |
| **lib/schemas/inventory.ts** | New: Zod schema for inventory movement |
| **lib/schemas/parse.ts** | New: parseWithAppError, formDataToObject |
| **lib/auth.ts** | requireUser/requireAdmin/requireOwnerOrAdmin throw AppError |
| **app/actions/cats.ts** | AppError + getFriendlyMessage in updateCatWithState |
| **app/actions/activity.ts** | AppError; deleteActivities returns { successCount, failed } |
| **app/actions/logs.ts** | All throws → AppError(DB_ERROR or VALIDATION_ERROR) |
| **app/actions/inventory.ts** | AppError; *WithState wrappers for form error state |
| **app/actions/breeds.ts** | AppError for DB errors |
| **app/(app)/inventory/page.tsx** | Uses InventoryContent client component |
| **components/inventory/inventory-content.tsx** | New: client forms with useFormState + error display |
| **components/activity/activity-day-panel.tsx** | Error state, bulk result ("X succeeded, Y failed"), getFriendlyMessage |
| **components/activity/add-activity-dialog.tsx** | getFriendlyMessage in catch |
| **components/activity/activity-content.tsx** | loadError state, getFriendlyMessage for loadMonth/loadDay |
| **components/cats/cats-table.tsx** | bulkError state, getFriendlyMessage for bulk submit |
| **components/health/set-next-due-dialog.tsx** | Error state, getFriendlyMessage |
| **components/health/set-last-date-dialog.tsx** | Error state, getFriendlyMessage |
| **components/cats/breeds-table.tsx** | Error state, getFriendlyMessage for create/update/delete |
| **RELIABILITY_CHECKLIST.md** | This file |

---

## 3. Manual Verification Steps

### 3.1 Unauthenticated → friendly message
1. Sign out or use an incognito window.
2. Trigger any server action (e.g. try to add a cat, or open a page that calls getMonthActivitySummary).
3. **Expect**: "Session expired. Please log in again." or redirect to login; no raw "Not authenticated" or stack.

### 3.2 Owner mutation → friendly message
1. Log in as **owner**.
2. Try to create a cat, update a cat, or run any admin-only action.
3. **Expect**: "You don't have permission to do that." (or equivalent); no raw "Not authorized".

### 3.3 Invalid enum → friendly validation message
1. As admin, submit a form with an invalid status/location/type (e.g. cat status "invalid", or health type "INVALID").
2. **Expect**: Clear message such as "Status harus salah satu: Baik, Kurang Baik, Sakit." or "Tipe log kesehatan tidak valid."; no stack trace.

### 3.4 Bulk delete partial failure → report
1. As admin, go to Activity, select a day with activities.
2. Select several activities and delete (or trigger delete for a mix of valid and invalid IDs if you can simulate).
3. **Expect**: Message like "X berhasil dihapus, Y gagal" and a copyable list of failed IDs when some fail.

### 3.5 General error display
1. Cause a DB error (e.g. duplicate cat_id, or disconnect DB).
2. **Expect**: Single-line user-friendly message in the UI (e.g. "Cat ID sudah dipakai. Pilih ID lain."); no stack or internal details.

---

## 4. How to Verify Quickly

1. **Build**: `npm run build` — must pass.
2. **Lint**: `npm run lint` — no new errors.
3. Run the 4 manual cases above (unauthenticated, owner mutation, invalid enum, bulk delete report).
4. Spot-check one form per area (e.g. add activity, add cat, adjust inventory, add breed) and confirm errors show as a short inline message.

---

## 5. Remaining / Optional

- **Zod in actions**: Schemas are defined; not all actions parse FormData through Zod yet. You can gradually replace ad-hoc validation with `parseWithAppError(schema, object)`.
- **Health table bulk actions**: Same pattern as activity: add try/catch and getFriendlyMessage in the component that calls bulkSetNextDueDate / bulkSetLastPreventiveDate if not already covered.
- **Grooming / cat detail forms**: Any remaining `action={...}` forms without useFormState can be wrapped with *WithState + useFormState or onSubmit + try/catch + setError for consistency.
