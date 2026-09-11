import { generatePuzzle, findConflicts, getConfig, isComplete, peersOf } from './sudoku.js';

const $ = selector => document.querySelector(selector);
const boardElement = $('#board');
const state = { size: 4, givens: [], values: [], selected: null, history: [], hints: true, busy: false, won: false };
let cells = [], numberButtons = [], pendingSize = 4;
const dialogFocus = new WeakMap();
const labels = { 4: 'The mini puzzle', 6: 'Room to grow', 9: 'The classic puzzle' };

function setFeedback(message, kind = '') {
  const feedback = $('#feedback');
  feedback.className = 'feedback' + (kind ? ` ${kind}` : '');
  feedback.replaceChildren();
  if (kind) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'icon'); svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', kind === 'error' ? '#i-warning' : '#i-check');
    svg.append(use); feedback.append(svg);
  }
  const text = document.createElement('span'); text.textContent = message; feedback.append(text);
}

function renderBoard() {
  const { size } = state, { boxRows, boxCols } = getConfig(size);
  boardElement.style.setProperty('--size', size);
  boardElement.dataset.size = size;
  boardElement.setAttribute('aria-label', `${size} by ${size} Sudoku puzzle; ${boxRows} by ${boxCols} boxes`);
  boardElement.setAttribute('aria-rowcount', size); boardElement.setAttribute('aria-colcount', size);
  boardElement.replaceChildren(); cells = [];
  for (let row = 0; row < size; row++) {
    const line = document.createElement('div'); line.className = 'board-row'; line.setAttribute('role', 'row');
    line.setAttribute('aria-rowindex', row + 1);
    for (let col = 0; col < size; col++) {
      const index = row * size + col, cell = document.createElement('button');
      cell.className = 'cell'; cell.type = 'button'; cell.dataset.index = index;
      cell.setAttribute('role', 'gridcell'); cell.setAttribute('aria-colindex', col + 1);
      if ((col + 1) % boxCols === 0) cell.classList.add('box-right');
      if ((row + 1) % boxRows === 0) cell.classList.add('box-bottom');
      if (col === size - 1) cell.classList.add('edge-right');
      if (row === size - 1) cell.classList.add('edge-bottom');
      cell.addEventListener('click', () => selectCell(index));
      cell.addEventListener('focus', () => { if (state.selected !== index) selectCell(index, false); });
      line.append(cell); cells.push(cell);
    }
    boardElement.append(line);
  }
  const pad = $('#number-pad'); pad.replaceChildren(); numberButtons = [];
  pad.style.setProperty('--pad-columns', size === 4 ? 4 : 3);
  pad.classList.toggle('nine', size === 9);
  for (let value = 1; value <= size; value++) {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = value;
    button.dataset.number = value; button.setAttribute('aria-label', `Enter ${value}`);
    button.addEventListener('click', () => enterNumber(value)); pad.append(button); numberButtons.push(button);
  }
  $('#size-label').textContent = labels[size]; $('#range-label').textContent = `Numbers 1–${size}`;
  document.querySelectorAll('.size-picker button').forEach(button => button.setAttribute('aria-pressed', Number(button.dataset.size) === size));
  update();
}

