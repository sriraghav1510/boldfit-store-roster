"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import {
  ATTENDANCE_EMPLOYEES,
  ATTENDANCE_WORK_SHIFTS,
  attendanceEmployee,
  buildClosingExceptionMessage,
  buildPunchReminderMessage,
  buildRegistrationInviteMessage,
  classifyAttendance,
  createAttendanceSuiteState,
  createPunchRecord,
  exceptionCount,
  formatDuration,
  monthlyEmployeeSummary,
  shiftTimes,
  storeAttendanceSummary,
  todayIso,
  type AttendanceAuditEvent,
  type AttendanceException,
  type AttendanceNotification,
  type AttendanceRecord,
  type AttendanceSuiteState,
  type DemoRole,
  type RegistrationRecord,
  type SkillName,
} from "./attendance-domain";
import {
  SHIFT_DEFINITIONS,
  evaluateStoreGeofence,
  fromIsoDate,
  type GeofenceResult,
  type StoreLocation,
} from "./roster-domain";

type SuiteTab =
  | "my-day"
  | "self-service"
  | "history"
  | "profile"
  | "actions"
  | "team"
  | "store-ops"
  | "live"
  | "exceptions"
  | "analytics"
  | "operations"
  | "payroll"
  | "people-admin"
  | "security";

const SUITE_STORAGE_KEY = "boldfit-attendance-suite-v2";
const DEMO_OTP = "246810";

const ROLE_TABS: Record<
  DemoRole,
  Array<{ id: SuiteTab; label: string; short: string }>
> = {
  Employee: [
    { id: "my-day", label: "My day", short: "01" },
    { id: "self-service", label: "Requests", short: "02" },
    { id: "history", label: "History", short: "03" },
    { id: "profile", label: "My profile", short: "04" },
  ],
  "Store Manager": [
    { id: "actions", label: "Action inbox", short: "IN" },
    { id: "team", label: "Team setup", short: "SET" },
    { id: "store-ops", label: "Store operations", short: "OPS" },
    { id: "self-service", label: "Team requests", short: "REQ" },
  ],
  "Area Ops": [
    { id: "live", label: "Live dashboard", short: "LV" },
    { id: "exceptions", label: "Exceptions", short: "EX" },
    { id: "analytics", label: "Analytics", short: "AN" },
    { id: "operations", label: "Operations", short: "OP" },
  ],
  "HR Admin": [
    { id: "live", label: "Live dashboard", short: "LV" },
    { id: "payroll", label: "Payroll", short: "PAY" },
    { id: "people-admin", label: "People & skills", short: "PEO" },
    { id: "security", label: "Security & devices", short: "SEC" },
  ],
};

function initialTabForRole(role: DemoRole): SuiteTab {
  return ROLE_TABS[role][0].id;
}

function loadSuiteState(): AttendanceSuiteState {
  const initial = createAttendanceSuiteState();
  if (typeof window === "undefined") return initial;
  try {
    const saved = window.localStorage.getItem(SUITE_STORAGE_KEY);
    if (!saved) return initial;
    const parsed = JSON.parse(saved) as AttendanceSuiteState;
    if (
      Array.isArray(parsed.attendance) &&
      Array.isArray(parsed.registrations) &&
      parsed.payroll
    ) {
      return { ...initial, ...parsed };
    }
  } catch {
    // The demo always falls back to a complete seeded state.
  }
  return initial;
}

