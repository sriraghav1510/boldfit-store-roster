"use client";

import { Capacitor } from "@capacitor/core";
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  EMPLOYEES,
  FLEX_POOL,
  SHIFT_CODES,
  SHIFT_DEFINITIONS,
  STORES,
  addDaysIso,
  autofillRoster,
  createCoverageRiskNotifications,
  createManagerNudgeNotification,
  createPublicationNotifications,
  createRosterReviewNotification,
  createShiftChangeNotification,
  createTransferCancellationNotification,
  createTransferNotification,
  copyWeekRoster,
  countBlankAssignments,
  coverageForDate,
  createInitialState,
  createWeekRoster,
  employeeWeekHours,
  employeeWorkDays,
  formatWeekRange,
  fromIsoDate,
  planningWeekIso,
  rosterCompletion,
  weekDates,
  type Employee,
  type RosterAppState,
  type RosterValue,
  type ShiftCode,
  type TransferRequest,
  type WeekRoster,
  type WhatsAppNotification,
} from "./roster-domain";

type View = "overview" | "planner" | "people" | "transfers" | "activity";
type RoleMode = "Store Manager" | "Area Ops";
type Toast = { message: string; tone: "success" | "warning" | "info" };
type SelectedCell = { employeeId: string; date: string };

const STORAGE_KEY = "boldfit-roster-demo-v2";

function loadInitialState(): RosterAppState {
  const initialState = createInitialState();

  if (typeof window === "undefined") {
    return initialState;
  }

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return initialState;
    }

    const parsed = JSON.parse(saved) as RosterAppState;
    if (parsed.schedules && parsed.transfers && parsed.activity) {
      return {
        ...parsed,
        notifications: Array.isArray(parsed.notifications)
          ? parsed.notifications
          : initialState.notifications,
      };
    }
  } catch {
    // A damaged demo cache should never stop the roster from opening.
  }

  return initialState;
}

const NAV_ITEMS: Array<{
  id: View;
  label: string;
  short: string;
  marker: string;
}> = [
  { id: "overview", label: "Overview", short: "Home", marker: "01" },
  { id: "planner", label: "Roster planner", short: "Plan", marker: "02" },
  { id: "people", label: "People", short: "People", marker: "03" },
  { id: "transfers", label: "Flex & transfers", short: "Flex", marker: "04" },
  { id: "activity", label: "Alerts & activity", short: "Alerts", marker: "05" },
];

function formatDay(date: string) {
  return new Intl.DateTimeFormat("en-IN", { weekday: "short" }).format(
    fromIsoDate(date),
  );
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
  }).format(fromIsoDate(date));
}

function formatLongDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(fromIsoDate(date));
}

function employeeById(employeeId: string) {
  return (
    EMPLOYEES.find((employee) => employee.id === employeeId) ??
    FLEX_POOL.find((employee) => employee.id === employeeId)
  );
}

function statusTone(status: "Good" | "Tight" | "Gap") {
  if (status === "Good") return "good";
  if (status === "Tight") return "tight";
  return "gap";
}

function NavIcon({ value }: { value: string }) {
  return (
    <span className="nav-marker" aria-hidden="true">
      {value}
    </span>
  );
}

