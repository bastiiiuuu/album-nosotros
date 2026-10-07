export const JOURNEY_KEY = 'album-nosotros.ocean-journey.v1';
export const phraseParts = ['Entre', 'tantas corrientes,', 'volvería', 'a', 'encontrarte.'];
export const awakenings = ['Los corales despiertan', 'La vida encuentra su corriente', 'Florece nuestro pequeño mundo', 'La luz une los recuerdos', 'Dos caminos, un mismo encuentro'];

export function createJourney(storage, total = 5) {
  let visited = new Set(), finaleSeen = false, persistent = true;
  try {
    const saved = JSON.parse(storage?.getItem(JOURNEY_KEY) || 'null');
    if (saved?.version === 1 && Array.isArray(saved.visited)) {
      visited = new Set(saved.visited.filter(i => Number.isInteger(i) && i >= 0 && i < total));
      finaleSeen = saved.finaleSeen === true && visited.size === total;
    }
    if (!storage) persistent = false;
  } catch { persistent = false; }
  function save() {
    try {
      if (!storage) throw new Error('Storage unavailable');
      storage.setItem(JOURNEY_KEY, JSON.stringify({version:1, visited:[...visited].sort((a,b)=>a-b), finaleSeen}));
      persistent = true;
    } catch { persistent = false; }
  }
  return {
    snapshot: () => ({visited:[...visited], count:visited.size, complete:visited.size===total, finaleSeen, persistent}),
    visit(index) {
      if (!Number.isInteger(index) || index<0 || index>=total || visited.has(index)) return false;
      visited.add(index); save(); return true;
    },
    next(after = -1) {
      for(let step=1;step<=total;step++){const index=(after+step+total)%total;if(!visited.has(index))return index;}
      return -1;
    },
    finish() { if(visited.size!==total)return false;finaleSeen=true;save();return true; },
    reset() { visited.clear();finaleSeen=false;save(); }
  };
}
