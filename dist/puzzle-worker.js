import { generatePuzzle } from './sudoku.js';
self.onmessage = ({ data }) => {
  try { self.postMessage({ id: data.id, puzzle: generatePuzzle(data.size) }); }
  catch (error) { self.postMessage({ id: data.id, error: error.message }); }
};
