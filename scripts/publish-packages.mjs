#!/usr/bin/env node
// Publish every public @echozedlabs/techtree-* package whose version is not on npm yet.
//
// Why not `changeset publish`: under pnpm 10 it runs `pnpm publish`, which cannot do npm's OIDC exchange
// (trusted publishing). Here pnpm only packs (turning `workspace:*` into the exact sibling version) and the npm
// CLI publishes the tarball, so the same script works:
//   - in CI (Release workflow): npm >= 11.5.1 authenticates through the package's trusted publisher (no token);
//     provenance is added automatically when the repository is public;
//   - locally (first publish, before a trusted publisher can be attached): after `npm login`, with 2FA.
//
//   node scripts/publish-packages.mjs [--dry-run]
//
// Prints "New tag: <name>@<version>" per published package (changesets/action turns those into GitHub releases)
// and creates the matching git tags.
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";

const dryRun = process.argv.includes("--dry-run");
const root = path.resolve(import.meta.dirname, "..");
const packDir = path.join(root, ".pack");
const isWin = process.platform === "win32";

const pkgs = readdirSync(path.join(root, "packages"), { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => {
    const dir = path.join(root, "packages", d.name);
    return { dir, json: JSON.parse(readFileSync(path.join(dir, "package.json"), "utf8")) };
  })
  .filter((p) => !p.json.private);

// Dependencies first, so a consumer never sees a package whose sibling version is missing.
const byName = new Map(pkgs.map((p) => [p.json.name, p]));
const ordered = [];
const seen = new Set();
const visit = (p) => {
  if (seen.has(p.json.name)) return;
  seen.add(p.json.name);
  for (const dep of Object.keys({ ...p.json.dependencies, ...p.json.peerDependencies })) {
    if (byName.has(dep)) visit(byName.get(dep));
  }
  ordered.push(p);
};
pkgs.forEach(visit);

function onNpm(name, version) {
  const r = spawnSync("npm", ["view", `${name}@${version}`, "version"], { encoding: "utf8", shell: isWin });
  if (r.status === 0) return r.stdout.trim() === version;
  if (/E404|404 Not Found/.test(r.stderr)) return false;
  throw new Error(`npm view ${name}@${version} failed:\n${r.stderr}`);
}

rmSync(packDir, { recursive: true, force: true });
mkdirSync(packDir);
const published = [];
for (const { dir, json } of ordered) {
  const id = `${json.name}@${json.version}`;
  if (onNpm(json.name, json.version)) {
    console.log(`skip ${id} (already on npm)`);
    continue;
  }
  const out = execFileSync("pnpm", ["pack", "--pack-destination", packDir], {
    cwd: dir,
    encoding: "utf8",
    shell: isWin,
  });
  const tgz = out.trim().split(/\r?\n/).pop();
  console.log(`publish ${id}${dryRun ? " (dry run)" : ""}`);
  const args = ["publish", tgz, "--access", "public", ...(dryRun ? ["--dry-run"] : [])];
  const r = spawnSync("npm", args, { stdio: "inherit", shell: isWin });
  if (r.status !== 0) {
    console.error(`npm publish failed for ${id}`);
    process.exit(r.status ?? 1);
  }
  if (!dryRun) published.push(id);
}

for (const id of published) {
  spawnSync("git", ["tag", id], { cwd: root, stdio: "ignore" });
  console.log(`New tag: ${id}`);
}
rmSync(packDir, { recursive: true, force: true });
console.log(published.length ? `published ${published.length} package(s)` : "nothing to publish");
