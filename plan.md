# Pue Link MVP Plan

## 0. MVP Scope

Build a demo web app for a bracelet-triggered memory/video playback flow. For MVP, NFC is replaced by barcode/QR code scanning.

Core actors:
- Super admin: manages demo families, public place accounts, device accounts, and locations.
- Family member: uploads and manages videos per location slot, sees playback history, and receives refresh notifications.
- Device account: only displays a barcode/QR code to emulate the NFC bracelet.
- Public place account: runs the public machine/kiosk screen, scans the device barcode, selects the next video for that place, and plays it.

Target stack:
- Astro JS deployed as Cloudflare Worker via `@astrojs/cloudflare`.
- React islands for interactive screens.
- Tailwind CSS + shadcn/ui for UI.
- Better Auth with simple email/password login.
- Cloudflare D1 for metadata, users, locations, video slots, playback logs, and notification subscriptions.
- Cloudflare R2 for uploaded video files.
- OneSignal free plan for web push notification.

MVP constraint:
- No real NFC integration.
- No native mobile app.
- Authentication uses Better Auth email/password for all demo roles.
- Role-based access is required for the 4 MVP account types.
- Only 3 video slots per location.
- Default overuse threshold is 5 playbacks unless configured per location/video.

## 0.1 Minimalist UI Direction

Use the reference image as the visual target: clean, white, compact, and dashboard-first.

Design principles:
- Use a white and near-white background with thin neutral borders and subtle shadows.
- Use one restrained purple accent for primary actions, active navigation, focus rings, and small status highlights.
- Keep cards compact with 8px radius or less, generous internal spacing, and no nested card layouts.
- Prefer dense operational screens over marketing layouts: sidebar navigation, compact header, summary metrics, tables, slot grids, and clear form panels.
- Avoid decorative gradients, oversized hero sections, heavy illustrations, and large rounded pill-heavy components.
- Login can use a split layout similar to the reference: compact login form on the left, one warm family/video preview image panel on the right.
- Use lucide icons for navigation/actions and keep labels short.
- Use Indonesian UI copy for user-facing demo screens.
- Make every major screen responsive, but optimize desktop/tablet for dashboard and kiosk workflows.

## 1. Domain Rules

### 1.0 Account Types And Access Model

MVP uses 4 account types:

`super_admin`
- Can create and manage families.
- Can create and manage locations/public places.
- Can create device accounts for bracelet barcode emulation.
- Can create public place accounts for machine/kiosk login.
- Can inspect all playback logs for demo support.

`family_member`
- Belongs to one family.
- Can upload and replace videos for that family's slots.
- Can see playback counts, recommendations, and calendar history for their family.
- Can subscribe to web push notification.

`device`
- Belongs to one family.
- Represents one bracelet.
- Can only access a locked-down page that displays its barcode/QR code.
- Cannot upload videos, view calendar, or view private dashboard data.

`public_place`
- Belongs to one location/public place.
- Can only access scanner/playback kiosk pages for that location.
- Scans a device barcode/QR code.
- Cannot see family dashboard data.

Checkpoint:
- Logging in as each role lands on a different role-specific screen.
- Device account only shows barcode/QR and logout.
- Public place account can scan a device barcode and play a video, but cannot upload or manage videos.
- Family member cannot access super admin pages.
- Super admin can prepare all demo accounts without direct database edits.

### 1.0A Login Users And Seed Credentials

All roles log in from the same `/login` page using Better Auth simple email/password.

Seed users for local/demo:
- Super admin: `admin@puelink.test` / `password123`
- Family member: `family@puelink.test` / `password123`
- Device account: `device-oma@puelink.test` / `password123`
- Public place Minimarket: `minimarket@puelink.test` / `password123`
- Public place Taman: `taman@puelink.test` / `password123`

