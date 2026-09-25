// Copies a product's source files into a demo's vendor folder, byte for byte, and lists them.
//
//   node scripts/port-sync.mjs domainclaim ../resend-take-home
//
// The files copied are the import closure of the demo's entry points, found with esbuild. Imports
// the demo replaces (its seams, listed in the port's config) are not followed. Run it again after
// the product changes: it rewrites vendor/ and prints what changed, so the demo follows the product
// instead of drifting from it.
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { build } from 'esbuild';

const [project, sourceArg] = process.argv.slice(2);
if (!project || !sourceArg) {
  console.error('usage: node scripts/port-sync.mjs <project> <path to the product repo>');
  process.exit(1);
}

const root = resolve('src/components/react/demos', project);
const config = JSON.parse(readFileSync(join(root, 'port.json'), 'utf8'));
const source = resolve(sourceArg);
const vendor = join(root, 'vendor');

const hash = (file) => createHash('sha256').update(readFileSync(file)).digest('hex').slice(0, 12);
const before = new Map();
const manifestPath = join(root, 'vendor.lock.json');
if (existsSync(manifestPath)) {
  for (const [file, digest] of Object.entries(JSON.parse(readFileSync(manifestPath, 'utf8')).files)) {
    before.set(file, digest);
  }
}

const seams = new Set(Object.keys(config.seams));
const alias = config.alias ?? {};

const result = await build({
  entryPoints: config.entries.map((entry) => join(source, entry)),
  bundle: true,
  write: false,
  metafile: true,
  outdir: '/tmp/port-sync-out',
  format: 'esm',
  logLevel: 'silent',
  jsx: 'automatic',
  loader: { '.css': 'empty' },
  plugins: [
    {
      name: 'seams',
      setup(b) {
        b.onResolve({ filter: /.*/ }, (args) => {
          if (seams.has(args.path)) {
            return { path: args.path, external: true };
          }
          for (const [prefix, target] of Object.entries(alias)) {
            if (args.path.startsWith(prefix)) {
              return b.resolve(join(source, target, args.path.slice(prefix.length)), {
                kind: args.kind,
                resolveDir: args.resolveDir,
              });
            }
          }
          if (!args.path.startsWith('.') && !args.path.startsWith('/')) {
            return { path: args.path, external: true };
          }
          return undefined;
        });
      },
    },
  ],
});

const files = Object.keys(result.metafile.inputs)
  .map((input) => resolve(input))
  .filter((file) => file.startsWith(source))
  .map((file) => relative(source, file));
for (const extra of config.include ?? []) {
  files.push(extra);
}
const unique = [...new Set(files)].sort();

rmSync(vendor, { recursive: true, force: true });
const lock = {};
for (const file of unique) {
  const to = join(vendor, file);
  mkdirSync(dirname(to), { recursive: true });
  cpSync(join(source, file), to);
  lock[file] = hash(to);
}
writeFileSync(
  manifestPath,
  `${JSON.stringify({ source: config.source, files: lock }, null, 2)}\n`,
);

const added = unique.filter((f) => !before.has(f));
const changed = unique.filter((f) => before.has(f) && before.get(f) !== lock[f]);
const removed = [...before.keys()].filter((f) => !lock[f]);
console.log(`${unique.length} files vendored from ${config.source}`);
for (const [label, list] of [['added', added], ['changed', changed], ['removed', removed]]) {
  if (list.length > 0) {
    console.log(`\n${label}:\n  ${list.join('\n  ')}`);
  }
}
const externals = Object.keys(result.metafile.outputs).flatMap((o) =>
  result.metafile.outputs[o].imports.filter((i) => i.external).map((i) => i.path),
);
console.log(`\nleft to the page: ${[...new Set(externals)].sort().join(', ')}`);
