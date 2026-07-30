# Boldfit Roster & Attendance Architecture

## Decision

The current repository is an interactive, local-persistence demonstration with
shared domain rules. Production should keep the same user journeys while moving
identity, authorisation, attendance events, notifications and payroll controls
behind authenticated services.

## Current application

```text
Responsive React UI
  ├─ Roster and WhatsApp domain
  ├─ Attendance and workforce domain
  ├─ Browser local storage (demo persistence)
  ├─ Browser camera/location/download APIs
  └─ Capacitor Android shell
```

The public website and Android app use the same React components and domain
logic. This keeps role behaviour and attendance classification consistent.

## Production boundaries

```text
Web / Android clients
        │
API gateway + identity + role policy
        │
        ├─ Roster service
        ├─ Attendance event service
        ├─ Registration / device service
        ├─ Face + liveness provider
        ├─ Notification orchestration
        ├─ Leave / swap workflow
        ├─ Payroll export + lock service
        └─ Reporting read models

PostgreSQL · encrypted object storage · queue/scheduler · audit log
```

## Key decisions

1. **Server authority:** production punch time, assigned store, rostered shift
   and role permissions come from the backend. Device time is evidence only.
2. **Event history:** original attendance events are append-only. Approved
   corrections create linked adjustment events instead of overwriting evidence.
3. **Role policy:** the live attendance read model is denied to Store Managers
   at the API layer. Area Ops, regional/zonal operations, HR and authorised
   admins receive only their permitted geography.
4. **Biometrics:** store encrypted templates separately from HR spreadsheets.
   Event-selfie retention and access must be policy-controlled and auditable.
5. **Location privacy:** capture precise location only for Punch In/Punch Out.
   Do not continuously track employees.
6. **Offline security:** queue signed, encrypted events with device integrity,
   replay protection and backend conflict handling.
7. **Notifications:** use idempotent message jobs and provider delivery status.
   Roster publication, transfer, reminder and closing jobs must not duplicate.
8. **Payroll:** move a period through SM approval, AOM approval and HR lock.
   Reopening a locked period requires a privileged, audited workflow.

## Attendance rules

- Late Login: more than 10 minutes after rostered start.
- Early Logout: more than 10 minutes before rostered end.
- Short Timing: below 9 hours for OP/MID/CL; below 11 hours for FULL.
- Punch Out requires a successful Punch In for the same roster day.
- At 23:59, a rostered employee with neither punch is absent; an incomplete
  record becomes a missed-punch exception and produces employee communication.

## Demo limitations

The demo simulates OTP verification, face/liveness matching, backend timestamps,
WhatsApp delivery, signed offline events and payroll integration. It is suitable
for workflow review and user testing, not real attendance or biometric storage.