function update(customMessage) {
  const { size, values, givens, selected, hints } = state;
  const conflicts = findConflicts(values, size);
  const peers = selected === null ? new Set() : peersOf(selected, size);
  const selectedValue = selected === null ? 0 : values[selected];
  const firstEmpty = values.findIndex((value, index) => !value && !givens[index]);
  const focusIndex = selected ?? (firstEmpty < 0 ? 0 : firstEmpty);
  cells.forEach((cell, index) => {
    const conflict = hints && conflicts.cells.has(index);
    cell.textContent = values[index] || '';
    cell.classList.toggle('given', !!givens[index]);
    cell.classList.toggle('selected', selected === index);
    cell.classList.toggle('peer', peers.has(index));
    cell.classList.toggle('same', !!selectedValue && values[index] === selectedValue && index !== selected);
    cell.classList.toggle('conflict', conflict);
    cell.setAttribute('aria-selected', index === selected);
    cell.setAttribute('aria-readonly', !!givens[index]);
    cell.setAttribute('aria-invalid', conflict);
    cell.setAttribute('aria-label', `Row ${Math.floor(index / size) + 1}, column ${index % size + 1}, ${values[index] || 'empty'}${givens[index] ? ', fixed clue' : ''}${conflict ? ', repeated number' : ''}`);
    cell.tabIndex = index === focusIndex ? 0 : -1;
  });
  numberButtons.forEach((button, index) => button.classList.toggle('active-number', selectedValue === index + 1));
  const total = givens.filter(n => !n).length;
  const filled = values.filter((n, index) => n && !givens[index]).length;
  $('#progress-label').textContent = `${filled} of ${total} filled`;
  $('#progress-fill').style.width = `${filled / total * 100}%`;
  const progress = $('.progress-track'); progress.setAttribute('aria-valuemax', total); progress.setAttribute('aria-valuenow', filled);
  $('#undo-button').disabled = !state.history.length || state.busy;
  $('#erase-button').disabled = selected === null || !!givens[selected] || !values[selected] || state.busy;
  const tip = $('#board-tip span');
  if (selected === null) tip.textContent = 'Tap an empty square to begin.';
  else if (givens[selected]) tip.textContent = 'This is a clue. Try an empty square.';
  else tip.textContent = `Row ${Math.floor(selected / size) + 1}, column ${selected % size + 1} · Choose a number below.`;
  $('#input-help').textContent = selected === null ? 'Select a square, then choose below.' : givens[selected] ? 'Clue numbers stay put. Pick an empty square.' : 'Which number fits this square?';
  const complete = isComplete(values, size);
  boardElement.classList.toggle('solved', complete);
  if (complete) setFeedback('Every number has its place. You solved it!', 'success');
  else if (hints && conflicts.groups.length) {
    const group = conflicts.groups.find(group => group.cells.includes(selected)) || conflicts.groups[0];
    const where = group.type === 'box' ? 'an outlined box' : `${group.type} ${group.index + 1}`;
    setFeedback(`${group.value} appears more than once in ${where}. Check the red squares — each number needs its own place.`, 'error');
  } else if (filled === total) setFeedback('All squares are filled, but a number repeats. Check each row, column, and box, or turn on Friendly hints.');
  else if (customMessage) setFeedback(customMessage);
  else if (!hints) setFeedback('Hints are off. Take your time and check each row, column, and box.');
  else if (filled) setFeedback('Keep exploring. Each number belongs once in every row, column, and box.');
  else setFeedback('Every puzzle starts with one square.');
  if (complete && !state.won) { state.won = true; openDialog($('#win-dialog')); }
  if (!complete) state.won = false;
}

function selectCell(index, focus = true) {
  if (state.busy || !Number.isInteger(index) || index < 0 || index >= cells.length) return;
  state.selected = index; update();
  if (focus) cells[index].focus({ preventScroll: true });
}
function enterNumber(value) {
  if (state.busy) return false;
  if (!Number.isInteger(value) || value < 0 || value > state.size) throw new RangeError('Number is outside this puzzle.');
  const index = state.selected;
  if (index === null) { setFeedback('First, tap an empty square on the puzzle.'); return false; }
  if (state.givens[index]) { setFeedback('This number is a clue, so it stays put. Choose an empty square.'); return false; }
  if (state.values[index] === value) return true;
  state.history.push({ index, before: state.values[index] }); state.values[index] = value; update();
  return true;
}
function undo() {
  if (state.busy || !state.history.length) return;
  const move = state.history.pop(); state.values[move.index] = move.before;
  state.selected = move.index; update('One step back. You can try another number.');
}
function openDialog(dialog) { dialogFocus.set(dialog, document.activeElement); dialog.showModal(); }
function closeDialog(dialog) { dialog.close(); }
function requestNewPuzzle(size) {
  if (state.busy) return;
  pendingSize = size;
  const hasMoves = state.values.some((n, i) => n !== state.givens[i]);
  if (hasMoves && !state.won) {
    $('#confirm-title').textContent = size === state.size ? 'Start a new puzzle?' : `Try a ${size} × ${size} puzzle?`;
    openDialog($('#confirm-dialog'));
  } else startPuzzle(size);
}
function makePuzzle(size) {
  return new Promise(resolve => {
    let worker, timer, settled = false;
    const finish = puzzle => { if (settled) return; settled = true; clearTimeout(timer); worker?.terminate(); resolve(puzzle); };
    const fallback = () => { if (!settled) finish(generatePuzzle(size, { budgetMs: 35 })); };
    try {
      worker = new Worker(new URL('./puzzle-worker.js', import.meta.url), { type: 'module' });
      timer = setTimeout(fallback, 2500);
      worker.onmessage = ({ data }) => data.puzzle ? finish(data.puzzle) : fallback();
      worker.onerror = fallback; worker.postMessage({ id: 1, size });
    } catch { fallback(); }
  });
}
async function startPuzzle(size) {
  if (state.busy) return;
  getConfig(size); state.busy = true;
  const hadPuzzle = cells.length > 0;
  boardElement.setAttribute('aria-busy', 'true');
  document.querySelectorAll('.game-shell button').forEach(button => { button.disabled = true; });
  setFeedback('Finding a fresh little puzzle…');
  const puzzle = await makePuzzle(size);
  Object.assign(state, { size, givens: puzzle.givens, values: puzzle.givens.slice(), selected: null, history: [], won: false, busy: false });
  document.querySelectorAll('.game-shell button').forEach(button => { button.disabled = false; });
  boardElement.setAttribute('aria-busy', 'false'); renderBoard();
  if (hadPuzzle) cells.find(cell => cell.tabIndex === 0)?.focus({ preventScroll: true });
}

