import assert from "node:assert/strict";
import test from "node:test";
import { applyDisplayOrder } from "../skills/burns-update-github-progress/scripts/project-options.mjs";

test("display order is omitted, set, or explicitly cleared", () => {
  assert.deepEqual(applyDisplayOrder({ slug: "akka" }, undefined), {
    slug: "akka",
  });
  assert.deepEqual(applyDisplayOrder({ slug: "akka" }, "30"), {
    slug: "akka",
    displayOrder: 30,
  });
  assert.deepEqual(applyDisplayOrder({ slug: "akka" }, "none"), {
    slug: "akka",
    displayOrder: null,
  });
});

test("display order rejects invalid CLI values", () => {
  for (const value of ["0", "1.5", "100001", "latest"]) {
    assert.throws(() => applyDisplayOrder({}, value), /display-order/);
  }
});
