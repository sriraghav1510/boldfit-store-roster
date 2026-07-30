import assert from "node:assert/strict";
import test from "node:test";

import {
  ATTENDANCE_EMPLOYEES,
  attendanceEmployee,
  buildClosingExceptionMessage,
  classifyAttendance,
  createAttendanceSuiteState,
  createPunchRecord,
  storeAttendanceSummary,
} from "../app/attendance-domain.ts";

const insideGeofence = {
  status: "Inside",
  allowed: true,
  distanceMeters: 4,
  accuracyMeters: 5,
  message: "Location verified.",
};

test("applies the 10-minute login and logout grace exactly", () => {
  assert.deepEqual(
    classifyAttendance({
      shift: "OP",
      punchIn: "09:40",
      punchOut: "18:20",
    }).statuses,
    ["Short Timing"],
  );
  assert.ok(
    classifyAttendance({
      shift: "OP",
      punchIn: "09:41",
      punchOut: "18:30",
    }).statuses.includes("Late Login"),
  );
  assert.ok(
    classifyAttendance({
      shift: "OP",
      punchIn: "09:30",
      punchOut: "18:19",
    }).statuses.includes("Early Logout"),
  );
});

test("requires 9 hours for standard shifts and 11 hours for FULL", () => {
  assert.ok(
    classifyAttendance({
      shift: "MID",
      punchIn: "11:00",
      punchOut: "19:59",
    }).statuses.includes("Short Timing"),
  );
  assert.ok(
    !classifyAttendance({
      shift: "MID",
      punchIn: "11:00",
      punchOut: "20:00",
    }).statuses.includes("Short Timing"),
  );
  assert.ok(
    classifyAttendance({
      shift: "FULL",
      punchIn: "10:00",
      punchOut: "20:59",
    }).statuses.includes("Short Timing"),
  );
  assert.deepEqual(
    classifyAttendance({
      shift: "FULL",
      punchIn: "10:00",
      punchOut: "21:00",
    }).statuses,
    ["On time"],
  );
});

test("classifies end-of-day missing punches and absence", () => {
  assert.deepEqual(
    classifyAttendance({ shift: "CL", closingProcess: true }).statuses,
    ["Absent"],
  );
  assert.deepEqual(
    classifyAttendance({
      shift: "CL",
      punchIn: "12:02",
      closingProcess: true,
    }).statuses,
    ["Missed Punch Out"],
  );
});

test("blocks Punch Out without Punch In and records a valid sequence", () => {
  const employee = attendanceEmployee("bf-101");

  assert.throws(
    () =>
      createPunchRecord({
        employee,
        storeCode: employee.homeStore,
        shift: "OP",
        time: "18:30",
        geofence: insideGeofence,
        action: "Punch Out",
      }),
    /only after Punch In/,
  );

  const punchedIn = createPunchRecord({
    employee,
    storeCode: employee.homeStore,
    shift: "OP",
    time: "09:42",
    geofence: insideGeofence,
    action: "Punch In",
  });
  assert.equal(punchedIn.punchIn, "09:42");
  assert.equal(punchedIn.punchOut, undefined);

  const punchedOut = createPunchRecord({
    employee,
    storeCode: employee.homeStore,
    shift: "OP",
    time: "18:31",
    existing: punchedIn,
    geofence: insideGeofence,
    action: "Punch Out",
  });
  assert.equal(punchedOut.punchOut, "18:31");
  assert.ok(punchedOut.statuses.includes("Late Login"));
});

test("prepares the required closing WhatsApp language", () => {
  const employee = attendanceEmployee("bf-101");
  const baseRecord = {
    id: "att-message",
    employeeId: employee.id,
    storeCode: employee.homeStore,
    date: "2026-07-30",
    shift: "OP",
    scheduledStart: "09:30",
    scheduledEnd: "18:30",
    source: "Mobile",
    faceVerified: false,
    livenessVerified: false,
    geofence: null,
    eventSelfieStored: false,
  };

  assert.equal(
    buildClosingExceptionMessage(employee, {
      ...baseRecord,
      statuses: ["Absent"],
    }),
    "Hi Asha,\nYou were absent today against your rostered shift.",
  );
  assert.equal(
    buildClosingExceptionMessage(employee, {
      ...baseRecord,
      statuses: ["Missed Punch In"],
    }),
    "Hi Asha,\nYou missed to Punch In. Please submit an attendance regularisation request.",
  );
  assert.equal(
    buildClosingExceptionMessage(employee, {
      ...baseRecord,
      punchIn: "09:30",
      statuses: ["Missed Punch Out"],
    }),
    "Hi Asha,\nYou missed to Punch Out. Please submit an attendance regularisation request.",
  );
});

test("seeds 18 employees across three live stores without premature absence", () => {
  const date = "2026-07-30";
  const state = createAttendanceSuiteState(date);

  assert.equal(ATTENDANCE_EMPLOYEES.length, 18);
  assert.equal(new Set(ATTENDANCE_EMPLOYEES.map((item) => item.homeStore)).size, 3);
  assert.equal(
    state.attendance.filter((record) => record.date === date).length,
    18,
  );
  assert.equal(
    state.attendance
      .filter((record) => record.date === date)
      .some((record) => record.statuses.includes("Absent")),
    false,
  );
  assert.equal(
    storeAttendanceSummary(state, "BF-BLR-01", date).scheduled,
    6,
  );
});
