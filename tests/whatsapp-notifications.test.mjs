import assert from "node:assert/strict";
import test from "node:test";

import {
  EMPLOYEES,
  buildAomPublishedMessage,
  buildCoverageRiskMessage,
  buildEmployeeRosterMessage,
  buildRosterApprovedMessage,
  buildRosterCorrectionMessage,
  buildShiftChangeMessage,
  buildStoreManagerNudgeMessage,
  buildTransferCancellationMessage,
  buildTransferMessage,
  createCoverageRiskNotifications,
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
  assert.ok(
    notifications
      .filter((item) => item.audience === "Employee")
      .every(
        (item) =>
          item.responseRequired === true && item.responseStatus === "Pending",
      ),
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

test("builds a change-only message and requests employee confirmation", () => {
  assert.equal(
    buildShiftChangeMessage({
      employee: EMPLOYEES[0],
      date: "2026-08-05",
      previous: "MID",
      next: "CL",
      reason: "Operational coverage adjustment",
    }),
    [
      "Hi Asha,",
      "Your shift for Wednesday Aug 5 at Bengaluru Store 01 has been changed from MID (11am to 8pm) to CL (12pm to 9pm).",
      "Reason: Operational coverage adjustment",
      "Please confirm that you have seen this update.",
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

test("builds transfer cancellation, AOM review, and correction messages", () => {
  const transfer = {
    id: "tr-test",
    employee: "Asha Nair",
    employeeId: "bf-101",
    direction: "Outgoing",
    sourceStore: "BF-BLR-01",
    destinationStore: "BF-BLR-02",
    date: "2026-08-05",
    shift: "CL",
    status: "Scheduled",
  };

  assert.equal(
    buildTransferCancellationMessage(transfer),
    [
      "Hi Asha,",
      "Your transfer to Bengaluru Store 02 on Aug 5th has been cancelled. Please follow your original roster at Bengaluru Store 01.",
    ].join("\n"),
  );
  assert.equal(
    buildRosterApprovedMessage("2026-08-03"),
    [
      "Dear SM,",
      "Your roster for Bengaluru Store 01 for 3–9 Aug 2026 has been reviewed and approved by the AOM.",
    ].join("\n"),
  );
  assert.equal(
    buildRosterCorrectionMessage(
      "2026-08-03",
      "Friday closing coverage needs one additional employee.",
    ),
    [
      "Dear SM,",
      "Your roster for Bengaluru Store 01 for 3–9 Aug 2026 has been returned for correction.",
      "AOM comment: Friday closing coverage needs one additional employee.",
      "Please update and republish the roster.",
    ].join("\n"),
  );
});

test("creates paired Store Manager and AOM alerts for every coverage risk", () => {
  const roster = createWeekRoster("2026-08-03", false);
  const notifications = createCoverageRiskNotifications(
    roster,
    "test-coverage",
    "Just now",
  );

  assert.ok(notifications.length >= 2);
  assert.equal(notifications.length % 2, 0);
  assert.equal(
    notifications.filter((item) => item.audience === "Store Manager").length,
    notifications.filter(
      (item) => item.audience === "Area Operations Manager",
    ).length,
  );
  assert.match(
    buildCoverageRiskMessage({
      roster,
      date: notifications[0].relatedDate,
      audience: "Store Manager",
    }),
    /^Dear SM,\nBengaluru Store 01 has insufficient coverage on /,
  );
});
