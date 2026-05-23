import { state } from '../state';

export function parsePercentageMods(row) {
  const l = { ar: 0, ev: 0, es: 0 };
  const a = { ar: 0, ev: 0, es: 0 };

  // Explicit Mods
  row.querySelectorAll('.explicitMod .lc.s').forEach(el => {
    const text = el.textContent || "";
    const match = text.match(/(\d+)%/);
    if (match) {
      const pct = parseInt(match[1], 10) / 100;
      if (text.includes("増加する") || text.includes("increased")) {
        if (text.includes("アーマー") || text.includes("Armor")) l.ar += pct;
        if (text.includes("回避力") || text.includes("Evasion")) l.ev += pct;
        if (text.includes("エナジーシールド") || text.includes("Energy Shield")) l.es += pct;
      }
    }
  });

  // Rune Mods
  row.querySelectorAll('.runeMod .lc.s').forEach(el => {
    const text = el.textContent || "";
    const match = text.match(/(\d+)%/);
    if (match) {
      const pct = parseInt(match[1], 10) / 100;
      if (text.includes("増加する") || text.includes("increased")) {
        if (text.includes("アーマー") || text.includes("Armor")) a.ar += pct;
        if (text.includes("回避力") || text.includes("Evasion")) a.ev += pct;
        if (text.includes("エナジーシールド") || text.includes("Energy Shield")) a.es += pct;
      }
    }
  });

  return { l, a };
}

export function applyRuneExcludedDefenseToRow(row) {
  row.querySelectorAll('.rune-excluded-val').forEach(el => el.remove());

  if (!state.showRuneExcludedDefense) {
    return;
  }

  const { l, a } = parsePercentageMods(row);

  if (a.ar === 0 && a.ev === 0 && a.es === 0) {
    return;
  }

  const additionalContainer = row.querySelector('.itemPopupAdditional.q');

  ['ar', 'ev', 'es'].forEach(type => {
    let V = null;
    let hasQualityMaxStat = false;
    if (additionalContainer) {
      const maxEl = additionalContainer.querySelector(`[data-field="${type}"] .colourDefault, [data-field="${type}"] .colourAugmented`);
      if (maxEl && maxEl.textContent.trim() !== '') {
        V = parseInt(maxEl.textContent.replace(/[^0-9]/g, '').trim(), 10);
        if (!isNaN(V) && V > 0) {
          const title = maxEl.getAttribute('title') || '';
          if (title.includes('品質最大') || title.includes('Max Quality') || title.toLowerCase().includes('max quality')) {
            hasQualityMaxStat = true;
          }
        }
      }
    }

    if (V === null || isNaN(V) || V <= 0) {
      const propEl = row.querySelector(`.property [data-field="${type}"]`);
      if (propEl) {
        const valEl = propEl.querySelector('.colourAugmented, .colourDefault');
        if (valEl) {
          V = parseInt(valEl.textContent.replace(/[^0-9]/g, '').trim(), 10);
        }
      }
    }

    if (V !== null && !isNaN(V) && V > 0 && a[type] > 0) {
      const formulaVal = Math.round(V * (1 + l[type]) / (1 + l[type] + a[type]));
      
      const propEl = row.querySelector(`.property [data-field="${type}"]`);
      if (propEl) {
        const valEl = propEl.querySelector('.colourAugmented, .colourDefault');
        if (valEl) {
          if (!propEl.querySelector('.rune-excluded-val')) {
            const labelText = hasQualityMaxStat ? `ルーンなし+品質最大時: ${formulaVal}` : `ルーンを外した場合: ${formulaVal}`;
            valEl.insertAdjacentHTML('afterend', `<span class="rune-excluded-val"> (${labelText})</span>`);
          }
        }
      }
    }
  });
}

export function applyRuneExcludedDefenseToAll() {
  const rows = document.querySelectorAll('.resultset .row');
  rows.forEach(row => {
    applyRuneExcludedDefenseToRow(row);
  });
}
