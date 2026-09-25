// Resolves imports for demos that run a product's own code (see each demo's port.json).
//
// Only files inside a port's folder are affected. There, the product's path alias points at the
// vendored copy of its source, and each seam (a framework module, a server-only module, the data
// layer) points at the port's shim. Nothing else on the site sees either.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEMOS = fileURLToPath(new URL('.', import.meta.url));

const loadPorts = () =>
  readdirSync(DEMOS, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(DEMOS, entry.name, 'port.json')))
    .map((entry) => {
      const root = join(DEMOS, entry.name) + '/';
      const config = JSON.parse(readFileSync(join(root, 'port.json'), 'utf8'));
      return { root, config };
    });

export const demoPorts = () => {
  const ports = loadPorts();
  return {
    name: 'demo-ports',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      if (!importer) {
        return null;
      }
      const from = importer.split('?')[0];
      const port = ports.find((p) => from.startsWith(p.root));
      if (!port) {
        return null;
      }
      const seam = port.config.seams[source];
      if (seam) {
        return join(port.root, seam);
      }
      for (const [prefix, target] of Object.entries(port.config.alias ?? {})) {
        if (source.startsWith(prefix)) {
          const resolved = await this.resolve(
            join(port.root, 'vendor', target, source.slice(prefix.length)),
            importer,
            { ...options, skipSelf: true },
          );
          return resolved;
        }
      }
      return null;
    },
    // The build-time environment a product reads, the way its own framework would inline it.
    // Anything the port doesn't set reads as unset.
    transform(code, id) {
      const file = id.split('?')[0];
      const port = ports.find((p) => file.startsWith(p.root));
      if (!port || !code.includes('process.env')) {
        return null;
      }
      const env = port.config.env ?? {};
      return {
        code: code.replace(/process\.env\.([A-Z0-9_]+)/g, (_, key) =>
          key in env ? JSON.stringify(env[key]) : 'undefined',
        ),
        map: null,
      };
    },
  };
};
