import assert from "node:assert/strict";
import { safeNextPath } from "@/lib/auth-navigation";

assert.equal(safeNextPath("/x/share-id?mode=read"), "/x/share-id?mode=read");
assert.equal(safeNextPath("https://evil.example/steal"), "/app");
assert.equal(safeNextPath("//evil.example/steal"), "/app");
assert.equal(safeNextPath("/\\evil.example"), "/app");
assert.equal(safeNextPath(undefined, "/"), "/");
console.log("Safe internal authentication redirects passed.");
