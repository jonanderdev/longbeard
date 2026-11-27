#!/usr/bin/env node
// One page as one file: every local picture, stylesheet, script, font and clip it
// loads is written into it, so it opens the same anywhere: in a browser, as a
// download, or published as a page where the person cannot open this machine's
// files (a cloud session). Links to other pages stay links; publish those pages
// beside it, each bundled the same way. Web addresses stay as they are.
// No dependencies.
//
//   node bundle.mjs .longbeard/design/direction/canvas.html --out .longbeard/design/direction/canvas.one.html
//   node bundle.mjs .longbeard/design/prototype/home.html --out .longbeard/design/share/home.html
//
// It finds files by what the page names: src and href attributes, url() in CSS,
// and any quoted string in an inline script that names a local file (the canvas's
// screen list). A name it cannot find is listed and left as it was.
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const TYPES = {
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif",
  ".svg": "image/svg+xml", ".avif": "image/avif", ".ico": "image/x-icon",
  ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf", ".otf": "font/otf",
  ".mp4": "video/mp4", ".webm": "video/webm", ".css": "text/css", ".js": "text/javascript", ".json": "application/json",
};
const LIMIT = 15 * 1024 * 1024;

const remote = (ref) => /^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(ref) && !/^file:/i.test(ref) || /^(?:data|blob|https?|mailto|tel|javascript):/i.test(ref) || ref.startsWith("#");

// A name on the page, as a file on disk, or null.
function local(ref, from) {
  if (!ref || remote(ref)) return null;
  let path = ref.replace(/[?#].*$/, "");
  try { path = decodeURIComponent(path); } catch { return null; }
  if (/^file:/i.test(path)) {
    try { path = fileURLToPath(path); } catch { return null; }
  } else path = resolve(from, path);
  try { return statSync(path).isFile() ? path : null; } catch { return null; }
}

export function bundle(pagePath) {
  const missing = new Set();
  let count = 0;
  const dataUri = (path) => {
    count++;
    const type = TYPES[extname(path).toLowerCase()] || "application/octet-stream";
    if (type === "text/css") return `data:text/css;base64,${Buffer.from(css(readFileSync(path, "utf8"), dirname(path))).toString("base64")}`;
    return `data:${type};base64,${readFileSync(path).toString("base64")}`;
  };
  const known = (ref) => TYPES[extname(ref.replace(/[?#].*$/, "")).toLowerCase()];
  // url() in CSS, relative to the stylesheet it sits in.
  const css = (text, from) =>
    text.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, (all, q, ref) => {
      const path = local(ref.trim(), from);
      if (!path) {
        if (!remote(ref.trim())) missing.add(ref.trim());
        return all;
      }
      return `url("${dataUri(path)}")`;
    });

  const from = dirname(resolve(pagePath));
  let html = readFileSync(pagePath, "utf8");

  // Stylesheets and scripts go in as text, so the page needs nothing beside it.
  html = html.replace(/<link\b[^>]*\brel=(["'])stylesheet\1[^>]*>/gi, (tag) => {
    const ref = (tag.match(/\bhref=(["'])(.*?)\1/i) || [])[2];
    const path = local(ref, from);
    if (!path) {
      if (ref && !remote(ref)) missing.add(ref);
      return tag;
    }
    count++;
    return `<style>${css(readFileSync(path, "utf8"), dirname(path))}</style>`;
  });
  html = html.replace(/<script\b([^>]*)\bsrc=(["'])(.*?)\2([^>]*)>\s*<\/script>/gi, (tag, before, q, ref, after) => {
    const path = local(ref, from);
    if (!path) {
      if (!remote(ref)) missing.add(ref);
      return tag;
    }
    count++;
    return `<script${`${before}${after}`.replace(/\s+$/, "")}>${readFileSync(path, "utf8").replace(/<\/script/gi, "<\\/script")}</script>`;
  });
  // Inline styles: <style> blocks and style="" attributes.
  html = html.replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi, (all, open, body, close) => open + css(body, from) + close);
  html = html.replace(/\bstyle=(["'])(.*?)\1/gi, (all, q, body) => `style=${q}${css(body, from)}${q}`);
  // Attributes that load a file: pictures, posters, clips, icons. A link to another page stays a link.
  html = html.replace(/\b(src|poster|href)=(["'])(.*?)\2/gi, (all, attr, q, ref) => {
    if (attr.toLowerCase() === "href" && !/\.(?:png|jpe?g|webp|gif|svg|avif|ico)$/i.test(ref.replace(/[?#].*$/, ""))) return all;
    const path = local(ref, from);
    if (!path) {
      if (!remote(ref) && known(ref)) missing.add(ref);
      return all;
    }
    return `${attr}=${q}${dataUri(path)}${q}`;
  });
  // Names held in inline scripts (a list of screens and their pictures).
  html = html.replace(/(<script\b[^>]*>)([\s\S]*?)(<\/script>)/gi, (all, open, body, close) => {
    if (/\bsrc=/.test(open)) return all;
    return (
      open +
      body.replace(/(["'])((?:\.{1,2}\/|\/|file:)?[^"'\s<>]+?\.(?:png|jpe?g|webp|gif|svg|avif|mp4|webm))\1/gi, (m, q, ref) => {
        const path = local(ref, from);
        return path ? `${q}${dataUri(path)}${q}` : m;
      }) +
      close
    );
  });
  return { html, count, missing: [...missing] };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const i = args.indexOf("--out");
  const out = i === -1 ? "" : args.splice(i, 2)[1] || "";
  const [page] = args;
  if (!page || !out || args.length !== 1) {
    console.error("usage: node bundle.mjs <page.html> --out <one-file.html>");
    process.exit(2);
  }
  if (!existsSync(page)) {
    console.error(`bundle: no page at ${page}`);
    process.exit(1);
  }
  const { html, count, missing } = bundle(page);
  mkdirSync(dirname(resolve(out)), { recursive: true });
  writeFileSync(out, html);
  const size = Buffer.byteLength(html);
  console.error(`bundle: ${count} file${count === 1 ? "" : "s"} written in, ${(size / 1024 / 1024).toFixed(1)} MB${missing.length ? `; not found: ${missing.join(", ")}` : ""}`);
  if (size > LIMIT) console.error("bundle: over 15 MB, too big to publish as one page: capture the pictures as JPEG, or publish fewer at once");
  console.log(out);
}
