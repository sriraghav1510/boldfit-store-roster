export const SHIFT_CODES = [
  "OP",
  "MID",
  "CL",
  "FULL",
  "WO",
  "LE",
  "NA",
  "TR",
] as const;

export type ShiftCode = (typeof SHIFT_CODES)[number];
export type RosterValue = ShiftCode | "";

export type Employee = {
  id: string;
  name: string;
  role: string;
  initials: string;
  homeStore: string;
  phone: string;
  status: "Active" | "Flex pool";
};

export type ShiftDefinition = {
  code: ShiftCode;
  label: string;
  time: string;
  hours: number;
  work: boolean;
  description: string;
};

export type WeekRoster = {
  weekStart: string;
  assignments: Record<string, Record<string, RosterValue>>;
  status: "Draft" | "Published";
  publishedAt?: string;
};

export type TransferRequest = {
  id: string;
  employee: string;
  employeeId: string;
  direction: "Incoming" | "Outgoing";
  sourceStore: string;
  destinationStore: string;
  date: string;
  shift: ShiftCode;
  status: "Scheduled" | "Cancelled";
};

export type ActivityEvent = {
  id: string;
  title: string;
  detail: string;
  kind: "success" | "warning" | "info";
  time: string;
};

export type WhatsAppNotification = {
  id: string;
  kind:
    | "Weekly roster"
    | "Staff transfer"
    | "Roster published"
    | "Roster nudge";
  audience: "Employee" | "Area Operations Manager" | "Store Manager";
  recipientName: string;
  recipientId?: string;
  phone?: string;
  title: string;
  message: string;
  status: "Ready" | "Opened" | "Cancelled";
  createdAt: string;
  weekStart?: string;
  relatedTransferId?: string;
};

export type RosterAppState = {
  schedules: Record<string, WeekRoster>;
  transfers: TransferRequest[];
  activity: ActivityEvent[];
  notifications: WhatsAppNotification[];
};

export const SHIFT_DEFINITIONS: Record<ShiftCode, ShiftDefinition> = {
  OP: {
    code: "OP",
    label: "Opening",
    time: "09:30–18:30",
    hours: 9,
    work: true,
    description: "Opens the store and covers the first customer window.",
  },
  MID: {
    code: "MID",
    label: "Mid",
    time: "11:00–20:00",
    hours: 9,
    work: true,
    description: "Covers the middle and evening trading windows.",
  },
  CL: {
    code: "CL",
    label: "Closing",
    time: "12:00–21:00",
    hours: 9,
    work: true,
    description: "Owns the final customer and store-closing window.",
  },
  FULL: {
    code: "FULL",
    label: "Full day",
    time: "10:00–21:00",
    hours: 11,
    work: true,
    description: "Full trading-day coverage. Use only when operationally needed.",
  },
  WO: {
    code: "WO",
    label: "Week off",
    time: "—",
    hours: 0,
    work: false,
    description: "Planned weekly rest day.",
  },
  LE: {
    code: "LE",
    label: "Leave",
    time: "—",
    hours: 0,
    work: false,
    description: "Approved leave. Leave approval remains outside this demo.",
  },
  NA: {
    code: "NA",
    label: "Not available",
    time: "—",
    hours: 0,
    work: false,
    description: "Employee should not be scheduled at this store on this day.",
  },
  TR: {
    code: "TR",
    label: "Transferred",
    time: "—",
    hours: 0,
    work: false,
    description: "Temporarily assigned to another Boldfit store.",
  },
};

