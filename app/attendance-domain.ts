import {
  EMPLOYEES,
  SHIFT_DEFINITIONS,
  STORES,
  addDaysIso,
  startOfWeekIso,
  toIsoDate,
  type DeviceLocation,
  type Employee,
  type GeofenceResult,
  type ShiftCode,
} from "./roster-domain.ts";

export type DemoRole =
  | "Employee"
  | "Store Manager"
  | "Area Ops"
  | "HR Admin";

export type RegistrationStatus =
  | "Invited"
  | "OTP verified"
  | "Face pending"
  | "Active";

export type AttendanceException =
  | "On time"
  | "Late Login"
  | "Early Logout"
  | "Short Timing"
  | "Missed Punch In"
  | "Missed Punch Out"
  | "Absent"
  | "Pending Regularisation";

export type RegistrationRecord = {
  employeeId: string;
  status: RegistrationStatus;
  invitationSentAt: string;
  invitationExpiresAt: string;
  otpVerifiedAt?: string;
  faceEnrolledAt?: string;
  livenessVerified: boolean;
  deviceName?: string;
  deviceStatus: "Unbound" | "Trusted" | "Change requested";
};

export type AttendanceRecord = {
  id: string;
  employeeId: string;
  storeCode: string;
  date: string;
  shift: ShiftCode;
  scheduledStart: string;
  scheduledEnd: string;
  punchIn?: string;
  punchOut?: string;
  durationMinutes?: number;
  statuses: AttendanceException[];
  source: "Mobile" | "Kiosk" | "Offline sync" | "Manager assisted";
  faceVerified: boolean;
  livenessVerified: boolean;
  geofence: GeofenceResult | null;
  eventSelfieStored: boolean;
  correctionStatus?: "Pending" | "Approved" | "Rejected";
};

export type RegularisationRequest = {
  id: string;
  employeeId: string;
  date: string;
  type: "Missed Punch In" | "Missed Punch Out" | "Incorrect time";
  requestedPunchIn?: string;
  requestedPunchOut?: string;
  reason: string;
  status: "Pending SM" | "Pending AOM" | "Approved" | "Rejected";
  submittedAt: string;
  managerComment?: string;
};

export type ShiftSwapRequest = {
  id: string;
  requesterId: string;
  partnerId: string;
  date: string;
  requesterShift: ShiftCode;
  partnerShift: ShiftCode;
  partnerAccepted: boolean;
  status: "Pending partner" | "Pending SM" | "Approved" | "Rejected";
};

export type LeaveRequest = {
  id: string;
  employeeId: string;
  fromDate: string;
  toDate: string;
  leaveType: "Casual leave" | "Sick leave" | "Emergency leave";
  reason: string;
  status: "Pending" | "Approved" | "Rejected";
};

export type OpenShift = {
  id: string;
  storeCode: string;
  date: string;
  shift: ShiftCode;
  role: string;
  volunteerIds: string[];
  selectedEmployeeId?: string;
  status: "Open" | "Filled" | "Cancelled";
};

export type EmployeePreference = {
  employeeId: string;
  preferredShift: ShiftCode;
  preferredWeekOff: string;
  restrictedDays: string[];
  note: string;
};

export type PayrollPeriod = {
  id: string;
  label: string;
  status:
    | "Draft"
    | "SM approved"
    | "AOM approved"
    | "Locked";
  smApprovedAt?: string;
  aomApprovedAt?: string;
  lockedAt?: string;
};

export type CompOffEntry = {
  id: string;
  employeeId: string;
  earnedDate: string;
  reason: string;
  hours: number;
  status: "Pending" | "Approved" | "Credited";
};

export type StoreChecklist = {
  storeCode: string;
  date: string;
  openerId: string;
  closerId: string;
  openingComplete: boolean;
  closingComplete: boolean;
  openingItems: string[];
  closingItems: string[];
};

export type SkillName =
  | "Billing"
  | "Inventory"
  | "Opening"
  | "Closing"
  | "Product specialist"
  | "First aid";

export type SkillRecord = {
  employeeId: string;
  skills: SkillName[];
};

export type StoreDemand = {
  storeCode: string;
  forecastSales: number;
  forecastFootfall: number;
  scheduledPeople: number;
  recommendedPeople: number;
};

