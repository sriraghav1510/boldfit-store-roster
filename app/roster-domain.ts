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

export type StoreLocation = {
  code: string;
  name: string;
  hours: string;
  latitude: number;
  longitude: number;
  geofenceRadiusMeters: 10;
  googleMapsPin: string;
  pinStatus: "Demo" | "Configured";
};

export type DeviceLocation = {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
};

export type GeofenceResult = {
  status: "Inside" | "Outside" | "Retry";
  allowed: boolean;
  distanceMeters: number;
  accuracyMeters: number;
  message: string;
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
  reviewStatus?: "Pending review" | "Approved" | "Changes requested";
  reviewComment?: string;
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
    | "Transfer cancelled"
    | "Shift change"
    | "Roster published"
    | "Roster nudge"
    | "Roster approved"
    | "Roster correction"
    | "Coverage risk";
  audience: "Employee" | "Area Operations Manager" | "Store Manager";
  recipientName: string;
  recipientId?: string;
  phone?: string;
  title: string;
  message: string;
  status: "Ready" | "Opened" | "Cancelled";
  responseRequired?: boolean;
  responseStatus?: "Pending" | "Confirmed" | "Issue reported";
  createdAt: string;
  weekStart?: string;
  relatedTransferId?: string;
  relatedDate?: string;
};