export const EMPLOYEES: Employee[] = [
  {
    id: "bf-101",
    name: "Asha Nair",
    role: "Store Manager",
    initials: "AN",
    homeStore: "BF-BLR-01",
    phone: "+91 98••• 1201",
    status: "Active",
  },
  {
    id: "bf-102",
    name: "Rohan Mehta",
    role: "Store Lead",
    initials: "RM",
    homeStore: "BF-BLR-01",
    phone: "+91 98••• 4420",
    status: "Active",
  },
  {
    id: "bf-103",
    name: "Nisha Iyer",
    role: "Sales Specialist",
    initials: "NI",
    homeStore: "BF-BLR-01",
    phone: "+91 97••• 8802",
    status: "Active",
  },
  {
    id: "bf-104",
    name: "Arjun Singh",
    role: "Sales Specialist",
    initials: "AS",
    homeStore: "BF-BLR-01",
    phone: "+91 99••• 3134",
    status: "Active",
  },
  {
    id: "bf-105",
    name: "Kavya Rao",
    role: "Cashier & CX",
    initials: "KR",
    homeStore: "BF-BLR-01",
    phone: "+91 96••• 7295",
    status: "Active",
  },
  {
    id: "bf-106",
    name: "Imran Khan",
    role: "Inventory Associate",
    initials: "IK",
    homeStore: "BF-BLR-01",
    phone: "+91 98••• 9017",
    status: "Active",
  },
];

export const FLEX_POOL: Employee[] = [
  {
    id: "bf-p201",
    name: "Saira P.",
    role: "Sales Specialist",
    initials: "SP",
    homeStore: "Bengaluru Flex Pool",
    phone: "+91 97••• 1142",
    status: "Flex pool",
  },
  {
    id: "bf-p202",
    name: "Dev Joshi",
    role: "Inventory Associate",
    initials: "DJ",
    homeStore: "Bengaluru Flex Pool",
    phone: "+91 99••• 8210",
    status: "Flex pool",
  },
  {
    id: "bf-p203",
    name: "Meera Das",
    role: "Cashier & CX",
    initials: "MD",
    homeStore: "Bengaluru Flex Pool",
    phone: "+91 96••• 5309",
    status: "Flex pool",
  },
];

export const STORES = [
  { code: "BF-BLR-01", name: "Bengaluru Store 01" },
  { code: "BF-BLR-02", name: "Bengaluru Store 02" },
  { code: "BF-BLR-03", name: "Bengaluru Store 03" },
  { code: "BF-BLR-04", name: "Bengaluru Store 04" },
];

const SHIFT_PATTERNS: ShiftCode[][] = [
  ["OP", "OP", "MID", "MID", "CL", "WO", "FULL"],
  ["CL", "CL", "CL", "WO", "OP", "OP", "MID"],
  ["MID", "WO", "OP", "OP", "CL", "CL", "MID"],
  ["OP", "OP", "WO", "MID", "MID", "CL", "CL"],
  ["CL", "MID", "MID", "CL", "WO", "OP", "OP"],
  ["FULL", "FULL", "OP", "WO", "FULL", "MID", "CL"],
];

export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function fromIsoDate(value: string): Date {
  return new Date(`${value}T12:00:00`);
}

export function addDaysIso(value: string, amount: number): string {
  const date = fromIsoDate(value);
  date.setDate(date.getDate() + amount);
  return toIsoDate(date);
}

export function startOfWeekIso(date = new Date()): string {
  const value = new Date(date);
  value.setHours(12, 0, 0, 0);
  const mondayOffset = (value.getDay() + 6) % 7;
  value.setDate(value.getDate() - mondayOffset);
  return toIsoDate(value);
}

export function planningWeekIso(date = new Date()): string {
  return addDaysIso(startOfWeekIso(date), 7);
}

export function weekDates(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, index) =>
    addDaysIso(weekStart, index),
  );
}

export function formatWeekRange(weekStart: string): string {
  const dates = weekDates(weekStart);
  const start = fromIsoDate(dates[0]);
  const end = fromIsoDate(dates[6]);
  const sameMonth = start.getMonth() === end.getMonth();
  const startText = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: sameMonth ? undefined : "short",
  }).format(start);
  const endText = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(end);
  return `${startText}–${endText}`;
}

