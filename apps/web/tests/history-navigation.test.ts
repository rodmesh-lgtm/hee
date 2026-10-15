import test from "node:test";
import assert from "node:assert/strict";
import { historyHref, historyPage, historyPageLinks } from "../app/lib/history-navigation";

test("history navigation exposes both ends without unbounded page links", () => {
  assert.deepEqual(historyPageLinks(1, 1), [1]);
  assert.deepEqual(historyPageLinks(1, 10), [1, 2, "gap", 10]);
  assert.deepEqual(historyPageLinks(5, 10), [1, "gap", 4, 5, 6, "gap", 10]);
  assert.deepEqual(historyPageLinks(10, 10), [1, "gap", 9, 10]);
  assert.deepEqual(historyPageLinks(2, 3), [1, 2, 3]);
  assert.equal(historyPageLinks(500_000, 1_000_000).length, 7);
});

test("history links preserve Arabic searches and filters without duplicating page state", () => {
  const url = new URL(historyHref("/dashboard/notifications", {q:"موعد & عميل", tab:"unread"}, 5), "https://hub.ir.sa");
  assert.equal(url.searchParams.get("q"), "موعد & عميل");
  assert.equal(url.searchParams.get("tab"), "unread");
  assert.equal(url.searchParams.get("page"), "5");
  assert.equal(url.hash, "#history");
  assert.equal(new URL(historyHref("/dashboard/notes", {q:""}), "https://hub.ir.sa").searchParams.has("page"), false);
});

test("empty and out-of-range histories clamp safely before navigation", () => {
  assert.deepEqual(historyPage("999", 0), {page:1, pages:1});
  assert.deepEqual(historyPage("999", 41), {page:3, pages:3});
  assert.deepEqual(historyPage("-2", 41), {page:1, pages:3});
});