Login behavior:
- The login page shows a compact "Login sebagai" selector or quick-fill buttons for demo roles.
- Selecting a role only fills email/password for demo speed; authorization still comes from the authenticated user's role in D1.
- After Better Auth creates a session, app middleware loads the matching role profile and redirects to the correct default route.
- Disabled users cannot log in even if Better Auth credentials are valid.

Checkpoint:
- One login form signs in all 4 role types with email/password.
- Demo quick-fill buttons do not bypass password validation.
- Role is never trusted from form input; it is read from the stored app profile.

### 1.1 Location Video Slots

Each family-location pair has exactly 3 active slots:
- Slot 1
- Slot 2
- Slot 3

Each slot can hold zero or one active video.

Checkpoint:
- A location detail page always renders 3 slot positions.
- Empty slots clearly allow upload.
- Filled slots show title, preview metadata, playback count, and refresh status.

### 1.2 Playback Selection

When a public place machine scans a device barcode/QR:
1. Resolve the logged-in public place account to a location.
2. Resolve the scanned barcode token to a device account.
3. Resolve the device account to a family.
4. Load all active videos for that family at that location.
2. Exclude empty slots.
3. Pick the video with the lowest playback count.
4. If multiple videos have the same lowest count, pick the one least recently played.
5. If still tied, pick the oldest uploaded video.
6. Increment playback count after playback is started.
7. Write a playback log with video, location, device, public place account, machine, and timestamp.

Checkpoint:
- Repeated scans rotate across videos with lower counts first.
- Playback count changes are visible in family app after refresh.
- Every scan creates one calendar log row.
- Scanning a bracelet/device from another family only plays that family's videos for the current public place location.

### 1.3 Overuse Notification

Each video has an overuse threshold:
- Use location setting if available.
- Otherwise use global default: 5 plays.

When a video playback count reaches or exceeds the threshold:
- Mark it as `needs_refresh`.
- Send OneSignal web push notification once per threshold cycle.
- Show in-app recommendation to update the video.

Checkpoint:
- A video at 5 plays shows a refresh recommendation.
- Notification is not spammed on every scan.
- Replacing the video resets playback count and notification state.

### 1.4 Calendar History

Calendar shows:
- Dates where videos were played.
- Location name.
- Video title/slot.
- Playback time.

Checkpoint:
- Month view highlights dates with playback activity.
- Clicking a date shows playback rows for that day.
- Rows are filterable by location.

## 2. Data Model

### 2.1 D1 Tables

Better Auth tables:
- Use the Better Auth D1 schema for `user`, `session`, `account`, and `verification`.
- Better Auth owns password hashing, sessions, and credential validation.
- App role/ownership data lives in the local `accounts` profile table below.

`accounts`
- `id text primary key`
- `auth_user_id text unique not null`
- `role text not null`
- `email text unique not null`
- `display_name text not null`
- `family_id text`
- `location_id text`
- `device_id text`
- `is_active integer not null default 1`
- `created_at text not null`
- `updated_at text not null`
- Valid roles: `super_admin`, `family_member`, `device`, `public_place`

`families`
- `id text primary key`
- `name text not null`
- `created_at text not null`
- `updated_at text not null`

`devices`
- `id text primary key`
- `family_id text not null`
- `name text not null`
- `barcode_token text unique not null`
- `is_active integer not null default 1`
- `created_at text not null`
- `updated_at text not null`

`locations`
- `id text primary key`
- `name text not null`
- `kind text`
- `address text`
- `overuse_threshold integer not null default 5`
- `is_active integer not null default 1`
- `created_at text not null`
- `updated_at text not null`

`video_slots`
- `id text primary key`
- `family_id text not null`
- `location_id text not null`
- `slot_number integer not null`
- `video_id text`
- `created_at text not null`
- `updated_at text not null`
- Unique index: `location_id, slot_number`

