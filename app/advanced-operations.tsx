"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ATTENDANCE_EMPLOYEES,
  attendanceEmployee,
  todayIso,
  type DemoRole,
} from "./attendance-domain";
import {
  SHIFT_DEFINITIONS,
  addDaysIso,
  type ShiftCode,
  type StoreLocation,
} from "./roster-domain";

type CalloutStatus = "Reported" | "Broadcast" | "Filled";
type TaskStatus = "To do" | "In progress" | "Proof submitted" | "Verified";
type Severity = "Low" | "Medium" | "High";
type DeliveryState = "Delivered" | "Read" | "Acknowledged" | "Escalated";
type ReconciliationStatus =
  | "Employee confirmation"
  | "SM review"
  | "AOM sign-off"
  | "HR locked"
  | "Oracle ready";

type Callout = {
  id: string;
  employeeId: string;
  storeCode: string;
  date: string;
  shift: ShiftCode;
  reason: string;
  status: CalloutStatus;
  eligibleIds: string[];
  selectedEmployeeId?: string;
  reportedAt: string;
};

type LabourBudget = {
  storeCode: string;
  monthlyBudgetHours: number;
  plannedHours: number;
  actualHours: number;
  overtimeHours: number;
  projectedCost: number;
  salesPerLabourHour: number;
};

type ComplianceRule = {
  id: string;
  label: string;
  detail: string;
  mode: "Block" | "Warn";
  enabled: boolean;
  currentFlags: number;
};

type StoreTask = {
  id: string;
  storeCode: string;
  title: string;
  category: string;
  assigneeId: string;
  dueTime: string;
  status: TaskStatus;
  requiresPhoto: boolean;
  proof?: string;
  sla: string;
};

type Handover = {
  id: string;
  storeCode: string;
  fromShift: string;
  authorId: string;
  summary: string;
  openItems: string[];
  acknowledged: boolean;
  escalated: boolean;
};

type StoreProof = {
  storeCode: string;
  opening: "Pending" | "Verified";
  closing: "Pending" | "Verified";
  openingTime?: string;
  closingTime?: string;
  openingEvidence?: string;
  closingEvidence?: string;
};

type Incident = {
  id: string;
  storeCode: string;
  category: string;
  severity: Severity;
  summary: string;
  status: "Open" | "Investigating" | "Resolved";
  confidential: boolean;
};

type MaintenanceTicket = {
  id: string;
  storeCode: string;
  asset: string;
  issue: string;
  priority: Severity;
  status: "Raised" | "Vendor assigned" | "Resolved";
  sla: string;
};

type DemandSlot = {
  time: string;
  footfall: number;
  recommended: number;
  scheduled: number;
  taskLoad: number;
};

type Delivery = {
  id: string;
  recipient: string;
  message: string;
  primaryChannel: "Push" | "WhatsApp" | "SMS";
  fallbackChannel: "WhatsApp" | "SMS" | "None";
  language: string;
  state: DeliveryState;
  attempts: number;
};

type Certification = {
  employeeId: string;
  name: string;
  status: "Valid" | "Expiring" | "Expired";
  expiresOn: string;
};

type Learning = {
  id: string;
  title: string;
  duration: string;
  progress: number;
  skillAwarded: string;
};

type Announcement = {
  id: string;
  title: string;
  body: string;
  audience: string;
  mandatory: boolean;
  acknowledgedIds: string[];
};

type AuditVisit = {
  id: string;
  storeCode: string;
  date: string;
  type: "Planned" | "Surprise";
  score?: number;
  status: "Scheduled" | "In progress" | "Completed";
  actionsOpen: number;
};

type AdvancedState = {
  callouts: Callout[];
  budgets: LabourBudget[];
  rules: ComplianceRule[];
  tasks: StoreTask[];
  handovers: Handover[];
  proofs: StoreProof[];
  incidents: Incident[];
  maintenance: MaintenanceTicket[];
  delivery: Delivery[];
  certifications: Certification[];
  learning: Learning[];
  announcements: Announcement[];
  audits: AuditVisit[];
  recognition: string[];
  reconciliation: ReconciliationStatus;
  employeeConfirmations: number;
  scenario: {
    label: string;
    peopleGap: number;
    weeklyCostChange: number;
    coverage: number;
    recommendation: string;
  };
  channels: {
    push: boolean;
    whatsapp: boolean;
    smsFallback: boolean;
    language: string;
  };
};

const ADVANCED_STORAGE_KEY = "boldfit-advanced-operations-v1";
const DEFAULT_EMPLOYEE_ID = "bf-104";

