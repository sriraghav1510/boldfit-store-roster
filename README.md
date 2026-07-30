# Boldfit Store Roster

A responsive roster-planning demo for Boldfit stores. It adapts the weekly
planning, shift assignment, coverage, flex staffing, temporary transfers, and
publishing workflow from the supplied retail operations manuals.

Public demo: https://sriraghav1510.github.io/boldfit-store-roster/

Android demo APK:
https://github.com/sriraghav1510/boldfit-store-roster/releases/download/v0.1.0/Boldfit-Roster-v0.1.0.apk

## Included

- Weekly roster grid with shift and status codes
- Copy-previous-week and automatic completion actions
- Store coverage and employee workload checks
- Flex-pool and inter-store transfer workflows
- Activity alerts, CSV export, and browser-local demo persistence
- Store Manager and Area Ops viewing modes
- WhatsApp-ready weekly rosters, transfer updates, reminders, and coverage alerts
- Employee roster acknowledgements and issue reporting
- Published-shift change communication with an audit trail
- AOM roster approval and return-for-correction workflow

## Run locally

```bash
npm install
npm run dev
```

Quality checks:

```bash
npm run lint
npm test
```

## Android

The Android project uses Capacitor and packages the responsive roster interface
as an offline-capable native app. It adds Android safe-area styling, a branded
launcher and splash screen, and native CSV sharing.

```bash
npm run android:sync
```

The downloadable v0.1.0 APK is debug-signed for direct testing and is not yet a
Play Store production release.