`videos`
- `id text primary key`
- `family_id text not null`
- `location_id text not null`
- `slot_id text not null`
- `title text not null`
- `description text`
- `r2_key text not null`
- `mime_type text not null`
- `file_size integer not null`
- `duration_seconds integer`
- `play_count integer not null default 0`
- `last_played_at text`
- `overuse_threshold integer`
- `needs_refresh integer not null default 0`
- `last_overuse_notified_at text`
- `created_at text not null`
- `updated_at text not null`

`playback_logs`
- `id text primary key`
- `family_id text not null`
- `location_id text not null`
- `device_id text not null`
- `public_place_account_id text`
- `slot_id text not null`
- `video_id text not null`
- `machine_id text`
- `played_at text not null`
- `user_agent text`

`playback_sessions`
- `id text primary key`
- `family_id text not null`
- `location_id text not null`
- `device_id text not null`
- `public_place_account_id text not null`
- `slot_id text not null`
- `video_id text not null`
- `playback_log_id text not null`
- `expires_at text not null`
- `created_at text not null`

`push_subscriptions`
- `id text primary key`
- `family_id text not null`
- `onesignal_player_id text not null`
- `enabled integer not null default 1`
- `created_at text not null`
- `updated_at text not null`

`settings`
- `key text primary key`
- `value text not null`
- `updated_at text not null`

Checkpoint:
- Migrations can create all tables locally with `wrangler d1 migrations apply`.
- Seed script creates Better Auth users plus matching app profiles for one super admin, one demo family, one family member account, one device account, 2 public place accounts, 2 locations, and 3 empty slots per family-location pair.
- Seed script uses the demo credentials listed in section 1.0A.

### 2.2 R2 Object Layout

Bucket: `pue-link-videos`

Object key format:
- `families/{familyId}/locations/{locationId}/slots/{slotNumber}/{videoId}.{ext}`

Checkpoint:
- Uploading a replacement video writes a new R2 object.
- Old R2 object is deleted after DB update succeeds.
- Video playback uses a signed or controlled URL route, not a public bucket URL for the first MVP unless public R2 is explicitly desired.

## 3. Routes And Screens

### 3.1 Auth And Role Redirect Routes

`/`
- Redirect by session role:
   - `super_admin` -> `/admin`
   - `family_member` -> `/dashboard`
   - `device` -> `/device/barcode`
   - `public_place` -> `/place/scanner`
   - no session -> `/login`

`/login`
- Better Auth email/password login for all account roles.
- Includes demo quick-fill buttons:
   - Super Admin
   - Family Member
   - Device
   - Minimarket Kiosk
   - Taman Kiosk

`/logout`
- Sign out through Better Auth and clear the session cookie.

Checkpoint:
- One login page can authenticate all 4 role types.
- Each role is redirected to its correct default screen.

### 3.2 Device Account Routes

`/device/barcode`
- Locked-down device account page.
- Shows the device name and barcode/QR code.
- Barcode encodes `device.barcode_token`.
- Designed to be shown on a phone to emulate the NFC bracelet.

Checkpoint:
- Device account cannot access dashboard, admin, upload, settings, or calendar routes.
- Device barcode can be scanned by the public place scanner page.

### 3.3 Public Place / Machine Routes

`/place/scanner`
- Public place account scanner entrypoint.
- Uses the logged-in public place account to determine the current location.
- Scans or manually accepts a device barcode token.
- Requests the next video for that device family at the current location.

`/place/play/:playbackSessionId`
- Machine display playback page.
- Shows the selected video.
- Can be opened after scanner resolves a valid device barcode.
- Keeps scanner and playback behavior separate for a cleaner demo.

`/api/place/scan`
- Requires `public_place` session.
- Accepts `barcode_token`.
- Resolves barcode token to device.
- Resolves device to family.
- Resolves current public place session to location.
- Requests next video.
- Creates playback log.
- Increments counters atomically enough for MVP.
- Returns selected video metadata and playback URL.

`/api/videos/:videoId/stream`
- Streams or redirects to the R2 video object.