function seedState(): AdvancedState {
  const today = todayIso();
  return {
    callouts: [
      {
        id: "callout-1",
        employeeId: "bf-103",
        storeCode: "BF-BLR-01",
        date: today,
        shift: "CL",
        reason: "Unwell and unable to travel",
        status: "Reported",
        eligibleIds: ["bf-203", "bf-303", "bf-105"],
        reportedAt: "Today · 08:18",
      },
    ],
    budgets: [
      {
        storeCode: "BF-BLR-01",
        monthlyBudgetHours: 1120,
        plannedHours: 1082,
        actualHours: 734,
        overtimeHours: 12,
        projectedCost: 258400,
        salesPerLabourHour: 3940,
      },
      {
        storeCode: "BF-BLR-02",
        monthlyBudgetHours: 1160,
        plannedHours: 1198,
        actualHours: 786,
        overtimeHours: 31,
        projectedCost: 281700,
        salesPerLabourHour: 4210,
      },
      {
        storeCode: "BF-BLR-03",
        monthlyBudgetHours: 1040,
        plannedHours: 978,
        actualHours: 692,
        overtimeHours: 8,
        projectedCost: 237900,
        salesPerLabourHour: 3620,
      },
    ],
    rules: [
      {
        id: "rule-rest",
        label: "Minimum 11-hour rest",
        detail: "Prevents a closing shift followed by an early opening.",
        mode: "Block",
        enabled: true,
        currentFlags: 1,
      },
      {
        id: "rule-days",
        label: "Maximum 6 consecutive days",
        detail: "Protects weekly rest and highlights fatigue risk.",
        mode: "Block",
        enabled: true,
        currentFlags: 0,
      },
      {
        id: "rule-hours",
        label: "48-hour weekly threshold",
        detail: "Warns before planned hours cross the configured threshold.",
        mode: "Warn",
        enabled: true,
        currentFlags: 3,
      },
      {
        id: "rule-full",
        label: "Maximum 2 FULL shifts",
        detail: "Restricts repeated long shifts within a roster week.",
        mode: "Warn",
        enabled: true,
        currentFlags: 2,
      },
      {
        id: "rule-skill",
        label: "Key-holder certification",
        detail: "Blocks unqualified employees from opening or closing duty.",
        mode: "Block",
        enabled: true,
        currentFlags: 1,
      },
      {
        id: "rule-budget",
        label: "Store labour budget",
        detail: "Requires AOM approval before publishing above budget.",
        mode: "Block",
        enabled: true,
        currentFlags: 1,
      },
    ],
    tasks: [
      {
        id: "task-1",
        storeCode: "BF-BLR-01",
        title: "Campaign display refresh",
        category: "Visual merchandising",
        assigneeId: "bf-103",
        dueTime: "11:00",
        status: "In progress",
        requiresPhoto: true,
        sla: "42 min left",
      },
      {
        id: "task-2",
        storeCode: "BF-BLR-01",
        title: "High-value inventory count",
        category: "Inventory",
        assigneeId: "bf-106",
        dueTime: "14:00",
        status: "To do",
        requiresPhoto: false,
        sla: "3h 42m left",
      },
      {
        id: "task-3",
        storeCode: "BF-BLR-01",
        title: "POS settlement and cash close",
        category: "Closing",
        assigneeId: "bf-102",
        dueTime: "21:10",
        status: "To do",
        requiresPhoto: true,
        sla: "Today",
      },
      {
        id: "task-4",
        storeCode: "BF-BLR-02",
        title: "Weekend replenishment",
        category: "Inventory",
        assigneeId: "bf-206",
        dueTime: "13:00",
        status: "Proof submitted",
        requiresPhoto: true,
        proof: "3 shelf photos · 12:26",
        sla: "Awaiting verification",
      },
    ],
    handovers: [
      {
        id: "handover-1",
        storeCode: "BF-BLR-01",
        fromShift: "Yesterday closing",
        authorId: "bf-102",
        summary:
          "Cash matched. One return awaits customer confirmation. AC in trial room is intermittent.",
        openItems: ["Customer return follow-up", "AC vendor visit"],
        acknowledged: false,
        escalated: false,
      },
      {
        id: "handover-2",
        storeCode: "BF-BLR-02",
        fromShift: "Morning to mid",
        authorId: "bf-201",
        summary:
          "New campaign stock received; two cartons still need GRN verification.",
        openItems: ["Verify 2 cartons"],
        acknowledged: true,
        escalated: false,
      },
    ],
    proofs: [
      {
        storeCode: "BF-BLR-01",
        opening: "Verified",
        closing: "Pending",
        openingTime: "09:51",
        openingEvidence: "Face + geofence + shutter photo",
      },
      {
        storeCode: "BF-BLR-02",
        opening: "Verified",
        closing: "Pending",
        openingTime: "09:56",
        openingEvidence: "Face + geofence + shutter photo",
      },
      {
        storeCode: "BF-BLR-03",
        opening: "Pending",
        closing: "Pending",
      },
    ],
    incidents: [
      {
        id: "incident-1",
        storeCode: "BF-BLR-02",
        category: "Cash discrepancy",
        severity: "High",
        summary: "₹2,400 settlement variance under investigation.",
        status: "Investigating",
        confidential: true,
      },
      {
        id: "incident-2",
        storeCode: "BF-BLR-01",
        category: "Customer safety",
        severity: "Low",
        summary: "Loose display edge isolated; no injury reported.",
        status: "Open",
        confidential: false,
      },
    ],
    maintenance: [
      {
        id: "maint-1",
        storeCode: "BF-BLR-01",
        asset: "Trial room AC",
        issue: "Intermittent cooling",
        priority: "Medium",
        status: "Vendor assigned",
        sla: "Today · 16:00",
      },
      {
        id: "maint-2",
        storeCode: "BF-BLR-03",
        asset: "Barcode printer",
        issue: "Paper feed error",
        priority: "High",
        status: "Raised",
        sla: "58 min",
      },
    ],
    delivery: [
      {
        id: "delivery-1",
        recipient: attendanceEmployee(DEFAULT_EMPLOYEE_ID).name,
        message: "CL replacement opportunity at Bengaluru Store 01",
        primaryChannel: "Push",
        fallbackChannel: "WhatsApp",
        language: "English",
        state: "Read",
        attempts: 1,
      },
      {
        id: "delivery-2",
        recipient: "Manoj Gupta",
        message: "Roster change requires acknowledgement",
        primaryChannel: "WhatsApp",
        fallbackChannel: "SMS",
        language: "Hindi",
        state: "Delivered",
        attempts: 1,
      },
      {
        id: "delivery-3",
        recipient: "Neha Kulkarni",
        message: "Store 02 is projected above labour budget",
        primaryChannel: "Push",
        fallbackChannel: "WhatsApp",
        language: "English",
        state: "Acknowledged",
        attempts: 1,
      },
    ],
    certifications: [
      {
        employeeId: "bf-104",
        name: "Product specialist",
        status: "Valid",
        expiresOn: "30 Jun 2027",
      },
      {
        employeeId: "bf-102",
        name: "Key holder",
        status: "Expiring",
        expiresOn: "18 Aug 2026",
      },
      {
        employeeId: "bf-206",
        name: "Inventory control",
        status: "Valid",
        expiresOn: "11 Feb 2027",
      },
      {
        employeeId: "bf-303",
        name: "First aid",
        status: "Expired",
        expiresOn: "24 Jul 2026",
      },
    ],
    learning: [
      {
        id: "learn-1",
        title: "Weekend conversion playbook",
        duration: "8 min",
        progress: 65,
        skillAwarded: "Product specialist",
      },
      {
        id: "learn-2",
        title: "Safe store opening",
        duration: "6 min",
        progress: 20,
        skillAwarded: "Opening",
      },
      {
        id: "learn-3",
        title: "Customer data and privacy",
        duration: "5 min",
        progress: 100,
        skillAwarded: "Compliance",
      },
    ],
    announcements: [
      {
        id: "announcement-1",
        title: "Monsoon campaign launch",
        body:
          "New display and product stories go live Saturday. Complete the 8-minute campaign module before Friday close.",
        audience: "All Bengaluru stores",
        mandatory: true,
        acknowledgedIds: ["bf-101", "bf-102", "bf-201"],
      },
      {
        id: "announcement-2",
        title: "Attendance privacy notice updated",
        body:
          "Face event images retain only for the approved policy period. Review the updated employee notice.",
        audience: "All employees",
        mandatory: true,
        acknowledgedIds: [],
      },
    ],
    audits: [
      {
        id: "audit-visit-1",
        storeCode: "BF-BLR-03",
        date: addDaysIso(today, 1),
        type: "Planned",
        status: "Scheduled",
        actionsOpen: 0,
      },
      {
        id: "audit-visit-2",
        storeCode: "BF-BLR-01",
        date: addDaysIso(today, -4),
        type: "Surprise",
        score: 92,
        status: "Completed",
        actionsOpen: 1,
      },
      {
        id: "audit-visit-3",
        storeCode: "BF-BLR-02",
        date: addDaysIso(today, -8),
        type: "Planned",
        score: 86,
        status: "Completed",
        actionsOpen: 3,
      },
    ],
    recognition: [
      "Covered an urgent shift for Store 02",
      "Completed 7 punctual attendance days",
      "Customer champion · July week 4",
    ],
    reconciliation: "Employee confirmation",
    employeeConfirmations: 14,
    scenario: {
      label: "Current approved plan",
      peopleGap: 1,
      weeklyCostChange: 0,
      coverage: 94,
      recommendation: "Move one MID specialist to Store 02 on Saturday.",
    },
    channels: {
      push: true,
      whatsapp: true,
      smsFallback: true,
      language: "English",
    },
  };
}

function loadState(): AdvancedState {
  const initial = seedState();
  if (typeof window === "undefined") return initial;
  try {
    const saved = window.localStorage.getItem(ADVANCED_STORAGE_KEY);
    if (!saved) return initial;
    return { ...initial, ...(JSON.parse(saved) as AdvancedState) };
  } catch {
    return initial;
  }
}

function money(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function shortDate(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(`${value}T00:00:00`));
}

