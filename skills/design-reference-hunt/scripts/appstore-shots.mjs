#!/usr/bin/env node
// Shipped screens from App Store listings, through the iTunes Search API (no login).
// Prints TSV: label\timageURL\tlistingURL, ready for contact-sheet.mjs.
// The image URL is the full-size JPEG, so save it as .jpg. The path also holds
// the uploaded file's name (".../01.png/1200x0w.jpg"); the last extension is the format.
//
//   node appstore-shots.mjs "<app>" "<app>" "<app>" > shipped.tsv
//   node appstore-shots.mjs "<app>" --ipad --country gb
//
// Most of these are marketing frames: a headline, a coloured ground, a tilted
// phone. Prefer frames that are mostly the screen, and crop a keep to the device.

const args = process.argv.slice(2);
const flag = (name, def) => {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return def;
  const v = args[i + 1];
  args.splice(i, 2);
  return v;
};
const has = (name) => {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return false;
  args.splice(i, 1);
  return true;
};
const country = flag("country", "us");
const ipad = has("ipad");
const names = args;
if (!names.length || names.some((n) => n.startsWith("--"))) {
  console.error('usage: node appstore-shots.mjs "<app name>" ["<app name>" …] [--ipad] [--country us]');
  process.exit(2);
}

const fullSize = (url) => url.replace(/\/\d+x\d+\w*\.(?:jpg|jpeg|png|webp)$/i, "/1200x0w.jpg");
const clean = (s) => String(s).replace(/[\t\r\n]+/g, " ").trim();

let rows = 0;
for (const name of names) {
  const query = new URLSearchParams({ term: name, entity: "software", limit: "1", country });
  let app;
  try {
    const res = await fetch(`https://itunes.apple.com/search?${query}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    app = (await res.json()).results?.[0];
  } catch (error) {
    console.error(`appstore: ${name}: ${error.message}`);
    continue;
  }
  if (!app) {
    console.error(`appstore: ${name}: no listing in ${country}`);
    continue;
  }
  // The search always returns its closest listing, even for a name it does not know.
  const words = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  if (!words(app.trackName).includes(words(name))) {
    console.error(`appstore: ${name}: closest listing is "${app.trackName}" — check it is the app you meant`);
  }
  const shots = ipad && app.ipadScreenshotUrls?.length ? app.ipadScreenshotUrls : app.screenshotUrls ?? [];
  if (!shots.length) console.error(`appstore: ${app.trackName}: no screenshots`);
  shots.forEach((url, i) => {
    console.log(`${clean(app.trackName)} ${i + 1}\t${fullSize(url)}\t${app.trackViewUrl.replace(/\?.*$/, "")}`);
    rows += 1;
  });
}
console.error(`appstore: ${rows} screenshots from ${names.length} searches`);
