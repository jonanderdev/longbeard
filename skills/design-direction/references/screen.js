// The fixed part of every direction screen: the look from the URL, the faces
// loaded, the title set to "ready", and the live controls (only with ?controls).
// Copy it once beside the screens (screens/screen.js, prototype/screen.js); each
// page loads it after its own LOOK, PROVENANCE and CONTROLS. Never edit a copy.
// ---------------------------------------------------------------- controls: the measures (plain functions)
const Controls = {
  rgb: (hex) => { const h = hex.replace("#", ""); const f = h.length === 3 ? h.replace(/./g, "$&$&") : h; return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16)); },
  hex: (c) => "#" + c.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join(""),
  lum: (c) => { const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; },
  contrast(a, b) { const x = this.lum(this.rgb(a)), y = this.lum(this.rgb(b)); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); },
  // [least, most] of the numbers, or null when the board has no range (fewer than two values, or all alike).
  range(list) { const v = (Array.isArray(list) ? list : []).filter((n) => typeof n === "number" && isFinite(n)); if (v.length < 2) return null; const lo = Math.min(...v), hi = Math.max(...v); return hi > lo ? [lo, hi] : null; },
  // The board's range, widened to hold the screen's own value, so the screen can always come back to itself.
  span(range, own) { return [Math.min(range[0], own), Math.max(range[1], own)]; },
  // The accent's contrast against the ground, for each pair (ground, accent) the board has.
  accentRatios(pairs) { return (Array.isArray(pairs) ? pairs : []).filter((p) => Array.isArray(p) && p[0] && p[1]).map((p) => Math.round(10 * this.contrast(p[1], p[0])) / 10); },
  // The accent moved along the line from the ground through itself, to the contrast asked for.
  accentAt(ground, accent, target) {
    const g = this.rgb(ground), a = this.rgb(accent);
    let best = null;
    for (let t = 0; t <= 3.001; t += 0.01) {
      const hex = this.hex(g.map((v, i) => v + (a[i] - v) * t));
      const d = Math.abs(this.contrast(hex, ground) - target);
      if (!best || d < best.d - 1e-9) best = { d, hex };
    }
    return { hex: best.hex, ratio: Math.round(10 * this.contrast(best.hex, ground)) / 10 };
  },
  // What the person pastes back: only what moved, in the measures the board gives.
  copy(lines) { return lines.length ? ["Adjusted on this screen (own to chosen). Record in first.html's LOOK and CSS, not in the address:", ...lines].join("\n") : "Nothing moved: the screen as it was."; },
};
// ---------------------------------------------------------------- controls: the panel (only with ?controls, never in a capture)
function mountControls(look) {
  const set = (k, v) => document.documentElement.style.setProperty(k, v);
  const root = document.getElementById("screen");
  const all = [...root.querySelectorAll("*")];
  const px = (v) => parseFloat(v) || 0;
  const round = (n, d) => Math.round(n * d) / d;
  const display = all.filter((e) => e.classList.contains("display") && !e.parentElement.closest(".display") && e.textContent.trim()).map((e) => {
    const cs = getComputedStyle(e), size = px(cs.fontSize), lh = px(cs.lineHeight);
    return { e, size, lead: cs.lineHeight.endsWith("px") && lh ? lh / size : 1.2 };
  });
  const chars = new Map();
  for (const e of all) {
    if (e.closest(".display")) continue;
    const n = [...e.childNodes].filter((c) => c.nodeType === 3).map((c) => c.textContent.trim()).join("").length;
    if (n) { const s = Math.round(px(getComputedStyle(e).fontSize)); chars.set(s, (chars.get(s) || 0) + n); }
  }
  const body = [...chars].sort((a, b) => b[1] - a[1])[0]?.[0] || 0;
  const biggest = display.slice().sort((a, b) => b.size - a.size)[0];
  const corners = ["TopLeft", "TopRight", "BottomRight", "BottomLeft"];
  const rounded = [];
  for (const e of all) {
    const cs = getComputedStyle(e), r = e.getBoundingClientRect(), half = Math.min(r.width, r.height) / 2;
    const raw = corners.map((c) => cs[`border${c}Radius`]);
    if (raw.some((v) => /[%/ ]/.test(v))) continue;
    const v = raw.map(px);
    if (v.some((n) => n > 0) && v.every((n) => n < half)) rounded.push({ e, v });
  }
  const tally = new Map();
  for (const { v } of rounded) { const n = Math.round(v.find((x) => x > 0)); tally.set(n, (tally.get(n) || 0) + 1); }
  const ownRadius = [...tally].sort((a, b) => b[1] - a[1])[0]?.[0] || 0;
  const state = {};
  const kinds = [];
  const type = Controls.range(CONTROLS.type), lead = Controls.range(CONTROLS.leading), rad = Controls.range(CONTROLS.radius), acc = Controls.range(Controls.accentRatios(CONTROLS.accent));
  const ownAccent = look.accent ? round(Controls.contrast(look.accent, look.ground), 10) : 0;
  const refresh = () => {
    const kt = state.type === undefined ? 1 : state.type / (biggest.size / body), kl = state.leading === undefined ? 1 : state.leading / biggest.lead;
    for (const d of display) {
      d.e.style.fontSize = kt === 1 ? "" : `${d.size * kt}px`;
      d.e.style.lineHeight = kt === 1 && kl === 1 ? "" : String(d.lead * kl);
    }
    const kr = state.radius === undefined ? 1 : state.radius / ownRadius;
    for (const { e, v } of rounded) corners.forEach((c, i) => { e.style[`border${c}Radius`] = kr === 1 || !v[i] ? "" : `${v[i] * kr}px`; });
    state.accentHex = state.accent === undefined || Math.abs(state.accent - ownAccent) < 0.05 ? look.accent : Controls.accentAt(look.ground, look.accent, state.accent).hex;
    if (look.accent) set("--accent", state.accentHex);
  };
  if (biggest && body && type) {
    const own = round(biggest.size / body, 10);
    kinds.push({ key: "type", label: "Type scale", note: "display over text", own, range: Controls.span(type, own), step: 0.1,
      line: (v) => `type scale: ${own} to ${v} (every display size x ${round(v / own, 100)}; text stays ${body}px)` });
  }
  if (biggest && lead) {
    const own = round(biggest.lead, 100);
    kinds.push({ key: "leading", label: "Line spacing", note: "display line height", own, range: Controls.span(lead, own), step: 0.01,
      line: (v) => `line spacing: ${own} to ${v} (every display line height x ${round(v / own, 100)})` });
  }
  if (look.accent && acc) {
    kinds.push({ key: "accent", label: "Accent strength", note: "contrast against the ground", own: ownAccent, range: Controls.span(acc, ownAccent), step: 0.1,
      line: () => `accent: ${look.accent} to ${state.accentHex} (${ownAccent}:1 to ${round(Controls.contrast(state.accentHex, look.ground), 10)}:1 against the ground)` });
  }
  if (ownRadius && rad) {
    kinds.push({ key: "radius", label: "Corner radius", note: "px, rounded corners only", own: ownRadius, range: Controls.span(rad, ownRadius), step: 1,
      line: (v) => `corner radius: ${ownRadius}px to ${v}px (every rounded corner x ${round(v / ownRadius, 100)}; discs, pills and arches stay)` });
  }
  if (!kinds.length) return;
  const style = Object.assign(document.createElement("style"), { textContent: "#lb-controls{position:fixed;right:12px;bottom:12px;z-index:99999;font:12px/1.4 system-ui,sans-serif;color:#111;text-align:left}#lb-controls *{box-sizing:border-box}#lb-controls .lb-box{width:290px;margin-bottom:6px;padding:12px;background:#fff;border:1px solid #111;display:none}#lb-controls.lb-open .lb-box{display:block}#lb-controls label{display:block;margin:0 0 10px}#lb-controls label b{display:flex;justify-content:space-between}#lb-controls small{color:#555}#lb-controls input[type=range]{width:100%}#lb-controls button{font:inherit;padding:4px 8px;margin-right:6px;background:#fff;color:#111;border:1px solid #111;cursor:pointer}#lb-controls textarea{display:block;width:100%;height:96px;margin-top:8px;font:11px/1.3 ui-monospace,monospace;resize:none}" });
  const panel = Object.assign(document.createElement("div"), { id: "lb-controls" });
  const box = Object.assign(document.createElement("div"), { className: "lb-box" });
  const out = Object.assign(document.createElement("textarea"), { readOnly: true });
  const show = () => { out.value = Controls.copy(kinds.filter((k) => state[k.key] !== undefined && state[k.key] !== k.own).map((k) => k.line(state[k.key]))); };
  for (const k of kinds) {
    const label = document.createElement("label"), head = document.createElement("b"), name = document.createElement("span"), val = document.createElement("span");
    const input = Object.assign(document.createElement("input"), { type: "range", min: k.range[0], max: k.range[1], step: k.step, value: k.own });
    const list = Object.assign(document.createElement("datalist"), { id: `lb-own-${k.key}` }), tick = Object.assign(document.createElement("option"), { value: k.own }), note = document.createElement("small");
    list.appendChild(tick);
    input.setAttribute("list", list.id);
    name.textContent = k.label;
    val.textContent = k.own;
    note.textContent = `${k.note}: its own ${k.own} (the tick); the board ${round(k.range[0], 100)} to ${round(k.range[1], 100)}`;
    input.oninput = () => { state[k.key] = Number(input.value); val.textContent = input.value; refresh(); show(); };
    k.reset = () => { delete state[k.key]; input.value = k.own; val.textContent = k.own; };
    head.append(name, val);
    label.append(head, input, list, note);
    box.appendChild(label);
  }
  const button = (text, click) => Object.assign(document.createElement("button"), { textContent: text, onclick: click });
  box.append(
    button("Reset", () => { kinds.forEach((k) => k.reset()); refresh(); show(); }),
    button("Copy", () => { out.select(); try { navigator.clipboard.writeText(out.value).catch(() => document.execCommand("copy")); } catch (_) { document.execCommand("copy"); } }),
    out,
  );
  panel.append(box, button("Adjust", () => panel.classList.toggle("lb-open")));
  document.head.appendChild(style);
  document.body.appendChild(panel);
  show();
}
// ---------------------------------------------------------------- the same every time
(async () => {
  const q = new URLSearchParams(location.search);
  const look = { ...LOOK, more: { ...(LOOK.more || {}) } };
  for (const k of ["face", "body", "ground", "ink"]) if (q.get(k)) look[k] = q.get(k);
  if (q.get("weight")) look.weight = Number(q.get("weight"));
  if (q.get("accent")) look.accent = q.get("accent") === "none" ? null : q.get("accent");
  const [W, H] = (q.get("size") || "1440x900").split("x").map(Number);
  const set = (k, v) => document.documentElement.style.setProperty(k, v);
  set("--w", W + "px");
  set("--h", H + "px");
  set("--face", `"${look.face}"`);
  set("--weight", look.weight || 400);
  set("--body-face", `"${look.body || look.face}"`);
  set("--ground", look.ground);
  set("--ink", look.ink);
  set("--accent", look.accent || look.ink);
  for (const [k, v] of Object.entries(look.more)) set(`--${k}`, v);
  document.body.dataset.provenance = PROVENANCE.length;
  const wanted = [[look.face, look.weight || 400], [look.body || look.face, 400], [look.body || look.face, 700]];
  const sheets = [];
  for (const href of look.css || []) wanted.push([null, null, href]);
  for (const [face, weight, href] of wanted) {
    const urls = href ? [href] : [`https://fonts.googleapis.com/css2?family=${encodeURIComponent(face).replace(/%20/g, "+")}:wght@${weight}&display=block`, `https://fonts.googleapis.com/css2?family=${encodeURIComponent(face).replace(/%20/g, "+")}&display=block`];
    for (const url of urls) {
      if (document.querySelector(`link[href="${url}"]`)) continue;
      const link = Object.assign(document.createElement("link"), { rel: "stylesheet", href: url });
      sheets.push(new Promise((done) => ((link.onload = done), (link.onerror = done))));
      document.head.appendChild(link);
    }
  }
  await Promise.all(sheets);
  await Promise.all(wanted.filter(([f]) => f).map(([f, w]) => document.fonts.load(`${w} 100px "${f}"`).catch(() => [])));
  await document.fonts.ready;
  document.title = "ready";
  if (q.has("controls") && !q.has("capture")) mountControls(look);
})();
