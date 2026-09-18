import assert from 'node:assert/strict';

// Sandbox-only OT entry correction. No regulation constants or RNG changes.
export function patchOtEntry(source) {
  const before = 'g.scores.OT = [0, 0]; g.breakSeconds = 180; g.breakLabel = "OT setup";';
  assert.equal(source.split(before).length, 2, 'OT entry patch anchor changed');
  return source.replace(before, 'g.scores.OT = [0, 0]; g.breakSeconds = 600; g.breakLabel = "OT setup";');
}