export function createWeekRoster(
  weekStart: string,
  includePlanningGaps = weekStart === planningWeekIso(),
): WeekRoster {
  const dates = weekDates(weekStart);
  const assignments: WeekRoster["assignments"] = {};

  EMPLOYEES.forEach((employee, employeeIndex) => {
    assignments[employee.id] = {};
    dates.forEach((date, dayIndex) => {
      assignments[employee.id][date] =
        SHIFT_PATTERNS[employeeIndex][dayIndex];
    });
  });

  if (includePlanningGaps) {
    assignments["bf-103"][dates[4]] = "";
    assignments["bf-106"][dates[6]] = "";
  }

  return {
    weekStart,
    assignments,
    status: "Draft",
  };
}

export function copyWeekRoster(
  source: WeekRoster,
  destinationWeekStart: string,
): WeekRoster {
  const sourceDates = weekDates(source.weekStart);
  const destinationDates = weekDates(destinationWeekStart);
  const assignments: WeekRoster["assignments"] = {};

  EMPLOYEES.forEach((employee) => {
    assignments[employee.id] = {};
    destinationDates.forEach((date, index) => {
      assignments[employee.id][date] =
        source.assignments[employee.id]?.[sourceDates[index]] ?? "";
    });
  });

  return {
    weekStart: destinationWeekStart,
    assignments,
    status: "Draft",
  };
}

export function countBlankAssignments(roster: WeekRoster): number {
  return EMPLOYEES.reduce(
    (total, employee) =>
      total +
      weekDates(roster.weekStart).filter(
        (date) => !roster.assignments[employee.id]?.[date],
      ).length,
    0,
  );
}

export function rosterCompletion(roster: WeekRoster): number {
  const total = EMPLOYEES.length * 7;
  return Math.round(((total - countBlankAssignments(roster)) / total) * 100);
}

export function employeeWeekHours(
  roster: WeekRoster,
  employeeId: string,
): number {
  return weekDates(roster.weekStart).reduce((total, date) => {
    const code = roster.assignments[employeeId]?.[date];
    return total + (code ? SHIFT_DEFINITIONS[code].hours : 0);
  }, 0);
}

export function employeeWorkDays(
  roster: WeekRoster,
  employeeId: string,
): number {
  return weekDates(roster.weekStart).filter((date) => {
    const code = roster.assignments[employeeId]?.[date];
    return code ? SHIFT_DEFINITIONS[code].work : false;
  }).length;
}

type Coverage = {
  opening: number;
  core: number;
  closing: number;
  status: "Good" | "Tight" | "Gap";
};

export function coverageForDate(
  roster: WeekRoster,
  date: string,
): Coverage {
  let opening = 0;
  let core = 0;
  let closing = 0;

  EMPLOYEES.forEach((employee) => {
    const shift = roster.assignments[employee.id]?.[date];
    if (!shift) return;
    if (shift === "OP") {
      opening += 1;
      core += 1;
    }
    if (shift === "MID") {
      core += 1;
      closing += 1;
    }
    if (shift === "CL") {
      core += 1;
      closing += 1;
    }
    if (shift === "FULL") {
      opening += 1;
      core += 1;
      closing += 1;
    }
  });

  const status =
    opening >= 2 && core >= 4 && closing >= 2
      ? "Good"
      : opening >= 1 && core >= 3 && closing >= 1
        ? "Tight"
        : "Gap";

  return { opening, core, closing, status };
}

export function autofillRoster(roster: WeekRoster): WeekRoster {
  const assignments = structuredClone(roster.assignments);
  const fallback: ShiftCode[] = ["OP", "MID", "CL"];
  let next = 0;

  EMPLOYEES.forEach((employee) => {
    weekDates(roster.weekStart).forEach((date) => {
      if (!assignments[employee.id]?.[date]) {
        assignments[employee.id][date] = fallback[next % fallback.length];
        next += 1;
      }
    });
  });

  return { ...roster, assignments, status: "Draft", publishedAt: undefined };
}

