/** Pure Sudoku rules and generation. Flat boards use zero for empty. */
export function getConfig(size) {
  if (![4, 6, 9].includes(size)) throw new RangeError('Puzzle size must be 4, 6, or 9.');
  return { size, boxRows: size === 9 ? 3 : 2, boxCols: size === 4 ? 2 : 3 };
}
function checkBoard(board, size) {
  getConfig(size);
  if (!Array.isArray(board) || board.length !== size * size || board.some(n => !Number.isInteger(n) || n < 0 || n > size)) throw new TypeError('Board must contain size × size integers from zero to size.');
}
export function unitsFor(size) {
  const { boxRows, boxCols } = getConfig(size), units = [];
  for (let n = 0; n < size; n++) {
    units.push({ type: 'row', index: n, cells: Array.from({ length: size }, (_, c) => n * size + c) });
    units.push({ type: 'column', index: n, cells: Array.from({ length: size }, (_, r) => r * size + n) });
  }
  for (let r = 0; r < size; r += boxRows) for (let c = 0; c < size; c += boxCols) {
    const cells = [];
    for (let dr = 0; dr < boxRows; dr++) for (let dc = 0; dc < boxCols; dc++) cells.push((r + dr) * size + c + dc);
    units.push({ type: 'box', index: (r / boxRows) * (size / boxCols) + c / boxCols, cells });
  }
  return units;
}
export function findConflicts(board, size) {
  checkBoard(board, size);
  const cells = new Set(), groups = [];
  for (const unit of unitsFor(size)) for (let value = 1; value <= size; value++) {
    const matches = unit.cells.filter(index => board[index] === value);
    if (matches.length > 1) { matches.forEach(index => cells.add(index)); groups.push({ type: unit.type, index: unit.index, value, cells: matches }); }
  }
  return { cells, groups };
}
export function isComplete(board, size) {
  checkBoard(board, size);
  return board.every(Boolean) && findConflicts(board, size).cells.size === 0;
}
export function peersOf(index, size) {
  const peers = new Set();
  for (const unit of unitsFor(size)) if (unit.cells.includes(index)) unit.cells.forEach(i => { if (i !== index) peers.add(i); });
  return peers;
}
/** Cut off at two solutions. Exhaustion is never treated as uniqueness. */
export function countSolutions(board, size, { maxNodes = 100000, deadline = Infinity } = {}) {
  checkBoard(board, size);
  const { boxRows, boxCols } = getConfig(size), values = board.slice();
  const rowMasks = Array(size).fill(0), colMasks = Array(size).fill(0), boxMasks = Array(size).fill(0), full = (1 << size) - 1;
  const boxOf = (r, c) => Math.floor(r / boxRows) * (size / boxCols) + Math.floor(c / boxCols);
  for (let i = 0; i < values.length; i++) {
    if (!values[i]) continue;
    const r = Math.floor(i / size), c = i % size, b = boxOf(r, c), bit = 1 << (values[i] - 1);
    if ((rowMasks[r] | colMasks[c] | boxMasks[b]) & bit) return { count: 0, exhausted: false, nodes: 0 };
    rowMasks[r] |= bit; colMasks[c] |= bit; boxMasks[b] |= bit;
  }
  let count = 0, nodes = 0, exhausted = false;
  function visit() {
    if (count >= 2 || exhausted) return;
    if (++nodes > maxNodes || performance.now() >= deadline) { exhausted = true; return; }
    let chosen = -1, allowed = 0, least = size + 1;
    for (let i = 0; i < values.length; i++) {
      if (values[i]) continue;
      const r = Math.floor(i / size), c = i % size, mask = full & ~(rowMasks[r] | colMasks[c] | boxMasks[boxOf(r, c)]);
      if (!mask) return;
      let n = 0;
      for (let bits = mask; bits; bits &= bits - 1) n++;
      if (n < least) { chosen = i; allowed = mask; least = n; if (n === 1) break; }
    }
    if (chosen === -1) { count++; return; }
    const r = Math.floor(chosen / size), c = chosen % size, b = boxOf(r, c);
    while (allowed && count < 2 && !exhausted) {
      const bit = allowed & -allowed; allowed ^= bit;
      values[chosen] = Math.log2(bit) + 1; rowMasks[r] |= bit; colMasks[c] |= bit; boxMasks[b] |= bit;
      visit();
      values[chosen] = 0; rowMasks[r] ^= bit; colMasks[c] ^= bit; boxMasks[b] ^= bit;
    }
  }
  visit(); return { count, exhausted, nodes };
}
function shuffled(items, random) {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; }
  return result;
}
export function generatePuzzle(size, { random = Math.random, budgetMs = 180, maxNodes = 20000 } = {}) {
  const { boxRows, boxCols } = getConfig(size), sequence = n => Array.from({ length: n }, (_, i) => i);
  const rows = shuffled(sequence(size / boxRows), random).flatMap(b => shuffled(sequence(boxRows), random).map(r => b * boxRows + r));
  const cols = shuffled(sequence(size / boxCols), random).flatMap(s => shuffled(sequence(boxCols), random).map(c => s * boxCols + c));
  const symbols = shuffled(sequence(size).map(n => n + 1), random);
  const solution = rows.flatMap(r => cols.map(c => symbols[(boxCols * (r % boxRows) + Math.floor(r / boxRows) + c) % size]));
  const givens = solution.slice(), target = { 4: 8, 6: 18, 9: 39 }[size], deadline = performance.now() + budgetMs;
  let clues = size * size;
  // A single removed cell in a full valid board is always unique, even if
  // the subsequent verification budget is exhausted before another removal.
  const removalOrder = shuffled(sequence(size * size), random);
  givens[removalOrder.shift()] = 0; clues--;
  for (const index of removalOrder) {
    if (clues <= target || performance.now() >= deadline) break;
    const value = givens[index]; givens[index] = 0;
    const result = countSolutions(givens, size, { maxNodes, deadline });
    if (!result.exhausted && result.count === 1) clues--; else givens[index] = value;
    if (result.exhausted) break;
  }
  return { size, boxRows, boxCols, givens, solution };
}
