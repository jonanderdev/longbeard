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
  // A split screen: a still life of pears stacked on a dark stage at left; at right, a pale page where one red circle cuts into a big serif title.
  "04-still-life": page(
    `<div class="stage"><svg viewBox="0 0 720 900" preserveAspectRatio="xMidYMid slice">
      <defs><linearGradient id="fl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1e1f1c"/><stop offset="1" stop-color="#2a2a26"/></linearGradient>
      <linearGradient id="tb" x1="0" x2="1"><stop offset="0" stop-color="#e2c7a6"/><stop offset="1" stop-color="#c9a985"/></linearGradient>
      <radialGradient id="pg" cx=".35" cy=".35"><stop offset="0" stop-color="#9aa25a"/><stop offset="1" stop-color="#4f5a2a"/></radialGradient>
      <radialGradient id="pc" cx=".4" cy=".4"><stop offset="0" stop-color="#f4ead2"/><stop offset="1" stop-color="#d9c9a0"/></radialGradient></defs>
      <rect width="720" height="900" fill="url(#fl)"/><path d="M0 600 L720 520 L720 900 L0 900Z" fill="url(#tb)"/>
      <path d="M420 640 L700 600 L720 900 L380 900Z" fill="#000" opacity=".18"/>
      <path d="M250 760 C250 640 270 560 300 540 C330 560 350 640 350 760Z" fill="#ece6d6"/>
      <rect x="350" y="560" width="110" height="200" fill="#4a2f22"/>
      <path d="M240 420 C190 380 200 300 250 290 C300 280 330 330 380 380 C430 430 470 480 420 530 C380 570 300 500 240 420Z" fill="url(#pg)"/>
      <path d="M330 300 C300 230 320 150 380 130 C440 150 460 230 430 300 C410 350 350 350 330 300Z" fill="url(#pc)"/>
      <path d="M380 130 C390 100 410 90 425 80" stroke="#4a3a22" stroke-width="5" fill="none"/>
      <path d="M380 800 C380 740 440 710 500 730 C560 750 560 810 520 830 C480 850 390 850 380 800Z" fill="url(#pc)"/>
    </svg></div>
    <div class="page"><nav>Journal · Recipes · Shop · ☰</nav><h1 class="t1">The quiet</h1><span class="bars">∥</span><div class="sun"></div>
      <p class="note n1">Table · Fruit<br>and stone</p><p class="note n2">The idea was to set<br>objects from two<br>worlds on one table</p><p class="note n3">Shapes · textures<br>it is all about light</p><p class="note n4">Composition<br>weight · space</p><h1 class="t2"><span>Shape</span><br>of the Fruit</h1></div>
    <b class="logo">v.</b>`,
    `body{display:grid;grid-template-columns:720px 720px;background:#1e1f1c;font-family:Georgia,"Times New Roman",serif}
     .stage svg{width:720px;height:900px;display:block}.logo{position:absolute;left:28px;top:24px;color:#eee;font-size:20px}
     .page{position:relative;background:#d9d6cf;color:#111;overflow:hidden}nav{position:absolute;right:30px;top:26px;font:10px Arial,sans-serif;letter-spacing:.1em}
     h1{position:absolute;font-weight:400;letter-spacing:-.04em;line-height:.88;z-index:2}.t1{left:22px;top:50px;font-size:150px;white-space:nowrap}.t2{left:40px;bottom:30px;font-size:150px;line-height:.86}.t2 span{padding-left:210px}
     .bars{position:absolute;left:300px;top:180px;font-size:130px;z-index:2}.sun{position:absolute;left:40px;top:210px;width:400px;height:400px;border-radius:50%;background:#ff4a14}
     .note{position:absolute;font:9px/1.4 Arial,sans-serif;text-transform:uppercase;z-index:2}.n1{left:300px;top:400px}.n2{left:470px;top:600px}.n3{right:30px;top:170px}.n4{right:30px;top:470px}`,
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
  // A deep green page: a big light serif title, products standing in an arched niche, a second arch cut off at the edge, a line of words running along the foot.
  "08-dark-arches": page(
    `<header><span class="mark">VERDA<br><i>oils</i></span><nav><span>Shop</span><span>Body</span><span class="on">Gifts</span><span>About</span></nav><span class="cart">Bag ◦</span></header>
     <h1>Calm<br>Ritual</h1><p class="lede">A starter set of our three oils, for a whole evening in half the time.</p><span class="disc">• Discover</span>
     <div class="arch"><div class="shelf"></div><i class="j a"></i><i class="j b"></i><i class="j c"></i></div>
     <div class="play"><i>▶</i><span>Watch</span></div><div class="next"><small>NEXT</small><b>Night<br>balm</b><span>→</span></div><div class="arch2"><i class="j d"></i></div>
     <p class="cap">Body &amp; home<br>small-batch oils<br>that keep up with you</p><div class="card2"><span>❦</span></div><p class="offers"><b>4 new</b> carefully<br>chosen sets</p><i class="rule"></i><p class="foot">${"BE SLOW ◆ BE WARM ◆ BE STILL ◆ ".repeat(5)}</p>`,
    `body{background:#1f3a33;color:#f3ede2;font-family:Georgia,"Times New Roman",serif;position:relative}
     header{position:absolute;top:40px;left:80px;right:80px;display:flex;justify-content:space-between;align-items:center;font:13px Arial,sans-serif}
     .mark{border:1px solid #c9915a;border-radius:50%;width:76px;height:76px;display:grid;place-items:center;text-align:center;font-size:12px;line-height:1}
     nav{display:flex;gap:56px}.on{color:#d9a066}.cart{border:1px solid #f3ede2;border-radius:30px;padding:10px 22px}
     h1{position:absolute;left:150px;top:230px;font-weight:300;font-size:132px;line-height:1.02;letter-spacing:.05em;z-index:2;white-space:nowrap}
     .lede{position:absolute;left:180px;top:500px;width:280px;font:15px/1.6 Arial,sans-serif}.disc{position:absolute;left:180px;top:610px;width:110px;height:110px;border:1px solid #c9915a;border-radius:50%;display:grid;place-items:center;font:12px Arial,sans-serif;letter-spacing:.15em}
     .arch{position:absolute;left:520px;top:230px;width:420px;height:500px;border-radius:210px 210px 0 0;background:#7a6a3e;overflow:hidden}
     .shelf{position:absolute;left:0;right:0;bottom:0;height:150px;background:#2f4a46}
     .j{position:absolute;display:block;bottom:150px;border-radius:6px 6px 2px 2px;background:linear-gradient(90deg,#c27a3a,#8d4f24)}
     .a{left:70px;width:90px;height:220px}.b{left:180px;width:110px;height:100px;background:linear-gradient(90deg,#3b5450,#22322f)}.c{left:310px;width:50px;height:180px}
     .play{position:absolute;left:1020px;top:330px;display:flex;align-items:center;gap:20px;color:#d9a066;font-size:40px}.play i{width:90px;height:90px;border-radius:50%;background:#3d5651;display:grid;place-items:center;font-size:20px;font-style:normal;color:#fff}
     .next{position:absolute;left:1020px;top:520px}.next small{font:11px Arial,sans-serif;color:#d9a066;letter-spacing:.2em}.next b{display:block;font-weight:300;font-size:44px;line-height:1.05;margin:10px 0}.next span{color:#d9a066;font-size:44px}
     .arch2{position:absolute;left:1240px;top:430px;width:260px;height:360px;border-radius:130px 130px 0 0;background:#d9c7bd;overflow:hidden}.d{left:60px;width:120px;height:110px;bottom:60px;background:linear-gradient(90deg,#5a2a20,#2a120c)}
     .foot{position:absolute;left:0;top:846px;width:1440px;overflow:hidden;white-space:nowrap;color:#c9915a;font-size:22px;letter-spacing:.08em;z-index:3}
     .cap{position:absolute;left:520px;width:420px;top:760px;text-align:center;color:#c9915a;font:13px/1.6 Arial,sans-serif}.card2{position:absolute;left:520px;top:840px;width:420px;height:200px;background:#c9c4b2;border:1px solid #c9915a;outline:6px solid #c9c4b2;outline-offset:-14px;display:grid;place-items:start center;padding-top:10px;color:#5b6b3a;font-size:60px}
     .offers{position:absolute;left:180px;top:800px;font:15px/1.5 Arial,sans-serif}.offers b{color:#c9915a;font-weight:400}.rule{position:absolute;left:400px;top:815px;width:110px;height:1px;background:#c9915a}`,
  ),
  "09-split": page(
    `<div class="l"><h1>Field<br>Kitchen</h1></div><div class="r"><p>Seasonal lunches, cooked over fire, three days a week.</p><a>Book a table</a></div>`,
    `body{display:grid;grid-template-columns:1fr 1fr;grid-template-rows:900px;font-family:Georgia,serif}
     .l{background:#2f4a3a;color:#f1ead8;display:flex;align-items:flex-end;padding:72px}.l h1{font-size:120px;line-height:.9;font-weight:400}
     .r{background:#f1ead8;color:#2f4a3a;padding:72px;display:flex;flex-direction:column;justify-content:center;gap:32px;font-size:28px}
     a{font-family:Arial,sans-serif;font-size:16px;border:1.5px solid;padding:14px 22px;align-self:flex-start}`,
  ),
  // Cream: a tall arch holding a figure on a shore, a big light display serif title beside it, two cropped pictures bleeding off the edges, a ruled foot.
  "10-arch-portrait": page(
    `<div class="badge">ATELIER · SOLÈNE · ATELIER ·<b>S</b></div><div class="issue"><b>04/26</b><span>Solène Atelier<br>Spring collection</span></div>
     <div class="crop left"></div><div class="arch"><div class="sky"></div><div class="sea"></div><div class="rock"></div>
       <svg class="fig" viewBox="0 0 120 300"><circle cx="60" cy="40" r="18" fill="#c99a78"/><path d="M40 60 L80 60 L100 230 C80 250 30 250 15 230Z" fill="#b8b49a"/><path d="M45 230 L50 290 M75 230 L72 290" stroke="#c99a78" stroke-width="7"/></svg>
       <span class="moon">☾</span><span class="spk s1">✦</span><span class="spk s2">✦</span><span class="spk s3">✦</span><span class="spk s4">✦</span></div><span class="leaf">❧</span>
     <span class="vert">Linen · Salt · Collection</span><h1>Linen Season<br><em>Le Retour</em></h1>
     <p class="copy">${"Every morning I keep an hour of quiet for myself. The work is about giving, and that hour is what I give back. ".repeat(3)}</p>
     <div class="crop right"></div><footer><span>About</span><span>· Atelier<br>&nbsp; Typeface</span><span>· Salt<br>&nbsp; Typeface</span></footer>`,
    `body{background:#f1e6d4;color:#1d1a16;font-family:Georgia,"Times New Roman",serif;position:relative}
     .badge{position:absolute;left:60px;top:40px;width:110px;height:110px;border:1px dashed #1d1a16;border-radius:50%;font:8px Arial,sans-serif;letter-spacing:.2em;display:grid;place-items:center;text-align:center;padding:14px}.badge b{display:block;font:28px Georgia,serif}
     .issue{position:absolute;right:0;top:0;width:250px;border-left:1px solid #b8aa90;border-bottom:1px solid #b8aa90;padding:24px}.issue b{font:400 28px Arial,sans-serif}.issue span{display:block;margin-top:24px;font-size:13px;font-style:italic}
     .arch{position:absolute;left:330px;top:120px;width:330px;height:600px;border-radius:165px 165px 0 0;overflow:hidden}
     .sky{position:absolute;inset:0;background:linear-gradient(#6f8fb0,#a9bccb)}.sea{position:absolute;left:0;right:0;top:330px;bottom:0;background:linear-gradient(#5c7d97,#3e5c73)}
     .rock{position:absolute;left:-30px;right:-30px;bottom:-40px;height:200px;border-radius:50% 50% 0 0;background:#e6dcc8}.fig{position:absolute;left:110px;top:160px;width:120px;height:300px}
     .moon{position:absolute;left:120px;top:250px;font-size:90px;color:#fbf7ec}.spk{position:absolute;color:#fff;font-size:22px}.s1{left:200px;top:180px}.s2{left:250px;top:260px;font-size:16px}.s3{left:190px;top:420px}.s4{left:100px;top:190px;font-size:12px}
     .leaf{position:absolute;left:870px;top:170px;font-size:44px;color:#3a2e22;transform:rotate(-20deg)}
     .vert{position:absolute;left:290px;top:300px;writing-mode:vertical-rl;transform:rotate(180deg);font:11px Arial,sans-serif;letter-spacing:.15em}
     h1{position:absolute;left:560px;top:250px;font-weight:300;font-size:124px;line-height:1.02;letter-spacing:-.01em;z-index:2;white-space:nowrap}h1 em{font-style:normal;padding-left:20px}
     .copy{position:absolute;left:740px;top:540px;width:430px;font-size:13px;line-height:1.5;text-align:justify}
     .crop{position:absolute;top:250px;height:330px}.crop.left{left:0;width:120px;background:linear-gradient(135deg,#c78a4c,#8a5a30)}.crop.right{right:0;width:170px;background:radial-gradient(circle at 30% 50%,#e4b08a,#a8673e 60%,#6f8fb0 61%)}
     footer{position:absolute;left:0;right:0;bottom:0;height:70px;border-top:1px solid #b8aa90;display:grid;grid-template-columns:260px 1fr 260px 260px;align-items:center;padding:0 60px;font:10px Arial,sans-serif;letter-spacing:.25em;text-transform:uppercase}
     footer span:first-child{border-right:1px solid #b8aa90;height:100%;display:flex;align-items:center}`,
  ),
};
// The names a committed doc must never carry: the fictional studios and people above, and the ones the person loves.
export const sources = ["Halden Design Week", "Ines Halvorsen", "Mira Ostend", "Nord Magasin", "Elin Marsh", "Field Kitchen", "Verda", "Solène Atelier", "Field Notes Press", "Tidewater Journal"];