export type AttendanceNotification = {
  id: string;
  employeeId?: string;
  audience: "Employee" | "Store Manager" | "Area Ops" | "HR Admin";
  kind:
    | "Registration"
    | "Punch reminder"
    | "Punch success"
    | "Attendance exception"
    | "Daily summary"
    | "Request decision"
    | "Device security";
  message: string;
  status: "Ready" | "Opened";
  createdAt: string;
};

export type AttendanceAuditEvent = {
  id: string;
  actor: string;
  action: string;
  detail: string;
  createdAt: string;
};

export type AttendanceSuiteState = {
  registrations: RegistrationRecord[];
  attendance: AttendanceRecord[];
  regularisations: RegularisationRequest[];
  swaps: ShiftSwapRequest[];
  leaveRequests: LeaveRequest[];
  openShifts: OpenShift[];
  preferences: EmployeePreference[];
  payroll: PayrollPeriod;
  compOff: CompOffEntry[];
  checklists: StoreChecklist[];
  skills: SkillRecord[];
  demand: StoreDemand[];
  notifications: AttendanceNotification[];
  audit: AttendanceAuditEvent[];
  offlineQueue: AttendanceRecord[];
};

const STORE_2_EMPLOYEES: Employee[] = [
  {
    id: "bf-201",
    name: "Neha Kulkarni",
    role: "Store Manager",
    initials: "NK",
    homeStore: "BF-BLR-02",
    phone: "+91 98••• 2201",
    status: "Active",
  },
  {
    id: "bf-202",
    name: "Vikram Shah",
    role: "Store Lead",
    initials: "VS",
    homeStore: "BF-BLR-02",
    phone: "+91 99••• 4422",
    status: "Active",
  },
  {
    id: "bf-203",
    name: "Diya Menon",
    role: "Sales Specialist",
    initials: "DM",
    homeStore: "BF-BLR-02",
    phone: "+91 97••• 8832",
    status: "Active",
  },
  {
    id: "bf-204",
    name: "Karan Patel",
    role: "Sales Specialist",
    initials: "KP",
    homeStore: "BF-BLR-02",
    phone: "+91 96••• 3154",
    status: "Active",
  },
  {
    id: "bf-205",
    name: "Pooja Reddy",
    role: "Cashier & CX",
    initials: "PR",
    homeStore: "BF-BLR-02",
    phone: "+91 98••• 7255",
    status: "Active",
  },
  {
    id: "bf-206",
    name: "Manoj Gupta",
    role: "Inventory Associate",
    initials: "MG",
    homeStore: "BF-BLR-02",
    phone: "+91 97••• 9067",
    status: "Active",
  },
];

const STORE_3_EMPLOYEES: Employee[] = [
  {
    id: "bf-301",
    name: "Priya S.",
    role: "Store Manager",
    initials: "PS",
    homeStore: "BF-BLR-03",
    phone: "+91 99••• 3201",
    status: "Active",
  },
  {
    id: "bf-302",
    name: "Aditya Rao",
    role: "Store Lead",
    initials: "AR",
    homeStore: "BF-BLR-03",
    phone: "+91 98••• 4423",
    status: "Active",
  },
  {
    id: "bf-303",
    name: "Sana Sheikh",
    role: "Sales Specialist",
    initials: "SS",
    homeStore: "BF-BLR-03",
    phone: "+91 97••• 8842",
    status: "Active",
  },
  {
    id: "bf-304",
    name: "Rahul Das",
    role: "Sales Specialist",
    initials: "RD",
    homeStore: "BF-BLR-03",
    phone: "+91 96••• 3164",
    status: "Active",
  },
  {
    id: "bf-305",
    name: "Megha Jain",
    role: "Cashier & CX",
    initials: "MJ",
    homeStore: "BF-BLR-03",
    phone: "+91 98••• 7265",
    status: "Active",
  },
  {
    id: "bf-306",
    name: "Farhan Ali",
    role: "Inventory Associate",
    initials: "FA",
    homeStore: "BF-BLR-03",
    phone: "+91 97••• 9077",
    status: "Active",
  },
];

export const ATTENDANCE_EMPLOYEES: Employee[] = [
  ...EMPLOYEES,
  ...STORE_2_EMPLOYEES,
  ...STORE_3_EMPLOYEES,
];

export const ATTENDANCE_WORK_SHIFTS: ShiftCode[] = [
  "OP",
  "MID",
  "CL",
  "FULL",
];

