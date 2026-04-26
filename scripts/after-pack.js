// electron-builder afterPack hook.
//
// We were unable to convince electron-builder's extraResources copier to keep
// our bundle/node_modules intact on Windows — its default file walker drops
// most modules during packing. Instead, after electron-builder finishes
// producing the unpacked app directory, copy bundle/ into resources/app/
// ourselves with fs.cpSync. This is unconditional and not filtered by anything.

const fs = require("fs");
const path = require("path");

module.exports = async function afterPack(context) {
  const appOutDir = context.appOutDir;
  const projectDir = context.packager.projectDir;
  const src = path.join(projectDir, "bundle");
  const dest = path.join(appOutDir, "resources", "app");

  if (!fs.existsSync(src)) {
    throw new Error(
      `afterPack: bundle/ does not exist at ${src}. Did prepare-bundle run?`
    );
  }

  // Wipe whatever electron-builder put in resources/app, then copy our bundle.
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(src, dest, { recursive: true, dereference: true });

  // Sanity-check: confirm node_modules survived.
  const nm = path.join(dest, "node_modules");
  const count = fs.existsSync(nm) ? fs.readdirSync(nm).length : 0;
  console.log(
    `  • afterPack: copied bundle/ -> ${dest} (${count} modules in node_modules)`
  );
  if (count < 10) {
    throw new Error(
      `afterPack: only ${count} modules ended up in resources/app/node_modules — refusing to ship a broken build`
    );
  }
};