export function storeName(storeCode: string): string {
  return (
    STORES.find((store) => store.code === storeCode)?.name ?? storeCode
  );
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

function formatMessageDayDate(value: string): string {
  const date = fromIsoDate(value);
  const weekday = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
  }).format(date);
  const monthDay = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
  return `${weekday} ${monthDay}`;
}

function formatOrdinalDate(value: string): string {
  const date = fromIsoDate(value);
  const day = date.getDate();
  const lastTwoDigits = day % 100;
  const suffix =
    lastTwoDigits >= 11 && lastTwoDigits <= 13
      ? "th"
      : day % 10 === 1
        ? "st"
        : day % 10 === 2
          ? "nd"
          : day % 10 === 3
            ? "rd"
            : "th";
  const month = new Intl.DateTimeFormat("en-US", {
    month: "short",
  }).format(date);
  return `${month} ${day}${suffix}`;
}

function formatWhatsAppTime(value: string): string {
  const [hourText, minuteText] = value.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const hour12 = hour % 12 || 12;
  const minutePart = minute === 0 ? "" : `.${String(minute).padStart(2, "0")}`;
  return `${hour12}${minutePart}${hour >= 12 ? "pm" : "am"}`;
}

function formatRosterMessageAssignment(value: RosterValue): string {
  if (!value) return "Open";
  if (value === "WO") return "Week Off (Have Fun!)";
  if (value === "LE") return "Leave";
  if (value === "NA") return "Not Available";
  if (value === "TR") return "Transferred";

  const [start, end] = SHIFT_DEFINITIONS[value].time.split("–");
  return `${value} (${formatWhatsAppTime(start)} to ${formatWhatsAppTime(end)})`;
}

export function buildEmployeeRosterMessage(
  roster: WeekRoster,
  employee: Employee,
  storeCode = "BF-BLR-01",
): string {
  const lines = weekDates(roster.weekStart).map((date) => {
    const assignment = roster.assignments[employee.id]?.[date] ?? "";
    return `${formatMessageDayDate(date)} - ${formatRosterMessageAssignment(assignment)}`;
  });

  return [
    `Hi ${firstName(employee.name)},`,
    `Your roster for this week at ${storeName(storeCode)} is as follows:`,
    ...lines,
  ].join("\n");
}

export function buildTransferMessage(transfer: TransferRequest): string {
  const shift = SHIFT_DEFINITIONS[transfer.shift];
  const [start] = shift.time.split("–");
  return [
    `Hi ${firstName(transfer.employee)},`,
    `Please note, you have been transferred to ${storeName(transfer.destinationStore)} as on ${formatOrdinalDate(transfer.date)}. Reach the store at ${formatWhatsAppTime(start)} for your ${transfer.shift} shift.`,
  ].join("\n");
}

export function buildAomPublishedMessage(
  storeCode = "BF-BLR-01",
): string {
  return [
    "Dear AOM,",
    `${storeName(storeCode)} has published its roster. Please check and verify to ensure fill coverage for the week`,
  ].join("\n");
}

export function buildStoreManagerNudgeMessage(): string {
  return [
    "Dear SM",
    "Kindly complete the roster for next week",
  ].join("\n");
}

export function createPublicationNotifications(
  roster: WeekRoster,
  idPrefix: string,
  createdAt: string,
  storeCode = "BF-BLR-01",
): WhatsAppNotification[] {
  const employeeNotifications = EMPLOYEES.map((employee) => ({
    id: `${idPrefix}-${employee.id}`,
    kind: "Weekly roster" as const,
    audience: "Employee" as const,
    recipientName: employee.name,
    recipientId: employee.id,
    phone: employee.phone,
    title: `${employee.name} · Weekly roster`,
    message: buildEmployeeRosterMessage(roster, employee, storeCode),
    status: "Ready" as const,
    createdAt,
    weekStart: roster.weekStart,
  }));

  return [
    ...employeeNotifications,
    {
      id: `${idPrefix}-aom`,
      kind: "Roster published",
      audience: "Area Operations Manager",
      recipientName: "Area Operations Manager",
      title: `${storeName(storeCode)} · Published`,
      message: buildAomPublishedMessage(storeCode),
      status: "Ready",
      createdAt,
      weekStart: roster.weekStart,
    },
  ];
}

