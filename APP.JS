// NAMECOMM core logic

export function setupApp() {
  const elMin = document.getElementById('min');
  const elMax = document.getElementById('max');
  const elDur = document.getElementById('duration');
  const elDurLabel = document.getElementById('durLabel');
  const elMix = document.getElementById('mixEntropy');
  const display = document.getElementById('display');
  const bar = document.getElementById('bar');
  const status = document.getElementById('status');
  const btnDraw = document.getElementById('btnDraw');
  const btnAbort = document.getElementById('btnAbort');
  const btnCopy = document.getElementById('btnCopy');
  const btnExport = document.getElementById('btnExport');
  const btnClear = document.getElementById('btnClear');
  const tbody = document.querySelector('#logTable tbody');

  // ——— Entropy collector (conservative estimate)
  const pool = [];
  let estBits = 0;
  const entropyView = document.getElementById('entropyScore');
  let lastT = performance.now();

  function recordEvent() {
    const now = performance.now();
    const dt = now - lastT;
    lastT = now;
    const b = (dt * 1000) & 0xff; // quantized timing
    pool.push(b);
    estBits = Math.min(64, estBits + 0.25); // conservative
    entropyView.textContent = `entropy: ${estBits.toFixed(2)} bits`;
  }
  ['mousemove','keydown','click','touchstart'].forEach(t =>
    window.addEventListener(t, recordEvent, { passive: true })
  );
  function pullEntropyBytes(count=4) {
    if (!pool.length) return new Uint8Array(0);
    const out = new Uint8Array(count);
    for (let i=0;i<count;i++) out[i] = pool[(pool.length-1-i) >>> 0] ?? 0;
    return out;
  }

  // ——— Unbiased int in [min, max] using rejection sampling
  function csprngInt(min, max, extra = new Uint8Array(0)) {
    if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) {
      throw new Error('Invalid range');
    }
    const span = (max - min + 1) >>> 0;
    if (span === 0) return min;

    const max32 = 0xFFFFFFFF;
    const limit = Math.floor((max32 + 1) / span) * span - 1;

    const buf = new Uint8Array(4);
    let x;
    do {
      crypto.getRandomValues(buf);
      if (extra.length) {
        for (let i=0;i<4 && i<extra.length;i++) buf[i] ^= extra[i];
      }
      x = (buf[0] << 24 >>> 0) | (buf[1] << 16) | (buf[2] << 8) | buf[3];
    } while (x > limit);
    return min + (x % span);
  }

  // ——— UI
  elDur.addEventListener('input', () => { elDurLabel.textContent = elDur.value; });

  let raf = 0, aborting = false;

  function startShuffle() {
    const min = Number(elMin.value), max = Number(elMax.value);
    if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) {
      status.innerHTML = '<span class="warn">Invalid range.</span>'; return;
    }
    const seconds = Number(elDur.value);
    const t0 = performance.now();
    aborting = false;
    btnDraw.disabled = true; btnAbort.disabled = false;
    status.textContent = 'Shuffling…';

    const tick = () => {
      const p = Math.min(1, (performance.now() - t0) / (seconds * 1000));
      bar.style.width = `${(p*100).toFixed(1)}%`;
      display.textContent = String(csprngInt(min, max));
      if (!aborting && p < 1) { raf = requestAnimationFrame(tick); }
      else { finalize(min, max); }
    };
    raf = requestAnimationFrame(tick);
  }

  function finalize(min, max) {
    cancelAnimationFrame(raf);
    btnAbort.disabled = true;
    const extra = elMix.checked ? pullEntropyBytes(4) : new Uint8Array(0);
    const result = csprngInt(min, max, extra);
    display.textContent = String(result);
    status.textContent = 'Locked.';
    bar.style.width = '100%';
    btnDraw.disabled = false;

    const tr = document.createElement('tr');
    const ts = new Date().toISOString().replace('T',' ').replace('Z',' UTC');
    tr.innerHTML = `<td>${tbody.children.length + 1}</td>
                    <td><strong>${result}</strong></td>
                    <td>[${min}, ${max}]</td>
                    <td>${elMix.checked ? estBits.toFixed(2)+' bits' : '—'}</td>
                    <td>${ts}</td>`;
    tbody.prepend(tr);
  }

  btnDraw.addEventListener('click', startShuffle);
  btnAbort.addEventListener('click', () => {
    aborting = true; cancelAnimationFrame(raf);
    btnAbort.disabled = true; btnDraw.disabled = false;
    status.textContent = 'Aborted.';
  });
  btnCopy.addEventListener('click', async () => {
    await navigator.clipboard.writeText(display.textContent || '');
    status.textContent = 'Result copied to clipboard.';
  });
  btnExport.addEventListener('click', () => {
    const rows = [...tbody.querySelectorAll('tr')].reverse()
      .map(tr => [...tr.children].map(td => `"${td.textContent.replace(/"/g,'""')}"`).join(','));
    const csv = ['index,result,range,entropy,time'].concat(rows).join('\n');
    const blob = new Blob([csv], { type:'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'namecomm-results.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  });
  btnClear.addEventListener('click', () => { tbody.innerHTML = ''; });
}
