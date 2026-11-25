// Options on the real page. Each option is an element with data-variant="1", "2", …
// and data-from="<the reference it comes from>". The page shows one, chosen by
// ?variant=<n> (1 when absent), and a small bar at the bottom centre: the option's
// number, its reference, and arrows. ← and → flip between them and keep the URL in
// step, so a capture or a link opens the same option. ?bar=0 hides the bar for captures.
// Copy this file next to the page and load it last: <script src="variants.js"></script>
(() => {
  const all = [...document.querySelectorAll("[data-variant]")];
  const ns = [...new Set(all.map((el) => el.dataset.variant))].sort((a, b) => Number(a) - Number(b));
  if (!ns.length) return;
  const params = new URLSearchParams(location.search);
  let at = Math.max(0, ns.indexOf(params.get("variant") || ns[0]));
  const bar = document.createElement("div");
  bar.setAttribute("role", "toolbar");
  bar.setAttribute("aria-label", "Options");
  bar.style.cssText = "position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:2147483647;display:flex;gap:12px;align-items:center;padding:8px 12px;border-radius:999px;background:#111;color:#fff;font:500 13px/1.2 system-ui,sans-serif;box-shadow:0 2px 12px rgba(0,0,0,.25)";
  const button = (text, label, step) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = text;
    b.setAttribute("aria-label", label);
    b.style.cssText = "all:unset;cursor:pointer;padding:4px 8px;min-width:24px;text-align:center";
    b.onclick = () => show(at + step);
    return b;
  };
  const label = document.createElement("span");
  bar.append(button("←", "Previous option", -1), label, button("→", "Next option", 1));
  function show(i) {
    at = (i + ns.length) % ns.length;
    for (const el of all) el.hidden = el.dataset.variant !== ns[at];
    const from = all.find((el) => el.dataset.variant === ns[at])?.dataset.from || "";
    label.textContent = `${at + 1} / ${ns.length}${from ? " \u00b7 from " + from : ""}`;
    params.set("variant", ns[at]);
    history.replaceState(null, "", "?" + params.toString() + location.hash);
  }
  addEventListener("keydown", (e) => {
    if (e.target.closest?.("input, textarea, select, [contenteditable]")) return;
    if (e.key === "ArrowLeft") show(at - 1);
    if (e.key === "ArrowRight") show(at + 1);
  });
  if (params.get("bar") !== "0") document.body.append(bar);
  show(at);
})();
