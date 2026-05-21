# Pue Link Feature Suggestions

These suggestions are based on the current app surface: Astro + React on Cloudflare Workers, D1 for app data, R2 for uploaded videos, Better Auth login, role-based dashboards, bracelet QR/barcode scanning, location-based video slots, playback logging, refresh thresholds, calendar history, and early OneSignal push support.

## Phase 1 - Demo Polish And Trust

- [ ] Replace the starter `README.md` with a Pue Link-specific setup guide.
- [ ] Document required Cloudflare bindings for `DB`, `VIDEO_BUCKET`, and OneSignal-related secrets.
- [ ] Add a demo account table to the README with role, email, password, and landing page.
- [ ] Add a short architecture diagram showing Family, Device, Kiosk, D1, R2, and playback flow.
- [ ] Fix mojibake/encoding issues in bilingual UI strings so Mandarin text renders correctly.
- [ ] Add one shared language helper for English/Mandarin labels instead of embedding repeated spans everywhere.
- [ ] Add empty-state copy for admin lists when no families, devices, accounts, or locations exist.
- [ ] Add destructive-action confirmation text that includes the video title before deletion.
- [ ] Add loading states to admin form submissions so duplicate creates are harder.
- [ ] Add success/error banners after admin create and update actions.
- [ ] Add client-side validation for admin forms before sending requests.
- [ ] Add a visible app version/build timestamp in the admin footer.
- [ ] Add a lightweight health page for checking D1, R2, auth, and push configuration.

## Phase 2 - Family Video Management

- [ ] Generate a thumbnail image after video upload and store its R2 key in D1.
- [ ] Show video thumbnails on dashboard, location cards, and slot cards.
- [ ] Add optional video duration detection during upload.
- [ ] Display duration beside file size and MIME type in each slot.
- [ ] Add per-slot notes for what kind of memory should be uploaded for that location.
- [ ] Add a "replace soon" filter for near-threshold videos.
- [ ] Add a "needs refresh" page listing every stale video across all locations.
- [ ] Add bulk refresh workflow for replacing multiple stale videos in one session.
- [ ] Add upload retry handling when the R2 upload fails after the form is submitted.
- [ ] Preserve the selected file and title when upload validation fails on the client.
- [ ] Add a quota warning when family storage passes 80%.
- [ ] Add a quota-blocked state when the next upload would exceed family storage.
- [ ] Add a video archive table so removed videos can be audited without keeping playable files forever.
- [ ] Add optional video categories such as greeting, birthday, daily life, and reminder.
- [ ] Add a location-specific suggested category mix for the three slots.

## Phase 3 - Kiosk Reliability And Offline Flow

- [ ] Add kiosk heartbeat records so admins can see whether each kiosk was recently online.
- [ ] Store browser, device, and camera capability details with each kiosk heartbeat.
- [ ] Add a kiosk diagnostics panel for camera permission, HTTPS status, and scanner support.
- [ ] Add a kiosk "test scan" button using a known demo token.
- [ ] Add duplicate-scan protection so the same token cannot create multiple sessions within a few seconds.
- [ ] Add a configurable scan cooldown per kiosk account.
- [ ] Add a clear "no available videos" recovery screen with family and location context.
- [ ] Cache the last successful scanner settings per kiosk account.
- [ ] Add a fullscreen kiosk mode for the scanner and player screens.
- [ ] Add an idle timeout that returns the kiosk from player back to scanner.
- [ ] Add a local pending-event queue for failed playback log writes.
- [ ] Add a background retry endpoint to sync queued kiosk events when connection returns.
- [ ] Add a fallback static "please ask staff" screen when the app cannot reach the API.
- [ ] Add machine ID management in admin instead of free-text kiosk entry only.
- [ ] Add per-location kiosk status badges: ready, missing account, offline, or misconfigured.

## Phase 4 - Notifications And Engagement

- [ ] Complete OneSignal subscription registration for family accounts.
- [ ] Add a push preference screen with enable/disable controls per family member.
- [ ] Add notification preferences for near-threshold, needs-refresh, upload success, and kiosk errors.
- [ ] Send a near-threshold notification before a video fully reaches its refresh limit.
- [ ] Send a needs-refresh notification once per video threshold cycle.
- [ ] Reset notification state when a video is replaced.
- [ ] Add an in-app notification inbox backed by D1.
- [ ] Store notification delivery attempts with status, provider response, and timestamp.
- [ ] Add admin visibility into failed notification deliveries.
- [ ] Add email verification through Better Auth.
- [ ] Add password reset through Better Auth.
- [ ] Add account invitation emails for family members and kiosk accounts.
- [ ] Add an activity digest email summarizing weekly playbacks and stale videos.
- [ ] Add a "family milestone" notification when a location reaches 10, 25, 50, and 100 playbacks.

## Phase 5 - Analytics And Admin Operations

- [ ] Add a playback analytics page for family members.
- [ ] Chart playbacks by day, week, location, device, and slot.
- [ ] Add top-performing videos by play count and recent activity.
- [ ] Add stale-location detection when a location has empty or outdated slots.
- [ ] Add CSV export for playback logs.
- [ ] Add CSV export for families, accounts, devices, locations, and videos.
- [ ] Add admin audit logs for create, update, delete, login, upload, and scan actions.
- [ ] Add soft-delete support for accounts, families, devices, and locations.
- [ ] Add admin filters for role, family, location, device status, and account activity.
- [ ] Add impersonation-safe "view as family" mode for super admins.
- [ ] Add per-family configurable video quota instead of one global quota.
- [ ] Add per-location configurable slot count if future demos need more than three videos.
- [ ] Add device token rotation with old-token invalidation.
- [ ] Add token print/download templates for bracelets.
- [ ] Add QR code batch generation for multiple devices.

## Phase 6 - Production Hardening

- [ ] Add unit tests for threshold resolution and refresh status logic.
- [ ] Add unit tests for playback video selection order.
- [ ] Add API tests for scan success, invalid token, inactive device, inactive account, and no video cases.
- [ ] Add API tests for upload validation, quota enforcement, replacement, and deletion.
- [ ] Add auth middleware tests for all protected role paths.
- [ ] Add Playwright smoke tests for login, dashboard, upload, scan, and playback.
- [ ] Add a migration checklist for D1 schema changes.
- [ ] Add seed data scripts for demo, staging, and local development.
- [ ] Add CI commands for typecheck, build, tests, and linting.
- [ ] Add request rate limiting for login and scan endpoints.
- [ ] Add server-side file signature validation for uploaded videos.
- [ ] Add R2 object cleanup for failed or abandoned uploads.
- [ ] Add expired playback session cleanup.
- [ ] Add structured logging around scan, upload, notification, and auth failures.
- [ ] Add Cloudflare alerting for high API error rates and failed deployments.

## Suggested Priority Order

- [ ] Start with README replacement and encoding fixes because they improve demo confidence immediately.
- [ ] Finish OneSignal preferences because the database and API surface already exist.
- [ ] Add duplicate-scan protection because public kiosks can accidentally submit repeated scans.
- [ ] Add thumbnails because they make family video management easier to understand.
- [ ] Add playback selection tests before changing rotation, refresh, or kiosk behavior.
- [ ] Add kiosk heartbeat once multiple physical or demo kiosk devices are involved.
