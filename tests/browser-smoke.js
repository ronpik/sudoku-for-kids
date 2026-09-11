(async () => {
  const results = [], q = s => document.querySelector(s), all = s => [...document.querySelectorAll(s)];
  const assert = (ok, message) => { if (!ok) throw Error(message); };
  const click = s => { const el = q(s); assert(el, `Missing ${s}`); el.click(); };
  const wait = async fn => { const until = performance.now() + 4000; while (!fn()) { if (performance.now() > until) throw Error('Timed out waiting for UI'); await new Promise(r => setTimeout(r, 15)); } };
  const values = () => all('.cell').map(c => Number(c.textContent) || 0);
  const size = () => Number(q('#board').dataset.size);
  const conflicts = () => all('.cell.conflict').map(c => Number(c.dataset.index)).sort((a,b) => a-b);
  const expectedConflicts = board => {
    const n = Math.sqrt(board.length), br = n === 9 ? 3 : 2, bc = n === 4 ? 2 : 3, result = new Set();
    for(let i=0;i<board.length;i++) for(let j=i+1;j<board.length;j++) {
      if(!board[i] || board[i]!==board[j]) continue;
      const r=Math.floor(i/n),c=i%n,rr=Math.floor(j/n),cc=j%n;
      if(r===rr || c===cc || (Math.floor(r/br)===Math.floor(rr/br) && Math.floor(c/bc)===Math.floor(cc/bc))) {result.add(i);result.add(j);}
    }
    return [...result].sort((a,b)=>a-b);
  };
  const solve = (board,n) => {
    const i=board.indexOf(0); if(i<0) return board;
    for(let v=1;v<=n;v++) { const next=board.slice();next[i]=v; if(!expectedConflicts(next).length) {const solved=solve(next,n);if(solved) return solved;} }
    return null;
  };
  await wait(()=>q('#board').getAttribute('aria-busy')==='false');
  click('#help-button'); assert(q('#help-dialog').open,'Help opens');
  assert(q('#help-dialog .dialog-close').children.length===1,'Close button contains only icon');
  click('#help-title'); assert(q('#help-dialog').open,'Clicking help text does not close dialog');
  click('#help-dialog .primary-button'); assert(!q('#help-dialog').open,'Help closes'); results.push('help content and close');
  for(const n of [4,6,9]) {
    if(size()!==n) {click(`.size-picker [data-size="${n}"]`); await wait(()=>size()===n && q('#board').getAttribute('aria-busy')==='false');}
    assert(all('.cell').length===n*n,`${n} grid dimensions`);
    assert(all('#number-pad button').length===n,`${n} keypad dimensions`);
    assert(!q('#undo-button').disabled===false,`${n} initial undo`);
    const initial=values(), empty=initial.indexOf(0), given=initial.findIndex(Boolean);
    // Focus alone must select before any click, as with Tab keyboard navigation.
    q(`.cell[data-index="${empty}"]`).focus();
    assert(q('.cell[aria-selected="true"]').dataset.index===String(empty),'Focused cell is selected');
    const r=Math.floor(empty/n);
    let dup=initial.slice(r*n,(r+1)*n).find(Boolean);
    if(!dup) dup=initial[given];
    click(`[data-number="${dup}"]`);
    assert(values()[empty]===dup,'Number pad fills selected square');
    assert(JSON.stringify(conflicts())===JSON.stringify(expectedConflicts(values())),`${n} exact duplicate set`);
    assert(conflicts().length>=2,`${n} repeated cells visibly flagged`);
    click('#hints-toggle'); assert(!conflicts().length,'Toggle hides conflicts');
    click('#hints-toggle'); assert(conflicts().length>=2,'Toggle restores conflicts');
    const edited=values(); click(`.cell[data-index="${given}"]`);click('[data-number="1"]');
    assert(JSON.stringify(values())===JSON.stringify(edited),'Fixed clue immutable');
    click(`.cell[data-index="${empty}"]`);click('#erase-button'); assert(values()[empty]===0 && !conflicts().length,'Erase clears marks');
    click('#undo-button');assert(values()[empty]===dup,'Undo restores erased number');
    click('#undo-button');assert(JSON.stringify(values())===JSON.stringify(initial),'Undo restores initial board');
    assert(q('#undo-button').disabled,'Undo exhausted');
    click(`.cell[data-index="${empty}"]`);click(`[data-number="${dup}"]`);
    const before=values();click('#new-button');assert(q('#confirm-dialog').open,'Confirm before losing moves');
    click('#keep-button');assert(JSON.stringify(values())===JSON.stringify(before),'Cancel preserves puzzle');
    click('#undo-button');
    const solution=solve(initial,n);assert(solution,'Independent solver finds solution');
    // Fully filled but invalid cannot win, even with Friendly hints disabled.
    click('#hints-toggle');
    initial.forEach((v,i)=>{if(!v){click(`.cell[data-index="${i}"]`);click('[data-number="1"]');}});
    assert(!q('#win-dialog').open && !q('#board').classList.contains('solved'),'Full invalid board cannot win');
    assert(!conflicts().length,'Hints off stays off on full invalid board');
    initial.forEach((v,i)=>{if(!v){click(`.cell[data-index="${i}"]`);click(`[data-number="${solution[i]}"]`);}});
    assert(q('#win-dialog').open && q('#board').classList.contains('solved'),`${n} valid solution celebrates with hints off`);
    click('#win-dialog [data-close]');assert(!q('#win-dialog').open,'Finished board can be admired');
    click('#undo-button');assert(!q('#board').classList.contains('solved'),'Undo reopens solved puzzle');
    click('#hints-toggle');
    click('#new-button');assert(q('#confirm-dialog').open,'Unsolved changes require confirmation');
    click('#confirm-button');await wait(()=>q('#board').getAttribute('aria-busy')==='false');
    assert(q('#undo-button').disabled && !q('#win-dialog').open,'New puzzle resets history and completion');
    assert(!document.documentElement.scrollWidth || document.documentElement.scrollWidth<=innerWidth,`${n} no horizontal overflow`);
    results.push(`${n}×${n}: entry, focus, exact hints, toggle, clues, erase/undo, cancel/new, invalid-full rejection, solve`);
  }
  click('.size-picker [data-size="4"]');await wait(()=>size()===4 && q('#board').getAttribute('aria-busy')==='false');
  return {passed:results,viewport:[innerWidth,innerHeight],webmcpSupported:!!document.modelContext};
})()
