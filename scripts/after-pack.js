// electron-builder afterPack hook.
//
// We were unable to convince electron-builder's extraResources copier to keep
// our bundle/node_modules intact on Windows — its default file walker drops
// most modules during packing. Instead, after electron-builder finishes
// producing the unpacked app directory, copy bundle/ into resources/server/
// ourselves with fs.cpSync. This is unconditional and not filtered by anything.
//
// We deliberately use resources/server/ rather than resources/app/ so the
// bundle never collides with electron-builder's resources/app.asar (which
// holds the launcher). With both present some Electron versions resolve
// app/ instead of app.asar and try to boot server.js as the main electron
// process — server/ keeps them clearly separate.

const fs = require("fs");
const path = require("path");

module.exports = async function afterPack(context) {
  const appOutDir = context.appOutDir;
  const projectDir = context.packager.projectDir;
  const src = path.join(projectDir, "bundle");
  const dest = path.join(appOutDir, "resources", "server");

  if (!fs.existsSync(src)) {
    throw new Error(
      `afterPack: bundle/ does not exist at ${src}. Did prepare-bundle run?`
    );
  }

  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(src, dest, { recursive: true, dereference: true });

  // Also remove any stray resources/app/ directory that prior builds may have
  // left behind in incremental dist/ output, so the launcher inside app.asar
  // is unambiguously what Electron picks up.
  const strayAppDir = path.join(appOutDir, "resources", "app");
  if (fs.existsSync(strayAppDir)) {
    fs.rmSync(strayAppDir, { recursive: true, force: true });
  }

  const nm = path.join(dest, "node_modules");
  const count = fs.existsSync(nm) ? fs.readdirSync(nm).length : 0;
  console.log(
    `  • afterPack: copied bundle/ -> ${dest} (${count} modules in node_modules)`
  );
  if (count < 10) {
    throw new Error(
      `afterPack: only ${count} modules ended up in resources/server/node_modules — refusing to ship a broken build`
    );
  }
};