$('#undo-button').addEventListener('click', undo);
$('#erase-button').addEventListener('click', () => enterNumber(0));
$('#new-button').addEventListener('click', () => requestNewPuzzle(state.size));
document.querySelectorAll('.size-picker button').forEach(button => button.addEventListener('click', () => {
  const size = Number(button.dataset.size); if (size !== state.size) requestNewPuzzle(size);
}));
$('#hints-toggle').addEventListener('change', event => { state.hints = event.target.checked; if (!state.busy) update(); });
$('#help-button').addEventListener('click', () => openDialog($('#help-dialog')));
$('#rules-button').addEventListener('click', () => openDialog($('#help-dialog')));
$('#keep-button').addEventListener('click', () => closeDialog($('#confirm-dialog')));
$('#confirm-button').addEventListener('click', () => { closeDialog($('#confirm-dialog')); startPuzzle(pendingSize); });
$('#play-again-button').addEventListener('click', () => { closeDialog($('#win-dialog')); startPuzzle(state.size); });
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => closeDialog(button.closest('dialog'))));
document.querySelectorAll('dialog').forEach(dialog => {
  dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeDialog(dialog); } });
  dialog.addEventListener('close', () => { const target = dialogFocus.get(dialog); if (target?.isConnected) target.focus({ preventScroll: true }); });
});
document.querySelectorAll('.rule-grid').forEach(grid => { for (let i = 0; i < 16; i++) grid.append(document.createElement('i')); });

document.addEventListener('keydown', event => {
  if (state.busy || document.querySelector('dialog[open]')) return;
  const target = event.target;
  if (!(target === document.body || target.closest('.board, .number-pad, .edit-actions'))) return;
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && !event.shiftKey) { event.preventDefault(); undo(); return; }
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (/^[1-9]$/.test(event.key)) { event.preventDefault(); const n = Number(event.key); if (n <= state.size) enterNumber(n); return; }
  if (['Backspace', 'Delete', '0'].includes(event.key)) { event.preventDefault(); enterNumber(0); return; }
  if (event.key.startsWith('Arrow')) {
    event.preventDefault();
    if (state.selected === null) { selectCell(state.values.findIndex(n => !n)); return; }
    const row = Math.floor(state.selected / state.size), col = state.selected % state.size;
    const nextRow = Math.max(0, Math.min(state.size - 1, row + (event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0)));
    const nextCol = Math.max(0, Math.min(state.size - 1, col + (event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0)));
    selectCell(nextRow * state.size + nextCol);
  }
});

// Optional browser agent interface: the same actions and state as visible play.
function registerTools() {
  const context = document.modelContext;
  if (!context?.registerTool) return;
  const lifecycle = new AbortController();
  const tools = [
    { name: 'read_sudoku', description: 'Read the current Sudoku, fixed clues, selection, and hints setting.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: false }, execute() { return { size: state.size, values: state.values.slice(), givens: state.givens.slice(), selected: state.selected, hints: state.hints, busy: state.busy }; } },
    { name: 'enter_sudoku_number', description: 'Select a square and enter or erase a number. Rows and columns start at 1; zero erases. Fixed clues cannot change.', inputSchema: { type: 'object', properties: { row: { type: 'integer', minimum: 1, maximum: 9 }, column: { type: 'integer', minimum: 1, maximum: 9 }, value: { type: 'integer', minimum: 0, maximum: 9 } }, required: ['row', 'column', 'value'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute(input) {
      if (!input || typeof input !== 'object' || Object.keys(input).some(key => !['row', 'column', 'value'].includes(key))) throw new TypeError('Expected row, column, and value.');
      const { row, column, value } = input;
      if (state.busy || document.querySelector('dialog[open]')) throw new Error('Finish the current dialog or wait for the puzzle.');
      if (![row, column, value].every(Number.isInteger) || row < 1 || row > state.size || column < 1 || column > state.size || value < 0 || value > state.size) throw new RangeError('Position or value is outside this puzzle.');
      const index = (row - 1) * state.size + column - 1;
      if (state.givens[index]) throw new Error('This square is a fixed clue.');
      selectCell(index); enterNumber(value); return { row, column, value: state.values[index], complete: isComplete(state.values, state.size) };
    } }
  ];
  for (const tool of tools) {
    try { Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => {}); } catch { /* The game works without this optional API. */ }
  }
  window.addEventListener('pagehide', () => lifecycle.abort(), { once: true });
}
await startPuzzle(4);
registerTools();