Checkpoint:
- Public place account can scan a device barcode and play a video without family dashboard access.
- Invalid device barcode shows clear machine-safe error.
- Empty family-location slots show "Belum ada video untuk keluarga ini di lokasi ini."

### 3.4 Family Dashboard Routes

`/dashboard`
- Summary of locations, total videos, videos needing refresh, and recent playback activity.

`/locations`
- List minimarket, park, and other configured machines/places.

`/locations/:id`
- 3 video slots for that location.
- Upload/replace video per slot.
- Playback count per video.
- Refresh recommendation badge.
- Shows whether this location has a public place account configured.

`/calendar`
- Month view and daily playback detail.

`/settings`
- Overuse threshold fallback.
- Location threshold controls.
- OneSignal subscription status.

Checkpoint:
- A demo evaluator can upload videos as family member, scan the device barcode as public place account, see playback count rise, and inspect calendar log without touching database tools.

### 3.5 Super Admin Routes

`/admin`
- Overview of families, locations, device accounts, and public place accounts.

`/admin/families`
- Create/edit demo families and family member accounts.

`/admin/devices`
- Create/edit device accounts and barcode tokens.

`/admin/locations`
- Create/edit public places and bind public place accounts to locations.

Checkpoint:
- Super admin can set up a complete demo from UI:
   - Family
   - Family member
   - Device account
   - Location
   - Public place account
   - 3 slots for that family-location pair

### 3.6 API Routes

`POST /api/auth/login`
- Better Auth email/password sign-in endpoint or route wrapper.

`POST /api/auth/sign-out`
- Better Auth sign-out endpoint or route wrapper.

`POST /api/admin/accounts`
- Super admin creates Better Auth users and matching app role profiles for all roles.

`POST /api/admin/families`
- Super admin creates families.

`POST /api/admin/devices`
- Super admin creates device accounts and barcode tokens.

`POST /api/admin/locations`
- Super admin creates locations and public place accounts.

`POST /api/videos/upload-url`
- Create upload intent or direct upload endpoint decision.

`POST /api/locations/:locationId/slots/:slotNumber/video`
- Replace slot video metadata after upload.

`DELETE /api/videos/:videoId`
- Remove video from slot and R2.

`GET /api/locations/:locationId/slots`
- Return slot state.

`POST /api/place/scan`
- Public place scanner resolves a device barcode and starts playback.

`GET /api/playback-logs`
- Calendar data with date and location filters.

`POST /api/push/register`
- Store OneSignal player ID.

`POST /api/push/test`
- Send a test notification.

Checkpoint:
- API routes return consistent JSON envelope: `{ ok, data, error }`.
- Failed uploads and failed DB writes do not leave the UI in a false success state.

## 4. Implementation Phases

## Phase 1: Project Foundation

Goal:
- [x] Convert the starter Astro project into a Cloudflare-ready app with React, Tailwind, shadcn/ui, and baseline layout.

Tasks:
- [x] Install integrations and dependencies:
   - `@astrojs/react`
   - `react`
   - `react-dom`
   - `better-auth`
   - `tailwindcss`
   - `@tailwindcss/vite` or Astro-compatible Tailwind setup
   - `class-variance-authority`
   - `clsx`
   - `tailwind-merge`
   - `lucide-react`
   - shadcn/ui component setup
- [x] Configure Astro React integration.
- [x] Configure Tailwind global CSS.
- [x] Add `src/lib/utils.ts` with `cn`.
- [x] Add initial shadcn components:
   - Button
   - Card
   - Input
   - Label
   - Badge
   - Dialog
   - Tabs
   - Calendar
   - Table
   - Select
- [x] Create base app shell:
   - Sidebar/nav for dashboard.
   - Header with current family/demo status.
   - Responsive mobile navigation.