export type RosterAppState = {
  schedules: Record<string, WeekRoster>;
  transfers: TransferRequest[];
  activity: ActivityEvent[];
  notifications: WhatsAppNotification[];
  stores: StoreLocation[];
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

export const STORES: StoreLocation[] = [
  {
    code: "BF-BLR-01",
    name: "Bengaluru Store 01",
    hours: "10:00–21:00",
    latitude: 12.971599,
    longitude: 77.594566,
    geofenceRadiusMeters: 10,
    googleMapsPin: "12.971599, 77.594566",
    pinStatus: "Demo",
  },
  {
    code: "BF-BLR-02",
    name: "Bengaluru Store 02",
    hours: "10:00–21:00",
    latitude: 12.935192,
    longitude: 77.624481,
    geofenceRadiusMeters: 10,
    googleMapsPin: "12.935192, 77.624481",
    pinStatus: "Demo",
  },
  {
    code: "BF-BLR-03",
    name: "Bengaluru Store 03",
    hours: "10:00–21:00",
    latitude: 13.0358,
    longitude: 77.597,
    geofenceRadiusMeters: 10,
    googleMapsPin: "13.035800, 77.597000",
    pinStatus: "Demo",
  },
];

const EARTH_RADIUS_METERS = 6_371_000;
export const MAX_GEOFENCE_ACCURACY_METERS = 25;

function degreesToRadians(value: number): number {
  return (value * Math.PI) / 180;
}

export function distanceBetweenMeters(
  first: Pick<DeviceLocation, "latitude" | "longitude">,
  second: Pick<DeviceLocation, "latitude" | "longitude">,
): number {
  const latitudeDelta = degreesToRadians(
    second.latitude - first.latitude,
  );
  const longitudeDelta = degreesToRadians(
    second.longitude - first.longitude,
  );
  const firstLatitude = degreesToRadians(first.latitude);
  const secondLatitude = degreesToRadians(second.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;
  const arc = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  return EARTH_RADIUS_METERS * arc;
}

export function evaluateStoreGeofence(
  store: StoreLocation,
  deviceLocation: DeviceLocation,
): GeofenceResult {
  const distanceMeters = distanceBetweenMeters(store, deviceLocation);
  const roundedDistance = Math.round(distanceMeters * 10) / 10;
  const roundedAccuracy = Math.round(deviceLocation.accuracyMeters);

  if (
    !Number.isFinite(deviceLocation.accuracyMeters) ||
    deviceLocation.accuracyMeters > MAX_GEOFENCE_ACCURACY_METERS
  ) {
    return {
      status: "Retry",
      allowed: false,
      distanceMeters: roundedDistance,
      accuracyMeters: roundedAccuracy,
      message: `GPS accuracy is ±${roundedAccuracy}m. Move near the store entrance and retry.`,
    };
  }

  if (distanceMeters <= store.geofenceRadiusMeters) {
    return {
      status: "Inside",
      allowed: true,
      distanceMeters: roundedDistance,
      accuracyMeters: roundedAccuracy,
      message: `Location verified inside the ${store.geofenceRadiusMeters}m store boundary.`,
    };
  }

  return {
    status: "Outside",
    allowed: false,
    distanceMeters: roundedDistance,
    accuracyMeters: roundedAccuracy,
    message: `You are ${roundedDistance}m from the store pin. Move within ${store.geofenceRadiusMeters}m to continue.`,
  };
}

export function parseGoogleMapsPin(
  value: string,
): Pick<DeviceLocation, "latitude" | "longitude"> | null {
  const input = value.trim();
  if (!input) return null;

  let decoded = input;
  try {
    decoded = decodeURIComponent(input);
  } catch {
    // An ordinary coordinate pair is already usable without URL decoding.
  }

  const candidates = [
    decoded.match(/@(-?\d{1,2}(?:\.\d+)?),\s*(-?\d{1,3}(?:\.\d+)?)/),
    decoded.match(/[?&](?:q|query|destination)=(-?\d{1,2}(?:\.\d+)?),\s*(-?\d{1,3}(?:\.\d+)?)/i),
    decoded.match(/^\s*(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/),
  ];
  const match = candidates.find(
    (candidate): candidate is RegExpMatchArray => candidate !== null,
  );
  if (!match) return null;

  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  return { latitude, longitude };
}

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

export type Coverage = {
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
  if (countBlankAssignments(roster) === 0) {
    return roster;
  }

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

export function buildTransferCancellationMessage(
  transfer: TransferRequest,
): string {
  return [
    `Hi ${firstName(transfer.employee)},`,
    `Your transfer to ${storeName(transfer.destinationStore)} on ${formatOrdinalDate(transfer.date)} has been cancelled. Please follow your original roster at ${storeName(transfer.sourceStore)}.`,
  ].join("\n");
}

export function buildShiftChangeMessage({
  employee,
  date,
  previous,
  next,
  reason,
  storeCode = "BF-BLR-01",
}: {
  employee: Employee;
  date: string;
  previous: RosterValue;
  next: RosterValue;
  reason: string;
  storeCode?: string;
}): string {
  return [
    `Hi ${firstName(employee.name)},`,
    `Your shift for ${formatMessageDayDate(date)} at ${storeName(storeCode)} has been changed from ${formatRosterMessageAssignment(previous)} to ${formatRosterMessageAssignment(next)}.`,
    `Reason: ${reason}`,
    "Please confirm that you have seen this update.",
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

export function buildRosterApprovedMessage(
  weekStart: string,
  storeCode = "BF-BLR-01",
): string {
  return [
    "Dear SM,",
    `Your roster for ${storeName(storeCode)} for ${formatWeekRange(weekStart)} has been reviewed and approved by the AOM.`,
  ].join("\n");
}

export function buildRosterCorrectionMessage(
  weekStart: string,
  comment: string,
  storeCode = "BF-BLR-01",
): string {
  return [
    "Dear SM,",
    `Your roster for ${storeName(storeCode)} for ${formatWeekRange(weekStart)} has been returned for correction.`,
    `AOM comment: ${comment}`,
    "Please update and republish the roster.",
  ].join("\n");
}

export function buildCoverageRiskMessage({
  roster,
  date,
  audience,
  storeCode = "BF-BLR-01",
}: {
  roster: WeekRoster;
  date: string;
  audience: "Area Operations Manager" | "Store Manager";
  storeCode?: string;
}): string {
  const coverage = coverageForDate(roster, date);
  const greeting =
    audience === "Area Operations Manager" ? "Dear AOM," : "Dear SM,";
  const action =
    audience === "Area Operations Manager"
      ? "Please review this with the Store Manager."
      : "Please update the roster to restore minimum coverage.";
  return [
    greeting,
    `${storeName(storeCode)} has insufficient coverage on ${formatMessageDayDate(date)}.`,
    `Opening: ${coverage.opening}/2 · Core: ${coverage.core}/4 · Closing: ${coverage.closing}/2`,
    action,
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
    responseRequired: true,
    responseStatus: "Pending" as const,
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

export function createShiftChangeNotification({
  employee,
  weekStart,
  date,
  previous,
  next,
  reason,
  id,
  createdAt,
}: {
  employee: Employee;
  weekStart: string;
  date: string;
  previous: RosterValue;
  next: RosterValue;
  reason: string;
  id: string;
  createdAt: string;
}): WhatsAppNotification {
  return {
    id,
    kind: "Shift change",
    audience: "Employee",
    recipientName: employee.name,
    recipientId: employee.id,
    phone: employee.phone,
    title: `${employee.name} · Shift changed`,
    message: buildShiftChangeMessage({
      employee,
      date,
      previous,
      next,
      reason,
    }),
    status: "Ready",
    responseRequired: true,
    responseStatus: "Pending",
    createdAt,
    weekStart,
    relatedDate: date,
  };
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

export function createTransferCancellationNotification(
  transfer: TransferRequest,
  id: string,
  createdAt: string,
): WhatsAppNotification {
  const employee =
    EMPLOYEES.find((person) => person.id === transfer.employeeId) ??
    FLEX_POOL.find((person) => person.id === transfer.employeeId);
  return {
    id,
    kind: "Transfer cancelled",
    audience: "Employee",
    recipientName: transfer.employee,
    recipientId: transfer.employeeId,
    phone: employee?.phone,
    title: `${transfer.employee} · Transfer cancelled`,
    message: buildTransferCancellationMessage(transfer),
    status: "Ready",
    createdAt,
    relatedTransferId: transfer.id,
    relatedDate: transfer.date,
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

export function createRosterReviewNotification({
  weekStart,
  decision,
  comment,
  id,
  createdAt,
}: {
  weekStart: string;
  decision: "Approved" | "Changes requested";
  comment?: string;
  id: string;
  createdAt: string;
}): WhatsAppNotification {
  const manager = EMPLOYEES.find((employee) => employee.role === "Store Manager");
  const approved = decision === "Approved";
  return {
    id,
    kind: approved ? "Roster approved" : "Roster correction",
    audience: "Store Manager",
    recipientName: manager?.name ?? "Store Manager",
    recipientId: manager?.id,
    phone: manager?.phone,
    title: approved
      ? "Store Manager · Roster approved"
      : "Store Manager · Corrections required",
    message: approved
      ? buildRosterApprovedMessage(weekStart)
      : buildRosterCorrectionMessage(
          weekStart,
          comment?.trim() || "Please review the coverage and shift allocation.",
        ),
    status: "Ready",
    createdAt,
    weekStart,
  };
}

export function createCoverageRiskNotifications(
  roster: WeekRoster,
  idPrefix: string,
  createdAt: string,
  storeCode = "BF-BLR-01",
): WhatsAppNotification[] {
  return weekDates(roster.weekStart).flatMap((date) => {
    if (coverageForDate(roster, date).status === "Good") return [];

    const manager = EMPLOYEES.find(
      (employee) => employee.role === "Store Manager",
    );
    return [
      {
        id: `${idPrefix}-${date}-sm`,
        kind: "Coverage risk" as const,
        audience: "Store Manager" as const,
        recipientName: manager?.name ?? "Store Manager",
        recipientId: manager?.id,
        phone: manager?.phone,
        title: `${formatMessageDayDate(date)} · Coverage risk`,
        message: buildCoverageRiskMessage({
          roster,
          date,
          audience: "Store Manager",
          storeCode,
        }),
        status: "Ready" as const,
        createdAt,
        weekStart: roster.weekStart,
        relatedDate: date,
      },
      {
        id: `${idPrefix}-${date}-aom`,
        kind: "Coverage risk" as const,
        audience: "Area Operations Manager" as const,
        recipientName: "Area Operations Manager",
        title: `${formatMessageDayDate(date)} · Coverage risk`,
        message: buildCoverageRiskMessage({
          roster,
          date,
          audience: "Area Operations Manager",
          storeCode,
        }),
        status: "Ready" as const,
        createdAt,
        weekStart: roster.weekStart,
        relatedDate: date,
      },
    ];
  });
}

export function createInitialState(): RosterAppState {
  const current = startOfWeekIso();
  const planning = planningWeekIso();
  const previous = addDaysIso(current, -7);
  const planningDates = weekDates(planning);
  const currentRoster: WeekRoster = {
    ...createWeekRoster(current, false),
    status: "Published",
    reviewStatus: "Approved",
    reviewComment: "Coverage verified.",
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
  ).map((notification, index) => ({
    ...notification,
    status: "Opened" as const,
    responseStatus:
      notification.audience === "Employee"
        ? index < 2
          ? ("Confirmed" as const)
          : index === 2
            ? ("Issue reported" as const)
            : ("Pending" as const)
        : undefined,
  }));
  const transferNotifications = transfers.map((transfer, index) =>
    createTransferNotification(
      transfer,
      `wa-transfer-${index + 1}`,
      index === 0 ? "Yesterday · 18:40" : "Today · 10:05",
    ),
  );
  const coverageNotifications = createCoverageRiskNotifications(
    createWeekRoster(planning, true),
    "wa-coverage-planning",
    "Today · 10:10",
  );

  return {
    schedules: {
      [previous]: { ...createWeekRoster(previous, false), status: "Published" },
      [current]: currentRoster,
      [planning]: createWeekRoster(planning, true),
    },
    stores: structuredClone(STORES),
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
      {
        id: "activity-4",
        title: "Roster responses received",
        detail: "2 employees confirmed and 1 employee reported an issue.",
        kind: "info",
        time: "Today · 09:35",
      },
    ],
    notifications: [
      createManagerNudgeNotification(
        planning,
        "wa-nudge-planning",
        "Mon · 10:00",
      ),
      ...transferNotifications,
      ...coverageNotifications,
      ...publishedNotifications,
    ],
  };
}
