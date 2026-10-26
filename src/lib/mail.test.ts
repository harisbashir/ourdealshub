import assert from "node:assert/strict";
import { test } from "node:test";
import { activityEmail } from "./system-events";
import { safeMailError, mailReady } from "./mail-transport";
import type { MailSettings } from "@prisma/client";

test("activity summary contains timestamps, categories and admin links", () => {
  const result = activityEmail([{ title: "API settings changed", detail: "Credentials were updated.", level: "info", category: "settings", adminPath: "/admin/settings", createdAt: new Date("2026-10-26T09:00:00Z") }], "https://ourdeals.lan/");
  assert.match(result.subject, /1 activity update/);
  assert.match(result.text, /UTC/); assert.match(result.text, /https:\/\/ourdeals.lan\/admin\/settings/);
  assert.match(result.text, /Credentials were updated/);
});
test("error summaries get an alert subject", () => {
  const result = activityEmail([{ title: "Backup failed", detail: null, level: "error", category: "operations", adminPath: "/admin", createdAt: new Date() }], "https://example.com");
  assert.match(result.subject, /1 system alert/);
});
test("SMTP errors expose safe explanations, never raw credentials", () => {
  assert.equal(safeMailError({ code: "EAUTH", message: "secret-123" }).uncertain, false);
  assert.ok(!safeMailError({ code: "EAUTH", message: "secret-123" }).message.includes("secret-123"));
  assert.equal(safeMailError({ command: "CONN", message: "secret-123" }).uncertain, false);
  assert.equal(safeMailError({ command: "DATA", code: "ETIMEDOUT" }).uncertain, true);
  assert.equal(safeMailError({ responseCode: 550 }).uncertain, false);
});
test("Gmail/SMTP need a password; Outlook needs OAuth credentials", () => {
  const base = { host: "smtp.example.com", username: "user@example.com", fromAddress: "user@example.com", recipient: "admin@example.com", provider: "gmail", password: "sealed" } as MailSettings;
  assert.equal(mailReady(base), true);
  assert.equal(mailReady({ ...base, password: null }), false);
  assert.equal(mailReady({ ...base, provider: "outlook" }), false);
  assert.equal(mailReady({ ...base, provider: "outlook", oauthClientId: "id", oauthRefreshToken: "sealed-token" }), true);
  assert.equal(mailReady(null), false);
});