- [x] Apply minimalist UI direction from section 0.1:
   - White/neutral surfaces.
   - Compact cards and tables.
   - Purple primary accent.
   - Thin borders and subtle shadows.
   - No decorative gradients or marketing-style hero layouts.
- [x] Update home page from Astro starter to app entry.

Checkpoint:
- [x] `pnpm build` succeeds.
- [x] `pnpm dev` renders a styled dashboard shell.
- [x] No placeholder Astro starter UI remains.

## Phase 2: Cloudflare Bindings And Local Database

Goal:
- [x] Add D1 and R2 bindings, migrations, typed environment access, and local seed data.

Tasks:
- [x] Update `wrangler.jsonc`:
   - Add D1 binding `DB`.
   - Add R2 binding `VIDEOS_BUCKET`.
   - Add environment variables for OneSignal placeholders.
- [x] Create `migrations/0001_initial.sql`.
- [x] Add Better Auth D1 tables for users, sessions, credentials, and verification records.
- [x] Add indexes for:
   - `accounts.role`
   - `accounts.family_id`
   - `accounts.location_id`
   - `accounts.device_id`
   - `devices.family_id`
   - `devices.barcode_token`
   - `video_slots.location_id`
   - `video_slots.family_id`
   - `videos.location_id`
   - `videos.family_id`
   - `videos.needs_refresh`
   - `playback_logs.played_at`
   - `playback_logs.location_id`
   - `playback_logs.family_id`
   - `playback_logs.device_id`
   - `playback_sessions.expires_at`
   - `playback_sessions.public_place_account_id`
- [x] Add `src/lib/db.ts` helpers:
   - `getDb(env)` using Cloudflare Worker bindings.
   - query helpers for D1 prepared statements.
- [x] Add `src/lib/time.ts` for ISO timestamp helpers.
- [x] Add `src/lib/ids.ts` for ID/token generation.
- [x] Add seed script or seed route for demo data.
- [x] Generate Cloudflare types with `pnpm cf-typegen`.

Checkpoint:
- [x] Local D1 database can be created and migrated.
- [x] Demo seed creates all 4 account types, a family, a device, and locations.
- [x] TypeScript knows `DB` and `VIDEOS_BUCKET` bindings.

## Phase 3: Role-Based Auth And App Shell

Goal:
- [x] Provide Better Auth email/password login and role-based access for all 4 MVP account types.

Tasks:
- [x] Configure Better Auth with D1 and email/password enabled.
- [x] Implement `/login` with email/password fields and demo quick-fill buttons for all seed users.
- [x] Store and validate sessions through Better Auth secure HTTP-only cookies.
- [x] Add middleware to protect routes by role.
- [x] Add `getCurrentFamily` server helper.
- [x] Add `getCurrentAccount` server helper.
- [x] Add `requireRole` server helper.
- [x] Add role redirect after login.
- [x] Add logout/sign-out route through Better Auth.
- [x] Add local development seed users and role profiles.

Checkpoint:
- [x] Better Auth validates passwords for all demo users.
- [x] Unauthenticated users cannot access protected pages.
- [x] Super admin lands on `/admin`.
- [x] Family member lands on `/dashboard`.
- [x] Device account lands on `/device/barcode`.
- [x] Public place account lands on `/place/scanner`.
- [x] Cross-role route access is blocked.

## Phase 3A: Super Admin Demo Setup

Goal:
- [ ] Let super admin prepare the demo without manual database edits.

Tasks:
- [ ] Build `/admin` overview.
- [ ] Build family create/edit form.
- [ ] Build family member account create/edit form.
- [ ] Build device account create/edit form.
- [ ] Generate unique device barcode token.
- [ ] Build location create/edit form.
- [ ] Build public place account create/edit form.
- [ ] Bind public place account to a location.
- [ ] Ensure 3 video slots exist for each family-location pair.

Checkpoint:
- [ ] Super admin can create a complete demo setup:
   - Family
   - Family member account
   - Device account
   - Location
   - Public place account
   - 3 slots for the family at that location

