// Ten reference pages in clearly different looks, for the smoke run's moodboard.
// Each is drawn here from a composition move only (where things sit, how type and
// colour work), with fictional names, words of our own, and drawn shapes for
// pictures: no real site, brand, photo or design is copied, so nothing official is
// kept in the repo and no real name can leak into the docs. System fonts only, so
// rendering the board needs no network.
const page = (body, css) => `<!doctype html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0;padding:0} html,body{width:1440px;height:900px;overflow:hidden}
${css}</style></head><body>${body}</body></html>`;

// A drawn portrait: head and shoulders, lit from one side. No photograph.
const portrait = (ground, skin, shade, cloth) => `<svg viewBox="0 0 300 380" preserveAspectRatio="xMidYMid slice" style="width:100%;height:100%;display:block">
  <defs><linearGradient id="l${skin.slice(1)}" x1="0" x2="1"><stop offset="0" stop-color="${skin}"/><stop offset="1" stop-color="${shade}"/></linearGradient></defs>
  <rect width="300" height="380" fill="${ground}"/>
  <path d="M40 380 C50 300 100 270 150 270 C200 270 250 300 260 380Z" fill="${cloth}"/>
  <rect x="128" y="215" width="44" height="70" rx="18" fill="${shade}"/>
  <ellipse cx="150" cy="160" rx="62" ry="78" fill="url(#l${skin.slice(1)})"/>
  <path d="M88 150 C88 90 120 72 152 72 C190 72 214 98 212 150 C200 118 170 108 150 110 C126 110 100 122 88 150Z" fill="${shade}" opacity=".85"/>
</svg>`;

