# Boldfit Store Roster & Attendance

An interactive, mobile-first workforce operations demo for three Boldfit stores.
It combines weekly roster planning, WhatsApp communication, secure attendance,
employee self-service, multi-store oversight, payroll preparation and store
operations.

- Public demo: https://sriraghav1510.github.io/boldfit-store-roster/
- Android APK: https://github.com/sriraghav1510/boldfit-store-roster/releases/download/v0.1.0/Boldfit-Roster-v0.1.0.apk

The demo uses sample data and persists changes on the current device. Camera,
location, download and native share controls are interactive. Face matching,
WhatsApp delivery, backend timestamps and payroll integration are represented
faithfully in the workflow but require production services before real use.

## Demo roles

Use the role switcher in the top-right corner. It cycles through:

- **Employee:** one-time registration, face enrolment, geofence and face punch,
  datewise history, regularisation, leave, swaps, open shifts and preferences.
- **Store Manager:** roster planning, team registration readiness, an action
  inbox, attendance corrections, leave/swap decisions, open shifts and store
  opening/closing checklists. This role intentionally has **no live attendance
  dashboard**.
- **Area Ops:** authorised three-store live attendance, exception approval,
  staffing and productivity analytics, demand coverage and operational checks.
- **HR Admin:** authorised live attendance, payroll approval/locking, CSV
  export, comp-off, skills, trusted devices, audit history and store geofence
  administration.

## Roster and communication

- Weekly shift grid with OP, MID, CL, FULL, Week Off, Leave, Not Available and
  Training codes
- Copy previous week, auto-fill gaps, workload and coverage checks
- Flex pool and temporary inter-store transfers
- Publish/republish flow and AOM verification
- WhatsApp-ready weekly roster, transfer, cancellation, reminder, roster change,
  coverage risk, acknowledgement and approval/correction messages
- Employee acknowledgement and issue reporting
- CSV roster export and device-local audit activity

## Registration and attendance

- One-time WhatsApp registration invite with 48-hour expiry
- Employee code, registered-mobile OTP, trusted-device binding
- Front-camera face enrolment and liveness journey
- Fixed 10-metre geofence around the admin-approved Google Maps store pin
- Precise-GPS retry handling and no continuous location tracking
- Fixed security sequence: assigned store, location, liveness, face, punch
- Logout allowed only after a successful login
- Datewise Punch In, Punch Out, duration, source and evidence
- Late Login after the 10-minute start grace
- Early Logout before the 10-minute end grace
- Short Timing below 9 hours for OP/MID/CL or below 11 hours for FULL
- 23:59 closing classifications for missed Punch In, missed Punch Out and absence
- Employee reminders, closing messages and AOM daily summary
- Encrypted offline queue and manager-assisted/kiosk fallback model

## Workforce operations

- Attendance regularisation with SM/AOM approval stages and original-event audit
- Shift swaps, leave, availability, preferences and open-shift volunteering
- Live dashboard limited to Area Ops and above
- Three-store scheduled/present/late/absent/missing-punch view
- Sales, footfall, recommended staffing and sales-per-labour-hour analytics
- Skill-authorised opener, closer, billing, inventory, product and first-aid cover
- Opening and closing responsibility checklists
- Payroll chain: Draft → SM approved → AOM approved → Locked
- Attendance payroll CSV and compensatory-off balance flow
- Trusted-device reset, biometric/privacy controls and immutable audit history

## Visual system

The interface follows the supplied Boldfit 2025 visual guide:

- Bold Black `#000000`
- Active White `#FFFFFF`
- Spark Yellow `#FAEB31`
- Condensed display hierarchy, italic motion cues, disciplined bold type
- High-contrast editorial grids, restrained radii and yellow finish-line accents

See [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) and
[ARCHITECTURE.md](./ARCHITECTURE.md) for implementation decisions.

## Run locally

```bash
npm install
npm run dev
```

Quality checks:

```bash
npm run lint
npm test
npm run build:pages
```

## Android

The Capacitor Android application packages the same responsive interface. It
includes safe-area styling, a branded launcher and splash screen, native CSV
sharing, precise-location permission and camera permission.

```bash
npm run android:apk
```

The downloadable APK is debug-signed for direct testing and is not a Play Store
production release.