## Phase 4: Location Management

Goal:
- [ ] Let family users see locations and the 3-slot structure.

Tasks:
- [ ] Build `/dashboard` summary cards.
- [ ] Build `/locations` list.
- [ ] Build `/locations/:id` detail page.
- [ ] Ensure every location has 3 slots.
- [ ] Show whether the location has a configured public place account.
- [ ] Show location-level threshold setting.
- [ ] Keep upload/manage actions scoped to the logged-in family.

Checkpoint:
- [ ] Demo has at least:
   - Minimarket location
   - Taman location
- [ ] Each location shows 3 slots.
- [ ] Family member can manage only their own family's videos for those locations.

## Phase 4A: Device Barcode Emulator

Goal:
- [ ] Provide the bracelet replacement for the MVP.

Tasks:
- [ ] Build `/device/barcode`.
- [ ] Render QR code or barcode from `devices.barcode_token`.
- [ ] Show device/family label for demo clarity.
- [ ] Add refresh-safe layout suitable for phone screen.
- [ ] Block all dashboard/admin APIs for device role.

Checkpoint:
- [ ] Device account displays only its barcode/QR.
- [ ] Public place scanner can read or accept that token.
- [ ] Device account cannot access family dashboard data.

## Phase 5: Video Upload To R2

Goal:
- [ ] Upload or replace videos in a location slot.

Tasks:
- [ ] Decide MVP upload strategy:
   - Preferred simple MVP: upload through Astro API route to R2.
   - Later optimization: presigned/direct upload flow.
- [ ] Add file validation:
   - Accept `video/mp4`, `video/webm`, `video/quicktime` if supported.
   - Enforce MVP max size, for example 50 MB.
- [ ] Implement `POST /api/locations/:locationId/slots/:slotNumber/video`.
- [ ] Store object in R2.
- [ ] Create or replace `videos` row.
- [ ] Update `video_slots.video_id`.
- [ ] Reset:
   - `play_count = 0`
   - `last_played_at = null`
   - `needs_refresh = 0`
   - `last_overuse_notified_at = null`
- [ ] Delete old R2 object after replacement succeeds.
- [ ] Build upload UI per slot:
   - Empty state
   - Upload progress
   - Replace confirmation
   - Error display

Checkpoint:
- [ ] User can upload 3 videos to a location.
- [ ] Replacement video resets count.
- [ ] R2 contains uploaded objects under expected key format.
- [ ] Slot UI updates after successful upload.

## Phase 6: Public Place Scanner And Playback Flow

Goal:
- [ ] Public place account scans a device barcode and plays the least-used video for that device family at the current location.

Tasks:
- [ ] Build `/place/scanner` page.
- [ ] Add camera scanner if practical for MVP, with manual token input fallback.
- [ ] Build `POST /api/place/scan`.
- [ ] Resolve the logged-in public place account to `location_id`.
- [ ] Resolve scanned `barcode_token` to `device_id` and `family_id`.
- [ ] Implement selection algorithm:
   - Active videos only.
   - Matching `family_id`.
   - Matching `location_id`.
   - Lowest `play_count`.
   - Oldest `last_played_at` when tied.
   - Oldest `created_at` when tied.
- [ ] Increment selected video:
   - `play_count += 1`
   - `last_played_at = now`
- [ ] Insert `playback_logs` row with:
   - `family_id`
   - `location_id`
   - `device_id`
   - `public_place_account_id`
   - `slot_id`
   - `video_id`
   - `machine_id`
- [ ] Return playable URL.
- [ ] Build `/place/play/:playbackSessionId` or inline player state:
   - Loading
   - Playing
   - Ended
   - Replay / next scan button for demo
   - No videos
   - Error
- [ ] Add optional `machine_id` query/session value:
   - `minimarket-front`
   - `taman-gate`