function tone(value: string): "good" | "warn" | "bad" {
  const normalized = value.toLowerCase();
  if (
    normalized.includes("verified") ||
    normalized.includes("filled") ||
    normalized.includes("valid") ||
    normalized.includes("completed") ||
    normalized.includes("acknowledged") ||
    normalized.includes("resolved") ||
    normalized.includes("oracle")
  ) {
    return "good";
  }
  if (
    normalized.includes("high") ||
    normalized.includes("expired") ||
    normalized.includes("escalated") ||
    normalized.includes("over")
  ) {
    return "bad";
  }
  return "warn";
}

function Chip({ children, value }: { children?: ReactNode; value?: string }) {
  const label = value ?? String(children);
  return (
    <span className={`advanced-chip ${tone(label)}`}>{children ?? value}</span>
  );
}

function Heading({
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
    <div className="advanced-heading">
      <div>
        <span>{eyebrow}</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}

function Card({
  eyebrow,
  title,
  children,
  action,
  className = "",
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`advanced-card ${className}`}>
      <div className="advanced-card-head">
        <div>
          <span>{eyebrow}</span>
          <h3>{title}</h3>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function AdvancedOperations({
  role,
  stores,
  employeeId = DEFAULT_EMPLOYEE_ID,
}: {
  role: DemoRole;
  stores: StoreLocation[];
  employeeId?: string;
}) {
  const [state, setState] = useState<AdvancedState>(seedState);
  const [toast, setToast] = useState<string | null>(null);
  const restored = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      restored.current = true;
      setState(loadState());
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!restored.current) return;
    window.localStorage.setItem(ADVANCED_STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 3200);
  }

  function updateCallout(id: string, status: CalloutStatus) {
    setState((current) => ({
      ...current,
      callouts: current.callouts.map((item) =>
        item.id === id ? { ...item, status } : item,
      ),
      delivery:
        status === "Broadcast"
          ? [
              ...current.callouts
                .find((item) => item.id === id)!
                .eligibleIds.map((employeeId, index) => ({
                  id: `delivery-callout-${Date.now()}-${index}`,
                  recipient: attendanceEmployee(employeeId).name,
                  message:
                    "Urgent eligible shift available. Tap to accept or decline.",
                  primaryChannel: "Push" as const,
                  fallbackChannel: "WhatsApp" as const,
                  language: "English",
                  state: "Delivered" as const,
                  attempts: 1,
                })),
              ...current.delivery,
            ]
          : current.delivery,
    }));
    notify(
      status === "Broadcast"
        ? "Eligible replacements notified by push and WhatsApp."
        : "Availability report updated.",
    );
  }

  function claimReplacement(calloutId: string, employeeId: string) {
    const selected = attendanceEmployee(employeeId);
    setState((current) => ({
      ...current,
      callouts: current.callouts.map((item) =>
        item.id === calloutId
          ? {
              ...item,
              status: "Filled",
              selectedEmployeeId: employeeId,
            }
          : item,
      ),
      delivery: [
        {
          id: `delivery-assigned-${Date.now()}`,
          recipient: selected.name,
          message:
            "Shift accepted and added to your roster. Store Manager has been notified.",
          primaryChannel: "WhatsApp",
          fallbackChannel: "SMS",
          language: "English",
          state: "Acknowledged",
          attempts: 1,
        },
        ...current.delivery,
      ],
    }));
    notify(`${selected.name} assigned. Roster and communications updated.`);
  }

  function reportUnavailable() {
    const exists = state.callouts.some(
      (item) =>
        item.employeeId === employeeId &&
        item.date === addDaysIso(todayIso(), 1),
    );
    if (exists) {
      notify("Your availability report is already with the Store Manager.");
      return;
    }
    setState((current) => ({
      ...current,
      callouts: [
        {
          id: `callout-${Date.now()}`,
          employeeId,
          storeCode: "BF-BLR-01",
          date: addDaysIso(todayIso(), 1),
          shift: "MID",
          reason: "Personal emergency",
          status: "Reported",
          eligibleIds: ["bf-203", "bf-303", "bf-105"],
          reportedAt: "Just now",
        },
        ...current.callouts,
      ],
      delivery: [
        {
          id: `delivery-sm-${Date.now()}`,
          recipient: "Asha Nair",
          message:
            "New employee call-out requires replacement coverage for tomorrow.",
          primaryChannel: "Push",
          fallbackChannel: "WhatsApp",
          language: "English",
          state: "Delivered",
          attempts: 1,
        },
        ...current.delivery,
      ],
    }));
    notify("Unable-to-attend report sent. Your manager is arranging cover.");
  }

  function progressTask(id: string) {
    const order: TaskStatus[] = [
      "To do",
      "In progress",
      "Proof submitted",
      "Verified",
    ];
    setState((current) => ({
      ...current,
      tasks: current.tasks.map((task) => {
        if (task.id !== id) return task;
        const next = order[Math.min(order.indexOf(task.status) + 1, 3)];
        return {
          ...task,
          status: next,
          proof:
            next === "Proof submitted" || next === "Verified"
              ? task.proof ?? "Photo + geofence · Just now"
              : task.proof,
        };
      }),
    }));
    notify("Task status and evidence trail updated.");
  }

  function acknowledgeHandover(id: string) {
    setState((current) => ({
      ...current,
      handovers: current.handovers.map((item) =>
        item.id === id ? { ...item, acknowledged: true } : item,
      ),
    }));
    notify("Shift handover acknowledged.");
  }

  function escalateHandover(id: string) {
    setState((current) => ({
      ...current,
      handovers: current.handovers.map((item) =>
        item.id === id ? { ...item, escalated: true } : item,
      ),
      delivery: [
        {
          id: `handover-escalation-${Date.now()}`,
          recipient: "Area Operations Manager",
          message:
            "Unresolved store handover item requires Area Operations support.",
          primaryChannel: "Push",
          fallbackChannel: "WhatsApp",
          language: "English",
          state: "Escalated",
          attempts: 2,
        },
        ...current.delivery,
      ],
    }));
    notify("Only the unresolved item was escalated to Area Operations.");
  }

  function verifyStoreProof(storeCode: string, phase: "opening" | "closing") {
    setState((current) => ({
      ...current,
      proofs: current.proofs.map((proof) =>
        proof.storeCode === storeCode
          ? {
              ...proof,
              [phase]: "Verified",
              [`${phase}Time`]: phase === "opening" ? "09:58" : "21:07",
              [`${phase}Evidence`]:
                "Face + geofence + timestamp + store photo",
            }
          : proof,
      ),
    }));
    notify(
      `${phase === "opening" ? "Opening" : "Closing"} proof verified and sealed.`,
    );
  }

  function resolveIncident(id: string) {
    setState((current) => ({
      ...current,
      incidents: current.incidents.map((incident) =>
        incident.id === id ? { ...incident, status: "Resolved" } : incident,
      ),
    }));
    notify("Incident resolved with its restricted evidence trail retained.");
  }

  function advanceMaintenance(id: string) {
    setState((current) => ({
      ...current,
      maintenance: current.maintenance.map((ticket) =>
        ticket.id === id
          ? {
              ...ticket,
              status:
                ticket.status === "Raised" ? "Vendor assigned" : "Resolved",
            }
          : ticket,
      ),
    }));
    notify("Maintenance owner, status and SLA updated.");
  }

  function runScenario(kind: "traffic" | "absence" | "budget") {
    const scenarios = {
      traffic: {
        label: "Saturday footfall +25%",
        peopleGap: 3,
        weeklyCostChange: 12800,
        coverage: 87,
        recommendation:
          "Add one MID and two four-hour peak shifts between 15:00 and 19:00.",
      },
      absence: {
        label: "Two Store 02 employees absent",
        peopleGap: 2,
        weeklyCostChange: 7400,
        coverage: 82,
        recommendation:
          "Use Vikram Shah plus one Store 01 flex specialist; avoid overtime.",
      },
      budget: {
        label: "Budget-safe optimisation",
        peopleGap: 0,
        weeklyCostChange: -9600,
        coverage: 96,
        recommendation:
          "Replace two FULL shifts with OP + CL coverage and one flex peak shift.",
      },
    };
    setState((current) => ({ ...current, scenario: scenarios[kind] }));
    notify("Workforce scenario recalculated with cost and coverage impact.");
  }

  function toggleRule(id: string) {
    setState((current) => ({
      ...current,
      rules: current.rules.map((rule) =>
        rule.id === id ? { ...rule, enabled: !rule.enabled } : rule,
      ),
    }));
    notify("Compliance policy updated. Every change is audit logged.");
  }

  function advanceDelivery(id: string) {
    const states: DeliveryState[] = [
      "Delivered",
      "Read",
      "Acknowledged",
      "Escalated",
    ];
    setState((current) => ({
      ...current,
      delivery: current.delivery.map((item) => {
        if (item.id !== id) return item;
        const next = states[Math.min(states.indexOf(item.state) + 1, 3)];
        return {
          ...item,
          state: next,
          attempts: next === "Escalated" ? item.attempts + 1 : item.attempts,
        };
      }),
    }));
    notify("Delivery acknowledgement workflow advanced.");
  }

  function completeLearning(id: string) {
    setState((current) => ({
      ...current,
      learning: current.learning.map((course) =>
        course.id === id ? { ...course, progress: 100 } : course,
      ),
      recognition: [
        `Completed ${current.learning.find((course) => course.id === id)?.title}`,
        ...current.recognition,
      ],
    }));
    notify("Module completed. Skill record and recognition updated.");
  }

  function acknowledgeAnnouncement(id: string) {
    setState((current) => ({
      ...current,
      announcements: current.announcements.map((announcement) =>
        announcement.id === id
          ? {
              ...announcement,
              acknowledgedIds: Array.from(
                new Set([
                  ...announcement.acknowledgedIds,
                  employeeId,
                ]),
              ),
            }
          : announcement,
      ),
    }));
    notify("Announcement acknowledged with timestamp.");
  }

  function completeAudit(id: string) {
    setState((current) => ({
      ...current,
      audits: current.audits.map((audit) =>
        audit.id === id
          ? {
              ...audit,
              status: "Completed",
              score: 89,
              actionsOpen: 2,
            }
          : audit,
      ),
    }));
    notify("AOM visit submitted with geo and photo evidence.");
  }

  function advanceReconciliation() {
    const stages: ReconciliationStatus[] = [
      "Employee confirmation",
      "SM review",
      "AOM sign-off",
      "HR locked",
      "Oracle ready",
    ];
    setState((current) => ({
      ...current,
      reconciliation:
        stages[
          Math.min(stages.indexOf(current.reconciliation) + 1, stages.length - 1)
        ],
      employeeConfirmations: Math.min(
        ATTENDANCE_EMPLOYEES.length,
        current.employeeConfirmations + 4,
      ),
    }));
    notify("Month-end attendance moved to the next controlled approval stage.");
  }

  function exportOracle() {
    const rows = [
      [
        "EMPLOYEE_CODE",
        "STORE_CODE",
        "PAY_PERIOD",
        "REGULAR_HOURS",
        "OVERTIME_HOURS",
        "EXCEPTIONS",
        "STATUS",
      ],
      ...ATTENDANCE_EMPLOYEES.map((employee, index) => [
        employee.id.toUpperCase(),
        employee.homeStore,
        "2026-07",
        index % 4 === 0 ? "184.0" : "192.0",
        index % 5 === 0 ? "4.0" : "0.0",
        index % 6 === 0 ? "1" : "0",
        "RECONCILED",
      ]),
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
    link.download = "boldfit-oracle-attendance-2026-07.csv";
    link.click();
    URL.revokeObjectURL(href);
    setState((current) => ({ ...current, reconciliation: "Oracle ready" }));
    notify("Reconciled Oracle attendance file downloaded.");
  }

  function downloadPayslip() {
    const employee = attendanceEmployee(employeeId);
    const content = [
      "BOLDFIT PRIVATE LIMITED",
      "Payslip · July 2026",
      `Employee: ${employee.name} (${employee.employeeCode})`,
      "Store: Bengaluru Store 01",
      "Gross earnings: ₹36,200",
      "Deductions: ₹4,360",
      "Net pay: ₹31,840",
    ].join("\n");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = `boldfit-payslip-${employee.employeeCode.toLowerCase()}-july-2026.txt`;
    link.click();
    URL.revokeObjectURL(href);
    notify("July payslip downloaded securely.");
  }

  function toggleChannel(channel: "push" | "whatsapp" | "smsFallback") {
    setState((current) => ({
      ...current,
      channels: {
        ...current.channels,
        [channel]: !current.channels[channel],
      },
    }));
    notify("Communication preferences saved.");
  }

  function changeLanguage(language: string) {
    setState((current) => ({
      ...current,
      channels: { ...current.channels, language },
    }));
    notify(`Employee communication language changed to ${language}.`);
  }

  function resetAdvancedDemo() {
    window.localStorage.removeItem(ADVANCED_STORAGE_KEY);
    setState(seedState());
    notify("Advanced operations demo reset.");
  }

  const demandSlots = useMemo<DemandSlot[]>(
    () => [
      { time: "10:00", footfall: 11, recommended: 3, scheduled: 3, taskLoad: 1 },
      { time: "12:00", footfall: 26, recommended: 5, scheduled: 4, taskLoad: 2 },
      { time: "14:00", footfall: 34, recommended: 6, scheduled: 5, taskLoad: 1 },
      { time: "16:00", footfall: 47, recommended: 7, scheduled: 5, taskLoad: 1 },
      { time: "18:00", footfall: 58, recommended: 8, scheduled: 6, taskLoad: 0 },
      { time: "20:00", footfall: 29, recommended: 5, scheduled: 5, taskLoad: 2 },
    ],
    [],
  );

  return (
    <div className="advanced-operations">
      {role === "Employee" && (
        <EmployeeExperience
          state={state}
          employeeId={employeeId}
          onUnavailable={reportUnavailable}
          onLearning={completeLearning}
          onAnnouncement={acknowledgeAnnouncement}
          onPayslip={downloadPayslip}
          onChannel={toggleChannel}
          onLanguage={changeLanguage}
        />
      )}
      {role === "Store Manager" && (
        <ManagerDailyOperations
          state={state}
          onBroadcast={updateCallout}
          onClaim={claimReplacement}
          onTask={progressTask}
          onHandover={acknowledgeHandover}
          onEscalateHandover={escalateHandover}
          onProof={verifyStoreProof}
          onIncident={resolveIncident}
          onMaintenance={advanceMaintenance}
          onDelivery={advanceDelivery}
        />
      )}
      {role === "Area Ops" && (
        <AreaPlanningIntelligence
          state={state}
          stores={stores}
          demandSlots={demandSlots}
          onScenario={runScenario}
          onAudit={completeAudit}
          onDelivery={advanceDelivery}
          onRule={toggleRule}
        />
      )}
      {role === "HR Admin" && (
        <HrGovernance
          state={state}
          onReconciliation={advanceReconciliation}
          onOracle={exportOracle}
          onRule={toggleRule}
          onDelivery={advanceDelivery}
          onAnnouncement={acknowledgeAnnouncement}
        />
      )}
      <button
        type="button"
        className="advanced-reset"
        onClick={resetAdvancedDemo}
      >
        Reset advanced demo
      </button>
      {toast && (
        <div className="suite-toast advanced-toast" role="status">
          <span>✓</span>
          {toast}
        </div>
      )}
    </div>
  );
}

function EmployeeExperience({
  state,
  employeeId,
  onUnavailable,
  onLearning,
  onAnnouncement,
  onPayslip,
  onChannel,
  onLanguage,
}: {
  state: AdvancedState;
  employeeId: string;
  onUnavailable: () => void;
  onLearning: (id: string) => void;
  onAnnouncement: (id: string) => void;
  onPayslip: () => void;
  onChannel: (channel: "push" | "whatsapp" | "smsFallback") => void;
  onLanguage: (language: string) => void;
}) {
  const personalCallout = state.callouts.find(
    (item) => item.employeeId === employeeId,
  );
  const personalCertifications = state.certifications.filter(
    (item) => item.employeeId === employeeId,
  );
  const employee = attendanceEmployee(employeeId);
  return (
    <>
      <Heading
        eyebrow="MY BOLDFIT"
        title="Wallet, growth and communication"
        description={`Everything ${employee.name.split(" ")[0]} needs beyond today's punch: shifts, money, learning, certificates, announcements and help.`}
        action={
          <button className="advanced-button dark" type="button" onClick={onUnavailable}>
            I cannot attend a shift
          </button>
        }
      />

      <div className="advanced-metrics employee">
        <article>
          <span>Upcoming shifts</span>
          <strong>5</strong>
          <small>Next · MID tomorrow</small>
        </article>
        <article>
          <span>Leave balance</span>
          <strong>4.5</strong>
          <small>Days available</small>
        </article>
        <article>
          <span>Comp-off</span>
          <strong>9h</strong>
          <small>Expires 30 Sep</small>
        </article>
        <article className="spark">
          <span>July net pay</span>
          <strong>₹31.8k</strong>
          <small>Payslip ready</small>
        </article>
      </div>

      {personalCallout && (
        <div className="advanced-alert">
          <div>
            <span>AVAILABILITY REQUEST</span>
            <strong>
              {shortDate(personalCallout.date)} · {personalCallout.shift} shift
            </strong>
            <p>Your Store Manager is arranging eligible cover. Your current roster remains visible until reassigned.</p>
          </div>
          <Chip value={personalCallout.status} />
        </div>
      )}

      <div className="advanced-grid two">
        <Card eyebrow="LEARNING" title="Micro-learning path">
          <div className="advanced-list">
            {state.learning.map((course) => (
              <article key={course.id}>
                <div className="advanced-list-main">
                  <strong>{course.title}</strong>
                  <span>{course.duration} · awards {course.skillAwarded}</span>
                  <div className="advanced-progress">
                    <i style={{ width: `${course.progress}%` }} />
                  </div>
                </div>
                <button
                  type="button"
                  disabled={course.progress === 100}
                  onClick={() => onLearning(course.id)}
                >
                  {course.progress === 100 ? "Completed" : "Finish"}
                </button>
              </article>
            ))}
          </div>
        </Card>

        <Card eyebrow="PAY & BENEFITS" title="Employee wallet">
          <div className="advanced-wallet">
            <div>
              <span>Gross earnings</span>
              <strong>₹36,200</strong>
            </div>
            <div>
              <span>Deductions</span>
              <strong>₹4,360</strong>
            </div>
            <div>
              <span>Attendance eligibility</span>
              <strong>Qualified</strong>
            </div>
            <div>
              <span>Team incentive estimate</span>
              <strong>₹2,180</strong>
            </div>
          </div>
          <button className="advanced-card-action" type="button" onClick={onPayslip}>
            Download July payslip
          </button>
        </Card>
      </div>

      <div className="advanced-grid two">
        <Card eyebrow="NOTICEBOARD" title="Announcements and policies">
          <div className="advanced-list announcements">
            {state.announcements.map((announcement) => {
              const acknowledged = announcement.acknowledgedIds.includes(
                employeeId,
              );
              return (
                <article key={announcement.id}>
                  <div className="advanced-list-main">
                    <strong>{announcement.title}</strong>
                    <span>{announcement.audience}</span>
                    <p>{announcement.body}</p>
                  </div>
                  <button
                    type="button"
                    disabled={acknowledged}
                    onClick={() => onAnnouncement(announcement.id)}
                  >
                    {acknowledged ? "Acknowledged" : "Acknowledge"}
                  </button>
                </article>
              );
            })}
          </div>
        </Card>

        <Card eyebrow="PROFILE" title="Certificates and preferences">
          <div className="advanced-certificates">
            {personalCertifications.map((certification) => (
              <article key={certification.name}>
                <div>
                  <strong>{certification.name}</strong>
                  <span>Valid until {certification.expiresOn}</span>
                </div>
                <Chip value={certification.status} />
              </article>
            ))}
            <article>
              <div>
                <strong>Communication language</strong>
                <span>Applies to push, WhatsApp and SMS</span>
              </div>
              <select
                value={state.channels.language}
                onChange={(event) => onLanguage(event.target.value)}
                aria-label="Communication language"
              >
                <option>English</option>
                <option>Hindi</option>
                <option>Kannada</option>
              </select>
            </article>
          </div>
          <div className="advanced-channel-grid">
            {(
              [
                ["push", "Push", state.channels.push],
                ["whatsapp", "WhatsApp", state.channels.whatsapp],
                ["smsFallback", "SMS fallback", state.channels.smsFallback],
              ] as const
            ).map(([key, label, enabled]) => (
              <button
                key={key}
                type="button"
                className={enabled ? "on" : ""}
                onClick={() => onChannel(key)}
              >
                <span>{enabled ? "ON" : "OFF"}</span>
                {label}
              </button>
            ))}
          </div>
        </Card>
      </div>

      <Card eyebrow="RECOGNITION" title="Private achievements">
        <div className="advanced-recognition">
          {state.recognition.slice(0, 4).map((item, index) => (
            <article key={`${item}-${index}`}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{item}</strong>
            </article>
          ))}
        </div>
      </Card>
    </>
  );
}

function ManagerDailyOperations({
  state,
  onBroadcast,
  onClaim,
  onTask,
  onHandover,
  onEscalateHandover,
  onProof,
  onIncident,
  onMaintenance,
  onDelivery,
}: {
  state: AdvancedState;
  onBroadcast: (id: string, status: CalloutStatus) => void;
  onClaim: (calloutId: string, employeeId: string) => void;
  onTask: (id: string) => void;
  onHandover: (id: string) => void;
  onEscalateHandover: (id: string) => void;
  onProof: (storeCode: string, phase: "opening" | "closing") => void;
  onIncident: (id: string) => void;
  onMaintenance: (id: string) => void;
  onDelivery: (id: string) => void;
}) {
  const storeCode = "BF-BLR-01";
  const callout = state.callouts.find(
    (item) => item.storeCode === storeCode && item.status !== "Filled",
  );
  const storeTasks = state.tasks.filter((item) => item.storeCode === storeCode);
  const proof = state.proofs.find((item) => item.storeCode === storeCode)!;
  const budget = state.budgets.find((item) => item.storeCode === storeCode)!;
  return (
    <>
      <Heading
        eyebrow="STORE MANAGER · DAILY OPS"
        title="Start with decisions, not dashboards"
        description="Asha sees only the actions required to run Bengaluru Store 01 today. Multi-store live monitoring remains restricted to Area Operations."
      />

      <section className="advanced-brief">
        <div className="advanced-brief-title">
          <span>THURSDAY · 09:05</span>
          <h3>Good morning, Asha</h3>
          <p>Six actions will protect today&apos;s coverage, customer experience and store close.</p>
        </div>
        <div className="advanced-brief-actions">
          <article className="critical">
            <span>01</span>
            <div>
              <strong>Replace CL call-out</strong>
              <p>Three eligible people found. No overtime required.</p>
            </div>
          </article>
          <article>
            <span>02</span>
            <div>
              <strong>Acknowledge close handover</strong>
              <p>Customer return and AC vendor follow-up remain open.</p>
            </div>
          </article>
          <article>
            <span>03</span>
            <div>
              <strong>Complete campaign display by 11:00</strong>
              <p>Photo evidence required before launch.</p>
            </div>
          </article>
          <article>
            <span>04</span>
            <div>
              <strong>Resolve one attendance request</strong>
              <p>Evidence is ready in the existing Action Inbox.</p>
            </div>
          </article>
          <article>
            <span>05</span>
            <div>
              <strong>Verify opening proof</strong>
              <p>Face, geofence and shutter photo captured at 09:51.</p>
            </div>
          </article>
          <article>
            <span>06</span>
            <div>
              <strong>Review labour hours</strong>
              <p>{budget.plannedHours}h planned · {budget.monthlyBudgetHours}h budget.</p>
            </div>
          </article>
        </div>
      </section>

      {callout && (
        <Card
          eyebrow="AUTO REPLACEMENT"
          title="Urgent CL coverage"
          className="advanced-callout"
          action={<Chip value={callout.status} />}
        >
          <div className="advanced-callout-summary">
            <div>
              <span>Employee</span>
              <strong>{attendanceEmployee(callout.employeeId).name}</strong>
              <small>{callout.reason} · {callout.reportedAt}</small>
            </div>
            <div>
              <span>Shift</span>
              <strong>{callout.shift}</strong>
              <small>{SHIFT_DEFINITIONS[callout.shift].time}</small>
            </div>
            <div>
              <span>Impact</span>
              <strong>1 person gap</strong>
              <small>Closing skill required</small>
            </div>
            <button
              type="button"
              className="advanced-button spark"
              disabled={callout.status === "Broadcast"}
              onClick={() => onBroadcast(callout.id, "Broadcast")}
            >
              {callout.status === "Broadcast"
                ? "Broadcast sent"
                : "Notify eligible staff"}
            </button>
          </div>
          <div className="advanced-candidates">
            {callout.eligibleIds.map((employeeId, index) => {
              const candidate = attendanceEmployee(employeeId);
              const distances = ["2.4 km", "3.8 km", "6.1 km"];
              const hours = ["36h planned", "31h planned", "40h planned"];
              return (
                <article key={employeeId}>
                  <span className="candidate-score">{96 - index * 7}</span>
                  <div>
                    <strong>{candidate.name}</strong>
                    <small>{candidate.role} · {candidate.homeStore}</small>
                  </div>
                  <div className="candidate-signals">
                    <span>{distances[index]}</span>
                    <span>{hours[index]}</span>
                    <span>{index === 2 ? "Closing certified" : "Skill match"}</span>
                  </div>
                  <button
                    type="button"
                    disabled={callout.status !== "Broadcast"}
                    onClick={() => onClaim(callout.id, employeeId)}
                  >
                    Assign
                  </button>
                </article>
              );
            })}
          </div>
        </Card>
      )}

      {!callout && (
        <div className="advanced-alert success">
          <div>
            <span>COVERAGE RESTORED</span>
            <strong>Urgent shift has been filled</strong>
            <p>The roster, attendance expectation and employee communication were updated automatically.</p>
          </div>
          <Chip value="Filled" />
        </div>
      )}

      <div className="advanced-grid two">
        <Card eyebrow="TASK BOARD" title="Execution tied to shifts">
          <div className="advanced-list tasks">
            {storeTasks.map((task) => (
              <article key={task.id}>
                <div className="advanced-list-main">
                  <strong>{task.title}</strong>
                  <span>{attendanceEmployee(task.assigneeId).name} · due {task.dueTime}</span>
                  <p>{task.category} · {task.sla}{task.proof ? ` · ${task.proof}` : ""}</p>
                </div>
                <div className="advanced-stack-action">
                  <Chip value={task.status} />
                  <button
                    type="button"
                    disabled={task.status === "Verified"}
                    onClick={() => onTask(task.id)}
                  >
                    Advance
                  </button>
                </div>
              </article>
            ))}
          </div>
        </Card>

        <Card eyebrow="SHIFT HANDOVER" title="Nothing gets lost at close">
          <div className="advanced-list handovers">
            {state.handovers
              .filter((item) => item.storeCode === storeCode)
              .map((handover) => (
                <article key={handover.id}>
                  <div className="advanced-list-main">
                    <strong>{handover.fromShift}</strong>
                    <span>By {attendanceEmployee(handover.authorId).name}</span>
                    <p>{handover.summary}</p>
                    <div className="advanced-tag-row">
                      {handover.openItems.map((item) => (
                        <span key={item}>{item}</span>
                      ))}
                    </div>
                  </div>
                  <div className="advanced-stack-action">
                    <button
                      type="button"
                      disabled={handover.acknowledged}
                      onClick={() => onHandover(handover.id)}
                    >
                      {handover.acknowledged ? "Acknowledged" : "Acknowledge"}
                    </button>
                    <button
                      type="button"
                      disabled={handover.escalated}
                      onClick={() => onEscalateHandover(handover.id)}
                    >
                      {handover.escalated ? "Escalated" : "Escalate item"}
                    </button>
                  </div>
                </article>
              ))}
          </div>
        </Card>
      </div>

      <div className="advanced-grid three">
        <Card eyebrow="STORE ASSURANCE" title="Open and close proof">
          <div className="advanced-proof">
            <article>
              <div>
                <span>Opening</span>
                <strong>{proof.openingTime ?? "Not captured"}</strong>
                <small>{proof.openingEvidence ?? "Proof overdue"}</small>
              </div>
              <Chip value={proof.opening} />
            </article>
            <article>
              <div>
                <span>Closing</span>
                <strong>{proof.closingTime ?? "Due 21:10"}</strong>
                <small>{proof.closingEvidence ?? "Face + photo required"}</small>
              </div>
              <button
                type="button"
                disabled={proof.closing === "Verified"}
                onClick={() => onProof(storeCode, "closing")}
              >
                Capture demo proof
              </button>
            </article>
          </div>
        </Card>

        <Card eyebrow="INCIDENTS" title="Safety and protected cases">
          <div className="advanced-list small">
            {state.incidents
              .filter((item) => item.storeCode === storeCode)
              .map((incident) => (
                <article key={incident.id}>
                  <div className="advanced-list-main">
                    <strong>{incident.category}</strong>
                    <span>{incident.severity} severity</span>
                    <p>{incident.summary}</p>
                  </div>
                  <button
                    type="button"
                    disabled={incident.status === "Resolved"}
                    onClick={() => onIncident(incident.id)}
                  >
                    {incident.status === "Resolved" ? "Resolved" : "Resolve"}
                  </button>
                </article>
              ))}
          </div>
        </Card>

        <Card eyebrow="MAINTENANCE" title="Assets and vendor SLAs">
          <div className="advanced-list small">
            {state.maintenance
              .filter((item) => item.storeCode === storeCode)
              .map((ticket) => (
                <article key={ticket.id}>
                  <div className="advanced-list-main">
                    <strong>{ticket.asset}</strong>
                    <span>{ticket.issue}</span>
                    <p>{ticket.status} · SLA {ticket.sla}</p>
                  </div>
                  <button
                    type="button"
                    disabled={ticket.status === "Resolved"}
                    onClick={() => onMaintenance(ticket.id)}
                  >
                    Advance
                  </button>
                </article>
              ))}
          </div>
        </Card>
      </div>

      <Card eyebrow="DELIVERY CONTROL" title="Important messages must land">
        <DeliveryTable deliveries={state.delivery.slice(0, 4)} onAdvance={onDelivery} />
      </Card>
    </>
  );
}

function AreaPlanningIntelligence({
  state,
  stores,
  demandSlots,
  onScenario,
  onAudit,
  onDelivery,
  onRule,
}: {
  state: AdvancedState;
  stores: StoreLocation[];
  demandSlots: DemandSlot[];
  onScenario: (kind: "traffic" | "absence" | "budget") => void;
  onAudit: (id: string) => void;
  onDelivery: (id: string) => void;
  onRule: (id: string) => void;
}) {
  return (
    <>
      <Heading
        eyebrow="AREA OPERATIONS · PLANNING INTELLIGENCE"
        title="Put the right skills where demand happens"
        description="A 30-minute view combines POS sales, footfall, promotions, task load and roster availability across the Bengaluru area."
        action={
          <span className="advanced-live"><i /> Forecast refreshed 2 min ago</span>
        }
      />

      <div className="advanced-driver-row">
        <span>POS sales · connected</span>
        <span>Footfall · connected</span>
        <span>Promotion · Monsoon launch</span>
        <span>Weather · heavy rain after 17:00</span>
        <span>Local event · mall sale</span>
      </div>

      <Card eyebrow="30-MINUTE DEMAND" title="Store 02 · Saturday forecast">
        <div className="advanced-demand-chart">
          {demandSlots.map((slot) => (
            <article key={slot.time}>
              <div className="advanced-demand-bars">
                <i
                  className="recommended"
                  style={{ height: `${slot.recommended * 10}%` }}
                  title={`${slot.recommended} recommended`}
                />
                <i
                  className="scheduled"
                  style={{ height: `${slot.scheduled * 10}%` }}
                  title={`${slot.scheduled} scheduled`}
                />
              </div>
              <strong>{slot.time}</strong>
              <span>{slot.footfall} visits</span>
              <small>{slot.recommended - slot.scheduled > 0 ? `${slot.recommended - slot.scheduled} gap` : "Covered"}</small>
            </article>
          ))}
        </div>
        <div className="advanced-chart-legend">
          <span><i className="recommended" /> Recommended staff</span>
          <span><i className="scheduled" /> Scheduled staff</span>
          <strong>Peak action: add 2 people from 16:00–19:30</strong>
        </div>
      </Card>

      <div className="advanced-grid three">
        {state.budgets.map((budget) => {
          const over = budget.plannedHours - budget.monthlyBudgetHours;
          return (
            <Card
              key={budget.storeCode}
              eyebrow={budget.storeCode}
              title={stores.find((store) => store.code === budget.storeCode)?.name ?? budget.storeCode}
              action={<Chip value={over > 0 ? `${over}h over` : "Within budget"} />}
            >
              <div className="advanced-budget">
                <div>
                  <span>Planned / budget</span>
                  <strong>{budget.plannedHours}h / {budget.monthlyBudgetHours}h</strong>
                </div>
                <div className="advanced-progress">
                  <i
                    className={over > 0 ? "over" : ""}
                    style={{
                      width: `${Math.min(100, (budget.plannedHours / budget.monthlyBudgetHours) * 100)}%`,
                    }}
                  />
                </div>
                <dl>
                  <div><dt>Projected cost</dt><dd>{money(budget.projectedCost)}</dd></div>
                  <div><dt>Overtime</dt><dd>{budget.overtimeHours}h</dd></div>
                  <div><dt>Sales / labour hour</dt><dd>{money(budget.salesPerLabourHour)}</dd></div>
                </dl>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="advanced-grid two">
        <Card eyebrow="WHAT-IF LAB" title="Roster scenario simulator">
          <div className="advanced-scenario-buttons">
            <button type="button" onClick={() => onScenario("traffic")}>Footfall +25%</button>
            <button type="button" onClick={() => onScenario("absence")}>Two absences</button>
            <button type="button" onClick={() => onScenario("budget")}>Optimise cost</button>
          </div>
          <div className="advanced-scenario-result">
            <span>{state.scenario.label}</span>
            <div>
              <article><strong>{state.scenario.coverage}%</strong><small>Coverage</small></article>
              <article><strong>{state.scenario.peopleGap}</strong><small>People gap</small></article>
              <article>
                <strong>{state.scenario.weeklyCostChange > 0 ? "+" : ""}{money(state.scenario.weeklyCostChange)}</strong>
                <small>Weekly cost</small>
              </article>
            </div>
            <p>{state.scenario.recommendation}</p>
          </div>
        </Card>

        <Card eyebrow="FAIRNESS & FATIGUE" title="Healthy roster distribution">
          <div className="advanced-fairness">
            <article>
              <div><strong>Closing shifts</strong><span>Most balanced</span></div>
              <em>92%</em>
            </article>
            <article>
              <div><strong>Weekend burden</strong><span>2 employees above team median</span></div>
              <em>78%</em>
            </article>
            <article>
              <div><strong>FULL shifts</strong><span>One policy exception</span></div>
              <em>84%</em>
            </article>
            <article>
              <div><strong>Transfer commute</strong><span>All assignments below 8 km</span></div>
              <em>96%</em>
            </article>
          </div>
          <div className="advanced-alert-inline">
            <strong>Commute protection</strong>
            <span>Rekha&apos;s proposed transfer was blocked: 13.4 km and 56-minute travel time.</span>
          </div>
        </Card>
      </div>

      <div className="advanced-grid two">
        <Card eyebrow="COMPLIANCE" title="Guardrails before publish">
          <div className="advanced-rules compact">
            {state.rules.slice(0, 4).map((rule) => (
              <article key={rule.id}>
                <button
                  type="button"
                  className={rule.enabled ? "advanced-toggle on" : "advanced-toggle"}
                  onClick={() => onRule(rule.id)}
                  aria-label={`Toggle ${rule.label}`}
                >
                  <i />
                </button>
                <div><strong>{rule.label}</strong><span>{rule.detail}</span></div>
                <Chip
                  value={`${rule.currentFlags} ${rule.currentFlags === 1 ? "flag" : "flags"}`}
                />
              </article>
            ))}
          </div>
        </Card>

        <Card eyebrow="FIELD AUDITS" title="AOM visits and corrective actions">
          <div className="advanced-list">
            {state.audits.map((audit) => (
              <article key={audit.id}>
                <div className="advanced-list-main">
                  <strong>{audit.storeCode} · {audit.type}</strong>
                  <span>{shortDate(audit.date)} · {audit.actionsOpen} corrective actions</span>
                  <p>{audit.score ? `${audit.score}/100 audit score` : "Geo + photo evidence required"}</p>
                </div>
                <button
                  type="button"
                  disabled={audit.status === "Completed"}
                  onClick={() => onAudit(audit.id)}
                >
                  {audit.status === "Completed" ? "Completed" : "Complete demo"}
                </button>
              </article>
            ))}
          </div>
        </Card>
      </div>

      <Card eyebrow="ACKNOWLEDGEMENTS" title="Critical communication control">
        <DeliveryTable deliveries={state.delivery} onAdvance={onDelivery} />
      </Card>
    </>
  );
}

function HrGovernance({
  state,
  onReconciliation,
  onOracle,
  onRule,
  onDelivery,
  onAnnouncement,
}: {
  state: AdvancedState;
  onReconciliation: () => void;
  onOracle: () => void;
  onRule: (id: string) => void;
  onDelivery: (id: string) => void;
  onAnnouncement: (id: string) => void;
}) {
  const stages: ReconciliationStatus[] = [
    "Employee confirmation",
    "SM review",
    "AOM sign-off",
    "HR locked",
    "Oracle ready",
  ];
  const currentStage = stages.indexOf(state.reconciliation);
  return (
    <>
      <Heading
        eyebrow="HR ADMIN · GOVERNANCE"
        title="Clean attendance in. Reconciled payroll out"
        description="A controlled month-end chain joins employee confirmation, manager review, AOM sign-off, HR lock and Oracle-ready attendance."
        action={
          <button className="advanced-button spark" type="button" onClick={onOracle}>
            Export Oracle file
          </button>
        }
      />

      <Card eyebrow="JULY 2026" title="Month-end attendance reconciliation">
        <div className="advanced-reconciliation">
          {stages.map((stage, index) => (
            <article
              key={stage}
              className={index <= currentStage ? "done" : ""}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{stage}</strong>
              <small>
                {index === 0
                  ? `${state.employeeConfirmations}/${ATTENDANCE_EMPLOYEES.length} confirmed`
                  : index < currentStage
                    ? "Completed"
                    : index === currentStage
                      ? "Current stage"
                      : "Waiting"}
              </small>
            </article>
          ))}
        </div>
        <div className="advanced-reconcile-summary">
          <div><span>Employees</span><strong>{ATTENDANCE_EMPLOYEES.length}</strong></div>
          <div><span>Exceptions open</span><strong>2</strong></div>
          <div><span>Approved corrections</span><strong>11</strong></div>
          <div><span>Control total</span><strong>3,418h</strong></div>
          <button
            type="button"
            className="advanced-button dark"
            disabled={state.reconciliation === "Oracle ready"}
            onClick={onReconciliation}
          >
            Advance approval
          </button>
        </div>
      </Card>

      <div className="advanced-grid two">
        <Card eyebrow="POLICY ENGINE" title="Configurable compliance rules">
          <div className="advanced-rules">
            {state.rules.map((rule) => (
              <article key={rule.id}>
                <button
                  type="button"
                  className={rule.enabled ? "advanced-toggle on" : "advanced-toggle"}
                  onClick={() => onRule(rule.id)}
                  aria-label={`Toggle ${rule.label}`}
                >
                  <i />
                </button>
                <div>
                  <strong>{rule.label}</strong>
                  <span>{rule.detail}</span>
                </div>
                <div className="advanced-rule-meta">
                  <Chip value={rule.mode} />
                  <small>
                    {rule.currentFlags} active{" "}
                    {rule.currentFlags === 1 ? "flag" : "flags"}
                  </small>
                </div>
              </article>
            ))}
          </div>
        </Card>

        <Card eyebrow="CERTIFICATIONS" title="Skills that can expire">
          <div className="advanced-certificates">
            {state.certifications.map((certification) => (
              <article key={`${certification.employeeId}-${certification.name}`}>
                <div>
                  <strong>{attendanceEmployee(certification.employeeId).name}</strong>
                  <span>{certification.name} · {certification.expiresOn}</span>
                </div>
                <Chip value={certification.status} />
              </article>
            ))}
          </div>
          <div className="advanced-alert-inline">
            <strong>Assignment control active</strong>
            <span>Expired First Aid certification is excluded from skilled coverage recommendations.</span>
          </div>
        </Card>
      </div>

      <div className="advanced-grid two">
        <Card eyebrow="WORKFORCE SIGNALS" title="Wellbeing without invasive scoring">
          <div className="advanced-wellbeing">
            <article><span>Healthy schedules</span><strong>89%</strong><p>Rest, hours and preferences are within policy.</p></article>
            <article><span>Preference match</span><strong>83%</strong><p>Up 6 points from the previous roster cycle.</p></article>
            <article><span>Fatigue watch</span><strong>3</strong><p>Manager prompts based on workload—not employee ranking.</p></article>
            <article><span>Training completion</span><strong>91%</strong><p>Mandatory modules across all Bengaluru stores.</p></article>
          </div>
        </Card>

        <Card eyebrow="POLICY & CAMPAIGNS" title="Targeted announcements">
          <div className="advanced-list announcements">
            {state.announcements.map((announcement) => (
              <article key={announcement.id}>
                <div className="advanced-list-main">
                  <strong>{announcement.title}</strong>
                  <span>{announcement.audience} · {announcement.acknowledgedIds.length} acknowledged</span>
                  <p>{announcement.body}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onAnnouncement(announcement.id)}
                >
                  Record demo ack
                </button>
              </article>
            ))}
          </div>
        </Card>
      </div>

      <Card eyebrow="OMNICHANNEL CONTROL" title="Delivery, fallback and escalation">
        <DeliveryTable deliveries={state.delivery} onAdvance={onDelivery} />
      </Card>
    </>
  );
}

function DeliveryTable({
  deliveries,
  onAdvance,
}: {
  deliveries: Delivery[];
  onAdvance: (id: string) => void;
}) {
  return (
    <div className="advanced-delivery-table">
      <div className="advanced-delivery-head">
        <span>Recipient</span>
        <span>Message</span>
        <span>Route</span>
        <span>Language</span>
        <span>Status</span>
        <span>Action</span>
      </div>
      {deliveries.map((delivery) => (
        <article key={delivery.id}>
          <strong>{delivery.recipient}</strong>
          <p>{delivery.message}</p>
          <span>{delivery.primaryChannel} → {delivery.fallbackChannel}</span>
          <span>{delivery.language}</span>
          <Chip value={delivery.state} />
          <button
            type="button"
            disabled={delivery.state === "Escalated"}
            onClick={() => onAdvance(delivery.id)}
          >
            {delivery.state === "Acknowledged"
              ? "Escalate"
              : delivery.state === "Escalated"
                ? "Escalated"
                : "Advance"}
          </button>
        </article>
      ))}
    </div>
  );
}
