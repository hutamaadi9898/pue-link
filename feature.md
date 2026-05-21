# Pue Link Feature Overview

Pue Link is a demo web app for playing family memory videos at public locations. A bracelet is emulated with a QR code/barcode, and a public kiosk scans it to choose and play the most appropriate family video for that location.

## User Roles

### Super Admin

The super admin can prepare and manage the demo setup from the web interface.

- Create and update families.
- Create and update family member accounts.
- Create and update bracelet device records.
- Generate or edit bracelet barcode tokens.
- Create and update public locations, such as a minimarket or park.
- Create and bind kiosk/public place accounts to locations.
- View all active app accounts and their family, device, and location assignments.
- Check whether each family-location pair has the required 3 video slots.

### Family Member

Family members manage the videos that will be played when their bracelet is scanned.

- Sign in to a family dashboard.
- View a summary of active locations, available slots, uploaded videos, total playbacks, and videos that need refresh.
- See recent playback activity with time, location, video slot, title, and device.
- View all public locations available in the demo.
- Open a location detail page and manage exactly 3 video slots for that location.
- Upload videos into empty slots.
- Replace existing videos.
- Remove videos from slots.
- Preview uploaded videos.
- See video title, description, file type, file size, play count, last played time, and refresh status.
- Track storage usage against the family video quota.
- Adjust global and location-level refresh thresholds.
- View a calendar of playback history by month and day.
- Filter playback history by location.

### Bracelet Device Account

The device account represents the bracelet in the MVP demo.

- Shows a QR code/barcode token for the linked bracelet device.
- Shows the device name and family name for demo clarity.
- Allows the token to be copied or manually entered at the kiosk if the camera is unavailable.
- Provides a locked-down experience with only the barcode screen and sign out.

### Public Place / Kiosk Account

The kiosk account is used by public machines at specific locations.

- Opens a kiosk scanner screen for the account's linked location.
- Uses the camera to scan a bracelet QR code.
- Provides a manual barcode token input as a fallback.
- Allows a machine ID to be set, such as `minimarket-front` or `taman-gate`.
- Sends the scan to the app and starts a playback session when a valid bracelet is recognized.
- Opens a dedicated playback screen for the selected video.
- Supports replay, scan again, and a manual play button if browser autoplay is blocked.

## Core Product Features

### Role-Based Login And Access

- One login page is used by all account types.
- Demo quick-fill buttons are available for Super Admin, Family, Bracelet, Minimarket, and Park accounts.
- After login, users are sent to the correct screen for their role.
- Protected pages and APIs are restricted by role.
- Disabled or inactive accounts cannot continue into protected app areas.

### Demo Setup Management

- A super admin can set up the complete demo without editing the database directly.
- The setup includes families, family accounts, bracelet devices, barcode tokens, public locations, kiosk accounts, and location slots.
- The app automatically ensures each family has 3 slots for each active location.

### Location-Based Video Slots

- Every family-location pair has exactly 3 video slots.
- Empty slots clearly show that they are ready for upload.
- Filled slots show video details, playback counts, limits, and status badges.
- Location cards show how many slots are available, how many videos are uploaded, and how many plays happened there.
- Locations can show whether a kiosk account is already linked.

### Video Upload And Storage

- Family members can upload videos through the app.
- Supported formats are MP4, WebM, and QuickTime.
- Each video is limited to 50 MB.
- Each family has a total video storage quota of 5 GB.
- Uploaded videos are stored in Cloudflare R2.
- Replacing a video resets its play count, last played date, and refresh recommendation.
- Removing a video clears the slot and deletes the stored video object.

### Smart Video Selection

When a kiosk scans a bracelet, the app:

1. Identifies the kiosk location from the logged-in kiosk account.
2. Identifies the bracelet device from the scanned barcode token.
3. Finds the bracelet's family.
4. Looks for videos uploaded by that family for the kiosk's current location.
5. Chooses the video with the lowest play count.
6. If counts are tied, chooses the least recently played video.
7. If still tied, chooses the oldest uploaded video.
8. Creates a playback session and opens the player.

This keeps playback rotation balanced across the family's videos at each public location.

### Playback Tracking

- Every successful scan creates a playback log.
- The selected video's play count is increased.
- The last played time is updated.
- The log records family, location, bracelet device, kiosk account, video slot, video, machine ID, playback time, and user agent.
- Playback sessions expire after a limited time so old player URLs cannot be reused indefinitely.

### Refresh Recommendations

- The app tracks when videos are getting overused.
- A video can use its own threshold, the location threshold, the global threshold, or the fallback default of 5 plays.
- Videos near their limit show a warning status.
- Videos at or above their limit are marked as needing refresh.
- The dashboard highlights videos that need to be replaced.
- Replacing a video clears the refresh recommendation.

### Playback Calendar

- Family members can review playback history in a calendar view.
- The calendar highlights dates that have playback activity.
- Users can move between months.
- Users can filter the calendar by location.
- Selecting a date shows playback rows for that day.
- Each row includes time, location, slot number, video title, and machine ID.
- Calendar grouping uses Taiwan time.

### Bilingual Interface Support

- Main screens include English and Mandarin Chinese text variants.
- The interface is designed for a clean dashboard and kiosk workflow.

### Cloudflare-Based Infrastructure

- The app is built with Astro and React.
- It is configured for Cloudflare Workers.
- Cloudflare D1 stores accounts, families, devices, locations, slots, videos, playback logs, sessions, subscriptions, and settings.
- Cloudflare R2 stores uploaded video files.
- Better Auth handles email/password login and sessions.

## Current Demo Flow

1. Super admin creates or reviews the demo family, bracelet device, locations, and kiosk accounts.
2. Family member logs in and uploads videos into the 3 slots for a location.
3. Bracelet device account displays its QR code/barcode.
4. Kiosk account logs in at a public location.
5. Kiosk scans the bracelet QR code or receives the token manually.
6. The app selects the least-used video for that family at that location.
7. The kiosk opens the player and plays the selected video.
8. Family dashboard and calendar update with the new playback activity.
9. Once a video reaches its refresh threshold, the app recommends replacing it.

## Not Currently Included

These items are listed in the project roadmap but are not fully implemented in the current app:

- Real NFC bracelet integration.
- Native mobile app.
- OneSignal web push notification delivery.
- Email verification and password reset.
- Video transcoding and thumbnails.
- Offline kiosk mode.
- Production billing or subscription management.
- Automated test suite and full deployment checklist.