Checkpoint:
- [ ] With 3 videos at 0 plays, three scans distribute play counts across all three videos.
- [ ] After one video replacement, that video is selected first because it has 0 plays.
- [ ] Calendar logs match scan events.
- [ ] Public place account at Minimarket plays Minimarket videos for the scanned family.
- [ ] Public place account at Taman plays Taman videos for the same scanned device/family.

## Phase 7: Playback Counts And Refresh Recommendations

Goal:
- [ ] Surface overused videos and prepare notification trigger.

Tasks:
- [ ] Add threshold resolver:
   - `video.overuse_threshold`
   - else `location.overuse_threshold`
   - else global default 5
- [ ] After playback increment, compare count to threshold.
- [ ] Mark `needs_refresh = 1` when threshold is reached.
- [ ] Store `last_overuse_notified_at` only when notification send succeeds.
- [ ] Add dashboard widget:
   - Videos needing refresh
   - Location and slot
   - Current play count and threshold
- [ ] Add slot badge:
   - Normal
   - Near threshold
   - Needs refresh
- [ ] Add setting UI for fallback threshold and per-location threshold.

Checkpoint:
- [ ] At 4/5 plays, UI warns "mendekati batas".
- [ ] At 5/5 plays, UI recommends replacing video.
- [ ] Replacing the video clears the recommendation.

## Phase 8: OneSignal Web Push

Goal:
- [ ] Allow family users to receive web push recommendations.

Tasks:
- [ ] Create OneSignal app.
- [ ] Add public env:
   - `PUBLIC_ONESIGNAL_APP_ID`
- [ ] Add secret env:
   - `ONESIGNAL_REST_API_KEY`
- [ ] Add OneSignal SDK script/client initialization in app layout.
- [ ] Add notification permission prompt in settings.
- [ ] Register OneSignal player/subscription ID via `/api/push/register`.
- [ ] Store subscription in D1.
- [ ] Implement `src/lib/onesignal.ts`.
- [ ] Send notification when a video reaches threshold:
   - Title: "Video perlu diperbarui"
   - Body: "{locationName} slot {slotNumber} sudah diputar {count} kali."
   - URL: `/locations/:id`
- [ ] Add test notification button.

Checkpoint:
- [ ] Browser can subscribe to push.
- [ ] Test notification works.
- [ ] Threshold notification fires once when count reaches 5.
- [ ] Notification opens the correct location detail page.

## Phase 9: Calendar Playback History

Goal:
- [ ] Show when and where videos were played.

Tasks:
- [ ] Add `/calendar` route.
- [ ] Query playback logs grouped by date.
- [ ] Build React calendar component.
- [ ] Highlight dates with playback activity.
- [ ] Add selected day side panel/table:
   - Time
   - Location
   - Slot
   - Video title
   - Machine ID
- [ ] Add filters:
   - Location
   - Month
- [ ] Add empty states.

Checkpoint:
- [ ] Scanning today highlights today's date.
- [ ] Selecting today shows the scan event.
- [ ] Filtering by minimarket hides park/taman logs.

## Phase 10: Demo Polish And Reliability

Goal:
- [ ] Make the MVP reliable enough for demo.

Tasks:
- [ ] Add loading, empty, and error states for all main screens.
- [ ] Add toast notifications for upload, replacement, settings, and push actions.
- [ ] Add optimistic UI only where rollback is simple.
- [ ] Add basic analytics/debug page for demo:
   - Current family ID
   - Locations
   - Last 10 playback logs
- [ ] Add route-level 404 and error pages.
- [ ] Add responsive checks:
   - Mobile family dashboard
   - Desktop machine playback
   - Tablet dashboard
- [ ] Add file upload size messaging.
- [ ] Add browser autoplay fallback:
   - If autoplay blocked, show play button.

Checkpoint:
- [ ] Demo can be completed from a clean seed without manual DB edits.
- [ ] All main flows have visible error states.
- [ ] Machine display remains readable from a few meters away.