export function RosterApp() {
  const [appState, setAppState] = useState<RosterAppState>(loadInitialState);
  const [selectedWeek, setSelectedWeek] = useState(() => planningWeekIso());
  const [view, setView] = useState<View>("overview");
  const [role, setRole] = useState<RoleMode>("Store Manager");
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [peopleSearch, setPeopleSearch] = useState("");
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [transferMode, setTransferMode] = useState<"pool" | "outgoing">("pool");
  const [transferEmployeeId, setTransferEmployeeId] = useState("bf-p201");
  const [transferStore, setTransferStore] = useState("BF-BLR-02");
  const [transferDate, setTransferDate] = useState(() =>
    addDaysIso(planningWeekIso(), 5),
  );
  const [transferShift, setTransferShift] = useState<ShiftCode>("CL");

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
  }, [appState]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    void (async () => {
      try {
        const { StatusBar, Style } = await import("@capacitor/status-bar");
        await StatusBar.setOverlaysWebView({ overlay: false });
        await StatusBar.setBackgroundColor({ color: "#171714" });
        await StatusBar.setStyle({ style: Style.Light });
      } catch {
        // The browser demo does not provide native status-bar controls.
      }
    })();
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelectedCell(null);
        setShowTransferForm(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const roster =
    appState.schedules[selectedWeek] ??
    createWeekRoster(selectedWeek, selectedWeek === planningWeekIso());
  const dates = weekDates(selectedWeek);
  const blanks = countBlankAssignments(roster);
  const completion = rosterCompletion(roster);
  const selectedEmployee = selectedCell
    ? employeeById(selectedCell.employeeId)
    : undefined;

  const filteredPeople = useMemo(() => {
    const query = peopleSearch.trim().toLowerCase();
    if (!query) return EMPLOYEES;
    return EMPLOYEES.filter(
      (employee) =>
        employee.name.toLowerCase().includes(query) ||
        employee.role.toLowerCase().includes(query) ||
        employee.id.toLowerCase().includes(query),
    );
  }, [peopleSearch]);

  function notify(
    message: string,
    tone: Toast["tone"] = "info",
  ): void {
    setToast({ message, tone });
    window.setTimeout(() => setToast(null), 3200);
  }

  function updateRoster(updater: (current: WeekRoster) => WeekRoster) {
    setAppState((current) => {
      const existing =
        current.schedules[selectedWeek] ??
        createWeekRoster(selectedWeek, selectedWeek === planningWeekIso());
      return {
        ...current,
        schedules: {
          ...current.schedules,
          [selectedWeek]: updater(existing),
        },
      };
    });
  }

  function changeWeek(amount: number) {
    const nextWeek = addDaysIso(selectedWeek, amount * 7);
    setSelectedWeek(nextWeek);
    setAppState((current) => {
      if (current.schedules[nextWeek]) return current;
      return {
        ...current,
        schedules: {
          ...current.schedules,
          [nextWeek]: createWeekRoster(nextWeek, false),
        },
      };
    });
  }

  function setAssignment(
    value: RosterValue,
    reason = "Operational coverage adjustment",
  ) {
    if (!selectedCell || !selectedEmployee) return;
    const previous =
      roster.assignments[selectedCell.employeeId]?.[selectedCell.date] ?? "";
    if (previous === value) {
      setSelectedCell(null);
      return;
    }

    const wasPublished = roster.status === "Published";
    const selectedDate = selectedCell.date;
    const employee = selectedEmployee;
    const eventId = Date.now();

    setAppState((current) => {
      const existing =
        current.schedules[selectedWeek] ??
        createWeekRoster(selectedWeek, selectedWeek === planningWeekIso());
      const updatedRoster: WeekRoster = {
        ...existing,
        status: wasPublished ? "Published" : "Draft",
        publishedAt: wasPublished ? existing.publishedAt : undefined,
        reviewStatus: wasPublished ? "Pending review" : existing.reviewStatus,
        reviewComment: wasPublished
          ? `${employee.name}'s ${formatDate(selectedDate)} shift was changed.`
          : existing.reviewComment,
        assignments: {
          ...existing.assignments,
          [selectedCell.employeeId]: {
            ...existing.assignments[selectedCell.employeeId],
            [selectedDate]: value,
          },
        },
      };

      if (!wasPublished) {
        return {
          ...current,
          schedules: {
            ...current.schedules,
            [selectedWeek]: updatedRoster,
          },
        };
      }

      const shiftChange = createShiftChangeNotification({
        employee,
        weekStart: selectedWeek,
        date: selectedDate,
        previous,
        next: value,
        reason,
        id: `wa-shift-change-${eventId}`,
        createdAt: "Just now",
      });
      const refreshedCoverage = createCoverageRiskNotifications(
        updatedRoster,
        `wa-coverage-${eventId}`,
        "Just now",
      ).filter((notification) => notification.relatedDate === selectedDate);
      const existingNotifications = current.notifications.map((notification) =>
        notification.kind === "Coverage risk" &&
        notification.weekStart === selectedWeek &&
        notification.relatedDate === selectedDate &&
        notification.status !== "Cancelled"
          ? { ...notification, status: "Cancelled" as const }
          : notification,
      );

      return {
        ...current,
        schedules: {
          ...current.schedules,
          [selectedWeek]: updatedRoster,
        },
        notifications: [
          shiftChange,
          ...refreshedCoverage,
          ...existingNotifications,
        ],
        activity: [
          {
            id: `activity-${eventId}`,
            title: "Published shift changed",
            detail: `${employee.name} · ${formatLongDate(selectedDate)} · ${previous || "Open"} to ${value || "Open"}. Employee confirmation requested.`,
            kind: refreshedCoverage.length > 0 ? "warning" : "info",
            time: "Just now",
          },
          ...current.activity,
        ],
      };
    });
    notify(
      wasPublished
        ? `${selectedEmployee.name}'s shift changed. Employee and coverage messages are ready.`
        : value
        ? `${SHIFT_DEFINITIONS[value].label} assigned to ${selectedEmployee?.name}.`
        : `Assignment cleared for ${selectedEmployee?.name}.`,
      "success",
    );
    setSelectedCell(null);
  }

  function copyPreviousWeek() {
    const previousKey = addDaysIso(selectedWeek, -7);
    const previous =
      appState.schedules[previousKey] ?? createWeekRoster(previousKey, false);
    setAppState((current) => ({
      ...current,
      schedules: {
        ...current.schedules,
        [selectedWeek]: copyWeekRoster(previous, selectedWeek),
      },
      activity: [
        {
          id: `activity-${Date.now()}`,
          title: "Previous roster copied",
          detail: `${formatWeekRange(previousKey)} was copied into ${formatWeekRange(selectedWeek)}.`,
          kind: "info",
          time: "Just now",
        },
        ...current.activity,
      ],
    }));
    notify("Previous week copied. Review the shifts before publishing.", "info");
  }

  function fillOpenCells() {
    updateRoster((current) => autofillRoster(current));
    notify("Open cells filled with balanced shift suggestions.", "success");
  }

  function publishRoster() {
    if (blanks > 0) {
      notify(
        `${blanks} open ${blanks === 1 ? "cell needs" : "cells need"} a shift or availability code.`,
        "warning",
      );
      setView("planner");
      return;
    }

    const publishedAt = new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date());
    const notificationBatchId = `wa-publish-${Date.now()}`;
    const publishedRoster: WeekRoster = {
      ...roster,
      status: "Published",
      publishedAt,
      reviewStatus: "Pending review",
      reviewComment: undefined,
    };
    const publicationNotifications = createPublicationNotifications(
      publishedRoster,
      notificationBatchId,
      "Just now",
    );
    const coverageNotifications = createCoverageRiskNotifications(
      publishedRoster,
      `wa-coverage-publish-${Date.now()}`,
      "Just now",
    );
    const newNotifications = [
      ...publicationNotifications,
      ...coverageNotifications,
    ];

    setAppState((current) => ({
      ...current,
      schedules: {
        ...current.schedules,
        [selectedWeek]: publishedRoster,
      },
      notifications: [
        ...newNotifications,
        ...current.notifications
          .filter(
            (notification) =>
              notification.weekStart !== selectedWeek ||
              !(
                notification.kind === "Weekly roster" ||
                notification.kind === "Roster published" ||
                notification.kind === "Coverage risk"
              ),
          )
          .map((notification) =>
            notification.weekStart === selectedWeek &&
            notification.kind === "Roster nudge"
              ? { ...notification, status: "Cancelled" as const }
              : notification,
          ),
      ],
      activity: [
        {
          id: `activity-${Date.now()}`,
          title: "Roster published",
          detail: `${EMPLOYEES.length * 7} assignments published, ${publicationNotifications.length} team messages prepared, and ${coverageNotifications.length} coverage alerts raised for ${formatWeekRange(selectedWeek)}.`,
          kind: coverageNotifications.length > 0 ? "warning" : "success",
          time: "Just now",
        },
        ...current.activity,
      ],
    }));
    notify(
      `Roster published. ${newNotifications.length} WhatsApp messages are ready.`,
      "success",
    );
  }

  async function exportRoster() {
    const header = ["Employee ID", "Employee", "Role", ...dates];
    const rows = EMPLOYEES.map((employee) => [
      employee.id,
      employee.name,
      employee.role,
      ...dates.map(
        (date) => roster.assignments[employee.id]?.[date] || "BLANK",
      ),
    ]);
    const csv = [header, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","),
      )
      .join("\n");
    const fileName = `boldfit-roster-${selectedWeek}.csv`;

    if (Capacitor.isNativePlatform()) {
      try {
        const [{ Directory, Encoding, Filesystem }, { Share }] =
          await Promise.all([
            import("@capacitor/filesystem"),
            import("@capacitor/share"),
          ]);
        const savedFile = await Filesystem.writeFile({
          path: fileName,
          data: csv,
          directory: Directory.Cache,
          encoding: Encoding.UTF8,
        });
        await Share.share({
          title: "Boldfit store roster",
          text: `Roster for ${formatWeekRange(selectedWeek)}`,
          url: savedFile.uri,
          dialogTitle: "Share roster CSV",
        });
        notify("Roster CSV ready to share.", "success");
        return;
      } catch {
        notify("Native sharing was unavailable. Downloading instead.", "warning");
      }
    }

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const href = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = fileName;
    anchor.click();
    window.URL.revokeObjectURL(href);
    notify("Roster CSV downloaded.", "success");
  }

  function resetDemo() {
    const initial = createInitialState();
    window.localStorage.removeItem(STORAGE_KEY);
    setAppState(initial);
    setSelectedWeek(planningWeekIso());
    setView("overview");
    notify("Demo data reset.", "info");
  }

  function setTransferFormMode(mode: "pool" | "outgoing") {
    setTransferMode(mode);
    setTransferEmployeeId(mode === "pool" ? FLEX_POOL[0].id : EMPLOYEES[1].id);
  }

  function createTransfer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const employee = employeeById(transferEmployeeId);
    if (!employee) return;

    const direction: TransferRequest["direction"] =
      transferMode === "pool" ? "Incoming" : "Outgoing";
    const sourceStore =
      direction === "Incoming" ? "Bengaluru Flex Pool" : "BF-BLR-01";
    const destinationStore =
      direction === "Incoming" ? "BF-BLR-01" : transferStore;
    const transfer: TransferRequest = {
      id: `tr-${Date.now()}`,
      employee: employee.name,
      employeeId: employee.id,
      direction,
      sourceStore,
      destinationStore,
      date: transferDate,
      shift: transferShift,
      status: "Scheduled",
    };
    const transferNotification = createTransferNotification(
      transfer,
      `wa-transfer-${Date.now()}`,
      "Just now",
    );

    setAppState((current) => ({
      ...current,
      transfers: [transfer, ...current.transfers],
      notifications: [transferNotification, ...current.notifications],
      activity: [
        {
          id: `activity-${Date.now()}`,
          title:
            direction === "Incoming"
              ? "Flex cover added"
              : "Temporary transfer scheduled",
          detail: `${employee.name} · ${formatLongDate(transferDate)} · ${transferShift}.`,
          kind: "info",
          time: "Just now",
        },
        ...current.activity,
      ],
    }));
    setShowTransferForm(false);
    notify(
      direction === "Incoming"
        ? `${employee.name} added from the Flex Pool. WhatsApp message ready.`
        : `${employee.name} scheduled for a temporary transfer. WhatsApp message ready.`,
      "success",
    );
  }

  function cancelTransfer(transferId: string) {
    const transfer = appState.transfers.find((item) => item.id === transferId);
    if (!transfer) return;
    const cancellationNotification = createTransferCancellationNotification(
      transfer,
      `wa-transfer-cancel-${Date.now()}`,
      "Just now",
    );

    setAppState((current) => ({
      ...current,
      transfers: current.transfers.map((transfer) =>
        transfer.id === transferId
          ? { ...transfer, status: "Cancelled" }
          : transfer,
      ),
      notifications: [
        cancellationNotification,
        ...current.notifications.map((notification) =>
          notification.relatedTransferId === transferId &&
          notification.kind === "Staff transfer"
            ? { ...notification, status: "Cancelled" as const }
            : notification,
        ),
      ],
      activity: [
        {
          id: `activity-${Date.now()}`,
          title: "Transfer cancelled",
          detail: `${transfer.employee} remains assigned to ${transfer.sourceStore}. Cancellation message prepared.`,
          kind: "warning",
          time: "Just now",
        },
        ...current.activity,
      ],
    }));
    notify(
      `Transfer cancelled. WhatsApp update ready for ${transfer.employee}.`,
      "info",
    );
  }

  async function copyNotification(notificationId: string) {
    const notification = appState.notifications.find(
      (item) => item.id === notificationId,
    );
    if (!notification) return;

    try {
      await navigator.clipboard.writeText(notification.message);
      notify(`Message for ${notification.recipientName} copied.`, "success");
    } catch {
      notify("Copy was unavailable on this device.", "warning");
    }
  }

  async function shareNotification(notificationId: string) {
    const notification = appState.notifications.find(
      (item) => item.id === notificationId,
    );
    if (!notification || notification.status === "Cancelled") return;

    try {
      if (Capacitor.isNativePlatform()) {
        const { Share } = await import("@capacitor/share");
        await Share.share({
          title: notification.title,
          text: notification.message,
          dialogTitle: "Share via WhatsApp",
        });
      } else {
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(notification.message)}`;
        const anchor = document.createElement("a");
        anchor.href = whatsappUrl;
        anchor.target = "_blank";
        anchor.rel = "noopener noreferrer";
        anchor.click();
      }

      setAppState((current) => ({
        ...current,
        notifications: current.notifications.map((item) =>
          item.id === notificationId
            ? { ...item, status: "Opened" }
            : item,
        ),
        activity: [
          {
            id: `activity-${Date.now()}`,
            title: "WhatsApp opened",
            detail: `${notification.kind} message prepared for ${notification.recipientName}.`,
            kind: "success",
            time: "Just now",
          },
          ...current.activity,
        ],
      }));
      notify(`WhatsApp opened for ${notification.recipientName}.`, "success");
    } catch {
      notify("WhatsApp sharing was closed or unavailable.", "warning");
    }
  }

  function queueManagerNudge() {
    if (roster.status === "Published") {
      notify("This roster is already published. No manager nudge is needed.", "info");
      return;
    }

    const alreadyReady = appState.notifications.some(
      (notification) =>
        notification.kind === "Roster nudge" &&
        notification.weekStart === selectedWeek &&
        notification.status === "Ready",
    );
    if (alreadyReady) {
      notify("The Store Manager nudge is already ready.", "info");
      return;
    }

    const nudge = createManagerNudgeNotification(
      selectedWeek,
      `wa-nudge-${Date.now()}`,
      "Just now",
    );
    setAppState((current) => ({
      ...current,
      notifications: [nudge, ...current.notifications],
      activity: [
        {
          id: `activity-${Date.now()}`,
          title: "Planning nudge queued",
          detail: `WhatsApp reminder prepared for the Store Manager for ${formatWeekRange(selectedWeek)}.`,
          kind: "warning",
          time: "Just now",
        },
        ...current.activity,
      ],
    }));
    notify("Store Manager WhatsApp nudge is ready.", "success");
  }

  function respondToNotification(
    notificationId: string,
    response: "Confirmed" | "Issue reported",
  ) {
    const notification = appState.notifications.find(
      (item) => item.id === notificationId,
    );
    if (!notification?.responseRequired) return;

    setAppState((current) => ({
      ...current,
      notifications: current.notifications.map((item) =>
        item.id === notificationId
          ? {
              ...item,
              status: "Opened",
              responseStatus: response,
            }
          : item,
      ),
      activity: [
        {
          id: `activity-${Date.now()}`,
          title:
            response === "Confirmed"
              ? "Roster acknowledged"
              : "Roster issue reported",
          detail: `${notification.recipientName} ${response === "Confirmed" ? "confirmed the communication" : "reported an issue for Store Manager follow-up"}.`,
          kind: response === "Confirmed" ? "success" : "warning",
          time: "Just now",
        },
        ...current.activity,
      ],
    }));
    notify(
      response === "Confirmed"
        ? `${notification.recipientName} marked as confirmed.`
        : `${notification.recipientName}'s issue has been flagged.`,
      response === "Confirmed" ? "success" : "warning",
    );
  }

  function reviewRoster(
    decision: "Approved" | "Changes requested",
    comment?: string,
  ) {
    if (roster.status !== "Published") {
      notify("Publish the roster before requesting AOM review.", "warning");
      return;
    }

    const reviewNotification = createRosterReviewNotification({
      weekStart: selectedWeek,
      decision,
      comment,
      id: `wa-review-${Date.now()}`,
      createdAt: "Just now",
    });
    setAppState((current) => ({
      ...current,
      schedules: {
        ...current.schedules,
        [selectedWeek]: {
          ...roster,
          reviewStatus: decision,
          reviewComment:
            decision === "Approved"
              ? comment?.trim() || "Coverage and staffing verified."
              : comment?.trim() ||
                "Please review the coverage and shift allocation.",
        },
      },
      notifications: [reviewNotification, ...current.notifications],
      activity: [
        {
          id: `activity-${Date.now()}`,
          title:
            decision === "Approved"
              ? "AOM approved roster"
              : "AOM requested corrections",
          detail:
            decision === "Approved"
              ? `${formatWeekRange(selectedWeek)} approved for Bengaluru Store 01.`
              : `Roster returned to the Store Manager: ${comment?.trim() || "Coverage and shift allocation require review."}`,
          kind: decision === "Approved" ? "success" : "warning",
          time: "Just now",
        },
        ...current.activity,
      ],
    }));
    notify(
      decision === "Approved"
        ? "Roster approved. Store Manager message ready."
        : "Roster returned for correction. Store Manager message ready.",
      decision === "Approved" ? "success" : "warning",
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button
          className="brand"
          type="button"
          onClick={() => setView("overview")}
          aria-label="Boldfit roster overview"
        >
          <span className="brand-word">BOLDFIT</span>
          <span className="brand-product">OPS / ROSTER</span>
        </button>

        <nav className="side-nav" aria-label="Primary navigation">
          {NAV_ITEMS.map((item) => (
            <button
              type="button"
              className={`nav-item ${view === item.id ? "active" : ""}`}
              key={item.id}
              onClick={() => setView(item.id)}
              aria-current={view === item.id ? "page" : undefined}
            >
              <NavIcon value={item.marker} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span className="demo-dot" />
          <div>
            <strong>Interactive demo</strong>
            <span>Device-local sample data</span>
          </div>
        </div>
      </aside>

      <div className="main-frame">
        <header className="topbar">
          <div className="mobile-brand">
            <strong>BOLDFIT</strong>
            <span>ROSTER</span>
          </div>
          <div className="store-identity">
            <span className="eyebrow">Active store</span>
            <strong>Bengaluru Store 01</strong>
            <span>BF-BLR-01 · 10:00–21:00</span>
          </div>
          <div className="topbar-actions">
            <span className="sync-state">
              <span className="sync-dot" />
              Saved
            </span>
            <button
              className="role-switch"
              type="button"
              onClick={() =>
                setRole((current) =>
                  current === "Store Manager" ? "Area Ops" : "Store Manager",
                )
              }
              aria-label="Switch demo role"
            >
              <span>{role === "Store Manager" ? "AN" : "AO"}</span>
              <span>
                <small>Viewing as</small>
                <strong>{role}</strong>
              </span>
              <span aria-hidden="true">↕</span>
            </button>
          </div>
        </header>

        <main className="content">
          {view === "overview" && (
            <OverviewView
              roster={roster}
              dates={dates}
              blanks={blanks}
              completion={completion}
              transfers={appState.transfers}
              activity={appState.activity}
              selectedWeek={selectedWeek}
              onOpenPlanner={() => setView("planner")}
              onFill={fillOpenCells}
              onPublish={publishRoster}
            />
          )}

          {view === "planner" && (
            <PlannerView
              roster={roster}
              dates={dates}
              blanks={blanks}
              completion={completion}
              selectedWeek={selectedWeek}
              onChangeWeek={changeWeek}
              onToday={() => setSelectedWeek(planningWeekIso())}
              onSelectCell={setSelectedCell}
              onCopy={copyPreviousWeek}
              onFill={fillOpenCells}
              onPublish={publishRoster}
              onExport={exportRoster}
            />
          )}

          {view === "people" && (
            <PeopleView
              people={filteredPeople}
              roster={roster}
              search={peopleSearch}
              onSearch={setPeopleSearch}
              onOpenTransfers={() => setView("transfers")}
            />
          )}

          {view === "transfers" && (
            <TransfersView
              transfers={appState.transfers}
              onAdd={() => setShowTransferForm(true)}
              onCancel={cancelTransfer}
            />
          )}

          {view === "activity" && (
            <ActivityView
              activity={appState.activity}
              notifications={appState.notifications}
              roster={roster}
              role={role}
              onReset={resetDemo}
              onCopyNotification={copyNotification}
              onShareNotification={shareNotification}
              onQueueNudge={queueManagerNudge}
              onRespondNotification={respondToNotification}
              onReviewRoster={reviewRoster}
            />
          )}
        </main>

        <nav className="mobile-nav" aria-label="Mobile navigation">
          {NAV_ITEMS.map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => setView(item.id)}
              className={view === item.id ? "active" : ""}
              aria-current={view === item.id ? "page" : undefined}
            >
              <span aria-hidden="true">{item.marker}</span>
              {item.short}
            </button>
          ))}
        </nav>
      </div>

      {selectedCell && selectedEmployee && (
        <ShiftPicker
          employee={selectedEmployee}
          date={selectedCell.date}
          current={
            roster.assignments[selectedCell.employeeId]?.[selectedCell.date] ??
            ""
          }
          published={roster.status === "Published"}
          onChoose={setAssignment}
          onClose={() => setSelectedCell(null)}
        />
      )}

      {showTransferForm && (
        <TransferForm
          mode={transferMode}
          employeeId={transferEmployeeId}
          destination={transferStore}
          date={transferDate}
          shift={transferShift}
          onMode={setTransferFormMode}
          onEmployee={setTransferEmployeeId}
          onDestination={setTransferStore}
          onDate={setTransferDate}
          onShift={setTransferShift}
          onSubmit={createTransfer}
          onClose={() => setShowTransferForm(false)}
        />
      )}

      {toast && (
        <div className={`toast ${toast.tone}`} role="status" aria-live="polite">
          <span aria-hidden="true">
            {toast.tone === "success"
              ? "✓"
              : toast.tone === "warning"
                ? "!"
                : "i"}
          </span>
          {toast.message}
        </div>
      )}
    </div>
  );
}

