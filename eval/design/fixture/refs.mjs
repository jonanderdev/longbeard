// Ten reference pages in clearly different looks, for the smoke run's moodboard.
// Fictional studios, system fonts and drawn shapes only, so a run needs no network
// for its board and no real site's name can leak into the docs.
const page = (body, css) => `<!doctype html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0;padding:0} html,body{width:1440px;height:900px;overflow:hidden}
${css}</style></head><body>${body}</body></html>`;

export const refs = {
  "01-editorial": page(
    `<header><b>Marlow Quarterly</b><nav>Issues · Essays · About</nav></header>
     <main><h1>The long way round to a good loaf</h1><div class="cols"><p>${"Words set slowly, for reading on a Sunday. ".repeat(9)}</p><p>${"A margin you can rest a thumb in. ".repeat(9)}</p></div></main>`,
    `body{background:#f4ede1;color:#2a2620;font-family:Georgia,"Times New Roman",serif;padding:56px 120px}
     header{display:flex;justify-content:space-between;font-size:15px;border-bottom:1px solid #2a2620;padding-bottom:14px}
     h1{font-size:88px;line-height:1;font-weight:400;margin:90px 0 48px;max-width:1000px}
     .cols{display:grid;grid-template-columns:1fr 1fr;gap:56px;font-size:19px;line-height:1.6}`,
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
  "03-dark-photo": page(
    `<div class="photo"></div><nav>NIGHT SHIFT</nav><h1>OPEN<br>UNTIL<br>LATE</h1><a>See the menu →</a>`,
    `body{background:#0d0d0d;color:#f2f2f2;font-family:"Arial Narrow",Arial,sans-serif;position:relative}
     .photo{position:absolute;inset:0 0 0 38%;background:radial-gradient(circle at 60% 40%,#c77a2e,#3a1c08 55%,#0d0d0d 80%)}
     nav{position:absolute;top:40px;left:56px;letter-spacing:.3em;font-size:14px}
     h1{position:absolute;left:56px;bottom:120px;font-size:150px;line-height:.85;font-stretch:condensed;letter-spacing:-.02em}
     a{position:absolute;left:56px;bottom:56px;font-size:18px;border-bottom:1px solid}`,
  ),
  "04-brutal": page(
    `<div class="box b1">ARCHIVE_v2</div><div class="box b2">[ENTER]</div><div class="box b3">${"DATA ".repeat(40)}</div><div class="box b4">SIGN UP ></div>`,
    `body{background:#ffe600;color:#000;font-family:"Courier New",monospace;position:relative}
     .box{position:absolute;border:6px solid #000;padding:20px;font-size:28px;font-weight:700}
     .b1{top:40px;left:40px;font-size:96px}.b2{top:260px;left:700px;background:#fff}
     .b3{top:420px;left:40px;width:620px;font-size:16px}.b4{bottom:60px;right:60px;background:#000;color:#ffe600}`,
  ),
  "05-warm-cards": page(
    `<h1>Made by hand, <i>slowly</i></h1><div class="cards">${["Clay cups", "Linen", "Oak spoons"].map((t) => `<div class="c"><div class="img"></div><b>${t}</b></div>`).join("")}</div>`,
    `body{background:#c8613f;color:#fff6ec;font-family:"Trebuchet MS",sans-serif;padding:80px}
     h1{font-family:"Brush Script MT","Segoe Script",cursive;font-weight:400;font-size:96px;margin-bottom:56px}
     .cards{display:flex;gap:32px}.c{background:#fff6ec;color:#5a2a18;border-radius:28px;padding:20px;width:360px}
     .img{height:280px;border-radius:18px;background:linear-gradient(135deg,#e9c9a8,#b9774f);margin-bottom:16px}`,
  ),
  "06-giant-type": page(
    `<h1>BREAD</h1><p>A small studio for packaging and signs. Est. 2011.</p>`,
    `body{background:#f7f5f0;color:#1a1a1a;font-family:Impact,"Arial Black",sans-serif;overflow:hidden}
     h1{font-size:560px;line-height:.8;margin:120px 0 0 -30px;letter-spacing:-.04em}
     p{position:absolute;right:64px;top:56px;font-family:Arial,sans-serif;font-size:16px;width:260px}`,
  ),
  "07-minimal": page(
    `<nav>Oro</nav><div class="obj"></div><p>The kettle. €129</p>`,
    `body{background:#fafafa;color:#222;font-family:Helvetica,Arial,sans-serif;position:relative}
     nav{position:absolute;top:36px;left:48px;font-size:14px;letter-spacing:.1em}
     .obj{position:absolute;left:570px;top:280px;width:300px;height:300px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff,#bdbdbd)}
     p{position:absolute;bottom:80px;left:0;right:0;text-align:center;font-size:14px;letter-spacing:.05em}`,
  ),
  "08-pastel": page(
    `<div class="blob a"></div><div class="blob b"></div><div class="blob c"></div><h1>Hey! Let's make<br>something fun 🎈</h1><button>Start free</button>`,
    `body{background:#fff4f8;color:#3b2a6b;font-family:"Comic Sans MS","Chalkboard SE",sans-serif;position:relative}
     .blob{position:absolute;border-radius:50%}.a{width:420px;height:420px;background:#bde7ff;top:-80px;right:120px}
     .b{width:300px;height:300px;background:#ffd6a5;bottom:-60px;left:200px}.c{width:200px;height:200px;background:#caffbf;top:300px;right:420px}
     h1{position:absolute;left:96px;top:260px;font-size:72px}button{position:absolute;left:96px;top:520px;font:inherit;font-size:22px;padding:16px 32px;border-radius:40px;border:0;background:#7b5cff;color:#fff}`,
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
// The names a committed doc must never carry: the studios above, and the ones the person loves.
export const sources = ["Marlow Quarterly", "Night Shift", "Field Kitchen", "Oro", "Field Notes Press", "Tidewater Journal", "Archive_v2"];