## Phase 11: Testing

Goal:
- [ ] Catch regressions in the core demo behavior.

Tasks:
- [ ] Add unit tests for selection algorithm.
- [ ] Add unit tests for threshold resolver.
- [ ] Add integration-style API tests where feasible:
   - Upload metadata replacement
   - Scan creates playback log
   - Scan increments count
- [ ] Add Playwright smoke tests:
   - Login
   - Role redirects
   - Device barcode page
   - Public place scanner page
   - View locations
   - Scan barcode token through public place route
   - Calendar shows log after seeded playback
- [ ] Add manual QA checklist in `docs/demo-checklist.md`.

Checkpoint:
- [ ] `pnpm build` passes.
- [ ] Core algorithm tests pass.
- [ ] Manual demo checklist can be run in under 10 minutes.

## Phase 12: Cloudflare Deployment

Goal:
- [ ] Deploy working MVP to Cloudflare Workers.

Tasks:
- [ ] Create Cloudflare D1 database.
- [ ] Create Cloudflare R2 bucket.
- [ ] Update `wrangler.jsonc` with production IDs.
- [ ] Add OneSignal env vars/secrets:
   - `PUBLIC_ONESIGNAL_APP_ID`
   - `ONESIGNAL_REST_API_KEY`
- [ ] Apply D1 migrations to remote.
- [ ] Seed production demo data.
- [ ] Deploy with `pnpm deploy`.
- [ ] Verify:
   - Role-based login
   - Super admin setup
   - Device barcode screen
   - Public place scanner
   - Upload video
   - Playback count
   - Calendar log
   - Push test

Checkpoint:
- [ ] Public demo URL works end to end.
- [ ] At least one device barcode/QR is ready to show from the device account.
- [ ] Public place accounts for Minimarket and Taman can scan that device barcode.
- [ ] Rollback notes are documented.

## 5. Suggested Build Order

1. Phase 1: Foundation
2. Phase 2: D1/R2 bindings
3. Phase 3: Role-based auth
4. Phase 3A: Super admin demo setup
5. Phase 4: Locations and slots
6. Phase 4A: Device barcode emulator
7. Phase 6: Public place scanner/playback using seeded/mock video metadata
8. Phase 5: R2 upload
9. Phase 7: Counts and refresh recommendations
10. Phase 9: Calendar
11. Phase 8: OneSignal
12. Phase 10: Polish
13. Phase 11: Testing
14. Phase 12: Deployment

Reason:
- The scan/playback loop across device account, public place account, family, and location is the core demo. Build it early with seeded data before spending time on upload and notifications.

## 6. Demo Script

1. Super admin logs in.
2. Super admin confirms demo family, family member, device account, Minimarket public place account, and Taman public place account.
3. Family member logs in.
4. Family member opens location "Minimarket".
5. Family member uploads 3 videos into slots.
6. Device account logs in on a phone and shows bracelet barcode/QR.
7. Public place account logs in as "Minimarket".
8. Public place scanner scans the device barcode.
9. Machine page plays the least-used Minimarket video for that family.
10. Repeat scan several times.
11. Family dashboard shows varied playback counts.
12. Calendar shows today's playback at Minimarket.
13. Continue until a video reaches 5 plays.
14. App shows refresh recommendation and sends web push.
15. Family replaces that slot video.
16. Count resets and recommendation disappears.
17. Public place account logs in as "Taman" and scans the same device barcode to demonstrate location-specific video selection.

## 7. Non-MVP Backlog

- Real NFC bracelet integration.
- Native mobile app.
- Production-grade multi-family onboarding.
- Email verification and password reset.
- Video transcoding and thumbnails.
- Durable Object queue for stricter playback concurrency.
- Signed upload URLs.
- Offline machine mode.
- Dedicated physical machine registration.
- Admin analytics.
- Subscription billing.
- Multi-language UI.