function PageHeading({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <span className="eyebrow accent">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions && <div className="heading-actions">{actions}</div>}
    </div>
  );
}

function OverviewView({
  roster,
  dates,
  blanks,
  completion,
  transfers,
  activity,
  selectedWeek,
  onOpenPlanner,
  onFill,
  onPublish,
}: {
  roster: WeekRoster;
  dates: string[];
  blanks: number;
  completion: number;
  transfers: TransferRequest[];
  activity: RosterAppState["activity"];
  selectedWeek: string;
  onOpenPlanner: () => void;
  onFill: () => void;
  onPublish: () => void;
}) {
  const scheduledTransfers = transfers.filter(
    (transfer) => transfer.status === "Scheduled",
  ).length;
  const goodDays = dates.filter(
    (date) => coverageForDate(roster, date).status === "Good",
  ).length;

  return (
    <>
      <PageHeading
        eyebrow="MOVE BOLD. PLAN SMART."
        title="Your store, properly covered."
        description="Build the week, spot coverage gaps, and publish one roster everyone can follow."
        actions={
          <>
            <button className="button secondary" type="button" onClick={onFill}>
              Auto-fill gaps
            </button>
            <button className="button primary" type="button" onClick={onPublish}>
              {roster.status === "Published" ? "Republish roster" : "Publish roster"}
            </button>
          </>
        }
      />

      <section className="overview-hero">
        <div className="hero-copy">
          <span className="status-chip draft">
            {roster.status === "Published" ? "Published" : "Planning in progress"}
          </span>
          <h2>{formatWeekRange(selectedWeek)}</h2>
          <p>
            {blanks > 0
              ? `${blanks} open ${blanks === 1 ? "assignment" : "assignments"} remain before this roster is ready.`
              : "All assignments are complete. Review coverage and publish when ready."}
          </p>
          <button className="text-link" type="button" onClick={onOpenPlanner}>
            Open roster planner <span aria-hidden="true">→</span>
          </button>
        </div>
        <div className="completion-block">
          <div className="completion-score">
            <strong>{completion}%</strong>
            <span>complete</span>
          </div>
          <div
            className="progress-track large"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={completion}
            aria-label="Roster completion"
          >
            <span style={{ width: `${completion}%` }} />
          </div>
          <div className="completion-meta">
            <span>{EMPLOYEES.length} team members</span>
            <span>{EMPLOYEES.length * 7 - blanks}/42 planned</span>
          </div>
        </div>
      </section>

      <section className="metric-grid" aria-label="Roster summary">
        <MetricCard
          label="Coverage"
          value={`${goodDays}/7`}
          detail="days meet all coverage targets"
          tone={goodDays >= 5 ? "green" : "amber"}
        />
        <MetricCard
          label="Open cells"
          value={String(blanks)}
          detail={blanks === 0 ? "ready to publish" : "need a shift or status"}
          tone={blanks === 0 ? "green" : "red"}
        />
        <MetricCard
          label="Flex cover"
          value={String(scheduledTransfers)}
          detail="temporary assignments scheduled"
          tone="ink"
        />
        <MetricCard
          label={roster.status === "Published" ? "AOM review" : "Planning deadline"}
          value={
            roster.status === "Published"
              ? roster.reviewStatus === "Approved"
                ? "Approved"
                : roster.reviewStatus === "Changes requested"
                  ? "Revise"
                  : "Pending"
              : "Thu"
          }
          detail={
            roster.status === "Published"
              ? roster.reviewStatus === "Approved"
                ? "verified by Area Operations"
                : roster.reviewStatus === "Changes requested"
                  ? "corrections requested"
                  : "awaiting Area Operations"
              : "publish by 18:00"
          }
          tone={
            roster.reviewStatus === "Changes requested"
              ? "red"
              : roster.status === "Published"
                ? "green"
                : "lime"
          }
        />
      </section>

      <div className="two-column-layout">
        <section className="panel coverage-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">NEXT WEEK</span>
              <h2>Daily coverage</h2>
            </div>
            <div className="coverage-legend">
              <span><i className="dot good" />Good</span>
              <span><i className="dot tight" />Tight</span>
              <span><i className="dot gap" />Gap</span>
            </div>
          </div>
          <div className="coverage-days">
            {dates.map((date) => {
              const coverage = coverageForDate(roster, date);
              return (
                <button
                  className="coverage-day"
                  type="button"
                  key={date}
                  onClick={onOpenPlanner}
                >
                  <span>{formatDay(date)}</span>
                  <strong>{formatDate(date).split(" ")[0]}</strong>
                  <i className={`coverage-status ${statusTone(coverage.status)}`} />
                  <small>{coverage.status}</small>
                </button>
              );
            })}
          </div>
        </section>

        <section className="panel action-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">ACTION QUEUE</span>
              <h2>Before Thursday</h2>
            </div>
            <span className="count-badge">{blanks + 1}</span>
          </div>
          <div className="action-list">
            <button type="button" onClick={onOpenPlanner}>
              <span className="action-icon warning">!</span>
              <span>
                <strong>Complete open assignments</strong>
                <small>{blanks} cells still need attention</small>
              </span>
              <span aria-hidden="true">→</span>
            </button>
            <button type="button" onClick={onOpenPlanner}>
              <span className="action-icon info">↔</span>
              <span>
                <strong>Review Wednesday cover</strong>
                <small>Closing window is currently tight</small>
              </span>
              <span aria-hidden="true">→</span>
            </button>
            <button type="button" onClick={onPublish}>
              <span className="action-icon success">✓</span>
              <span>
                <strong>Publish and notify</strong>
                <small>Creates the team message preview</small>
              </span>
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </section>
      </div>

      <section className="panel activity-preview">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">LATEST</span>
            <h2>Store activity</h2>
          </div>
        </div>
        <div className="activity-rows">
          {activity.slice(0, 3).map((item) => (
            <div className="activity-row" key={item.id}>
              <span className={`activity-indicator ${item.kind}`} />
              <div>
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </div>
              <time>{item.time}</time>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function MetricCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone: "green" | "amber" | "red" | "ink" | "lime";
}) {
  return (
    <article className={`metric-card ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

function PlannerView({
  roster,
  dates,
  blanks,
  completion,
  selectedWeek,
  onChangeWeek,
  onToday,
  onSelectCell,
  onCopy,
  onFill,
  onPublish,
  onExport,
}: {
  roster: WeekRoster;
  dates: string[];
  blanks: number;
  completion: number;
  selectedWeek: string;
  onChangeWeek: (amount: number) => void;
  onToday: () => void;
  onSelectCell: (cell: SelectedCell) => void;
  onCopy: () => void;
  onFill: () => void;
  onPublish: () => void;
  onExport: () => void;
}) {
  return (
    <>
      <PageHeading
        eyebrow="STORE ROSTER"
        title="Plan the week"
        description="Tap any cell to assign a shift, week off, leave, or availability status."
        actions={
          <>
            <button className="button ghost" type="button" onClick={onExport}>
              Export CSV
            </button>
            <button className="button primary" type="button" onClick={onPublish}>
              {roster.status === "Published" ? "Republish" : "Publish roster"}
            </button>
          </>
        }
      />

      <section className="planner-toolbar">
        <div className="week-control">
          <button
            type="button"
            aria-label="Previous week"
            onClick={() => onChangeWeek(-1)}
          >
            ←
          </button>
          <button type="button" className="week-label" onClick={onToday}>
            <small>Planning week</small>
            <strong>{formatWeekRange(selectedWeek)}</strong>
          </button>
          <button
            type="button"
            aria-label="Next week"
            onClick={() => onChangeWeek(1)}
          >
            →
          </button>
        </div>
        <div className="planner-quick-actions">
          <button type="button" onClick={onCopy}>
            <span aria-hidden="true">⧉</span> Copy previous week
          </button>
          <button type="button" onClick={onFill}>
            <span aria-hidden="true">+</span> Auto-fill gaps
          </button>
        </div>
      </section>

      <div className="planner-layout">
        <section className="roster-card">
          <div className="roster-scroll">
            <table className="roster-table">
              <thead>
                <tr>
                  <th className="employee-heading">
                    Team member
                    <small>{EMPLOYEES.length} active</small>
                  </th>
                  {dates.map((date) => {
                    const coverage = coverageForDate(roster, date);
                    return (
                      <th key={date}>
                        <span>{formatDay(date)}</span>
                        <strong>{formatDate(date).split(" ")[0]}</strong>
                        <i
                          className={`header-coverage ${statusTone(coverage.status)}`}
                          aria-label={`${coverage.status} coverage`}
                        />
                      </th>
                    );
                  })}
                  <th className="hours-heading">Load</th>
                </tr>
              </thead>
              <tbody>
                {EMPLOYEES.map((employee) => {
                  const hours = employeeWeekHours(roster, employee.id);
                  const workDays = employeeWorkDays(roster, employee.id);
                  return (
                    <tr key={employee.id}>
                      <th className="employee-cell">
                        <span className="avatar">{employee.initials}</span>
                        <span>
                          <strong>{employee.name}</strong>
                          <small>{employee.role}</small>
                        </span>
                      </th>
                      {dates.map((date) => {
                        const shift =
                          roster.assignments[employee.id]?.[date] ?? "";
                        return (
                          <td key={date}>
                            <button
                              className={`shift-cell ${shift ? `shift-${shift.toLowerCase()}` : "empty"}`}
                              type="button"
                              onClick={() =>
                                onSelectCell({ employeeId: employee.id, date })
                              }
                              aria-label={`${employee.name}, ${formatLongDate(date)}: ${
                                shift
                                  ? SHIFT_DEFINITIONS[shift].label
                                  : "No assignment"
                              }`}
                            >
                              {shift ? (
                                <>
                                  <strong>{shift}</strong>
                                  <small>
                                    {SHIFT_DEFINITIONS[shift].time === "—"
                                      ? SHIFT_DEFINITIONS[shift].label
                                      : SHIFT_DEFINITIONS[shift].time.split("–")[0]}
                                  </small>
                                </>
                              ) : (
                                <>
                                  <strong>+</strong>
                                  <small>Open</small>
                                </>
                              )}
                            </button>
                          </td>
                        );
                      })}
                      <td className="load-cell">
                        <strong>{hours}h</strong>
                        <small>{workDays} days</small>
                        <span className={hours > 54 ? "over" : ""} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="roster-footer">
            <div>
              <span className={`status-chip ${roster.status.toLowerCase()}`}>
                {roster.status}
              </span>
              {roster.status === "Published" && roster.reviewStatus && (
                <span
                  className={`review-state compact ${roster.reviewStatus.toLowerCase().replaceAll(" ", "-")}`}
                >
                  {roster.reviewStatus}
                </span>
              )}
              <span>
                {roster.status === "Published" && roster.publishedAt
                  ? `Published ${roster.publishedAt}`
                  : "Changes save automatically on this device"}
              </span>
            </div>
            <div className="footer-progress">
              <span>{completion}% complete</span>
              <div className="progress-track">
                <i style={{ width: `${completion}%` }} />
              </div>
            </div>
          </div>
        </section>

        <aside className="planner-insights">
          <section className="insight-card attention">
            <span className="eyebrow">ATTENTION</span>
            <strong>{blanks} open cells</strong>
            <p>
              A roster cannot be published until every cell has a shift or
              availability code.
            </p>
            <button type="button" onClick={onFill}>
              Fill suggestions
            </button>
          </section>

          <section className="insight-card">
            <span className="eyebrow">COVERAGE RULES</span>
            <h3>Daily minimum</h3>
            <ul className="rule-list">
              <li><span>Opening</span><strong>2 people</strong></li>
              <li><span>Core hours</span><strong>4 people</strong></li>
              <li><span>Closing</span><strong>2 people</strong></li>
              <li><span>Weekly load</span><strong>≤ 54h</strong></li>
            </ul>
            <p className="fine-print">
              Demo rules are configurable and require Boldfit HR/operations
              approval before production use.
            </p>
          </section>

          <section className="insight-card legend-card">
            <span className="eyebrow">SHIFT LEGEND</span>
            <div className="compact-legend">
              {SHIFT_CODES.map((code) => (
                <div key={code}>
                  <span className={`legend-code shift-${code.toLowerCase()}`}>
                    {code}
                  </span>
                  <span>
                    <strong>{SHIFT_DEFINITIONS[code].label}</strong>
                    <small>{SHIFT_DEFINITIONS[code].time}</small>
                  </span>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}

function PeopleView({
  people,
  roster,
  search,
  onSearch,
  onOpenTransfers,
}: {
  people: Employee[];
  roster: WeekRoster;
  search: string;
  onSearch: (value: string) => void;
  onOpenTransfers: () => void;
}) {
  return (
    <>
      <PageHeading
        eyebrow="STORE TEAM"
        title="People and workload"
        description="See each employee’s weekly load, home store, and roster readiness."
        actions={
          <button className="button primary" type="button" onClick={onOpenTransfers}>
            Add flex cover
          </button>
        }
      />
      <section className="people-toolbar">
        <label className="search-field">
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Search employee, role, or ID"
            aria-label="Search people"
          />
        </label>
        <div className="team-summary">
          <span><strong>{EMPLOYEES.length}</strong> active</span>
          <span><strong>{FLEX_POOL.length}</strong> in city pool</span>
        </div>
      </section>
      <section className="people-panel">
        <div className="people-table-head">
          <span>Employee</span>
          <span>Contact</span>
          <span>Home store</span>
          <span>Weekly load</span>
          <span>Status</span>
        </div>
        {people.map((employee) => {
          const hours = employeeWeekHours(roster, employee.id);
          const workDays = employeeWorkDays(roster, employee.id);
          return (
            <article className="person-row" key={employee.id}>
              <div className="person-primary">
                <span className="avatar large">{employee.initials}</span>
                <span>
                  <strong>{employee.name}</strong>
                  <small>{employee.role} · {employee.id.toUpperCase()}</small>
                </span>
              </div>
              <span>{employee.phone}</span>
              <span>{employee.homeStore}</span>
              <div className="load-summary">
                <strong>{hours}h</strong>
                <span>{workDays} working days</span>
              </div>
              <span className="status-chip active">Active</span>
            </article>
          );
        })}
        {people.length === 0 && (
          <div className="empty-state">
            <strong>No team members found</strong>
            <p>Try a different name, role, or employee ID.</p>
          </div>
        )}
      </section>
    </>
  );
}

function TransfersView({
  transfers,
  onAdd,
  onCancel,
}: {
  transfers: TransferRequest[];
  onAdd: () => void;
  onCancel: (id: string) => void;
}) {
  const active = transfers.filter((item) => item.status === "Scheduled");
  return (
    <>
      <PageHeading
        eyebrow="AREA OPS"
        title="Flex pool and transfers"
        description="Fill temporary gaps without changing an employee’s permanent home store."
        actions={
          <button className="button primary" type="button" onClick={onAdd}>
            New assignment
          </button>
        }
      />

      <section className="transfer-summary">
        <div>
          <span className="eyebrow">AVAILABLE NOW</span>
          <strong>{FLEX_POOL.length}</strong>
          <p>Bengaluru Flex Pool employees</p>
        </div>
        <div>
          <span className="eyebrow">SCHEDULED</span>
          <strong>{active.length}</strong>
          <p>active temporary assignments</p>
        </div>
        <div className="transfer-note">
          <span aria-hidden="true">i</span>
          <p>
            Scheduling a transfer immediately prepares the employee’s
            WhatsApp message with the destination store, reporting time, and
            shift.
          </p>
        </div>
      </section>

      <div className="transfer-layout">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">CITY FLEX POOL</span>
              <h2>Available people</h2>
            </div>
          </div>
          <div className="pool-list">
            {FLEX_POOL.map((employee, index) => (
              <article className="pool-card" key={employee.id}>
                <span className="avatar large">{employee.initials}</span>
                <div>
                  <strong>{employee.name}</strong>
                  <span>{employee.role}</span>
                  <small>{index === 1 ? "Available from Thu" : "Available next week"}</small>
                </div>
                <button type="button" onClick={onAdd}>Assign</button>
              </article>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">ASSIGNMENTS</span>
              <h2>Temporary movement</h2>
            </div>
            <span className="count-badge">{active.length}</span>
          </div>
          <div className="transfer-list">
            {transfers.map((transfer) => (
              <article
                className={`transfer-card ${transfer.status.toLowerCase()}`}
                key={transfer.id}
              >
                <div className="transfer-card-top">
                  <span className={`direction ${transfer.direction.toLowerCase()}`}>
                    {transfer.direction === "Incoming" ? "IN" : "OUT"}
                  </span>
                  <div>
                    <strong>{transfer.employee}</strong>
                    <span>{formatLongDate(transfer.date)} · {transfer.shift}</span>
                  </div>
                  <span className={`status-chip ${transfer.status.toLowerCase()}`}>
                    {transfer.status}
                  </span>
                </div>
                <div className="store-route">
                  <span>{transfer.sourceStore}</span>
                  <i aria-hidden="true">→</i>
                  <span>{transfer.destinationStore}</span>
                </div>
                {transfer.status === "Scheduled" && (
                  <button type="button" onClick={() => onCancel(transfer.id)}>
                    Cancel assignment
                  </button>
                )}
              </article>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

function ActivityView({
  activity,
  notifications,
  roster,
  role,
  onReset,
  onCopyNotification,
  onShareNotification,
  onQueueNudge,
  onRespondNotification,
  onReviewRoster,
}: {
  activity: RosterAppState["activity"];
  notifications: WhatsAppNotification[];
  roster: WeekRoster;
  role: RoleMode;
  onReset: () => void;
  onCopyNotification: (id: string) => void;
  onShareNotification: (id: string) => void;
  onQueueNudge: () => void;
  onRespondNotification: (
    id: string,
    response: "Confirmed" | "Issue reported",
  ) => void;
  onReviewRoster: (
    decision: "Approved" | "Changes requested",
    comment?: string,
  ) => void;
}) {
  const published = roster.status === "Published";
  const [reviewComment, setReviewComment] = useState("");
  const [notificationFilter, setNotificationFilter] = useState<
    "All" | "Employees" | "Managers"
  >("All");
  const [selectedNotificationId, setSelectedNotificationId] = useState(
    notifications[0]?.id ?? "",
  );
  const visibleNotifications = notifications.filter((notification) => {
    if (notificationFilter === "Employees") {
      return notification.audience === "Employee";
    }
    if (notificationFilter === "Managers") {
      return notification.audience !== "Employee";
    }
    return true;
  });
  const selectedNotification =
    visibleNotifications.find(
      (notification) => notification.id === selectedNotificationId,
    ) ?? visibleNotifications[0];
  const readyCount = notifications.filter(
    (notification) => notification.status === "Ready",
  ).length;
  const currentWeekResponses = notifications.filter(
    (notification) =>
      notification.responseRequired &&
      notification.weekStart === roster.weekStart,
  );
  const responseMessages =
    currentWeekResponses.length > 0
      ? currentWeekResponses
      : notifications.filter((notification) => notification.responseRequired);
  const confirmedCount = responseMessages.filter(
    (notification) => notification.responseStatus === "Confirmed",
  ).length;
  const issueCount = responseMessages.filter(
    (notification) => notification.responseStatus === "Issue reported",
  ).length;
  const pendingCount = responseMessages.filter(
    (notification) =>
      !notification.responseStatus ||
      notification.responseStatus === "Pending",
  ).length;
  const coverageAlertCount = new Set(
    notifications
      .filter(
        (notification) =>
          notification.kind === "Coverage risk" &&
          notification.weekStart === roster.weekStart &&
          notification.status !== "Cancelled",
      )
      .map((notification) => notification.relatedDate),
  ).size;
  const reviewStatus =
    roster.reviewStatus ?? (published ? "Pending review" : "Not submitted");

  function notificationStateClass(notification: WhatsAppNotification) {
    if (
      notification.responseStatus &&
      notification.responseStatus !== "Pending"
    ) {
      return notification.responseStatus.toLowerCase().replaceAll(" ", "-");
    }
    return notification.status.toLowerCase();
  }

  function notificationStateLabel(notification: WhatsAppNotification) {
    if (
      notification.responseStatus &&
      notification.responseStatus !== "Pending"
    ) {
      return notification.responseStatus;
    }
    return notification.status === "Opened"
      ? "WhatsApp opened"
      : notification.status;
  }

  return (
    <>
      <PageHeading
        eyebrow="COMMUNICATION"
        title="Alerts and activity"
        description="A clear record of planning reminders, roster changes, and temporary movements."
        actions={
          <button className="button ghost" type="button" onClick={onReset}>
            Reset demo
          </button>
        }
      />

      <div className="alert-grid">
        <article className="alert-card">
          <span className="alert-day">THU</span>
          <div>
            <span className="eyebrow">STORE MANAGER</span>
            <h3>Planning reminder</h3>
            <p>
              Prepared at 18:00 if next week’s roster has not been published.
            </p>
            <button type="button" onClick={onQueueNudge}>
              {published ? "Check reminder" : "Preview nudge"}
            </button>
          </div>
          <span className={`status-chip ${published ? "active" : "scheduled"}`}>
            {published ? "Not needed" : "Scheduled"}
          </span>
        </article>
        <article className="alert-card">
          <span className="alert-day">ACK</span>
          <div>
            <span className="eyebrow">EMPLOYEE RESPONSES</span>
            <h3>Roster acknowledgement</h3>
            <p>
              {confirmedCount} confirmed · {pendingCount} pending · {issueCount} issue
              {issueCount === 1 ? "" : "s"} reported.
            </p>
          </div>
          <span
            className={`status-chip ${issueCount > 0 ? "scheduled" : "active"}`}
          >
            {issueCount > 0 ? "Follow up" : `${confirmedCount} confirmed`}
          </span>
        </article>
        <article className="alert-card">
          <span className="alert-day">RISK</span>
          <div>
            <span className="eyebrow">SM + AREA OPS</span>
            <h3>Coverage alerts</h3>
            <p>
              Alerts are recalculated whenever the roster is published or a
              live shift changes.
            </p>
          </div>
          <span
            className={`status-chip ${coverageAlertCount > 0 ? "scheduled" : "active"}`}
          >
            {coverageAlertCount > 0
              ? `${coverageAlertCount} active`
              : "Covered"}
          </span>
        </article>
      </div>

      <section className="panel roster-review-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">AOM REVIEW</span>
            <h2>Publish verification</h2>
          </div>
          <span
            className={`review-state ${reviewStatus.toLowerCase().replaceAll(" ", "-")}`}
          >
            {reviewStatus}
          </span>
        </div>
        <div className="roster-review-content">
          <div className="review-summary">
            <span className="review-icon" aria-hidden="true">
              {reviewStatus === "Approved"
                ? "✓"
                : reviewStatus === "Changes requested"
                  ? "!"
                  : "AO"}
            </span>
            <div>
              <strong>
                {published
                  ? `${formatWeekRange(roster.weekStart)} is ready for Area Operations review`
                  : "Publish this roster to begin Area Operations review"}
              </strong>
              <p>
                {roster.reviewComment ??
                  "The AOM can approve the roster or return it with a correction note. The Store Manager receives the outcome on WhatsApp."}
              </p>
            </div>
          </div>

          {role === "Area Ops" ? (
            <div className="review-controls">
              <label>
                Review comment
                <textarea
                  value={reviewComment}
                  onChange={(event) => setReviewComment(event.target.value)}
                  placeholder="Add an approval note or explain the required correction"
                />
              </label>
              <div>
                <button
                  className="button secondary"
                  type="button"
                  disabled={!published}
                  onClick={() =>
                    onReviewRoster("Changes requested", reviewComment)
                  }
                >
                  Return for correction
                </button>
                <button
                  className="button primary"
                  type="button"
                  disabled={!published}
                  onClick={() => onReviewRoster("Approved", reviewComment)}
                >
                  Approve roster
                </button>
              </div>
            </div>
          ) : (
            <div className="review-role-note">
              <span>SM VIEW</span>
              Switch the demo role to <strong>Area Ops</strong> to approve or
              return this roster.
            </div>
          )}
        </div>
      </section>

      <section className="panel whatsapp-centre">
        <div className="panel-heading whatsapp-heading">
          <div>
            <span className="eyebrow">WHATSAPP NOTIFICATIONS</span>
            <h2>Message centre</h2>
            <p>
              Review each personalised message before opening it in WhatsApp.
            </p>
          </div>
          <div className="message-centre-count">
            <strong>{readyCount}</strong>
            <span>ready to open</span>
          </div>
        </div>

        <div className="notification-filters" aria-label="Filter notifications">
          {(["All", "Employees", "Managers"] as const).map((filter) => (
            <button
              type="button"
              key={filter}
              className={notificationFilter === filter ? "active" : ""}
              onClick={() => setNotificationFilter(filter)}
            >
              {filter}
              <span>
                {filter === "All"
                  ? notifications.length
                  : notifications.filter((notification) =>
                      filter === "Employees"
                        ? notification.audience === "Employee"
                        : notification.audience !== "Employee",
                    ).length}
              </span>
            </button>
          ))}
        </div>

        <div className="notification-workspace">
          <div className="notification-list" aria-label="WhatsApp message queue">
            {visibleNotifications.map((notification) => (
              <button
                type="button"
                className={
                  selectedNotification?.id === notification.id ? "active" : ""
                }
                key={notification.id}
                onClick={() => setSelectedNotificationId(notification.id)}
              >
                <span className="notification-avatar" aria-hidden="true">
                  {notification.audience === "Employee" ? "EMP" : "OPS"}
                </span>
                <span className="notification-summary">
                  <strong>{notification.recipientName}</strong>
                  <small>{notification.kind} · {notification.createdAt}</small>
                </span>
                <span
                  className={`notification-state ${notificationStateClass(notification)}`}
                >
                  {notificationStateLabel(notification)}
                </span>
              </button>
            ))}
            {visibleNotifications.length === 0 && (
              <div className="notification-empty">
                No messages in this group yet.
              </div>
            )}
          </div>

          <div className="notification-preview">
            {selectedNotification ? (
              <>
                <div className="notification-preview-meta">
                  <div>
                    <span className="eyebrow">{selectedNotification.audience}</span>
                    <h3>{selectedNotification.title}</h3>
                    <p>
                      {selectedNotification.phone
                        ? `${selectedNotification.phone} · ${selectedNotification.kind}`
                        : selectedNotification.kind}
                    </p>
                  </div>
                  <span
                    className={`notification-state ${notificationStateClass(selectedNotification)}`}
                  >
                    {notificationStateLabel(selectedNotification)}
                  </span>
                </div>
                <div className="whatsapp-chat-preview">
                  <span className="whatsapp-label">WHATSAPP PREVIEW</span>
                  <p>{selectedNotification.message}</p>
                  <small>Prepared by Boldfit Store Operations</small>
                </div>
                <div className="notification-actions">
                  <button
                    className="button secondary"
                    type="button"
                    onClick={() =>
                      onCopyNotification(selectedNotification.id)
                    }
                  >
                    Copy message
                  </button>
                  <button
                    className="button whatsapp-button"
                    type="button"
                    disabled={selectedNotification.status === "Cancelled"}
                    onClick={() =>
                      onShareNotification(selectedNotification.id)
                    }
                  >
                    Open WhatsApp
                  </button>
                </div>
                {selectedNotification.responseRequired && (
                  <div className="response-actions">
                    <div>
                      <strong>Employee response</strong>
                      <span>
                        {selectedNotification.responseStatus ?? "Pending"}
                      </span>
                    </div>
                    <button
                      className="button secondary"
                      type="button"
                      disabled={
                        selectedNotification.responseStatus === "Issue reported"
                      }
                      onClick={() =>
                        onRespondNotification(
                          selectedNotification.id,
                          "Issue reported",
                        )
                      }
                    >
                      Report an issue
                    </button>
                    <button
                      className="button acknowledgement-button"
                      type="button"
                      disabled={
                        selectedNotification.responseStatus === "Confirmed"
                      }
                      onClick={() =>
                        onRespondNotification(
                          selectedNotification.id,
                          "Confirmed",
                        )
                      }
                    >
                      Confirm roster
                    </button>
                  </div>
                )}
                <p className="fine-print notification-disclaimer">
                  Demo phone numbers are masked. WhatsApp opens with the full
                  message ready; select the intended contact to complete sending.
                </p>
              </>
            ) : (
              <div className="notification-empty">
                Select a message to preview it.
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="activity-layout">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">AUDIT TRAIL</span>
              <h2>Recent changes</h2>
            </div>
          </div>
          <div className="timeline">
            {activity.map((item) => (
              <article key={item.id}>
                <span className={`timeline-dot ${item.kind}`} />
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.detail}</p>
                  <time>{item.time}</time>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="panel automation-rules">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">AUTOMATION RULES</span>
              <h2>When messages are prepared</h2>
            </div>
          </div>
          <div className="automation-rule-list">
            <article>
              <span>01</span>
              <div>
                <strong>Roster published</strong>
                <p>One personalised seven-day roster for every employee.</p>
              </div>
            </article>
            <article>
              <span>02</span>
              <div>
                <strong>Employee response</strong>
                <p>Confirmation and issue-reporting status for every roster message.</p>
              </div>
            </article>
            <article>
              <span>03</span>
              <div>
                <strong>Published shift changed</strong>
                <p>Only the affected employee receives the old shift, new shift, and reason.</p>
              </div>
            </article>
            <article>
              <span>04</span>
              <div>
                <strong>Coverage below minimum</strong>
                <p>Store Manager and AOM receive the affected date and coverage counts.</p>
              </div>
            </article>
            <article>
              <span>05</span>
              <div>
                <strong>AOM decision recorded</strong>
                <p>The Store Manager receives an approval or correction message.</p>
              </div>
            </article>
            <article>
              <span>06</span>
              <div>
                <strong>Transfer scheduled or cancelled</strong>
                <p>The employee receives each movement update with the applicable store and date.</p>
              </div>
            </article>
            <article>
              <span>07</span>
              <div>
                <strong>Roster still incomplete</strong>
                <p>A next-week roster completion nudge for the Store Manager.</p>
              </div>
            </article>
          </div>
        </section>
      </div>
    </>
  );
}

function ShiftPicker({
  employee,
  date,
  current,
  published,
  onChoose,
  onClose,
}: {
  employee: Employee;
  date: string;
  current: RosterValue;
  published: boolean;
  onChoose: (code: RosterValue, reason?: string) => void;
  onClose: () => void;
}) {
  const [changeReason, setChangeReason] = useState(
    "Operational coverage adjustment",
  );

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="sheet shift-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shift-sheet-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="sheet-header">
          <div>
            <span className="eyebrow">{formatLongDate(date)}</span>
            <h2 id="shift-sheet-title">{employee.name}</h2>
            <p>{employee.role}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close shift picker">
            ×
          </button>
        </div>
        {published && (
          <div className="published-change-notice">
            <strong>Changing a published roster</strong>
            <p>
              The employee will receive the old shift, new shift, and reason.
              Confirmation will be requested automatically.
            </p>
            <label>
              Change reason
              <select
                value={changeReason}
                onChange={(event) => setChangeReason(event.target.value)}
              >
                <option>Operational coverage adjustment</option>
                <option>Employee request</option>
                <option>Approved leave</option>
                <option>Store transfer</option>
                <option>Emergency staffing change</option>
              </select>
            </label>
          </div>
        )}
        <div className="shift-options">
          {SHIFT_CODES.map((code) => {
            const shift = SHIFT_DEFINITIONS[code];
            return (
              <button
                type="button"
                className={current === code ? "selected" : ""}
                key={code}
                onClick={() => onChoose(code, changeReason)}
              >
                <span className={`legend-code shift-${code.toLowerCase()}`}>
                  {code}
                </span>
                <span>
                  <strong>{shift.label}</strong>
                  <small>{shift.time}</small>
                </span>
                <span aria-hidden="true">{current === code ? "✓" : "→"}</span>
              </button>
            );
          })}
        </div>
        <button
          className="clear-assignment"
          type="button"
          onClick={() => onChoose("", changeReason)}
        >
          Clear assignment
        </button>
      </section>
    </div>
  );
}

function TransferForm({
  mode,
  employeeId,
  destination,
  date,
  shift,
  onMode,
  onEmployee,
  onDestination,
  onDate,
  onShift,
  onSubmit,
  onClose,
}: {
  mode: "pool" | "outgoing";
  employeeId: string;
  destination: string;
  date: string;
  shift: ShiftCode;
  onMode: (mode: "pool" | "outgoing") => void;
  onEmployee: (value: string) => void;
  onDestination: (value: string) => void;
  onDate: (value: string) => void;
  onShift: (value: ShiftCode) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
}) {
  const people = mode === "pool" ? FLEX_POOL : EMPLOYEES;
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="sheet transfer-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="transfer-sheet-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="sheet-header">
          <div>
            <span className="eyebrow">TEMPORARY STAFFING</span>
            <h2 id="transfer-sheet-title">New assignment</h2>
            <p>Schedule cover without changing the employee’s home store.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close transfer form">
            ×
          </button>
        </div>
        <div className="segmented-control" aria-label="Assignment type">
          <button
            type="button"
            className={mode === "pool" ? "active" : ""}
            onClick={() => onMode("pool")}
          >
            Add from Flex Pool
          </button>
          <button
            type="button"
            className={mode === "outgoing" ? "active" : ""}
            onClick={() => onMode("outgoing")}
          >
            Transfer store employee
          </button>
        </div>
        <form className="transfer-form" onSubmit={onSubmit}>
          <label>
            Employee
            <select value={employeeId} onChange={(event) => onEmployee(event.target.value)}>
              {people.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name} · {employee.role}
                </option>
              ))}
            </select>
          </label>
          {mode === "outgoing" && (
            <label>
              Destination store
              <select
                value={destination}
                onChange={(event) => onDestination(event.target.value)}
              >
                {STORES.filter((store) => store.code !== "BF-BLR-01").map((store) => (
                  <option key={store.code} value={store.code}>
                    {store.name} · {store.code}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="form-row">
            <label>
              Date
              <input
                type="date"
                value={date}
                onChange={(event) => onDate(event.target.value)}
                required
              />
            </label>
            <label>
              Shift
              <select
                value={shift}
                onChange={(event) => onShift(event.target.value as ShiftCode)}
              >
                {SHIFT_CODES.filter((code) => SHIFT_DEFINITIONS[code].work).map(
                  (code) => (
                    <option key={code} value={code}>
                      {SHIFT_DEFINITIONS[code].label} · {SHIFT_DEFINITIONS[code].time}
                    </option>
                  ),
                )}
              </select>
            </label>
          </div>
          <div className="form-note">
            <span aria-hidden="true">i</span>
            A personalised WhatsApp message will be prepared for the employee.
          </div>
          <button className="button primary wide" type="submit">
            Schedule assignment
          </button>
        </form>
      </section>
    </div>
  );
}
