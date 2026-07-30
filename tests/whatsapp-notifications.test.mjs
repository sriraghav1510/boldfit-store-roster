import assert from "node:assert/strict";
import test from "node:test";

import {
  EMPLOYEES,
  buildAomPublishedMessage,
  buildEmployeeRosterMessage,
  buildStoreManagerNudgeMessage,
  buildTransferMessage,
  createPublicationNotifications,
  createWeekRoster,
} from "../app/roster-domain.ts";

test("builds the exact seven-day employee roster message", () => {
  const roster = createWeekRoster("2026-08-03", false);

  assert.equal(
    buildEmployeeRosterMessage(roster, EMPLOYEES[0]),
    [
      "Hi Asha,",
      "Your roster for this week at Bengaluru Store 01 is as follows:",
      "Monday Aug 3 - OP (9.30am to 6.30pm)",
      "Tuesday Aug 4 - OP (9.30am to 6.30pm)",
      "Wednesday Aug 5 - MID (11am to 8pm)",
      "Thursday Aug 6 - MID (11am to 8pm)",
      "Friday Aug 7 - CL (12pm to 9pm)",
      "Saturday Aug 8 - Week Off (Have Fun!)",
      "Sunday Aug 9 - FULL (10am to 9pm)",
    ].join("\n"),
  );
});

test("publishing creates one employee message per person and one AOM message", () => {
  const roster = createWeekRoster("2026-08-03", false);
  const notifications = createPublicationNotifications(
    roster,
    "test-publish",
    "Just now",
  );

  assert.equal(
    notifications.filter((item) => item.audience === "Employee").length,
    EMPLOYEES.length,
  );
  assert.equal(
    notifications.filter(
      (item) => item.audience === "Area Operations Manager",
    ).length,
    1,
  );
  assert.equal(
    notifications.at(-1)?.message,
    [
      "Dear AOM,",
      "Bengaluru Store 01 has published its roster. Please check and verify to ensure fill coverage for the week",
    ].join("\n"),
  );
});

test("builds transfer and incomplete-roster nudge messages", () => {
  assert.equal(
    buildTransferMessage({
      id: "tr-test",
      employee: "Asha Nair",
      employeeId: "bf-101",
      direction: "Outgoing",
      sourceStore: "BF-BLR-01",
      destinationStore: "BF-BLR-02",
      date: "2026-08-05",
      shift: "CL",
      status: "Scheduled",
    }),
    [
      "Hi Asha,",
      "Please note, you have been transferred to Bengaluru Store 02 as on Aug 5th. Reach the store at 12pm for your CL shift.",
    ].join("\n"),
  );
  assert.equal(
    buildStoreManagerNudgeMessage(),
    "Dear SM\nKindly complete the roster for next week",
  );
  assert.equal(
    buildAomPublishedMessage(),
    "Dear AOM,\nBengaluru Store 01 has published its roster. Please check and verify to ensure fill coverage for the week",
  );
});
