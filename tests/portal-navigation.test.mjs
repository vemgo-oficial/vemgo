import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../components/vemgo/PortalLayout.tsx", import.meta.url), "utf8");

test("shared portal drawer has a translucent background and backdrop blur", () => {
  assert.match(source, /backgroundColor:\s*"rgb\(10 14 14 \/ 65%\)"/);
  assert.match(source, /backdropFilter:\s*"blur\(8px\)"/);
  assert.match(source, /WebkitBackdropFilter:\s*"blur\(8px\)"/);
});

test("drawer opacity is applied to its background, not its text or icons", () => {
  const drawer = source.match(/<aside[\s\S]*?className="([^"]+)"[\s\S]*?style=\{\{/);
  assert.ok(drawer, "shared drawer aside should define its own style");
  assert.doesNotMatch(drawer[1], /(?:^|\s)opacity-/);
  assert.match(drawer[1], /fixed inset-y-0 left-0/);
  assert.match(drawer[1], /z-\[60\]/);
});
