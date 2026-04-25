/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  serverExternalPackages: ["node-sqlite3-wasm"],
  outputFileTracingIncludes: {
    "*": ["./node_modules/node-sqlite3-wasm/dist/*.wasm"],
  },
};

export default nextConfig;