export const refs = {
  // A poster: pale pink, one arched window with a chair-like shape, tiny red serif text, set vertical at the edges.
  "01-arch-poster": page(
    `<p class="intro">Halden Design Week invites you to a quiet room of new furniture: twelve makers, one long table, and the chairs to sit at it.</p>
     <div class="arch"><div class="shade"></div><div class="chair"></div></div>
     <span class="v left">Halden Design Week 2026</span><span class="v right">4 – 9 March</span>
     <div class="foot"><span>Open daily<br>10 am – 6 pm</span><b>HDW</b><span>Hall 3, stand 21<br>Kvarnvägen 8, Halden</span></div>`,
    `body{background:#ece0db;color:#d2492f;font-family:Georgia,serif;position:relative}
     .intro{position:absolute;top:70px;left:360px;width:720px;text-align:center;font-size:19px;line-height:1.55}
     .arch{position:absolute;left:560px;top:230px;width:320px;height:470px;border-radius:160px 160px 0 0;background:linear-gradient(90deg,#e9b79c,#d99878);overflow:hidden}
     .shade{position:absolute;right:0;top:0;width:120px;height:100%;background:repeating-linear-gradient(90deg,#c9805f 0 12px,#e2a585 12px 24px)}
     .chair{position:absolute;left:70px;bottom:40px;width:70px;height:110px;border:6px solid #e7b74a;border-top-width:14px;border-bottom:0}
     .v{position:absolute;font-size:30px;letter-spacing:.06em;writing-mode:vertical-rl;white-space:nowrap}.left{left:300px;top:250px;transform:rotate(180deg)}.right{right:300px;top:290px}
     .foot{position:absolute;left:300px;right:300px;bottom:60px;display:flex;justify-content:space-between;align-items:center;font-size:13px;line-height:1.5}
     .foot b{width:84px;height:84px;border:1.5px solid;border-radius:50%;display:grid;place-items:center;font-weight:400;font-size:18px;letter-spacing:.1em}`,
  ),
  "02-swiss": page(
    `<div class="g"><div class="n">03</div><h1>Form<br>follows<br>function.</h1><ul><li>Grid systems</li><li>Type specimens</li><li>Posters 1957–1972</li></ul><div class="red"></div></div>`,
    `body{background:#fff;color:#000;font-family:Helvetica,Arial,sans-serif;padding:64px}
     .g{display:grid;grid-template-columns:repeat(12,1fr);gap:24px;height:100%}
     .n{grid-column:1/3;font-size:20px;font-weight:700}
     h1{grid-column:3/9;font-size:120px;line-height:.92;letter-spacing:-.04em;font-weight:700}
     ul{grid-column:10/13;list-style:none;font-size:18px;line-height:1.8;border-top:2px solid #000;padding-top:10px}
     .red{grid-column:1/4;grid-row:2;height:220px;background:#e30613;align-self:end}`,
  ),
  // White page on a grey ground: a small serif name, black-and-white pictures at odd sizes, one orange dot.
  "03-dot-editorial": page(
    `<div class="sheet"><header><span>Ines<br>Halvorsen</span><i>≡</i></header>
     <h1>Mira Ostend</h1><div class="dot"></div>
     <div class="p p1">${portrait("#d9d9d9", "#bdbdbd", "#555", "#222")}</div>
     <div class="p p2">${portrait("#efefef", "#cfcfcf", "#7a7a7a", "#e8e8e8")}</div>
     <div class="p p3">${portrait("#2b2b2b", "#9a9a9a", "#3a3a3a", "#111")}</div>
     <div class="p p4"></div><nav>↑<br>↓</nav><footer><span>Portfolio</span><span>Instagram</span></footer></div>`,
    `body{background:#e6e6e6;font-family:Georgia,serif;color:#111;display:grid;place-items:center}
     .sheet{position:relative;width:1180px;height:700px;background:#fbfbfb;box-shadow:0 20px 60px rgba(0,0,0,.08)}
     header{position:absolute;top:30px;left:44px;right:44px;display:flex;justify-content:space-between;font:11px/1.3 Arial,sans-serif}
     h1{position:absolute;left:96px;top:250px;font-weight:400;font-size:44px;letter-spacing:.01em}
     .dot{position:absolute;left:96px;top:330px;width:46px;height:46px;border-radius:50%;background:#f0571d}
     .p{position:absolute;overflow:hidden;filter:grayscale(1)}.p1{left:440px;top:280px;width:150px;height:200px}.p2{left:620px;top:120px;width:250px;height:270px}
     .p3{left:900px;top:150px;width:170px;height:200px}.p4{left:440px;top:120px;width:150px;height:140px;background:repeating-linear-gradient(60deg,#222 0 6px,#ddd 6px 30px)}
     nav{position:absolute;left:100px;top:470px;font-size:14px;line-height:1.4}footer{position:absolute;right:44px;bottom:30px;display:flex;gap:40px;font:11px Arial,sans-serif}`,
  ),
  // A printed page on blue cloth: one big blue serif sentence set on a slant, small notes around it.
  "04-blue-serif": page(
    `<div class="cloth"></div><div class="paper"><div class="notes"><span>Since<br>2001</span><span>Studio<br>notes</span></div>
     <h1>There's a voice in the room, waiting to be heard.</h1>
     <p class="spec">AaBbCc<br>DdEeFf<br>0123?!&amp;</p><p class="side">${"Small notes run down the edge of the page in a plain sans, for the ones who read everything. ".repeat(3)}</p></div>`,
    `body{background:#16357a;font-family:Georgia,"Times New Roman",serif;overflow:hidden}
     .cloth{position:absolute;inset:0;background:repeating-linear-gradient(115deg,#1b3f8f 0 10px,#122c66 10px 22px);opacity:.9}
     .paper{position:absolute;left:230px;top:-120px;width:1100px;height:1200px;background:#f4f2ec;transform:rotate(-14deg);box-shadow:-30px 30px 80px rgba(0,0,0,.4)}
     .notes{position:absolute;left:120px;top:260px;display:flex;gap:50px;font:13px/1.3 Arial,sans-serif;color:#1d3fbf}
     h1{position:absolute;left:110px;top:330px;width:800px;color:#1d3fbf;font-weight:400;font-size:128px;line-height:.95;letter-spacing:-.02em}
     .spec{position:absolute;left:120px;top:820px;font-size:40px;line-height:1;color:#333}
     .side{position:absolute;right:120px;top:300px;width:170px;font:12px/1.4 Arial,sans-serif;color:#1d3fbf}`,
  ),
  // A wide grey frame; inside, a white page with a small name, then a block of orange holding a dark portrait, a red strip at the edge.
  "05-orange-block": page(
    `<div class="frame"><div class="white"><small>• Menu</small><h1>Theo</h1><p>A photographer of quiet rooms and loud people. Based between two coasts, working with both.</p><div class="dots"><i></i><i></i></div></div>
     <div class="orange">${portrait("#ee5a1c", "#2e2420", "#120c0a", "#0c0907")}</div><div class="black"></div><div class="red"><span>— 01</span></div></div>`,
    `body{background:#e9e9e9;font-family:Arial,sans-serif;display:grid;place-items:center}
     .frame{position:relative;width:1260px;height:720px;background:#fff;display:flex;box-shadow:0 10px 40px rgba(0,0,0,.06)}
     .white{position:relative;width:560px;padding:60px}small{font-size:11px;color:#888}h1{margin-top:150px;font-size:34px}p{margin-top:12px;width:250px;font-size:12px;line-height:1.5;color:#666}
     .dots{position:absolute;left:60px;bottom:60px;display:flex;gap:8px}.dots i{width:9px;height:9px;border-radius:50%;background:#ee5a1c}.dots i+i{background:#ccc}
     .orange{width:380px;margin:90px 0;overflow:hidden}.black{width:160px;margin:90px 0;background:#141414}.red{width:160px;background:#ff2a12;position:relative}
     .red span{position:absolute;top:300px;left:70px;color:#fff;font-size:11px;writing-mode:vertical-rl}`,
  ),
  // Dark ground, a black-and-white portrait, and huge lime letters cut across and behind it.
  "06-lime-letters": page(
    `<div class="card"><div class="face">${portrait("#d8d2c4", "#b9b2a4", "#4d4a44", "#2c2a27")}</div>
     <span class="L l1">TI</span><span class="L l2">DE</span><div class="small">${portrait("#cfc9bb", "#aaa395", "#4a463f", "#2a2824")}</div>
     <span class="tag t1">ISSUE 12</span><span class="tag t2">TIDE<br>TIDE<br>TIDE</span></div>`,
    `body{background:#060606;display:grid;place-items:center;font-family:Georgia,"Times New Roman",serif}
     .card{position:relative;width:1240px;height:820px;background:#d4f21a;overflow:hidden}
     .face{position:absolute;left:330px;top:40px;width:580px;height:740px;filter:grayscale(1) contrast(1.2)}
     .L{position:absolute;color:#d4f21a;font-size:520px;line-height:.78;letter-spacing:-.02em;mix-blend-mode:normal}
     .l1{left:300px;top:20px}.l2{left:300px;top:420px;color:#0c0c0c;opacity:.85}
     .small{position:absolute;left:40px;top:400px;width:200px;height:260px;filter:grayscale(1)}
     .tag{position:absolute;font:700 12px Arial,sans-serif;color:#111}.t1{left:40px;top:40px;writing-mode:vertical-rl;transform:rotate(180deg)}.t2{right:40px;bottom:120px;line-height:1}`,
  ),
  // A black panel on the left with a huge condensed name stacked; photographs fill the rest; a white CONTACT box in the corner.
  "07-condensed-panel": page(
    `<div class="panel"><small>No. 04</small><h1>NORD<br>MAGASIN</h1><b>ELIN<br>MARSH</b><i>✱</i><em>STYLIST</em></div>
     <div class="ph a">${portrait("#ececec", "#d9b49a", "#9a6b4f", "#d77a2a")}</div><div class="ph b">${portrait("#e3dcd4", "#c99a7c", "#7d5038", "#e8e2da")}</div>
     <div class="contact">CONTACT</div>`,
    `body{background:#b9aba5;font-family:"Arial Narrow",Arial,sans-serif;position:relative}
     .panel{position:absolute;left:120px;top:110px;width:430px;height:680px;background:#1a1a1a;color:#fff;padding:36px}
     small{font-size:11px;opacity:.7}h1{margin-top:40px;font-size:112px;line-height:.86;font-stretch:condensed;letter-spacing:-.04em;transform:scaleX(.66);transform-origin:left;white-space:nowrap}
     .panel b{position:absolute;left:36px;bottom:60px;font-size:30px;line-height:.9}.panel i{position:absolute;right:120px;bottom:120px;font-size:40px;font-style:normal}
     .panel em{position:absolute;right:30px;bottom:70px;font-style:normal;font-size:44px;transform:scaleX(.8)}
     .ph{position:absolute;overflow:hidden}.a{left:550px;top:110px;width:400px;height:680px}.b{left:950px;top:110px;width:370px;height:520px}
     .contact{position:absolute;left:950px;top:630px;width:370px;height:160px;background:#fff;display:grid;place-items:center;font-size:72px;font-weight:700;transform:scaleX(.85)}`,
  ),
  "08-editorial": page(
    `<header><b>Marlow Quarterly</b><nav>Issues · Essays · About</nav></header>
     <main><h1>The long way round to a good loaf</h1><div class="cols"><p>${"Words set slowly, for reading on a Sunday. ".repeat(9)}</p><p>${"A margin you can rest a thumb in. ".repeat(9)}</p></div></main>`,
    `body{background:#f4ede1;color:#2a2620;font-family:Georgia,"Times New Roman",serif;padding:56px 120px}
     header{display:flex;justify-content:space-between;font-size:15px;border-bottom:1px solid #2a2620;padding-bottom:14px}
     h1{font-size:88px;line-height:1;font-weight:400;margin:90px 0 48px;max-width:1000px}
     .cols{display:grid;grid-template-columns:1fr 1fr;gap:56px;font-size:19px;line-height:1.6}`,
  ),
  "09-split": page(
    `<div class="l"><h1>Field<br>Kitchen</h1></div><div class="r"><p>Seasonal lunches, cooked over fire, three days a week.</p><a>Book a table</a></div>`,
    `body{display:grid;grid-template-columns:1fr 1fr;grid-template-rows:900px;font-family:Georgia,serif}
     .l{background:#2f4a3a;color:#f1ead8;display:flex;align-items:flex-end;padding:72px}.l h1{font-size:120px;line-height:.9;font-weight:400}
     .r{background:#f1ead8;color:#2f4a3a;padding:72px;display:flex;flex-direction:column;justify-content:center;gap:32px;font-size:28px}
     a{font-family:Arial,sans-serif;font-size:16px;border:1.5px solid;padding:14px 22px;align-self:flex-start}`,
  ),
  "10-index": page(
    `<header>Works — 2019–2026</header>${["Harbour signage", "Type for a ferry line", "Mill museum", "Night market identity", "Seed library", "Weather station"].map((t, i) => `<div class="row"><span>${String(i + 1).padStart(3, "0")}</span><b>${t}</b><em>${2019 + i}</em></div>`).join("")}`,
    `body{background:#fff;color:#111;font-family:"Courier New",monospace;padding:64px}
     header{font-size:14px;margin-bottom:48px}.row{display:grid;grid-template-columns:120px 1fr 120px;border-top:1px solid #111;padding:22px 0;font-size:34px}
     .row b{font-family:Arial,sans-serif;font-weight:400}.row em{font-style:normal;text-align:right;font-size:16px}`,
  ),
};
// The names a committed doc must never carry: the fictional studios and people above, and the ones the person loves.
export const sources = ["Halden Design Week", "Ines Halvorsen", "Mira Ostend", "Nord Magasin", "Elin Marsh", "Marlow Quarterly", "Field Kitchen", "Field Notes Press", "Tidewater Journal"];