function formatDisplayDate(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(fromIsoDate(value));
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function statusClass(value: string): string {
  const normalized = value.toLowerCase();
  if (
    normalized.includes("approved") ||
    normalized.includes("active") ||
    normalized.includes("inside") ||
    normalized.includes("filled") ||
    normalized.includes("credited") ||
    normalized.includes("locked") ||
    normalized.includes("on time")
  ) {
    return "suite-good";
  }
  if (
    normalized.includes("rejected") ||
    normalized.includes("absent") ||
    normalized.includes("outside") ||
    normalized.includes("late") ||
    normalized.includes("early")
  ) {
    return "suite-bad";
  }
  return "suite-warn";
}

function employeeRecordForToday(
  state: AttendanceSuiteState,
  employeeId: string,
): AttendanceRecord | undefined {
  return state.attendance.find(
    (record) =>
      record.employeeId === employeeId && record.date === todayIso(),
  );
}

export function AttendanceSuite({
  role,
  stores,
}: {
  role: DemoRole;
  stores: StoreLocation[];
}) {
  const [state, setState] = useState<AttendanceSuiteState>(
    createAttendanceSuiteState,
  );
  const restoredState = useRef(false);
  const [tab, setTab] = useState<SuiteTab>(() => initialTabForRole(role));
  const [employeeId, setEmployeeId] = useState("bf-104");
  const [otp, setOtp] = useState(DEMO_OTP);
  const [geofence, setGeofence] = useState<GeofenceResult | null>(null);
  const [faceVerified, setFaceVerified] = useState(false);
  const [checkingLocation, setCheckingLocation] = useState(false);
  const [punchTime, setPunchTime] = useState("11:12");
  const [toast, setToast] = useState<string | null>(null);
  const [historyFilter, setHistoryFilter] = useState("All");
  const [regularisationReason, setRegularisationReason] = useState(
    "Phone or network issue prevented a valid punch.",
  );
  const [selectedLanguage, setSelectedLanguage] = useState("English");
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const restoreTimer = window.setTimeout(() => {
      restoredState.current = true;
      setState(loadSuiteState());
    }, 0);
    return () => window.clearTimeout(restoreTimer);
  }, []);

  useEffect(() => {
    if (!restoredState.current) return;
    window.localStorage.setItem(SUITE_STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const employee = attendanceEmployee(employeeId);
  const registration =
    state.registrations.find((item) => item.employeeId === employeeId) ??
    state.registrations[0];
  const todayRecord = employeeRecordForToday(state, employeeId);
  const selectedStore =
    stores.find(
      (store) =>
        store.code ===
        (todayRecord?.storeCode || employee.homeStore),
    ) ?? stores[0];
  const currentShift = todayRecord?.shift ?? "OP";

  const allExceptions = useMemo(
    () =>
      state.attendance.filter((record) =>
        record.statuses.some((status) => status !== "On time"),
      ),
    [state.attendance],
  );

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 3200);
  }

  function addAudit(
    action: string,
    detail: string,
    actor = role,
  ): AttendanceAuditEvent {
    return {
      id: `audit-${Date.now()}-${Math.random()}`,
      actor,
      action,
      detail,
      createdAt: "Just now",
    };
  }

  function addNotification(
    notification: Omit<AttendanceNotification, "id" | "createdAt" | "status">,
  ): AttendanceNotification {
    return {
      ...notification,
      id: `att-note-${Date.now()}-${Math.random()}`,
      createdAt: "Just now",
      status: "Ready",
    };
  }

  function updateRegistration(
    updater: (record: RegistrationRecord) => RegistrationRecord,
  ) {
    setState((current) => ({
      ...current,
      registrations: current.registrations.map((item) =>
        item.employeeId === employeeId ? updater(item) : item,
      ),
    }));
  }

  function verifyOtp() {
    if (otp !== DEMO_OTP) {
      showToast("Enter the demo OTP 246810.");
      return;
    }
    updateRegistration((item) => ({
      ...item,
      status: "Face pending",
      otpVerifiedAt: "Just now",
      deviceName: "Current Android phone",
      deviceStatus: "Trusted",
    }));
    setState((current) => ({
      ...current,
      audit: [
        addAudit(
          "Registration OTP verified",
          `${employee.name} verified the registered mobile number.`,
          employee.name,
        ),
        ...current.audit,
      ],
    }));
    showToast("OTP verified. Complete liveness and face enrolment.");
  }

  function completeFaceEnrollment(source = "Demo camera") {
    updateRegistration((item) => ({
      ...item,
      status: "Active",
      faceEnrolledAt: "Just now",
      livenessVerified: true,
      deviceName: item.deviceName ?? "Current Android phone",
      deviceStatus: "Trusted",
    }));
    setState((current) => ({
      ...current,
      notifications: [
        addNotification({
          employeeId,
          audience: "Employee",
          kind: "Registration",
          message: `Hi ${employee.name.split(" ")[0]},\nYour Boldfit attendance registration and face enrolment are complete.`,
        }),
        ...current.notifications,
      ],
      audit: [
        addAudit(
          "Face enrolment completed",
          `${employee.name} passed liveness using ${source}.`,
          employee.name,
        ),
        ...current.audit,
      ],
    }));
    showToast("Face and liveness enrolled. Attendance is now active.");
  }

  function handleCameraCapture(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files?.[0]) {
      completeFaceEnrollment("mobile camera");
      event.target.value = "";
    }
  }

  function checkDemoLocation(kind: "inside" | "outside" | "weak") {
    if (!selectedStore) return;
    const distance = kind === "inside" ? 4 : 24;
    const result = evaluateStoreGeofence(selectedStore, {
      latitude: selectedStore.latitude + distance / 111_111,
      longitude: selectedStore.longitude,
      accuracyMeters: kind === "weak" ? 40 : 5,
    });
    setGeofence(result);
    setFaceVerified(false);
  }

  function checkLiveLocation() {
    if (!selectedStore || !navigator.geolocation) {
      showToast("Location services are unavailable on this device.");
      return;
    }
    setCheckingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeofence(
          evaluateStoreGeofence(selectedStore, {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracyMeters: position.coords.accuracy,
          }),
        );
        setFaceVerified(false);
        setCheckingLocation(false);
      },
      () => {
        setCheckingLocation(false);
        showToast("Allow precise location and retry near the store entrance.");
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15_000 },
    );
  }

  function verifyPunchFace() {
    if (!geofence?.allowed) {
      showToast("Pass the store geofence before face verification.");
      return;
    }
    if (registration.status !== "Active") {
      showToast("Complete registration and face enrolment first.");
      return;
    }
    setFaceVerified(true);
    showToast("Liveness and face match passed.");
  }

  function savePunch() {
    if (!geofence?.allowed || !faceVerified) {
      showToast("Location, liveness and face verification are required.");
      return;
    }
    try {
      const updated = createPunchRecord({
        employee,
        storeCode: selectedStore.code,
        shift: currentShift,
        time: punchTime,
        existing: todayRecord,
        geofence,
        action: todayRecord?.punchIn ? "Punch Out" : "Punch In",
      });
      const isPunchOut = Boolean(updated.punchOut);
      setState((current) => ({
        ...current,
        attendance: [
          updated,
          ...current.attendance.filter((item) => item.id !== updated.id),
        ],
        notifications: [
          addNotification({
            employeeId,
            audience: "Employee",
            kind: "Punch success",
            message: `Hi ${employee.name.split(" ")[0]},\nYour ${isPunchOut ? "Punch Out" : "Punch In"} at ${punchTime} for ${selectedStore.name} was successful.`,
          }),
          ...current.notifications,
        ],
        audit: [
          addAudit(
            isPunchOut ? "Punch Out recorded" : "Punch In recorded",
            `${employee.name} · ${selectedStore.code} · ${punchTime} · face and geofence verified.`,
            employee.name,
          ),
          ...current.audit,
        ],
      }));
      setFaceVerified(false);
      setGeofence(null);
      setPunchTime(isPunchOut ? "09:30" : "18:30");
      showToast(
        `${isPunchOut ? "Punch Out" : "Punch In"} recorded at ${punchTime}.`,
      );
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Punch failed.");
    }
  }

  function submitRegularisation() {
    const target = todayRecord;
    if (!target) {
      showToast("No attendance record is available for regularisation.");
      return;
    }
    const type = !target.punchIn
      ? "Missed Punch In"
      : !target.punchOut
        ? "Missed Punch Out"
        : "Incorrect time";
    setState((current) => ({
      ...current,
      regularisations: [
        {
          id: `reg-${Date.now()}`,
          employeeId,
          date: target.date,
          type,
          requestedPunchIn: target.punchIn || target.scheduledStart,
          requestedPunchOut: target.punchOut || target.scheduledEnd,
          reason: regularisationReason,
          status: "Pending SM",
          submittedAt: "Just now",
        },
        ...current.regularisations,
      ],
      attendance: current.attendance.map((record) =>
        record.id === target.id
          ? {
              ...record,
              statuses: Array.from(
                new Set([
                  ...record.statuses,
                  "Pending Regularisation" as const,
                ]),
              ),
              correctionStatus: "Pending",
            }
          : record,
      ),
      audit: [
        addAudit(
          "Regularisation submitted",
          `${employee.name} submitted ${type}.`,
          employee.name,
        ),
        ...current.audit,
      ],
    }));
    showToast("Attendance regularisation sent to the Store Manager.");
  }

  function decideRegularisation(
    requestId: string,
    decision: "Approved" | "Rejected",
    byAom = false,
  ) {
    const request = state.regularisations.find(
      (item) => item.id === requestId,
    );
    if (!request) return;
    const requiresAom =
      request.status === "Pending AOM" || request.type === "Incorrect time";
    const nextStatus =
      decision === "Approved" && requiresAom && !byAom
        ? "Pending AOM"
        : decision;
    setState((current) => ({
      ...current,
      regularisations: current.regularisations.map((item) =>
        item.id === requestId
          ? {
              ...item,
              status: nextStatus,
              managerComment:
                decision === "Approved"
                  ? "Attendance evidence reviewed."
                  : "Evidence did not support the requested change.",
            }
          : item,
      ),
      attendance: current.attendance.map((record) => {
        if (
          record.employeeId !== request.employeeId ||
          record.date !== request.date ||
          (nextStatus !== "Approved" && nextStatus !== "Rejected")
        ) {
          return record;
        }
        if (nextStatus === "Rejected") {
          return {
            ...record,
            correctionStatus: "Rejected" as const,
            statuses: record.statuses.filter(
              (status) => status !== "Pending Regularisation",
            ),
          };
        }
        const classified = classifyAttendance({
          shift: record.shift,
          punchIn: request.requestedPunchIn,
          punchOut: request.requestedPunchOut,
        });
        return {
          ...record,
          punchIn: request.requestedPunchIn,
          punchOut: request.requestedPunchOut,
          durationMinutes: classified.durationMinutes,
          statuses: classified.statuses,
          correctionStatus: "Approved" as const,
        };
      }),
      notifications: [
        addNotification({
          employeeId: request.employeeId,
          audience: "Employee",
          kind: "Request decision",
          message: `Hi ${attendanceEmployee(request.employeeId).name.split(" ")[0]},\nYour attendance regularisation for ${formatDisplayDate(request.date)} is ${nextStatus.toLowerCase()}.`,
        }),
        ...current.notifications,
      ],
      audit: [
        addAudit(
          `Regularisation ${nextStatus.toLowerCase()}`,
          `${attendanceEmployee(request.employeeId).name} · ${formatDisplayDate(request.date)}.`,
        ),
        ...current.audit,
      ],
    }));
    showToast(
      nextStatus === "Pending AOM"
        ? "Escalated to Area Operations for final approval."
        : `Regularisation ${nextStatus.toLowerCase()}.`,
    );
  }

  function decideLeave(requestId: string, approved: boolean) {
    setState((current) => ({
      ...current,
      leaveRequests: current.leaveRequests.map((request) =>
        request.id === requestId
          ? { ...request, status: approved ? "Approved" : "Rejected" }
          : request,
      ),
      audit: [
        addAudit(
          approved ? "Leave approved" : "Leave rejected",
          `Leave request ${requestId} was reviewed.`,
        ),
        ...current.audit,
      ],
    }));
    showToast(approved ? "Leave approved and roster protected." : "Leave rejected.");
  }

  function approveSwap(requestId: string, approved: boolean) {
    setState((current) => ({
      ...current,
      swaps: current.swaps.map((request) =>
        request.id === requestId
          ? { ...request, status: approved ? "Approved" : "Rejected" }
          : request,
      ),
      audit: [
        addAudit(
          approved ? "Shift swap approved" : "Shift swap rejected",
          `Coverage was recalculated for ${requestId}.`,
        ),
        ...current.audit,
      ],
    }));
    showToast(
      approved
        ? "Shift swap approved. Both employees will be notified."
        : "Shift swap rejected.",
    );
  }

  function volunteerForShift(shiftId: string) {
    setState((current) => ({
      ...current,
      openShifts: current.openShifts.map((shift) =>
        shift.id === shiftId
          ? {
              ...shift,
              volunteerIds: Array.from(
                new Set([...shift.volunteerIds, employeeId]),
              ),
            }
          : shift,
      ),
    }));
    showToast("Volunteered for the open shift. Store Manager notified.");
  }

  function fillOpenShift(shiftId: string, selectedEmployeeId: string) {
    setState((current) => ({
      ...current,
      openShifts: current.openShifts.map((shift) =>
        shift.id === shiftId
          ? {
              ...shift,
              selectedEmployeeId,
              status: "Filled",
            }
          : shift,
      ),
      audit: [
        addAudit(
          "Open shift filled",
          `${attendanceEmployee(selectedEmployeeId).name} assigned to ${shiftId}.`,
        ),
        ...current.audit,
      ],
    }));
    showToast("Open shift filled and employee notification prepared.");
  }

  function updatePreference(field: "preferredShift" | "preferredWeekOff", value: string) {
    setState((current) => ({
      ...current,
      preferences: current.preferences.map((preference) =>
        preference.employeeId === employeeId
          ? { ...preference, [field]: value }
          : preference,
      ),
    }));
    showToast("Roster preference saved.");
  }

  function resendInvite(targetEmployeeId: string) {
    const target = attendanceEmployee(targetEmployeeId);
    setState((current) => ({
      ...current,
      notifications: [
        addNotification({
          employeeId: targetEmployeeId,
          audience: "Employee",
          kind: "Registration",
          message: buildRegistrationInviteMessage(target),
        }),
        ...current.notifications,
      ],
      registrations: current.registrations.map((item) =>
        item.employeeId === targetEmployeeId
          ? {
              ...item,
              invitationSentAt: "Just now",
              invitationExpiresAt: "48 hours",
            }
          : item,
      ),
    }));
    showToast(`Registration invitation prepared for ${target.name}.`);
  }

  function runClosingProcess() {
    const notifications: AttendanceNotification[] = [];
    const updated = state.attendance.map((record) => {
      if (record.date !== todayIso()) return record;
      const classified = classifyAttendance({
        shift: record.shift,
        punchIn: record.punchIn,
        punchOut: record.punchOut,
        closingProcess: true,
      });
      const next = {
        ...record,
        statuses: classified.statuses,
        durationMinutes: classified.durationMinutes,
      };
      if (
        next.statuses.includes("Absent") ||
        next.statuses.includes("Missed Punch In") ||
        next.statuses.includes("Missed Punch Out")
      ) {
        notifications.push(
          addNotification({
            employeeId: record.employeeId,
            audience: "Employee",
            kind: "Attendance exception",
            message: buildClosingExceptionMessage(
              attendanceEmployee(record.employeeId),
              next,
            ),
          }),
        );
      }
      return next;
    });
    setState((current) => ({
      ...current,
      attendance: updated,
      notifications: [
        ...notifications,
        addNotification({
          audience: "Area Ops",
          kind: "Daily summary",
          message: `Dear AOM,\nDaily attendance closing completed for 3 stores. ${notifications.length} missed-punch or absence messages were prepared.`,
        }),
        ...current.notifications,
      ],
      audit: [
        addAudit(
          "11:59 PM closing completed",
          `${notifications.length} employee exceptions and one AOM summary prepared.`,
          "System",
        ),
        ...current.audit,
      ],
    }));
    showToast(
      `Closing completed. ${notifications.length} employee messages prepared.`,
    );
  }

  function sendPunchReminder(record: AttendanceRecord, type: "in" | "out") {
    const target = attendanceEmployee(record.employeeId);
    setState((current) => ({
      ...current,
      notifications: [
        addNotification({
          employeeId: target.id,
          audience: "Employee",
          kind: "Punch reminder",
          message: buildPunchReminderMessage(target, type),
        }),
        ...current.notifications,
      ],
    }));
    showToast(`${type === "in" ? "Punch In" : "Punch Out"} reminder prepared.`);
  }

  function toggleChecklist(storeCode: string, kind: "opening" | "closing") {
    setState((current) => ({
      ...current,
      checklists: current.checklists.map((checklist) =>
        checklist.storeCode === storeCode
          ? {
              ...checklist,
              openingComplete:
                kind === "opening"
                  ? !checklist.openingComplete
                  : checklist.openingComplete,
              closingComplete:
                kind === "closing"
                  ? !checklist.closingComplete
                  : checklist.closingComplete,
            }
          : checklist,
      ),
      audit: [
        addAudit(
          `${kind === "opening" ? "Opening" : "Closing"} checklist updated`,
          `${storeCode} checklist status changed.`,
        ),
        ...current.audit,
      ],
    }));
  }

  function advancePayroll() {
    const next = {
      Draft: "SM approved",
      "SM approved": "AOM approved",
      "AOM approved": "Locked",
      Locked: "Locked",
    }[state.payroll.status] as AttendanceSuiteState["payroll"]["status"];
    setState((current) => ({
      ...current,
      payroll: {
        ...current.payroll,
        status: next,
        smApprovedAt:
          next === "SM approved"
            ? "Just now"
            : current.payroll.smApprovedAt,
        aomApprovedAt:
          next === "AOM approved"
            ? "Just now"
            : current.payroll.aomApprovedAt,
        lockedAt: next === "Locked" ? "Just now" : current.payroll.lockedAt,
      },
      audit: [
        addAudit(
          `Payroll ${next.toLowerCase()}`,
          `${current.payroll.label} moved from ${current.payroll.status} to ${next}.`,
          "HR Admin",
        ),
        ...current.audit,
      ],
    }));
    showToast(`Payroll period moved to ${next}.`);
  }

  function approveCompOff(entryId: string) {
    setState((current) => ({
      ...current,
      compOff: current.compOff.map((entry) =>
        entry.id === entryId
          ? {
              ...entry,
              status:
                entry.status === "Pending" ? "Approved" : "Credited",
            }
          : entry,
      ),
    }));
    showToast("Compensatory-off balance updated.");
  }

  function toggleSkill(targetEmployeeId: string, skill: SkillName) {
    setState((current) => ({
      ...current,
      skills: current.skills.map((record) =>
        record.employeeId === targetEmployeeId
          ? {
              ...record,
              skills: record.skills.includes(skill)
                ? record.skills.filter((item) => item !== skill)
                : [...record.skills, skill],
            }
          : record,
      ),
      audit: [
        addAudit(
          "Skill matrix updated",
          `${attendanceEmployee(targetEmployeeId).name} · ${skill}.`,
          "HR Admin",
        ),
        ...current.audit,
      ],
    }));
  }

  function resetDevice(targetEmployeeId: string) {
    setState((current) => ({
      ...current,
      registrations: current.registrations.map((registrationItem) =>
        registrationItem.employeeId === targetEmployeeId
          ? {
              ...registrationItem,
              deviceStatus: "Unbound",
              deviceName: undefined,
              status: "OTP verified",
            }
          : registrationItem,
      ),
      notifications: [
        addNotification({
          employeeId: targetEmployeeId,
          audience: "Employee",
          kind: "Device security",
          message: `Hi ${attendanceEmployee(targetEmployeeId).name.split(" ")[0]},\nYour previous attendance device has been removed. Verify your new device before the next punch.`,
        }),
        ...current.notifications,
      ],
      audit: [
        addAudit(
          "Trusted device removed",
          `${attendanceEmployee(targetEmployeeId).name}'s device was reset.`,
          "HR Admin",
        ),
        ...current.audit,
      ],
    }));
    showToast("Trusted device removed and employee notified.");
  }

  function simulateOfflinePunch() {
    const fallbackGeofence: GeofenceResult = {
      status: "Inside",
      allowed: true,
      distanceMeters: 3.8,
      accuracyMeters: 5,
      message: "Offline location proof captured.",
    };
    const queued = createPunchRecord({
      employee,
      storeCode: selectedStore.code,
      shift: currentShift,
      time: punchTime,
      existing: todayRecord,
      geofence: fallbackGeofence,
      source: "Offline sync",
      action: todayRecord?.punchIn ? "Punch Out" : "Punch In",
    });
    setState((current) => ({
      ...current,
      offlineQueue: [queued, ...current.offlineQueue],
      audit: [
        addAudit(
          "Offline punch queued",
          `${employee.name} · signed device event waiting for network.`,
          employee.name,
        ),
        ...current.audit,
      ],
    }));
    showToast("Encrypted offline punch queued for synchronisation.");
  }

  function syncOfflineQueue() {
    setState((current) => ({
      ...current,
      attendance: [
        ...current.offlineQueue,
        ...current.attendance.filter(
          (record) =>
            !current.offlineQueue.some(
              (queued) =>
                queued.employeeId === record.employeeId &&
                queued.date === record.date,
            ),
        ),
      ],
      offlineQueue: [],
      audit: [
        addAudit(
          "Offline punches synchronised",
          `${current.offlineQueue.length} signed events uploaded.`,
          "System",
        ),
        ...current.audit,
      ],
    }));
    showToast("Offline punch queue synchronised.");
  }

  function exportPayroll() {
    const rows = [
      [
        "Employee code",
        "Employee",
        "Store",
        "Present",
        "Late",
        "Early",
        "Short",
        "Absent",
        "Hours",
      ],
      ...ATTENDANCE_EMPLOYEES.map((person) => {
        const summary = monthlyEmployeeSummary(state, person.id);
        return [
          person.id.toUpperCase(),
          person.name,
          person.homeStore,
          summary.present,
          summary.late,
          summary.early,
          summary.short,
          summary.absent,
          formatDuration(summary.totalMinutes),
        ];
      }),
    ];
    const csv = rows
      .map((row) =>
        row
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(","),
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = "boldfit-attendance-payroll-july-2026.csv";
    link.click();
    URL.revokeObjectURL(href);
    showToast("Payroll attendance CSV downloaded.");
  }

  function renderCurrentTab() {
    if (tab === "my-day") {
      return (
        <EmployeeDayView
          employeeId={employeeId}
          employee={employee}
          registration={registration}
          record={todayRecord}
          store={selectedStore}
          otp={otp}
          geofence={geofence}
          faceVerified={faceVerified}
          punchTime={punchTime}
          checkingLocation={checkingLocation}
          onEmployee={(value) => {
            setEmployeeId(value);
            setGeofence(null);
            setFaceVerified(false);
          }}
          onOtp={setOtp}
          onVerifyOtp={verifyOtp}
          onOpenCamera={() => cameraInputRef.current?.click()}
          onDemoEnrollment={() => completeFaceEnrollment()}
          onCheckLiveLocation={checkLiveLocation}
          onDemoLocation={checkDemoLocation}
          onVerifyFace={verifyPunchFace}
          onPunchTime={setPunchTime}
          onPunch={savePunch}
          onRegularise={submitRegularisation}
          regularisationReason={regularisationReason}
          onRegularisationReason={setRegularisationReason}
          onOfflinePunch={simulateOfflinePunch}
        />
      );
    }
    if (tab === "self-service") {
      return (
        <SelfServiceView
          role={role}
          state={state}
          employeeId={employeeId}
          onEmployee={setEmployeeId}
          onApproveSwap={approveSwap}
          onDecideLeave={decideLeave}
          onVolunteer={volunteerForShift}
          onFillOpenShift={fillOpenShift}
          onPreference={updatePreference}
        />
      );
    }
    if (tab === "history") {
      return (
        <HistoryView
          state={state}
          employee={employee}
          filter={historyFilter}
          onFilter={setHistoryFilter}
        />
      );
    }
    if (tab === "profile") {
      return (
        <EmployeeProfileView
          employee={employee}
          registration={registration}
          language={selectedLanguage}
          onLanguage={setSelectedLanguage}
          offlineCount={state.offlineQueue.length}
          onOfflinePunch={simulateOfflinePunch}
        />
      );
    }
    if (tab === "actions") {
      return (
        <ManagerActionView
          state={state}
          onRegularisation={decideRegularisation}
          onLeave={decideLeave}
          onSwap={approveSwap}
          onFillOpenShift={fillOpenShift}
          onReminder={sendPunchReminder}
          onClosing={runClosingProcess}
        />
      );
    }
    if (tab === "team") {
      return (
        <TeamSetupView state={state} onInvite={resendInvite} />
      );
    }
    if (tab === "store-ops") {
      return (
        <StoreOperationsView
          state={state}
          stores={stores}
          onChecklist={toggleChecklist}
        />
      );
    }
    if (tab === "live") {
      return (
        <LiveDashboard
          state={state}
          stores={stores}
          role={role}
          onReminder={sendPunchReminder}
        />
      );
    }
    if (tab === "exceptions") {
      return (
        <ExceptionView
          state={state}
          exceptions={allExceptions}
          onRegularisation={decideRegularisation}
          onClosing={runClosingProcess}
        />
      );
    }
    if (tab === "analytics") {
      return <AnalyticsView state={state} stores={stores} />;
    }
    if (tab === "operations") {
      return (
        <AreaOperationsView
          state={state}
          stores={stores}
          onChecklist={toggleChecklist}
          onFillOpenShift={fillOpenShift}
        />
      );
    }
    if (tab === "payroll") {
      return (
        <PayrollView
          state={state}
          onAdvance={advancePayroll}
          onExport={exportPayroll}
          onCompOff={approveCompOff}
        />
      );
    }
    if (tab === "people-admin") {
      return (
        <PeopleAdminView state={state} onSkill={toggleSkill} />
      );
    }
    return (
      <SecurityView
        state={state}
        onResetDevice={resetDevice}
        onSyncOffline={syncOfflineQueue}
      />
    );
  }

  return (
    <div className="attendance-suite">
      <div className="suite-role-banner">
        <div>
          <span className="eyebrow accent">WORKFORCE OPERATIONS</span>
          <h1>
            {role === "Employee"
              ? "My roster and attendance"
              : role === "Store Manager"
                ? "Store action centre"
                : role === "Area Ops"
                  ? "Area attendance command centre"
                  : "People, payroll and compliance"}
          </h1>
          <p>
            {role === "Store Manager"
              ? "The Store Manager receives approvals and action items. Live attendance monitoring is restricted to Area Operations and above."
              : role === "Employee"
                ? "Register once, verify the assigned store, match your face, and record every punch."
                : "Live multi-store visibility with controlled approvals, immutable history and payroll readiness."}
          </p>
        </div>
        <div className={`suite-access-badge ${role === "Store Manager" ? "restricted" : ""}`}>
          <span>{role === "Employee" ? "SELF" : role === "Store Manager" ? "STORE" : "LIVE"}</span>
          <strong>
            {role === "Store Manager"
              ? "No live dashboard"
              : role === "Employee"
                ? "Personal access"
                : "Authorised access"}
          </strong>
        </div>
      </div>

      <nav className="suite-tabs" aria-label={`${role} attendance sections`}>
        {ROLE_TABS[role].map((item) => (
          <button
            type="button"
            key={item.id}
            className={tab === item.id ? "active" : ""}
            onClick={() => setTab(item.id)}
          >
            <span>{item.short}</span>
            {item.label}
          </button>
        ))}
      </nav>

      {renderCurrentTab()}

      <input
        ref={cameraInputRef}
        className="suite-camera-input"
        type="file"
        accept="image/*"
        capture="user"
        onChange={handleCameraCapture}
        aria-label="Capture face using camera"
      />

      {toast && (
        <div className="suite-toast" role="status">
          <span>✓</span>
          {toast}
        </div>
      )}
    </div>
  );
}

function SuiteSectionHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="suite-section-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}

function SuiteStatus({ value }: { value: string }) {
  return <span className={`suite-status ${statusClass(value)}`}>{value}</span>;
}

function SuiteMetric({
  label,
  value,
  detail,
  tone = "ink",
}: {
  label: string;
  value: string | number;
  detail: string;
  tone?: "ink" | "green" | "amber" | "red" | "lime";
}) {
  return (
    <article className={`suite-metric ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

function EmployeeIdentity({ employeeId }: { employeeId: string }) {
  const employee = attendanceEmployee(employeeId);
  return (
    <div className="suite-person">
      <span className="avatar">{employee.initials}</span>
      <span>
        <strong>{employee.name}</strong>
        <small>{employee.role} · {employee.id.toUpperCase()}</small>
      </span>
    </div>
  );
}

function EmployeeDayView({
  employeeId,
  employee,
  registration,
  record,
  store,
  otp,
  geofence,
  faceVerified,
  punchTime,
  checkingLocation,
  onEmployee,
  onOtp,
  onVerifyOtp,
  onOpenCamera,
  onDemoEnrollment,
  onCheckLiveLocation,
  onDemoLocation,
  onVerifyFace,
  onPunchTime,
  onPunch,
  onRegularise,
  regularisationReason,
  onRegularisationReason,
  onOfflinePunch,
}: {
  employeeId: string;
  employee: ReturnType<typeof attendanceEmployee>;
  registration: RegistrationRecord;
  record?: AttendanceRecord;
  store: StoreLocation;
  otp: string;
  geofence: GeofenceResult | null;
  faceVerified: boolean;
  punchTime: string;
  checkingLocation: boolean;
  onEmployee: (value: string) => void;
  onOtp: (value: string) => void;
  onVerifyOtp: () => void;
  onOpenCamera: () => void;
  onDemoEnrollment: () => void;
  onCheckLiveLocation: () => void;
  onDemoLocation: (kind: "inside" | "outside" | "weak") => void;
  onVerifyFace: () => void;
  onPunchTime: (value: string) => void;
  onPunch: () => void;
  onRegularise: () => void;
  regularisationReason: string;
  onRegularisationReason: (value: string) => void;
  onOfflinePunch: () => void;
}) {
  const shift = record?.shift ?? "OP";
  const times = shiftTimes(shift);
  const complete = Boolean(record?.punchIn && record?.punchOut);
  const nextAction = record?.punchIn ? "Punch Out" : "Punch In";
  return (
    <>
      <div className="suite-demo-selector">
        <label>
          Demo employee
          <select
            value={employeeId}
            onChange={(event) => onEmployee(event.target.value)}
          >
            {ATTENDANCE_EMPLOYEES.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name} · {person.homeStore}
              </option>
            ))}
          </select>
        </label>
        <span>
          Switch employees to demonstrate invited, face-pending and active states.
        </span>
      </div>

      {registration.status !== "Active" ? (
        <section className="suite-panel suite-registration">
          <SuiteSectionHeading
            eyebrow="ONE-TIME SETUP"
            title="Activate roster attendance"
            description="Verify the registered mobile number, complete liveness, and enrol the employee face on a trusted device."
            action={<SuiteStatus value={registration.status} />}
          />
          <div className="registration-journey">
            <article className={registration.status !== "Invited" ? "done" : "active"}>
              <span>01</span>
              <strong>Invitation received</strong>
              <p>Single-use WhatsApp registration link valid for 48 hours.</p>
            </article>
            <article
              className={
                registration.status === "Face pending" ? "active" : registration.status === "Invited" ? "" : "done"
              }
            >
              <span>02</span>
              <strong>Mobile OTP</strong>
              <p>Employee code and registered phone ownership verified.</p>
            </article>
            <article className={registration.status === "Face pending" ? "active" : ""}>
              <span>03</span>
              <strong>Liveness and face</strong>
              <p>Front-camera capture becomes the attendance identity.</p>
            </article>
          </div>
          {registration.status === "Invited" ? (
            <div className="registration-action">
              <label>
                Demo OTP
                <input
                  value={otp}
                  inputMode="numeric"
                  onChange={(event) => onOtp(event.target.value)}
                  aria-label="Registration OTP"
                />
              </label>
              <button className="button primary" type="button" onClick={onVerifyOtp}>
                Verify OTP
              </button>
            </div>
          ) : (
            <div className="registration-action camera">
              <button className="button primary" type="button" onClick={onOpenCamera}>
                Open front camera
              </button>
              <button className="button secondary" type="button" onClick={onDemoEnrollment}>
                Use demo face & liveness
              </button>
              <p>No face image is added to the employee spreadsheet.</p>
            </div>
          )}
          <pre>{buildRegistrationInviteMessage(employee)}</pre>
        </section>
      ) : (
        <div className="suite-my-day-layout">
          <section className="suite-panel suite-today-card">
            <SuiteSectionHeading
              eyebrow={formatDisplayDate(todayIso()).toUpperCase()}
              title={`${shift} · ${SHIFT_DEFINITIONS[shift].label}`}
              description={`${store.name} · ${times.start}–${times.end}`}
              action={<SuiteStatus value={complete ? "Completed" : nextAction} />}
            />
            <div className="today-timeline">
              <div className={record?.punchIn ? "complete" : "current"}>
                <span>IN</span>
                <strong>{record?.punchIn ?? "Not punched"}</strong>
                <small>Scheduled {times.start}</small>
              </div>
              <i />
              <div className={record?.punchOut ? "complete" : record?.punchIn ? "current" : ""}>
                <span>OUT</span>
                <strong>{record?.punchOut ?? "Not punched"}</strong>
                <small>Scheduled {times.end}</small>
              </div>
            </div>
            <div className="today-statuses">
              {(record?.statuses.length ? record.statuses : ["Ready"]).map(
                (status) => (
                  <SuiteStatus key={status} value={status} />
                ),
              )}
              {record?.durationMinutes !== undefined && (
                <strong>{formatDuration(record.durationMinutes)} worked</strong>
              )}
            </div>
          </section>

          <section className="suite-panel suite-punch-flow">
            <SuiteSectionHeading
              eyebrow="SECURE PUNCH"
              title={complete ? "Attendance complete" : nextAction}
              description="The sequence is fixed: assigned store → precise GPS → liveness → face → backend timestamp."
            />
            <div className="punch-security-grid">
              <article className={geofence?.allowed ? "done" : geofence ? "failed" : "current"}>
                <span>01</span>
                <strong>Store geofence</strong>
                <p>
                  {geofence
                    ? `${geofence.status} · ${geofence.distanceMeters}m · ±${geofence.accuracyMeters}m`
                    : `Waiting · ${store.geofenceRadiusMeters}m boundary`}
                </p>
              </article>
              <article className={faceVerified ? "done" : geofence?.allowed ? "current" : ""}>
                <span>02</span>
                <strong>Liveness & face</strong>
                <p>
                  {faceVerified
                    ? "Match passed"
                    : geofence?.allowed
                      ? "Ready for live capture"
                      : "Locked until location passes"}
                </p>
              </article>
              <article className={complete ? "done" : faceVerified ? "current" : ""}>
                <span>03</span>
                <strong>Save punch</strong>
                <p>Immutable event with server timestamp and audit proof</p>
              </article>
            </div>

            {!complete && (
              <>
                <button
                  className="button primary suite-wide-button"
                  type="button"
                  onClick={onCheckLiveLocation}
                  disabled={checkingLocation}
                >
                  {checkingLocation ? "Finding precise location…" : "Use current phone location"}
                </button>
                <div className="suite-demo-buttons">
                  <button type="button" onClick={() => onDemoLocation("inside")}>
                    Demo inside 4m
                  </button>
                  <button type="button" onClick={() => onDemoLocation("outside")}>
                    Demo outside 24m
                  </button>
                  <button type="button" onClick={() => onDemoLocation("weak")}>
                    Demo weak GPS
                  </button>
                </div>
                {geofence && (
                  <div className={`suite-location-result ${statusClass(geofence.status)}`}>
                    <strong>{geofence.status}</strong>
                    <span>{geofence.message}</span>
                  </div>
                )}
                <button
                  className="button secondary suite-wide-button"
                  type="button"
                  onClick={onVerifyFace}
                  disabled={!geofence?.allowed}
                >
                  {faceVerified ? "Face verified ✓" : "Capture live face"}
                </button>
                <label className="suite-time-field">
                  Demo backend time
                  <input
                    type="time"
                    value={punchTime}
                    onChange={(event) => onPunchTime(event.target.value)}
                  />
                </label>
                <button
                  className="button primary suite-wide-button"
                  type="button"
                  onClick={onPunch}
                  disabled={!faceVerified}
                >
                  Save {nextAction}
                </button>
              </>
            )}
          </section>
        </div>
      )}

      {registration.status === "Active" && (
        <div className="suite-secondary-grid">
          <section className="suite-panel suite-regularisation">
            <SuiteSectionHeading
              eyebrow="MISSED OR INCORRECT PUNCH"
              title="Attendance regularisation"
              description="The original event remains visible while the correction follows Store Manager and, where required, AOM approval."
            />
            <textarea
              value={regularisationReason}
              onChange={(event) => onRegularisationReason(event.target.value)}
              aria-label="Regularisation reason"
            />
            <button className="button secondary" type="button" onClick={onRegularise}>
              Submit correction request
            </button>
          </section>
          <section className="suite-panel suite-fallback">
            <SuiteSectionHeading
              eyebrow="NETWORK FALLBACK"
              title="Encrypted offline punch"
              description="Captures signed device time, store proof and face result, then marks the event as pending until the backend validates it."
            />
            <button className="button ghost" type="button" onClick={onOfflinePunch}>
              Simulate offline capture
            </button>
          </section>
        </div>
      )}
    </>
  );
}

function SelfServiceView({
  role,
  state,
  employeeId,
  onEmployee,
  onApproveSwap,
  onDecideLeave,
  onVolunteer,
  onFillOpenShift,
  onPreference,
}: {
  role: DemoRole;
  state: AttendanceSuiteState;
  employeeId: string;
  onEmployee: (value: string) => void;
  onApproveSwap: (id: string, approved: boolean) => void;
  onDecideLeave: (id: string, approved: boolean) => void;
  onVolunteer: (id: string) => void;
  onFillOpenShift: (id: string, employeeId: string) => void;
  onPreference: (
    field: "preferredShift" | "preferredWeekOff",
    value: string,
  ) => void;
}) {
  const preference =
    state.preferences.find((item) => item.employeeId === employeeId) ??
    state.preferences[0];
  const isManager = role === "Store Manager";
  return (
    <>
      <SuiteSectionHeading
        eyebrow="ROSTER SELF-SERVICE"
        title={isManager ? "Team requests and open shifts" : "Plan around real life"}
        description={
          isManager
            ? "Approve requests only after the system confirms coverage, overlapping shifts and weekly workload."
            : "Request a swap or leave, volunteer for open shifts, and record preferences without directly changing the published roster."
        }
        action={
          !isManager ? (
            <select
              className="suite-inline-select"
              value={employeeId}
              onChange={(event) => onEmployee(event.target.value)}
              aria-label="Self-service employee"
            >
              {ATTENDANCE_EMPLOYEES.map((person) => (
                <option value={person.id} key={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          ) : undefined
        }
      />

      <div className="suite-request-grid">
        <section className="suite-panel">
          <div className="suite-card-heading">
            <div>
              <span className="eyebrow">SHIFT SWAPS</span>
              <h3>Coverage-safe exchanges</h3>
            </div>
            <span className="count-badge">{state.swaps.length}</span>
          </div>
          <div className="suite-list">
            {state.swaps.map((swap) => (
              <article key={swap.id}>
                <EmployeeIdentity employeeId={swap.requesterId} />
                <p>
                  {formatDisplayDate(swap.date)} · {swap.requesterShift} ↔{" "}
                  {swap.partnerShift} with{" "}
                  {attendanceEmployee(swap.partnerId).name}
                </p>
                <SuiteStatus value={swap.status} />
                {isManager && swap.status === "Pending SM" && (
                  <div className="suite-row-actions">
                    <button type="button" onClick={() => onApproveSwap(swap.id, false)}>
                      Reject
                    </button>
                    <button type="button" onClick={() => onApproveSwap(swap.id, true)}>
                      Approve swap
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>

        <section className="suite-panel">
          <div className="suite-card-heading">
            <div>
              <span className="eyebrow">LEAVE & AVAILABILITY</span>
              <h3>Protected roster dates</h3>
            </div>
            <span className="count-badge">{state.leaveRequests.length}</span>
          </div>
          <div className="suite-list">
            {state.leaveRequests.map((request) => (
              <article key={request.id}>
                <EmployeeIdentity employeeId={request.employeeId} />
                <p>
                  {formatDisplayDate(request.fromDate)} · {request.leaveType}
                  <br />
                  {request.reason}
                </p>
                <SuiteStatus value={request.status} />
                {isManager && request.status === "Pending" && (
                  <div className="suite-row-actions">
                    <button type="button" onClick={() => onDecideLeave(request.id, false)}>
                      Reject
                    </button>
                    <button type="button" onClick={() => onDecideLeave(request.id, true)}>
                      Approve leave
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>

        <section className="suite-panel">
          <div className="suite-card-heading">
            <div>
              <span className="eyebrow">OPEN SHIFTS</span>
              <h3>Volunteer marketplace</h3>
            </div>
            <span className="count-badge">{state.openShifts.length}</span>
          </div>
          <div className="suite-list">
            {state.openShifts.map((shift) => (
              <article key={shift.id}>
                <strong>{shift.storeCode} · {shift.shift}</strong>
                <p>
                  {formatDisplayDate(shift.date)} · {shift.role}
                  <br />
                  {shift.volunteerIds.length} eligible volunteers
                </p>
                <SuiteStatus value={shift.status} />
                {shift.status === "Open" &&
                  (isManager ? (
                    <button
                      type="button"
                      onClick={() =>
                        onFillOpenShift(
                          shift.id,
                          shift.volunteerIds[0] ?? employeeId,
                        )
                      }
                    >
                      Select best eligible
                    </button>
                  ) : (
                    <button type="button" onClick={() => onVolunteer(shift.id)}>
                      Volunteer
                    </button>
                  ))}
              </article>
            ))}
          </div>
        </section>

        {!isManager && (
          <section className="suite-panel suite-preferences">
            <div className="suite-card-heading">
              <div>
                <span className="eyebrow">PREFERENCES</span>
                <h3>Help the planner</h3>
              </div>
              <SuiteStatus value="Not guaranteed" />
            </div>
            <label>
              Preferred shift
              <select
                value={preference.preferredShift}
                onChange={(event) =>
                  onPreference("preferredShift", event.target.value)
                }
              >
                {ATTENDANCE_WORK_SHIFTS.map((shift) => (
                  <option key={shift} value={shift}>
                    {shift} · {SHIFT_DEFINITIONS[shift].label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Preferred week off
              <select
                value={preference.preferredWeekOff}
                onChange={(event) =>
                  onPreference("preferredWeekOff", event.target.value)
                }
              >
                {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map(
                  (day) => (
                    <option key={day}>{day}</option>
                  ),
                )}
              </select>
            </label>
            <p>
              Preferences inform auto-fill but never override coverage, approved
              leave or working-hour rules.
            </p>
          </section>
        )}
      </div>
    </>
  );
}

function HistoryView({
  state,
  employee,
  filter,
  onFilter,
}: {
  state: AttendanceSuiteState;
  employee: ReturnType<typeof attendanceEmployee>;
  filter: string;
  onFilter: (value: string) => void;
}) {
  const summary = monthlyEmployeeSummary(state, employee.id);
  const records = state.attendance.filter(
    (record) =>
      record.employeeId === employee.id &&
      (filter === "All" || record.statuses.includes(filter as AttendanceException)),
  );
  return (
    <>
      <SuiteSectionHeading
        eyebrow="MY ATTENDANCE"
        title={`${employee.name}'s datewise history`}
        description="Every original punch, system classification and approved correction remains traceable."
        action={
          <select
            className="suite-inline-select"
            value={filter}
            onChange={(event) => onFilter(event.target.value)}
          >
            {["All", "On time", "Late Login", "Early Logout", "Short Timing", "Absent"].map(
              (item) => (
                <option key={item}>{item}</option>
              ),
            )}
          </select>
        }
      />
      <div className="suite-metric-grid five">
        <SuiteMetric label="Present" value={summary.present} detail="valid Punch In records" tone="green" />
        <SuiteMetric label="Late" value={summary.late} detail="after 10-minute grace" tone="amber" />
        <SuiteMetric label="Early" value={summary.early} detail="before end grace" tone="amber" />
        <SuiteMetric label="Short" value={summary.short} detail="below shift minimum" tone="red" />
        <SuiteMetric label="Worked" value={formatDuration(summary.totalMinutes)} detail="recorded duration" />
      </div>
      <section className="suite-panel suite-table-panel">
        <div className="suite-table suite-history-table">
          <div className="suite-table-head">
            <span>Date</span><span>Store</span><span>Shift</span><span>In</span><span>Out</span><span>Hours</span><span>Status</span>
          </div>
          {records.map((record) => (
            <div className="suite-table-row" key={record.id}>
              <strong>{formatDisplayDate(record.date)}</strong>
              <span>{record.storeCode}</span>
              <span>{record.shift}</span>
              <span>{record.punchIn ?? "—"}</span>
              <span>{record.punchOut ?? "—"}</span>
              <span>{formatDuration(record.durationMinutes)}</span>
              <div>{record.statuses.map((status) => <SuiteStatus key={status} value={status} />)}</div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function EmployeeProfileView({
  employee,
  registration,
  language,
  onLanguage,
  offlineCount,
  onOfflinePunch,
}: {
  employee: ReturnType<typeof attendanceEmployee>;
  registration: RegistrationRecord;
  language: string;
  onLanguage: (value: string) => void;
  offlineCount: number;
  onOfflinePunch: () => void;
}) {
  return (
    <>
      <SuiteSectionHeading
        eyebrow="IDENTITY & ACCESS"
        title="My attendance profile"
        description="Employees can see their trusted device, face enrolment and privacy controls without seeing another employee's data."
      />
      <div className="suite-profile-grid">
        <section className="suite-panel suite-profile-card">
          <EmployeeIdentity employeeId={employee.id} />
          <dl>
            <div><dt>Home store</dt><dd>{employee.homeStore}</dd></div>
            <div><dt>Registered mobile</dt><dd>{employee.phone}</dd></div>
            <div><dt>Face enrolment</dt><dd><SuiteStatus value={registration.status} /></dd></div>
            <div><dt>Trusted device</dt><dd>{registration.deviceName ?? "Not linked"}</dd></div>
            <div><dt>Device status</dt><dd><SuiteStatus value={registration.deviceStatus} /></dd></div>
          </dl>
        </section>
        <section className="suite-panel suite-setting-card">
          <h3>Language and accessibility</h3>
          <label>
            App language
            <select value={language} onChange={(event) => onLanguage(event.target.value)}>
              <option>English</option>
              <option>Hindi</option>
              <option>Kannada</option>
            </select>
          </label>
          <p>Large tap targets, clear error text and camera guidance remain available in each supported language.</p>
        </section>
        <section className="suite-panel suite-setting-card">
          <h3>Offline and emergency fallback</h3>
          <p>{offlineCount} encrypted events are waiting to synchronise.</p>
          <button className="button secondary" type="button" onClick={onOfflinePunch}>
            Queue a demo offline punch
          </button>
          <small>Manager-assisted attendance requires a reason, current selfie and audit entry.</small>
        </section>
        <section className="suite-panel suite-setting-card">
          <h3>Face-data controls</h3>
          <p>Encrypted biometric template for matching. Event selfies follow the configured retention policy and restricted access.</p>
          <button className="button ghost" type="button">Request data review</button>
        </section>
      </div>
    </>
  );
}

function ManagerActionView({
  state,
  onRegularisation,
  onLeave,
  onSwap,
  onFillOpenShift,
  onReminder,
  onClosing,
}: {
  state: AttendanceSuiteState;
  onRegularisation: (id: string, decision: "Approved" | "Rejected") => void;
  onLeave: (id: string, approved: boolean) => void;
  onSwap: (id: string, approved: boolean) => void;
  onFillOpenShift: (id: string, employeeId: string) => void;
  onReminder: (record: AttendanceRecord, type: "in" | "out") => void;
  onClosing: () => void;
}) {
  const pendingRegs = state.regularisations.filter((item) => item.status === "Pending SM");
  const pendingLeave = state.leaveRequests.filter((item) => item.status === "Pending");
  const pendingSwaps = state.swaps.filter((item) => item.status === "Pending SM");
  const localRecords = state.attendance.filter((item) => item.storeCode === "BF-BLR-01" && item.date === todayIso());
  const actionCount = pendingRegs.length + pendingLeave.length + pendingSwaps.length;
  return (
    <>
      <div className="suite-restriction-notice">
        <span>ROLE CONTROL</span>
        <strong>Store Managers do not have the Live Attendance Dashboard.</strong>
        <p>This page contains only store-specific decisions and assigned action items. Multi-store real-time monitoring is restricted to Area Operations and above.</p>
      </div>
      <div className="suite-metric-grid four">
        <SuiteMetric label="Assigned actions" value={actionCount} detail="awaiting Store Manager decision" tone="amber" />
        <SuiteMetric label="Registration pending" value={state.registrations.filter((item) => item.status !== "Active" && attendanceEmployee(item.employeeId).homeStore === "BF-BLR-01").length} detail="invite or face enrolment incomplete" />
        <SuiteMetric label="Roster requests" value={pendingLeave.length + pendingSwaps.length} detail="coverage check required" tone="lime" />
        <SuiteMetric label="Closing process" value="23:59" detail="system-owned final classification" />
      </div>

      <div className="suite-manager-grid">
        <section className="suite-panel">
          <div className="suite-card-heading">
            <div><span className="eyebrow">ATTENDANCE CORRECTIONS</span><h3>Regularisation approvals</h3></div>
            <span className="count-badge">{pendingRegs.length}</span>
          </div>
          <div className="suite-list">
            {pendingRegs.map((request) => (
              <article key={request.id}>
                <EmployeeIdentity employeeId={request.employeeId} />
                <p>{formatDisplayDate(request.date)} · {request.type}<br />{request.reason}</p>
                <div className="suite-evidence">
                  Requested: {request.requestedPunchIn ?? "—"}–{request.requestedPunchOut ?? "—"} · Original preserved
                </div>
                <div className="suite-row-actions">
                  <button type="button" onClick={() => onRegularisation(request.id, "Rejected")}>Reject</button>
                  <button type="button" onClick={() => onRegularisation(request.id, "Approved")}>Approve</button>
                </div>
              </article>
            ))}
            {pendingRegs.length === 0 && <div className="suite-empty">No Store Manager corrections pending.</div>}
          </div>
        </section>

        <section className="suite-panel">
          <div className="suite-card-heading">
            <div><span className="eyebrow">PUNCH ACTIONS</span><h3>Assigned reminders</h3></div>
            <button type="button" onClick={onClosing}>Run 23:59 demo</button>
          </div>
          <div className="suite-list compact">
            {localRecords
              .filter((record) => !record.punchIn || !record.punchOut)
              .map((record) => (
                <article key={record.id}>
                  <EmployeeIdentity employeeId={record.employeeId} />
                  <p>{record.shift} · {record.punchIn ? `In ${record.punchIn}; Punch Out missing` : "Punch In missing"}</p>
                  <button type="button" onClick={() => onReminder(record, record.punchIn ? "out" : "in")}>
                    Prepare reminder
                  </button>
                </article>
              ))}
          </div>
        </section>

        <section className="suite-panel">
          <div className="suite-card-heading">
            <div><span className="eyebrow">LEAVE REQUESTS</span><h3>Protect roster dates</h3></div>
            <span className="count-badge">{pendingLeave.length}</span>
          </div>
          <div className="suite-list compact">
            {pendingLeave.map((request) => (
              <article key={request.id}>
                <EmployeeIdentity employeeId={request.employeeId} />
                <p>{formatDisplayDate(request.fromDate)} · {request.leaveType}<br />Coverage impact: one open CL shift</p>
                <div className="suite-row-actions">
                  <button type="button" onClick={() => onLeave(request.id, false)}>Reject</button>
                  <button type="button" onClick={() => onLeave(request.id, true)}>Approve</button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="suite-panel">
          <div className="suite-card-heading">
            <div><span className="eyebrow">SHIFTS</span><h3>Swaps and open shifts</h3></div>
          </div>
          <div className="suite-list compact">
            {pendingSwaps.map((swap) => (
              <article key={swap.id}>
                <EmployeeIdentity employeeId={swap.requesterId} />
                <p>{formatDisplayDate(swap.date)} · partner accepted · no overlap</p>
                <div className="suite-row-actions">
                  <button type="button" onClick={() => onSwap(swap.id, false)}>Reject</button>
                  <button type="button" onClick={() => onSwap(swap.id, true)}>Approve</button>
                </div>
              </article>
            ))}
            {state.openShifts.filter((shift) => shift.status === "Open").map((shift) => (
              <article key={shift.id}>
                <strong>{shift.storeCode} · {shift.shift} open</strong>
                <p>{shift.volunteerIds.length} eligible volunteers · skill and hour checks passed</p>
                <button type="button" onClick={() => onFillOpenShift(shift.id, shift.volunteerIds[0])}>Fill shift</button>
              </article>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

function TeamSetupView({
  state,
  onInvite,
}: {
  state: AttendanceSuiteState;
  onInvite: (employeeId: string) => void;
}) {
  const storeTeam = ATTENDANCE_EMPLOYEES.filter((employee) => employee.homeStore === "BF-BLR-01");
  return (
    <>
      <SuiteSectionHeading
        eyebrow="TEAM ONBOARDING"
        title="Registration readiness"
        description="Store Managers can resend invitations and see completion status. They cannot view biometric templates or raw identity data."
      />
      <section className="suite-panel suite-table-panel">
        <div className="suite-table suite-registration-table">
          <div className="suite-table-head"><span>Employee</span><span>Registration</span><span>Liveness</span><span>Device</span><span>Invite</span></div>
          {storeTeam.map((employee) => {
            const registration = state.registrations.find((item) => item.employeeId === employee.id)!;
            return (
              <div className="suite-table-row" key={employee.id}>
                <EmployeeIdentity employeeId={employee.id} />
                <SuiteStatus value={registration.status} />
                <span>{registration.livenessVerified ? "Verified" : "Pending"}</span>
                <span>{registration.deviceName ?? "Not linked"}</span>
                <button type="button" onClick={() => onInvite(employee.id)}>Resend</button>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}

function StoreOperationsView({
  state,
  stores,
  onChecklist,
}: {
  state: AttendanceSuiteState;
  stores: StoreLocation[];
  onChecklist: (storeCode: string, kind: "opening" | "closing") => void;
}) {
  const checklist = state.checklists.find((item) => item.storeCode === "BF-BLR-01")!;
  const demand = state.demand.find((item) => item.storeCode === "BF-BLR-01")!;
  const store = stores.find((item) => item.code === "BF-BLR-01")!;
  return (
    <>
      <SuiteSectionHeading
        eyebrow="STORE OPERATIONS"
        title={`${store.name} responsibilities`}
        description="Action-based store controls without access to the Area Operations live dashboard."
      />
      <div className="suite-ops-grid">
        <section className="suite-panel suite-checklist">
          <div className="suite-card-heading"><div><span className="eyebrow">OPEN / CLOSE</span><h3>Key-holder checklist</h3></div></div>
          <EmployeeIdentity employeeId={checklist.openerId} />
          <ul>{checklist.openingItems.map((item) => <li key={item}>{item}</li>)}</ul>
          <button type="button" className="button secondary" onClick={() => onChecklist(checklist.storeCode, "opening")}>
            {checklist.openingComplete ? "Reopen opening checklist" : "Complete opening checklist"}
          </button>
          <EmployeeIdentity employeeId={checklist.closerId} />
          <ul>{checklist.closingItems.map((item) => <li key={item}>{item}</li>)}</ul>
          <button type="button" className="button secondary" onClick={() => onChecklist(checklist.storeCode, "closing")}>
            {checklist.closingComplete ? "Reopen closing checklist" : "Complete closing checklist"}
          </button>
        </section>
        <section className="suite-panel suite-demand-card">
          <div className="suite-card-heading"><div><span className="eyebrow">TODAY&apos;S PLAN</span><h3>Sales and footfall forecast</h3></div></div>
          <div className="demand-numbers">
            <div><span>Forecast sales</span><strong>{formatCurrency(demand.forecastSales)}</strong></div>
            <div><span>Footfall</span><strong>{demand.forecastFootfall}</strong></div>
            <div><span>Scheduled</span><strong>{demand.scheduledPeople}</strong></div>
            <div><span>Recommended</span><strong>{demand.recommendedPeople}</strong></div>
          </div>
          <SuiteStatus value={demand.scheduledPeople === demand.recommendedPeople ? "Right staffed" : "Review staffing"} />
        </section>
      </div>
    </>
  );
}

function LiveDashboard({
  state,
  stores,
  role,
  onReminder,
}: {
  state: AttendanceSuiteState;
  stores: StoreLocation[];
  role: DemoRole;
  onReminder: (record: AttendanceRecord, type: "in" | "out") => void;
}) {
  if (role !== "Area Ops" && role !== "HR Admin") {
    return <div className="suite-restriction-notice"><strong>Live dashboard access denied.</strong></div>;
  }
  const totals = stores.map((store) => storeAttendanceSummary(state, store.code));
  const aggregate = totals.reduce(
    (sum, item) => ({
      scheduled: sum.scheduled + item.scheduled,
      present: sum.present + item.present,
      late: sum.late + item.late,
      absent: sum.absent + item.absent,
      missingPunch: sum.missingPunch + item.missingPunch,
      shortTiming: sum.shortTiming + item.shortTiming,
    }),
    { scheduled: 0, present: 0, late: 0, absent: 0, missingPunch: 0, shortTiming: 0 },
  );
  return (
    <>
      <SuiteSectionHeading
        eyebrow="LIVE · AREA OPERATIONS AND ABOVE"
        title="Three stores, one operating picture"
        description="Real-time attendance events are visible only to authorised Area Operations, Regional/Zonal Operations, HR and Admin roles."
        action={<span className="suite-live-indicator"><i />Live now</span>}
      />
      <div className="suite-metric-grid six">
        <SuiteMetric label="Scheduled" value={aggregate.scheduled} detail="across 3 stores" />
        <SuiteMetric label="Present" value={aggregate.present} detail="valid Punch In" tone="green" />
        <SuiteMetric label="Late" value={aggregate.late} detail="past 10-minute grace" tone="amber" />
        <SuiteMetric label="Absent" value={aggregate.absent} detail="closed-day absence" tone="red" />
        <SuiteMetric label="Missing punch" value={aggregate.missingPunch} detail="requires follow-up" tone="amber" />
        <SuiteMetric label="Exceptions" value={exceptionCount(state)} detail="datewise records" />
      </div>

      <section className="suite-store-live-grid">
        {stores.map((store) => {
          const summary = storeAttendanceSummary(state, store.code);
          const demand = state.demand.find((item) => item.storeCode === store.code)!;
          return (
            <article className="suite-panel live-store-card" key={store.code}>
              <div className="live-store-top">
                <div><span>{store.code}</span><h3>{store.name}</h3></div>
                <SuiteStatus value={summary.present >= demand.recommendedPeople ? "Covered" : "Attention"} />
              </div>
              <div className="live-store-score">
                <strong>{summary.present}/{summary.scheduled}</strong>
                <span>punched in</span>
              </div>
              <div className="live-store-bars">
                <span style={{ width: `${Math.round((summary.present / summary.scheduled) * 100)}%` }} />
              </div>
              <dl>
                <div><dt>Late</dt><dd>{summary.late}</dd></div>
                <div><dt>Absent</dt><dd>{summary.absent}</dd></div>
                <div><dt>Missing punch</dt><dd>{summary.missingPunch}</dd></div>
                <div><dt>Footfall forecast</dt><dd>{demand.forecastFootfall}</dd></div>
              </dl>
            </article>
          );
        })}
      </section>

      <section className="suite-panel suite-table-panel">
        <div className="suite-card-heading">
          <div><span className="eyebrow">LIVE TEAM STATUS</span><h3>Current attendance by store</h3></div>
        </div>
        <div className="suite-table suite-live-table">
          <div className="suite-table-head"><span>Employee</span><span>Store</span><span>Shift</span><span>Punch In</span><span>Punch Out</span><span>Status</span><span>Action</span></div>
          {state.attendance.filter((record) => record.date === todayIso()).map((record) => (
            <div className="suite-table-row" key={record.id}>
              <EmployeeIdentity employeeId={record.employeeId} />
              <span>{record.storeCode}</span>
              <span>{record.shift}</span>
              <span>{record.punchIn ?? "Missing"}</span>
              <span>{record.punchOut ?? "Open"}</span>
              <div>{record.statuses.length ? record.statuses.map((status) => <SuiteStatus key={status} value={status} />) : <SuiteStatus value="In progress" />}</div>
              <button type="button" onClick={() => onReminder(record, record.punchIn ? "out" : "in")}>Notify</button>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function ExceptionView({
  state,
  exceptions,
  onRegularisation,
  onClosing,
}: {
  state: AttendanceSuiteState;
  exceptions: AttendanceRecord[];
  onRegularisation: (id: string, decision: "Approved" | "Rejected", byAom?: boolean) => void;
  onClosing: () => void;
}) {
  const pendingAom = state.regularisations.filter((item) => item.status === "Pending AOM");
  return (
    <>
      <SuiteSectionHeading
        eyebrow="EXCEPTION CONTROL"
        title="Resolve what can affect people or payroll"
        description="AOM reviews escalated corrections and monitors repeated exceptions across stores."
        action={<button className="button primary" type="button" onClick={onClosing}>Run 23:59 closing</button>}
      />
      <div className="suite-exception-layout">
        <section className="suite-panel">
          <div className="suite-card-heading"><div><span className="eyebrow">AOM APPROVAL</span><h3>Escalated regularisations</h3></div><span className="count-badge">{pendingAom.length}</span></div>
          <div className="suite-list">
            {pendingAom.map((request) => (
              <article key={request.id}>
                <EmployeeIdentity employeeId={request.employeeId} />
                <p>{formatDisplayDate(request.date)} · {request.type}<br />{request.reason}</p>
                <div className="suite-row-actions">
                  <button type="button" onClick={() => onRegularisation(request.id, "Rejected", true)}>Reject</button>
                  <button type="button" onClick={() => onRegularisation(request.id, "Approved", true)}>Approve correction</button>
                </div>
              </article>
            ))}
          </div>
        </section>
        <section className="suite-panel suite-exception-feed">
          <div className="suite-card-heading"><div><span className="eyebrow">ALL STORES</span><h3>Attendance exceptions</h3></div><span className="count-badge">{exceptions.length}</span></div>
          {exceptions.slice(0, 12).map((record) => (
            <article key={record.id}>
              <EmployeeIdentity employeeId={record.employeeId} />
              <span>{record.storeCode} · {formatDisplayDate(record.date)}</span>
              <div>{record.statuses.map((status) => <SuiteStatus key={status} value={status} />)}</div>
            </article>
          ))}
        </section>
      </div>
    </>
  );
}

function AnalyticsView({
  state,
  stores,
}: {
  state: AttendanceSuiteState;
  stores: StoreLocation[];
}) {
  return (
    <>
      <SuiteSectionHeading
        eyebrow="WORKFORCE ANALYTICS"
        title="Coverage, punctuality and productivity"
        description="Operational comparisons are designed for staffing decisions—not employee league tables."
      />
      <section className="suite-panel suite-analytics-chart">
        <div className="suite-card-heading"><div><span className="eyebrow">STORE COMPARISON</span><h3>Punctuality and coverage</h3></div></div>
        <div className="analytics-bars">
          {stores.map((store, index) => {
            const summary = storeAttendanceSummary(state, store.code);
            const punctuality = Math.max(0, Math.round(((summary.present - summary.late) / summary.scheduled) * 100));
            return (
              <article key={store.code}>
                <div><strong>{store.name}</strong><span>{punctuality}% punctual</span></div>
                <div className="analytics-track"><span style={{ width: `${punctuality}%` }} /></div>
                <small>{summary.present} present · {summary.late} late · {summary.absent} absent</small>
                <i style={{ height: `${60 + index * 16}px` }} />
              </article>
            );
          })}
        </div>
      </section>
      <div className="suite-demand-grid">
        {state.demand.map((demand) => {
          const labourHours = demand.scheduledPeople * 9;
          return (
            <article className="suite-panel" key={demand.storeCode}>
              <span className="eyebrow">{demand.storeCode}</span>
              <strong>{formatCurrency(Math.round(demand.forecastSales / labourHours))}</strong>
              <p>forecast sales per labour hour</p>
              <dl>
                <div><dt>Sales</dt><dd>{formatCurrency(demand.forecastSales)}</dd></div>
                <div><dt>Footfall</dt><dd>{demand.forecastFootfall}</dd></div>
                <div><dt>Scheduled</dt><dd>{demand.scheduledPeople}</dd></div>
                <div><dt>Recommended</dt><dd>{demand.recommendedPeople}</dd></div>
              </dl>
            </article>
          );
        })}
      </div>
    </>
  );
}

function AreaOperationsView({
  state,
  stores,
  onChecklist,
  onFillOpenShift,
}: {
  state: AttendanceSuiteState;
  stores: StoreLocation[];
  onChecklist: (storeCode: string, kind: "opening" | "closing") => void;
  onFillOpenShift: (id: string, employeeId: string) => void;
}) {
  return (
    <>
      <SuiteSectionHeading
        eyebrow="AREA OPERATIONS"
        title="Coverage and responsibility across three stores"
        description="Combine demand, authorised skills, transfer options and opening/closing ownership before escalating."
      />
      <section className="suite-operations-grid">
        {stores.map((store) => {
          const checklist = state.checklists.find((item) => item.storeCode === store.code)!;
          const demand = state.demand.find((item) => item.storeCode === store.code)!;
          const team = ATTENDANCE_EMPLOYEES.filter((employee) => employee.homeStore === store.code);
          const closingQualified = team.filter((employee) => state.skills.find((skill) => skill.employeeId === employee.id)?.skills.includes("Closing"));
          return (
            <article className="suite-panel area-store-card" key={store.code}>
              <div className="live-store-top"><div><span>{store.code}</span><h3>{store.name}</h3></div><SuiteStatus value={demand.scheduledPeople >= demand.recommendedPeople ? "Covered" : "Needs flex"} /></div>
              <dl>
                <div><dt>Forecast sales</dt><dd>{formatCurrency(demand.forecastSales)}</dd></div>
                <div><dt>Staffing</dt><dd>{demand.scheduledPeople}/{demand.recommendedPeople}</dd></div>
                <div><dt>Closing qualified</dt><dd>{closingQualified.length}</dd></div>
                <div><dt>First aid</dt><dd>{team.filter((employee) => state.skills.find((skill) => skill.employeeId === employee.id)?.skills.includes("First aid")).length}</dd></div>
              </dl>
              <div className="checklist-status-row">
                <button type="button" onClick={() => onChecklist(store.code, "opening")}>
                  Opening {checklist.openingComplete ? "✓" : "pending"}
                </button>
                <button type="button" onClick={() => onChecklist(store.code, "closing")}>
                  Closing {checklist.closingComplete ? "✓" : "pending"}
                </button>
              </div>
            </article>
          );
        })}
      </section>
      <div className="suite-secondary-grid">
        <section className="suite-panel suite-transfer-intelligence">
          <div className="suite-card-heading"><div><span className="eyebrow">TRANSFER INTELLIGENCE</span><h3>Best temporary cover</h3></div></div>
          <article>
            <EmployeeIdentity employeeId="bf-203" />
            <div><strong>Recommended for BF-BLR-03 CL</strong><p>Sales Specialist · 7.1 km · 45h projected week · no overlap · Closing coverage restored</p></div>
            <button type="button">Prepare transfer</button>
          </article>
          <article>
            <EmployeeIdentity employeeId="bf-103" />
            <div><strong>Alternative</strong><p>Sales Specialist · 10.4 km · 54h projected week · employee acknowledgement required</p></div>
            <button type="button">Compare</button>
          </article>
        </section>
        <section className="suite-panel">
          <div className="suite-card-heading"><div><span className="eyebrow">OPEN SHIFT</span><h3>Volunteer coverage</h3></div></div>
          <div className="suite-list compact">
            {state.openShifts.map((shift) => (
              <article key={shift.id}>
                <strong>{shift.storeCode} · {shift.shift}</strong>
                <p>{formatDisplayDate(shift.date)} · {shift.volunteerIds.length} volunteers</p>
                <SuiteStatus value={shift.status} />
                {shift.status === "Open" && <button type="button" onClick={() => onFillOpenShift(shift.id, shift.volunteerIds[0])}>Assign best match</button>}
              </article>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

function PayrollView({
  state,
  onAdvance,
  onExport,
  onCompOff,
}: {
  state: AttendanceSuiteState;
  onAdvance: () => void;
  onExport: () => void;
  onCompOff: (id: string) => void;
}) {
  return (
    <>
      <SuiteSectionHeading
        eyebrow="PAYROLL CONTROL"
        title={`${state.payroll.label} attendance`}
        description="Store approval, AOM approval and HR locking form a controlled sequence. Locked periods cannot be silently edited."
        action={<div className="suite-heading-buttons"><button className="button secondary" type="button" onClick={onExport}>Export CSV</button><button className="button primary" type="button" onClick={onAdvance} disabled={state.payroll.status === "Locked"}>{state.payroll.status === "Draft" ? "Record SM approval" : state.payroll.status === "SM approved" ? "Record AOM approval" : state.payroll.status === "AOM approved" ? "Lock payroll" : "Payroll locked"}</button></div>}
      />
      <div className="payroll-progress">
        {["Draft", "SM approved", "AOM approved", "Locked"].map((step, index) => {
          const currentIndex = ["Draft", "SM approved", "AOM approved", "Locked"].indexOf(state.payroll.status);
          return <div key={step} className={index <= currentIndex ? "done" : ""}><span>{index + 1}</span><strong>{step}</strong></div>;
        })}
      </div>
      <section className="suite-panel suite-table-panel">
        <div className="suite-table suite-payroll-table">
          <div className="suite-table-head"><span>Employee</span><span>Store</span><span>Present</span><span>Late</span><span>Early</span><span>Short</span><span>Absent</span><span>Hours</span></div>
          {ATTENDANCE_EMPLOYEES.map((employee) => {
            const summary = monthlyEmployeeSummary(state, employee.id);
            return (
              <div className="suite-table-row" key={employee.id}>
                <EmployeeIdentity employeeId={employee.id} />
                <span>{employee.homeStore}</span>
                <span>{summary.present}</span>
                <span>{summary.late}</span>
                <span>{summary.early}</span>
                <span>{summary.short}</span>
                <span>{summary.absent}</span>
                <strong>{formatDuration(summary.totalMinutes)}</strong>
              </div>
            );
          })}
        </div>
      </section>
      <section className="suite-panel suite-comp-off">
        <div className="suite-card-heading"><div><span className="eyebrow">OVERTIME & COMP OFF</span><h3>Approved additional work</h3></div></div>
        {state.compOff.map((entry) => (
          <article key={entry.id}>
            <EmployeeIdentity employeeId={entry.employeeId} />
            <p>{formatDisplayDate(entry.earnedDate)} · {entry.hours}h<br />{entry.reason}</p>
            <SuiteStatus value={entry.status} />
            {entry.status !== "Credited" && <button type="button" onClick={() => onCompOff(entry.id)}>{entry.status === "Pending" ? "Approve" : "Credit balance"}</button>}
          </article>
        ))}
      </section>
    </>
  );
}

const ALL_SKILLS: SkillName[] = ["Billing", "Inventory", "Opening", "Closing", "Product specialist", "First aid"];

function PeopleAdminView({
  state,
  onSkill,
}: {
  state: AttendanceSuiteState;
  onSkill: (employeeId: string, skill: SkillName) => void;
}) {
  return (
    <>
      <SuiteSectionHeading
        eyebrow="PEOPLE & CAPABILITY"
        title="Skill-authorised roster coverage"
        description="A headcount is not sufficient if the shift lacks an authorised opener, closer, cashier or inventory-trained employee."
      />
      <section className="suite-panel suite-table-panel">
        <div className="suite-table suite-skill-table">
          <div className="suite-table-head"><span>Employee</span><span>Store</span>{ALL_SKILLS.map((skill) => <span key={skill}>{skill}</span>)}</div>
          {ATTENDANCE_EMPLOYEES.map((employee) => {
            const skills = state.skills.find((item) => item.employeeId === employee.id)?.skills ?? [];
            return (
              <div className="suite-table-row" key={employee.id}>
                <EmployeeIdentity employeeId={employee.id} />
                <span>{employee.homeStore}</span>
                {ALL_SKILLS.map((skill) => (
                  <button
                    type="button"
                    className={skills.includes(skill) ? "skill-on" : ""}
                    key={skill}
                    onClick={() => onSkill(employee.id, skill)}
                    aria-label={`${employee.name} ${skill}`}
                  >
                    {skills.includes(skill) ? "✓" : "—"}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}

function SecurityView({
  state,
  onResetDevice,
  onSyncOffline,
}: {
  state: AttendanceSuiteState;
  onResetDevice: (employeeId: string) => void;
  onSyncOffline: () => void;
}) {
  return (
    <>
      <SuiteSectionHeading
        eyebrow="SECURITY & RECOVERY"
        title="Trusted devices, offline events and immutable history"
        description="Identity data is restricted, every privileged change is logged, and fallbacks never bypass review."
        action={<button className="button primary" type="button" onClick={onSyncOffline} disabled={state.offlineQueue.length === 0}>Sync {state.offlineQueue.length} offline</button>}
      />
      <div className="suite-security-grid">
        <section className="suite-panel">
          <div className="suite-card-heading"><div><span className="eyebrow">TRUSTED DEVICES</span><h3>Registration binding</h3></div></div>
          <div className="suite-list compact">
            {state.registrations.slice(0, 10).map((registration) => (
              <article key={registration.employeeId}>
                <EmployeeIdentity employeeId={registration.employeeId} />
                <p>{registration.deviceName ?? "No trusted device"} · {registration.deviceStatus}</p>
                <button type="button" onClick={() => onResetDevice(registration.employeeId)}>Remove device</button>
              </article>
            ))}
          </div>
        </section>
        <section className="suite-panel">
          <div className="suite-card-heading"><div><span className="eyebrow">AUDIT HISTORY</span><h3>Recent privileged events</h3></div></div>
          <div className="suite-audit-list">
            {state.audit.slice(0, 14).map((event) => (
              <article key={event.id}><span /><div><strong>{event.action}</strong><p>{event.detail}</p><small>{event.actor} · {event.createdAt}</small></div></article>
            ))}
          </div>
        </section>
        <section className="suite-panel suite-security-policy">
          <h3>Production controls</h3>
          <ul>
            <li>Encrypted biometric templates and event data</li>
            <li>Restricted event-selfie retention</li>
            <li>Role-based API authorisation</li>
            <li>Signed offline events and replay protection</li>
            <li>Device integrity and spoof-detection checks</li>
            <li>No continuous employee location tracking</li>
          </ul>
        </section>
        <section className="suite-panel suite-security-policy">
          <h3>Emergency fallback</h3>
          <ul>
            <li>Shared kiosk with face and geofence verification</li>
            <li>Manager-assisted punch with current selfie</li>
            <li>Camera/network failure reason codes</li>
            <li>AOM escalation for repeated fallback usage</li>
          </ul>
        </section>
      </div>
    </>
  );
}
