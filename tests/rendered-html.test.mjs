import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const templateRoot = new URL("../", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Boldfit roster application", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Boldfit Roster \| Store Operations<\/title>/i);
  assert.match(html, /BOLDFIT/);
  assert.match(html, /OPS \/ ROSTER/);
  assert.match(html, /Your store, properly covered\./);
  assert.match(html, /Roster planner/);
  assert.match(html, /Flex &amp; transfers/);
  assert.match(html, /Attendance/);
  assert.match(html, /Interactive demo/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/i);
});

test("removes the disposable starter preview and includes advanced operations", async () => {
  const [page, layout, packageJson, attendanceSuite, advancedOperations] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../app/attendance-suite.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/advanced-operations.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(page, /RosterApp/);
  assert.match(layout, /Boldfit Roster/);
  assert.doesNotMatch(page, /SkeletonPreview|codex-preview/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.match(attendanceSuite, /Daily ops/);
  assert.match(attendanceSuite, /AI planning/);
  assert.match(attendanceSuite, /Governance/);
  assert.match(advancedOperations, /AUTO REPLACEMENT/);
  assert.match(advancedOperations, /Month-end attendance reconciliation/);
  await assert.rejects(access(new URL("app/_sites-preview", templateRoot)));
});