export function attendanceEmployee(employeeId: string): Employee {
  return (
    ATTENDANCE_EMPLOYEES.find((employee) => employee.id === employeeId) ??
    ATTENDANCE_EMPLOYEES[0]
  );
}

export function employeesForStore(storeCode: string): Employee[] {
  return ATTENDANCE_EMPLOYEES.filter(
    (employee) => employee.homeStore === storeCode,
  );
}

export function shiftTimes(shift: ShiftCode): {
  start: string;
  end: string;
  requiredMinutes: number;
} {
  const definition = SHIFT_DEFINITIONS[shift];
  if (!definition.work) {
    return { start: "", end: "", requiredMinutes: 0 };
  }
  const [start, end] = definition.time.split("–");
  return {
    start,
    end,
    requiredMinutes: shift === "FULL" ? 11 * 60 : 9 * 60,
  };
}

function timeToMinutes(value: string): number {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function minutesBetween(start: string, end: string): number {
  return Math.max(0, timeToMinutes(end) - timeToMinutes(start));
}

export function classifyAttendance({
  shift,
  punchIn,
  punchOut,
  closingProcess = false,
  missedPunchInReported = false,
}: {
  shift: ShiftCode;
  punchIn?: string;
  punchOut?: string;
  closingProcess?: boolean;
  missedPunchInReported?: boolean;
}): {
  statuses: AttendanceException[];
  durationMinutes?: number;
} {
  if (!ATTENDANCE_WORK_SHIFTS.includes(shift)) {
    return { statuses: [] };
  }

  if (!punchIn && !punchOut) {
    return {
      statuses: closingProcess
        ? [missedPunchInReported ? "Missed Punch In" : "Absent"]
        : [],
    };
  }

  if (!punchIn && punchOut) {
    return {
      statuses: ["Missed Punch In", "Pending Regularisation"],
    };
  }

  if (punchIn && !punchOut) {
    return {
      statuses: closingProcess ? ["Missed Punch Out"] : [],
    };
  }

  const { start, end, requiredMinutes } = shiftTimes(shift);
  const durationMinutes = minutesBetween(punchIn!, punchOut!);
  const statuses: AttendanceException[] = [];
  if (timeToMinutes(punchIn!) > timeToMinutes(start) + 10) {
    statuses.push("Late Login");
  }
  if (timeToMinutes(punchOut!) < timeToMinutes(end) - 10) {
    statuses.push("Early Logout");
  }
  if (durationMinutes < requiredMinutes) {
    statuses.push("Short Timing");
  }
  if (statuses.length === 0) {
    statuses.push("On time");
  }
  return { statuses, durationMinutes };
}

export function formatDuration(minutes?: number): string {
  if (minutes === undefined) return "—";
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return `${hours}h ${String(remaining).padStart(2, "0")}m`;
}

export function buildRegistrationInviteMessage(employee: Employee): string {
  const firstName = employee.name.split(/\s+/)[0];
  return [
    `Hi ${firstName},`,
    "Welcome to the Boldfit Roster & Attendance app.",
    "Please complete your one-time registration and face enrolment using the secure link below:",
    "[Secure registration link]",
    `Use employee code ${employee.id.toUpperCase()} and your registered mobile number to verify your account.`,
    "This single-use link expires in 48 hours.",
    "— Boldfit Store Operations",
  ].join("\n");
}

export function buildPunchReminderMessage(
  employee: Employee,
  type: "in" | "out",
): string {
  const firstName = employee.name.split(/\s+/)[0];
  return type === "in"
    ? `Hi ${firstName},\nYour rostered shift has started. Please Punch In from the Boldfit Roster app now.`
    : `Hi ${firstName},\nYour rostered shift has ended. Please Punch Out from the Boldfit Roster app now.`;
}

export function buildClosingExceptionMessage(
  employee: Employee,
  record: AttendanceRecord,
): string {
  const firstName = employee.name.split(/\s+/)[0];
  if (record.statuses.includes("Absent")) {
    return `Hi ${firstName},\nYou were absent today against your rostered shift.`;
  }
  if (record.statuses.includes("Missed Punch In")) {
    return `Hi ${firstName},\nYou missed to Punch In. Please submit an attendance regularisation request.`;
  }
  return `Hi ${firstName},\nYou missed to Punch Out. Please submit an attendance regularisation request.`;
}

function record({
  id,
  employeeId,
  storeCode,
  date,
  shift,
  punchIn,
  punchOut,
  source = "Mobile",
  closingProcess = false,
}: {
  id: string;
  employeeId: string;
  storeCode: string;
  date: string;
  shift: ShiftCode;
  punchIn?: string;
  punchOut?: string;
  source?: AttendanceRecord["source"];
  closingProcess?: boolean;
}): AttendanceRecord {
  const times = shiftTimes(shift);
  const result = classifyAttendance({
    shift,
    punchIn,
    punchOut,
    closingProcess,
  });
  return {
    id,
    employeeId,
    storeCode,
    date,
    shift,
    scheduledStart: times.start,
    scheduledEnd: times.end,
    punchIn,
    punchOut,
    durationMinutes: result.durationMinutes,
    statuses: result.statuses,
    source,
    faceVerified: Boolean(punchIn),
    livenessVerified: Boolean(punchIn),
    geofence: punchIn
      ? {
          status: "Inside",
          allowed: true,
          distanceMeters: 4.8,
          accuracyMeters: 5,
          message: "Location verified.",
        }
      : null,
    eventSelfieStored: Boolean(punchIn),
  };
}

export function createAttendanceSuiteState(
  today = toIsoDate(new Date()),
): AttendanceSuiteState {
  const registrations = ATTENDANCE_EMPLOYEES.map(
    (employee, index): RegistrationRecord => ({
      employeeId: employee.id,
      status:
        index === 3
          ? "Invited"
          : index === 8
            ? "Face pending"
            : "Active",
      invitationSentAt: "Today · 08:00",
      invitationExpiresAt: "48 hours",
      otpVerifiedAt: index === 3 ? undefined : "Today · 08:06",
      faceEnrolledAt:
        index === 3 || index === 8 ? undefined : "Today · 08:08",
      livenessVerified: index !== 3 && index !== 8,
      deviceName: index === 3 ? undefined : "Android phone",
      deviceStatus: index === 3 ? "Unbound" : "Trusted",
    }),
  );

  const pattern: Array<{
    punchIn?: string;
    punchOut?: string;
    shift: ShiftCode;
  }> = [
    { punchIn: "09:28", punchOut: "18:34", shift: "OP" },
    { punchIn: "09:44", punchOut: "18:32", shift: "OP" },
    { punchIn: "10:58", punchOut: "20:03", shift: "MID" },
    { shift: "MID" },
    { punchIn: "12:02", punchOut: "20:41", shift: "CL" },
    { punchIn: "10:00", shift: "FULL" },
  ];

  const attendance = STORES.flatMap((store, storeIndex) =>
    employeesForStore(store.code).map((employee, employeeIndex) => {
      const sample = pattern[(employeeIndex + storeIndex) % pattern.length];
      return record({
        id: `att-${store.code}-${employee.id}-${today}`,
        employeeId: employee.id,
        storeCode: store.code,
        date: today,
        shift: sample.shift,
        punchIn: sample.punchIn,
        punchOut: sample.punchOut,
      });
    }),
  );

  const previousDay = addDaysIso(today, -1);
  ATTENDANCE_EMPLOYEES.slice(0, 8).forEach((employee, index) => {
    attendance.push(
      record({
        id: `att-history-${employee.id}-${previousDay}`,
        employeeId: employee.id,
        storeCode: employee.homeStore,
        date: previousDay,
        shift: index % 4 === 3 ? "FULL" : "OP",
        punchIn: index % 3 === 0 ? "09:43" : "09:28",
        punchOut:
          index % 4 === 3
            ? "20:35"
            : index % 3 === 1
              ? "18:03"
              : "18:35",
        closingProcess: true,
      }),
    );
  });

  return {
    registrations,
    attendance,
    regularisations: [
      {
        id: "reg-1",
        employeeId: "bf-103",
        date: previousDay,
        type: "Missed Punch Out",
        requestedPunchIn: "10:58",
        requestedPunchOut: "20:05",
        reason: "Phone battery was discharged at store closing.",
        status: "Pending SM",
        submittedAt: "Today · 09:15",
      },
      {
        id: "reg-2",
        employeeId: "bf-204",
        date: addDaysIso(today, -2),
        type: "Incorrect time",
        requestedPunchIn: "11:02",
        requestedPunchOut: "20:10",
        reason: "Network retry created an incorrect timestamp.",
        status: "Pending AOM",
        submittedAt: "Yesterday · 18:20",
      },
    ],
    swaps: [
      {
        id: "swap-1",
        requesterId: "bf-104",
        partnerId: "bf-105",
        date: addDaysIso(today, 2),
        requesterShift: "CL",
        partnerShift: "OP",
        partnerAccepted: true,
        status: "Pending SM",
      },
    ],
    leaveRequests: [
      {
        id: "leave-1",
        employeeId: "bf-205",
        fromDate: addDaysIso(today, 4),
        toDate: addDaysIso(today, 4),
        leaveType: "Casual leave",
        reason: "Family commitment",
        status: "Pending",
      },
    ],
    openShifts: [
      {
        id: "open-1",
        storeCode: "BF-BLR-03",
        date: addDaysIso(today, 3),
        shift: "CL",
        role: "Sales Specialist",
        volunteerIds: ["bf-103", "bf-203"],
        status: "Open",
      },
    ],
    preferences: ATTENDANCE_EMPLOYEES.map((employee, index) => ({
      employeeId: employee.id,
      preferredShift: (["OP", "MID", "CL"] as ShiftCode[])[index % 3],
      preferredWeekOff: ["Monday", "Tuesday", "Wednesday", "Thursday"][
        index % 4
      ],
      restrictedDays: [],
      note: "",
    })),
    payroll: {
      id: "payroll-2026-07",
      label: "July 2026",
      status: "Draft",
    },
    compOff: [
      {
        id: "comp-1",
        employeeId: "bf-106",
        earnedDate: previousDay,
        reason: "Worked on approved weekly off",
        hours: 9,
        status: "Pending",
      },
    ],
    checklists: STORES.map((store, index) => {
      const team = employeesForStore(store.code);
      return {
        storeCode: store.code,
        date: today,
        openerId: team[0].id,
        closerId: team[1].id,
        openingComplete: index !== 2,
        closingComplete: false,
        openingItems: [
          "Shutter and entrance check",
          "POS and cash float ready",
          "Inventory exceptions reviewed",
        ],
        closingItems: [
          "POS settlement completed",
          "High-value inventory secured",
          "Store locked and alarm enabled",
        ],
      };
    }),
    skills: ATTENDANCE_EMPLOYEES.map((employee, index) => ({
      employeeId: employee.id,
      skills: [
        "Billing",
        ...(index % 2 === 0 ? (["Inventory"] as SkillName[]) : []),
        ...(employee.role.includes("Manager") || employee.role.includes("Lead")
          ? (["Opening", "Closing"] as SkillName[])
          : []),
        ...(index % 3 === 0
          ? (["Product specialist"] as SkillName[])
          : []),
        ...(index % 6 === 0 ? (["First aid"] as SkillName[]) : []),
      ],
    })),
    demand: [
      {
        storeCode: "BF-BLR-01",
        forecastSales: 285000,
        forecastFootfall: 192,
        scheduledPeople: 6,
        recommendedPeople: 6,
      },
      {
        storeCode: "BF-BLR-02",
        forecastSales: 342000,
        forecastFootfall: 236,
        scheduledPeople: 6,
        recommendedPeople: 7,
      },
      {
        storeCode: "BF-BLR-03",
        forecastSales: 218000,
        forecastFootfall: 148,
        scheduledPeople: 6,
        recommendedPeople: 5,
      },
    ],
    notifications: [
      {
        id: "att-note-1",
        employeeId: "bf-104",
        audience: "Employee",
        kind: "Registration",
        message: buildRegistrationInviteMessage(attendanceEmployee("bf-104")),
        status: "Ready",
        createdAt: "Today · 08:00",
      },
      {
        id: "att-note-2",
        audience: "Area Ops",
        kind: "Daily summary",
        message:
          "Dear AOM,\nAcross your 3 stores: 13 employees are present, 3 attendance exceptions require attention, and 2 employees have not completed their expected punch.",
        status: "Ready",
        createdAt: "Today · 12:15",
      },
    ],
    audit: [
      {
        id: "audit-1",
        actor: "System",
        action: "Attendance day opened",
        detail: "18 rostered employees loaded across 3 stores.",
        createdAt: "Today · 00:01",
      },
      {
        id: "audit-2",
        actor: "Asha Nair",
        action: "Roster published",
        detail: "Bengaluru Store 01 roster is active for attendance.",
        createdAt: "Yesterday · 18:05",
      },
    ],
    offlineQueue: [],
  };
}

export function todayIso(): string {
  return toIsoDate(new Date());
}

export function weekLabelForToday(): string {
  const start = startOfWeekIso();
  return `${start} to ${addDaysIso(start, 6)}`;
}

export function storeAttendanceSummary(
  state: AttendanceSuiteState,
  storeCode: string,
  date = todayIso(),
): {
  scheduled: number;
  present: number;
  late: number;
  absent: number;
  missingPunch: number;
  shortTiming: number;
} {
  const records = state.attendance.filter(
    (item) => item.storeCode === storeCode && item.date === date,
  );
  return {
    scheduled: records.length,
    present: records.filter((item) => Boolean(item.punchIn)).length,
    late: records.filter((item) => item.statuses.includes("Late Login")).length,
    absent: records.filter((item) => item.statuses.includes("Absent")).length,
    missingPunch: records.filter(
      (item) =>
        item.statuses.includes("Missed Punch In") ||
        item.statuses.includes("Missed Punch Out") ||
        (Boolean(item.punchIn) && !item.punchOut),
    ).length,
    shortTiming: records.filter((item) =>
      item.statuses.includes("Short Timing"),
    ).length,
  };
}

export function exceptionCount(state: AttendanceSuiteState): number {
  return state.attendance.filter((record) =>
    record.statuses.some((status) => status !== "On time"),
  ).length;
}

export function monthlyEmployeeSummary(
  state: AttendanceSuiteState,
  employeeId: string,
): {
  present: number;
  late: number;
  early: number;
  short: number;
  absent: number;
  totalMinutes: number;
} {
  const records = state.attendance.filter(
    (record) => record.employeeId === employeeId,
  );
  return {
    present: records.filter((record) => Boolean(record.punchIn)).length,
    late: records.filter((record) =>
      record.statuses.includes("Late Login"),
    ).length,
    early: records.filter((record) =>
      record.statuses.includes("Early Logout"),
    ).length,
    short: records.filter((record) =>
      record.statuses.includes("Short Timing"),
    ).length,
    absent: records.filter((record) =>
      record.statuses.includes("Absent"),
    ).length,
    totalMinutes: records.reduce(
      (total, record) => total + (record.durationMinutes ?? 0),
      0,
    ),
  };
}

export function createPunchRecord({
  employee,
  storeCode,
  shift,
  time,
  existing,
  geofence,
  source = "Mobile",
  action = existing?.punchIn ? "Punch Out" : "Punch In",
}: {
  employee: Employee;
  storeCode: string;
  shift: ShiftCode;
  time: string;
  existing?: AttendanceRecord;
  geofence: GeofenceResult;
  source?: AttendanceRecord["source"];
  action?: "Punch In" | "Punch Out";
}): AttendanceRecord {
  if (!geofence.allowed) {
    throw new Error("The store geofence must pass before punching.");
  }
  const times = shiftTimes(shift);
  if (action === "Punch In") {
    if (existing?.punchIn) {
      throw new Error("Punch In is already recorded for today.");
    }
    return {
      ...existing,
      id: existing?.id ?? `att-${employee.id}-${todayIso()}-${Date.now()}`,
      employeeId: employee.id,
      storeCode,
      date: existing?.date ?? todayIso(),
      shift,
      scheduledStart: times.start,
      scheduledEnd: times.end,
      punchIn: time,
      punchOut: undefined,
      durationMinutes: undefined,
      statuses: classifyAttendance({ shift, punchIn: time }).statuses,
      source,
      faceVerified: true,
      livenessVerified: true,
      geofence,
      eventSelfieStored: true,
    };
  }
  if (!existing?.punchIn) {
    throw new Error("Punch Out is allowed only after Punch In.");
  }
  if (existing.punchOut) {
    throw new Error("Attendance is already complete for today.");
  }
  const classified = classifyAttendance({
    shift,
    punchIn: existing.punchIn,
    punchOut: time,
  });
  return {
    ...existing,
    punchOut: time,
    durationMinutes: classified.durationMinutes,
    statuses: classified.statuses,
    faceVerified: true,
    livenessVerified: true,
    geofence,
    eventSelfieStored: true,
  };
}

export function locationForStore(
  storeCode: string,
  accuracyMeters = 5,
): DeviceLocation {
  const store = STORES.find((item) => item.code === storeCode) ?? STORES[0];
  return {
    latitude: store.latitude + 4 / 111_111,
    longitude: store.longitude,
    accuracyMeters,
  };
}
