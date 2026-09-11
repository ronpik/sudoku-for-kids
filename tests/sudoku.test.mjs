import test from 'node:test';
import assert from 'node:assert/strict';
import { getConfig, unitsFor, generatePuzzle, findConflicts, countSolutions, isComplete, peersOf } from '../dist/sudoku.js';
function random(seed) { return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }; }
// Independent reference solver deliberately does not reuse the production solver.
function referenceCount(input, size, limit = 2) {
  const board = input.slice(), { boxRows, boxCols } = getConfig(size);
  let count = 0;
  function allowed(index, value) {
    const row = Math.floor(index / size), col = index % size;
    for (let n = 0; n < size; n++) if (board[row * size + n] === value || board[n * size + col] === value) return false;
    const br = row - row % boxRows, bc = col - col % boxCols;
    for (let r = br; r < br + boxRows; r++) for (let c = bc; c < bc + boxCols; c++) if (board[r * size + c] === value) return false;
    return true;
  }
  function visit() {
    if (count >= limit) return;
    let chosen = -1, candidates = [];
    for (let i = 0; i < board.length; i++) if (!board[i]) {
      const options = Array.from({ length: size }, (_, n) => n + 1).filter(n => allowed(i, n));
      if (!options.length) return;
      if (chosen < 0 || options.length < candidates.length) { chosen = i; candidates = options; }
    }
    if (chosen < 0) { count++; return; }
    for (const n of candidates) { board[chosen] = n; visit(); board[chosen] = 0; if (count >= limit) return; }
  }
  visit(); return count;
}
for (const size of [4, 6, 9]) {
  test(`${size}×${size}: 16 seeded puzzles have valid clues and exactly one independently verified solution`, () => {
    const seen = new Set();
    for (let seed = 1; seed <= 16; seed++) {
      const puzzle = generatePuzzle(size, { random: random(seed) });
      assert.ok(isComplete(puzzle.solution, size));
      assert.equal(findConflicts(puzzle.givens, size).cells.size, 0);
      puzzle.givens.forEach((value, i) => { if (value) assert.equal(value, puzzle.solution[i]); });
      assert.ok(puzzle.givens.some(n => !n));
      assert.equal(referenceCount(puzzle.givens, size), 1);
      const counted = countSolutions(puzzle.givens, size);
      assert.equal(counted.count, 1); assert.equal(counted.exhausted, false);
      assert.equal(isComplete(puzzle.givens, size), false);
      seen.add(puzzle.givens.join(''));
    }
    assert.ok(seen.size > 12, 'Generation should produce varied boards.');
  });
  test(`${size}×${size}: all units contain size cells and each cell belongs to 3 units`, () => {
    const units = unitsFor(size);
    assert.equal(units.length, size * 3);
    units.forEach(unit => assert.equal(new Set(unit.cells).size, size));
    for (let i = 0; i < size * size; i++) assert.equal(units.filter(u => u.cells.includes(i)).length, 3);
  });
  test(`${size}×${size}: exhausted generation restores attempted removal`, () => {
    for (const options of [{ maxNodes: 0 }, { budgetMs: 0 }]) {
      const puzzle = generatePuzzle(size, { ...options, random: random(1) });
      assert.equal(puzzle.givens.filter(n => !n).length, 1);
      assert.equal(referenceCount(puzzle.givens, size), 1);
    }
  });
}
for (const [name, indexes, types] of [
  ['row only', [0, 3], ['row']],
  ['column only', [0, 12], ['column']],
  ['box only', [0, 7], ['box']],
  ['triple row duplicate', [0, 3, 5], ['row', 'box']],
  ['overlapping constraints', [0, 1, 6], ['row', 'column', 'box']]
]) test(`6×6: highlights all and only ${name} participants`, () => {
  const board = Array(36).fill(0);
  indexes.forEach(i => { board[i] = 2; });
  board[35] = 6;
  const conflicts = findConflicts(board, 6);
  assert.deepEqual([...conflicts.cells].sort((a,b) => a-b), indexes.slice().sort((a,b) => a-b));
  assert.deepEqual(new Set(conflicts.groups.map(g => g.type)), new Set(types));
});
test('erasing a duplicate clears all its conflict marks and never mutates the input', () => {
  const board = Array(16).fill(0); board[0] = board[3] = 1;
  const before = board.slice(); findConflicts(board, 4); assert.deepEqual(board, before);
  board[3] = 0; assert.equal(findConflicts(board, 4).cells.size, 0);
});
test('locally legal entries are not compared with a stored solution', () => {
  const board = Array(16).fill(0); board[0] = 2; board[6] = 3;
  assert.equal(findConflicts(board, 4).cells.size, 0);
});
test('completion rejects full illegal board, solver rejects contradictory givens', () => {
  const board = generatePuzzle(4).solution; board[0] = board[1];
  assert.equal(isComplete(board, 4), false);
  assert.equal(countSolutions(board, 4).count, 0);
});
test('counting distinguishes multiple solutions and interrupted searches', () => {
  const empty = Array(16).fill(0);
  assert.equal(countSolutions(empty, 4).count, 2);
  assert.equal(countSolutions(empty, 4, { maxNodes: 0 }).exhausted, true);
});
test('reject unsupported dimensions and values outside the domain', () => {
  assert.throws(() => getConfig(5), RangeError);
  assert.throws(() => findConflicts([1, 2], 4), TypeError);
  for (const invalid of [5, -1, NaN, 1.5, '1', undefined]) {
    const board = Array(16).fill(0); board[0] = invalid;
    assert.throws(() => findConflicts(board, 4), TypeError);
  }
});
test('6×6 peer set uses 2-row × 3-column boxes', () => {
  const peers = peersOf(0, 6);
  assert.ok(peers.has(8)); assert.ok(!peers.has(14)); assert.ok(!peers.has(0));
});
