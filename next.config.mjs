/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // imapflow/mailparser pull in Node-only optional deps that webpack can't bundle
  // cleanly; keeping them external means they're loaded from node_modules at runtime.
  serverExternalPackages: ["node-sqlite3-wasm", "imapflow", "mailparser"],
  outputFileTracingIncludes: {
    "*": ["./node_modules/node-sqlite3-wasm/dist/*.wasm"],
  },
};

export default nextConfig;