export function createTransferNotification(
  transfer: TransferRequest,
  id: string,
  createdAt: string,
): WhatsAppNotification {
  const employee =
    EMPLOYEES.find((person) => person.id === transfer.employeeId) ??
    FLEX_POOL.find((person) => person.id === transfer.employeeId);
  return {
    id,
    kind: "Staff transfer",
    audience: "Employee",
    recipientName: transfer.employee,
    recipientId: transfer.employeeId,
    phone: employee?.phone,
    title: `${transfer.employee} · Store transfer`,
    message: buildTransferMessage(transfer),
    status: "Ready",
    createdAt,
    relatedTransferId: transfer.id,
  };
}

export function createManagerNudgeNotification(
  weekStart: string,
  id: string,
  createdAt: string,
): WhatsAppNotification {
  const manager = EMPLOYEES.find((employee) => employee.role === "Store Manager");
  return {
    id,
    kind: "Roster nudge",
    audience: "Store Manager",
    recipientName: manager?.name ?? "Store Manager",
    recipientId: manager?.id,
    phone: manager?.phone,
    title: "Store Manager · Roster reminder",
    message: buildStoreManagerNudgeMessage(),
    status: "Ready",
    createdAt,
    weekStart,
  };
}

export function createInitialState(): RosterAppState {
  const current = startOfWeekIso();
  const planning = planningWeekIso();
  const previous = addDaysIso(current, -7);
  const planningDates = weekDates(planning);
  const currentRoster: WeekRoster = {
    ...createWeekRoster(current, false),
    status: "Published",
  };
  const transfers: TransferRequest[] = [
    {
      id: "tr-demo-1",
      employee: "Saira P.",
      employeeId: "bf-p201",
      direction: "Incoming",
      sourceStore: "Bengaluru Flex Pool",
      destinationStore: "BF-BLR-01",
      date: planningDates[5],
      shift: "CL",
      status: "Scheduled",
    },
    {
      id: "tr-demo-2",
      employee: "Asha Nair",
      employeeId: "bf-101",
      direction: "Outgoing",
      sourceStore: "BF-BLR-01",
      destinationStore: "BF-BLR-02",
      date: planningDates[2],
      shift: "CL",
      status: "Scheduled",
    },
  ];
  const publishedNotifications = createPublicationNotifications(
    currentRoster,
    "wa-current",
    "Today · 09:12",
  ).map((notification) => ({
    ...notification,
    status: "Opened" as const,
  }));
  const transferNotifications = transfers.map((transfer, index) =>
    createTransferNotification(
      transfer,
      `wa-transfer-${index + 1}`,
      index === 0 ? "Yesterday · 18:40" : "Today · 10:05",
    ),
  );

  return {
    schedules: {
      [previous]: { ...createWeekRoster(previous, false), status: "Published" },
      [current]: currentRoster,
      [planning]: createWeekRoster(planning, true),
    },
    transfers,
    activity: [
      {
        id: "activity-1",
        title: "Current-week roster published",
        detail: "Asha Nair published 42 assignments for BF-BLR-01.",
        kind: "success",
        time: "Today · 09:12",
      },
      {
        id: "activity-2",
        title: "Temporary cover scheduled",
        detail: "Saira P. added from the Bengaluru Flex Pool for Saturday.",
        kind: "info",
        time: "Yesterday · 18:40",
      },
      {
        id: "activity-3",
        title: "Planning reminder queued",
        detail: "Next-week roster is due Thursday at 18:00.",
        kind: "warning",
        time: "Mon · 10:00",
      },
    ],
    notifications: [
      createManagerNudgeNotification(
        planning,
        "wa-nudge-planning",
        "Mon · 10:00",
      ),
      ...transferNotifications,
      ...publishedNotifications,
    ],
  };
}
