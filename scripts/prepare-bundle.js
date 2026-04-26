// Assembles the runtime bundle that electron-builder ships as resources/app.
//
// Why this exists: relying on `extraResources: { from: ".next/standalone" }`
// turned out to silently drop most of the standalone's node_modules on the
// Windows CI runner, leaving the packaged app with only a server.js that
// crashed on `require('next')`. This script does the copy explicitly with
// Node's fs.cpSync so we can see exactly what's in the bundle and fall back
// to copying full node_modules if Next.js's standalone trace was incomplete.

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const SRC_STANDALONE = path.join(ROOT, ".next", "standalone");
const SRC_STATIC = path.join(ROOT, ".next", "static");
const SRC_PUBLIC = path.join(ROOT, "public");
const SRC_NODE_MODULES = path.join(ROOT, "node_modules");
const BUNDLE = path.join(ROOT, "bundle");

// Modules that must be loadable via require() at runtime — i.e. those Next.js
// does NOT webpack-bundle into its own chunks. Anthropic SDK, Zod, etc. are
// bundled into Next's compiled output and don't need to be in node_modules.
// node-sqlite3-wasm is in serverExternalPackages so it stays external.
const REQUIRED_RUNTIME_MODULES = [
  "next",
  "react",
  "react-dom",
  "node-sqlite3-wasm",
];

function rmrf(p) {
  fs.rmSync(p, { recursive: true, force: true });
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function copyRecursive(src, dst) {
  fs.cpSync(src, dst, { recursive: true, dereference: true });
}

function listDir(p) {
  if (!fs.existsSync(p)) return [];
  return fs.readdirSync(p).sort();
}

function getDirSize(p) {
  let total = 0;
  for (const entry of fs.readdirSync(p, { withFileTypes: true })) {
    const full = path.join(p, entry.name);
    if (entry.isDirectory()) total += getDirSize(full);
    else total += fs.statSync(full).size;
  }
  return total;
}

function moduleExists(nodeModulesDir, name) {
  return fs.existsSync(path.join(nodeModulesDir, name, "package.json"));
}

function copyModule(srcRoot, dstRoot, name) {
  const src = path.join(srcRoot, name);
  const dst = path.join(dstRoot, name);
  if (!fs.existsSync(src)) {
    console.warn(`prepare-bundle:   ! source missing: ${name}`);
    return false;
  }
  rmrf(dst);
  ensureDir(path.dirname(dst));
  copyRecursive(src, dst);
  return true;
}

function main() {
  if (!fs.existsSync(SRC_STANDALONE)) {
    console.error(
      "prepare-bundle: .next/standalone does not exist — run `next build` first."
    );
    process.exit(1);
  }

  console.log(`prepare-bundle: cleaning ${BUNDLE}`);
  rmrf(BUNDLE);
  ensureDir(BUNDLE);

  console.log("prepare-bundle: copying .next/standalone/  ->  bundle/");
  copyRecursive(SRC_STANDALONE, BUNDLE);

  if (fs.existsSync(SRC_STATIC)) {
    console.log("prepare-bundle: copying .next/static/  ->  bundle/.next/static/");
    copyRecursive(SRC_STATIC, path.join(BUNDLE, ".next", "static"));
  }

  if (fs.existsSync(SRC_PUBLIC)) {
    console.log("prepare-bundle: copying public/  ->  bundle/public/");
    copyRecursive(SRC_PUBLIC, path.join(BUNDLE, "public"));
  }

  const bundleNodeModules = path.join(BUNDLE, "node_modules");
  ensureDir(bundleNodeModules);

  // Diagnose what Next.js's standalone trace actually produced.
  const standaloneNodeModules = path.join(SRC_STANDALONE, "node_modules");
  const traced = listDir(standaloneNodeModules);
  console.log(
    `prepare-bundle: Next.js standalone trace produced ${traced.length} top-level node_modules entries`
  );
  if (traced.length > 0) {
    console.log(`  ${traced.join(", ")}`);
  }

  // Patch any required runtime module the trace missed by copying it (and its
  // own nested deps) from the full npm install.
  const missingAfterTrace = REQUIRED_RUNTIME_MODULES.filter(
    (m) => !moduleExists(bundleNodeModules, m)
  );
  if (missingAfterTrace.length > 0) {
    console.log(
      `prepare-bundle: standalone trace missed ${missingAfterTrace.length} required modules — falling back to a full node_modules copy`
    );
    rmrf(bundleNodeModules);
    ensureDir(bundleNodeModules);
    copyRecursive(SRC_NODE_MODULES, bundleNodeModules);
  }

  // Always make sure the WASM file is present at the path node-sqlite3-wasm
  // looks for at runtime.
  const wasmDst = path.join(
    bundleNodeModules,
    "node-sqlite3-wasm",
    "dist",
    "node-sqlite3-wasm.wasm"
  );
  if (!fs.existsSync(wasmDst)) {
    const wasmSrc = path.join(
      SRC_NODE_MODULES,
      "node-sqlite3-wasm",
      "dist",
      "node-sqlite3-wasm.wasm"
    );
    if (!fs.existsSync(wasmSrc)) {
      console.error(`prepare-bundle: source WASM missing at ${wasmSrc}`);
      process.exit(1);
    }
    ensureDir(path.dirname(wasmDst));
    fs.copyFileSync(wasmSrc, wasmDst);
    console.log(`prepare-bundle: copied WASM to bundle`);
  }

  // Final verification.
  const finalModules = listDir(bundleNodeModules);
  console.log(
    `prepare-bundle: bundle/node_modules has ${finalModules.length} entries`
  );

  for (const required of REQUIRED_RUNTIME_MODULES) {
    if (!moduleExists(bundleNodeModules, required)) {
      console.error(
        `prepare-bundle: FATAL — required module '${required}' missing from final bundle`
      );
      process.exit(1);
    }
  }

  // Replace the standalone's package.json (which Next.js copies verbatim from
  // the project root, complete with devDependencies and an electron-builder
  // `build` config) with a minimal one. Otherwise electron-builder treats
  // bundle/ as a sibling npm project and runs its dev-dep pruning, which on
  // Windows ends up deleting most of node_modules in the packaged app.
  const minimalPkg = {
    name: "projectmind-runtime",
    version: "0.1.0",
    private: true,
    main: "server.js",
  };
  fs.writeFileSync(
    path.join(BUNDLE, "package.json"),
    JSON.stringify(minimalPkg, null, 2) + "\n"
  );
  console.log("prepare-bundle: replaced bundle/package.json with minimal manifest");

  const sizeMB = Math.round(getDirSize(BUNDLE) / (1024 * 1024));
  console.log(`prepare-bundle: bundle assembled (~${sizeMB} MB)`);
}

main();
