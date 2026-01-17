import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const ADMIN_DIR = path.join(ROOT, "src", "app", "api", "admin");

const IGNORE = new Set([
  path.join(ADMIN_DIR, "login", "route.ts"),
  path.join(ADMIN_DIR, "logout", "route.ts"),
]);

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

function listRoutes(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listRoutes(full));
      continue;
    }
    if (entry.isFile() && entry.name === "route.ts") out.push(full);
  }
  return out;
}

function injectImport(src: string) {
  if (src.includes("requireAdmin")) return src;
  const lines = src.split(/\r?\n/);
  let i = 0;
  while (i < lines.length && lines[i].trim().startsWith("import ")) i++;
  lines.splice(i, 0, 'import { requireAdmin } from "@/lib/security/requireAdmin";');
  return lines.join("\n");
}

function injectGuardIntoHandler(src: string) {
  let out = src;

  for (const method of METHODS) {
    const re = new RegExp(
      `export\\s+(?:async\\s+)?function\\s+${method}\\s*\\(\\s*([A-Za-z_][A-Za-z0-9_]*)\\s*:\\s*Request[^)]*\\)\\s*{`,
      "g"
    );

    out = out.replace(re, (m, reqName: string) => {
      const idx = out.indexOf(m);
      if (idx !== -1 && out.slice(idx, idx + 600).includes("const guard = await requireAdmin")) return m;
      return `${m}\n  const guard = await requireAdmin(${reqName});\n  if (guard) return guard;`;
    });
  }

  return out;
}

function secureFile(filePath: string) {
  if (IGNORE.has(filePath)) return false;
  const before = fs.readFileSync(filePath, "utf8");

  let after = before;
  after = injectImport(after);
  after = injectGuardIntoHandler(after);

  if (after === before) return false;

  fs.writeFileSync(filePath, after, "utf8");
  return true;
}

const routes = listRoutes(ADMIN_DIR);

let changed = 0;
for (const r of routes) {
  if (secureFile(r)) {
    changed += 1;
    console.log("secured:", path.relative(ROOT, r));
  }
}

console.log(`done. changed ${changed} file(s).`);
