#!/usr/bin/env -S npx tsx
import { existsSync, mkdirSync, readFileSync, watch, writeFileSync } from 'node:fs';
import { createServer, type ServerResponse } from 'node:http';
import { dirname, isAbsolute, resolve } from 'node:path';
import chalk from 'chalk';
import { Command } from 'commander';
import {
  deriveStatuses,
  emptyState,
  treeStateSchema,
  type NodeStatus,
  type TreeState,
} from '@echozedlabs/techtree-state';
import { parse as parseYaml } from 'yaml';
import { jsonSchemas, themeSchema } from '@echozedlabs/techtree-schema';
import {
  compile,
  errorCount,
  formatDiagnostic,
  generateSchemaDocs,
  generateStress,
  generateThemePreview,
  lint,
  loadTree,
  renameInTree,
  skillScaffold,
  stableStringify,
  suggestSkillPath,
  suggestThemePath,
  themeScaffold,
  warningCount,
  type Diagnostic,
  type Profile,
} from './index.js';
import { DEFAULT_PROFILE_ID, getProfile, PROFILES } from './profiles/index.js';

const program = new Command();
program.name('skilltree').description('Skill tree compiler and linter').version('0.1.0');

function colorize(d: Diagnostic, line: string): string {
  if (d.severity === 'error') return chalk.red(line);
  return chalk.yellow(line);
}

function printDiagnostics(diags: readonly Diagnostic[], useColor: boolean): void {
  for (const d of diags) {
    const text = formatDiagnostic(d);
    process.stderr.write((useColor ? colorize(d, text) : text) + '\n');
  }
  const errs = errorCount(diags);
  const warns = warningCount(diags);
  if (errs + warns > 0) {
    const summary = `${errs} error${errs === 1 ? '' : 's'}, ${warns} warning${warns === 1 ? '' : 's'}`;
    process.stderr.write((useColor ? chalk.bold(summary) : summary) + '\n');
  }
}

function invocationCwd(): string {
  // pnpm/npm set INIT_CWD to the directory the user ran the command from.
  // Without this, `pnpm --filter <pkg> cli serve examples/foo` resolves relative
  // to the package dir, not the user's cwd.
  return process.env.INIT_CWD ?? process.cwd();
}

function resolveInputDir(input: string): string {
  return isAbsolute(input) ? input : resolve(invocationCwd(), input);
}

function resolveProfile(id: string | undefined): Profile {
  const profile = getProfile(id ?? DEFAULT_PROFILE_ID);
  if (!profile) {
    process.stderr.write(
      `unknown profile "${id}". Available: ${Object.keys(PROFILES).join(', ')}.\n`,
    );
    process.exit(1);
  }
  return profile;
}

function resolveOutPath(outOpt: string | undefined, defaultPath: string): string {
  if (!outOpt) return defaultPath;
  return isAbsolute(outOpt) ? outOpt : resolve(invocationCwd(), outOpt);
}

program
  .command('build')
  .description('Compile a graph to IR (tree.ir.json)')
  .argument('<input-dir>', 'directory containing tree.yaml and node files')
  .option('-o, --out <path>', 'output IR path (default: <input-dir>/dist/tree.ir.json)')
  .option('-p, --profile <id>', `domain profile (${Object.keys(PROFILES).join(' | ')})`)
  .option('--no-color', 'disable colored output')
  .action(async (input: string, opts: { out?: string; profile?: string; color: boolean }) => {
    const inputDir = resolveInputDir(input);
    const outPath = resolveOutPath(opts.out, resolve(inputDir, 'dist', 'tree.ir.json'));
    const profile = resolveProfile(opts.profile);

    const result = await compile(inputDir, profile);
    printDiagnostics(result.diagnostics, opts.color);

    if (!result.ir) {
      process.stderr.write('build failed — no IR emitted\n');
      process.exit(1);
    }

    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, stableStringify(result.ir) + '\n', 'utf8');
    process.stdout.write(`wrote ${outPath}\n`);
    process.stdout.write(`  skills: ${result.ir.nodes.length}, edges: ${result.ir.edges.length}\n`);
  });

program
  .command('stress')
  .description('Emit a synthetic IR for renderer perf testing (Phase 1.5 bake-off)')
  .requiredOption('-n, --nodes <count>', 'total number of skills', (v) => parseInt(v, 10))
  .option('-e, --eras <count>', 'number of era columns', (v) => parseInt(v, 10), 10)
  .requiredOption('-o, --out <path>', 'output IR path')
  .action((opts: { nodes: number; eras: number; out: string }) => {
    const ir = generateStress({ nodes: opts.nodes, eras: opts.eras });
    const outPath = resolveOutPath(opts.out, opts.out);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, stableStringify(ir) + '\n', 'utf8');
    process.stdout.write(`wrote ${outPath}\n`);
    process.stdout.write(`  nodes: ${ir.nodes.length}, edges: ${ir.edges.length}\n`);
  });

async function runBuild(inputDir: string, outPath: string, useColor: boolean): Promise<boolean> {
  const result = await compile(inputDir);
  printDiagnostics(result.diagnostics, useColor);
  if (!result.ir) {
    process.stderr.write('build failed — no IR emitted\n');
    return false;
  }
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, stableStringify(result.ir) + '\n', 'utf8');
  process.stdout.write(
    `wrote ${outPath} (${result.ir.nodes.length} skills, ${result.ir.edges.length} edges)\n`,
  );
  return true;
}

program
  .command('serve')
  .description(
    'Compile in watch mode. Runs a hot-reload HTTP+SSE server on --port (default 7747) so the viewer can subscribe with ?watch=<port>. Default is deliberately well outside the Vite range (5173-5175) used by the viewer and bake-off demos.',
  )
  .argument('<input-dir>', 'directory containing tree.yaml and *.skill.yaml files')
  .option('-o, --out <path>', 'output IR path (default: <input-dir>/dist/tree.ir.json)')
  .option('--debounce <ms>', 'debounce window for rebuilds in ms', (v) => parseInt(v, 10), 250)
  .option('--port <port>', 'hot-reload HTTP+SSE server port', (v) => parseInt(v, 10), 7747)
  .option('--no-server', 'disable the hot-reload server (file-only watch mode)')
  .option('--no-color', 'disable colored output')
  .action(
    async (
      input: string,
      opts: {
        out?: string;
        debounce: number;
        port: number;
        server: boolean;
        color: boolean;
      },
    ) => {
      const inputDir = resolveInputDir(input);
      const outPath = resolveOutPath(opts.out, resolve(inputDir, 'dist', 'tree.ir.json'));

      process.stdout.write(`watching ${inputDir}\n`);
      await runBuild(inputDir, outPath, opts.color);

      // --- SSE clients + hot-reload HTTP server ---------------------------
      const sseClients = new Set<ServerResponse>();
      const notifyClients = (): void => {
        const payload = `event: ir-updated\ndata: ${JSON.stringify({ at: Date.now() })}\n\n`;
        for (const c of sseClients) {
          try {
            c.write(payload);
          } catch {
            // Client likely disconnected mid-write; will be cleaned up by 'close'.
          }
        }
      };

      let httpServer: ReturnType<typeof createServer> | undefined;
      if (opts.server) {
        httpServer = createServer((req, res) => {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

          if (req.method === 'OPTIONS') {
            res.statusCode = 204;
            res.end();
            return;
          }

          if (req.url?.startsWith('/events')) {
            res.writeHead(200, {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              Connection: 'keep-alive',
              'Access-Control-Allow-Origin': '*',
            });
            res.write('retry: 5000\n\n');
            sseClients.add(res);
            req.on('close', () => sseClients.delete(res));
            return;
          }

          if (req.url === '/' || req.url?.endsWith('.ir.json') || req.url === '/tree.ir.json') {
            if (existsSync(outPath)) {
              res.setHeader('Content-Type', 'application/json');
              res.end(readFileSync(outPath));
            } else {
              res.statusCode = 404;
              res.end('{"error":"IR not yet built"}');
            }
            return;
          }

          res.statusCode = 404;
          res.end('Not found');
        });
        httpServer.on('error', (err: NodeJS.ErrnoException) => {
          if (err.code === 'EADDRINUSE') {
            process.stderr.write(
              `port ${opts.port} is already in use — another process is bound to it ` +
                `(check Vite dev servers, the bake-off viewers, or any other skilltree serve).\n` +
                `Pick a different port with --port <n> or stop the conflicting process.\n`,
            );
            process.exit(1);
          }
          process.stderr.write(`hot-reload server error: ${err.message}\n`);
          process.exit(1);
        });
        httpServer.listen(opts.port, () => {
          process.stdout.write(`hot-reload: http://localhost:${opts.port}/tree.ir.json\n`);
          process.stdout.write(
            `viewer:     http://localhost:5173/?watch=${opts.port}  (pair with \`pnpm viewer\`)\n`,
          );
        });
      } else {
        process.stdout.write(`hot-reload server disabled (--no-server)\n`);
      }

      let timer: NodeJS.Timeout | null = null;
      let inFlight = false;

      const rebuild = (): void => {
        if (inFlight) return;
        if (timer) clearTimeout(timer);
        timer = setTimeout(async () => {
          inFlight = true;
          try {
            const ok = await runBuild(inputDir, outPath, opts.color);
            if (ok) notifyClients();
          } finally {
            inFlight = false;
          }
        }, opts.debounce);
      };

      const watcher = watch(inputDir, { recursive: true }, (_event, filename) => {
        // On Windows, fs.watch can fire events with filename === null
        // (especially for renames/deletes). Be conservative: if we have a
        // filename we can filter to YAML changes; if not, rebuild anyway.
        // The 250ms debounce protects against event storms.
        if (filename) {
          if (filename.includes('dist') || filename.startsWith('.')) return;
          if (!/\.(yaml|yml)$/.test(filename)) return;
        }
        rebuild();
      });

      process.on('SIGINT', () => {
        watcher.close();
        for (const c of sseClients) c.end();
        httpServer?.close();
        process.exit(0);
      });

      // Keep the process alive.
      await new Promise(() => {});
    },
  );

program
  .command('lint')
  .description('Validate and lint a skill tree without emitting IR')
  .argument('<input-dir>', 'directory containing tree.yaml and *.skill.yaml files')
  .option('--no-color', 'disable colored output')
  .action((input: string, opts: { color: boolean }) => {
    const inputDir = resolveInputDir(input);
    const diags = lint(inputDir);
    printDiagnostics(diags, opts.color);
    if (errorCount(diags) > 0) process.exit(1);
  });

const stateCmd = program
  .command('state')
  .description('Per-user achievement state operations (Phase 3)');

stateCmd
  .command('init')
  .description('Create an empty state file for a user against a compiled tree')
  .argument('<tree-dir>', 'directory containing tree.yaml (used to derive tree_id)')
  .requiredOption('-u, --user <id>', 'user id to embed in the state file')
  .option('-o, --out <path>', 'output state path (default: <tree-dir>/<user>.state.json)')
  .option('-p, --primary-path <id>', 'primary progression path for focus-on-load')
  .option('--force', 'overwrite if the state file already exists', false)
  .action(
    async (
      input: string,
      opts: { user: string; out?: string; primaryPath?: string; force: boolean },
    ) => {
      const inputDir = resolveInputDir(input);
      const result = await compile(inputDir);
      if (!result.ir) {
        process.stderr.write('build failed — cannot derive tree_id\n');
        process.exit(1);
      }
      const treeId = result.ir.tree.id;
      const outPath = resolveOutPath(opts.out, resolve(inputDir, `${opts.user}.state.json`));
      if (existsSync(outPath) && !opts.force) {
        process.stderr.write(`refusing to overwrite ${outPath} (use --force)\n`);
        process.exit(1);
      }
      const initial = emptyState(opts.user, treeId, opts.primaryPath);
      mkdirSync(dirname(outPath), { recursive: true });
      writeFileSync(outPath, stableStringify(initial) + '\n', 'utf8');
      process.stdout.write(`wrote ${outPath}\n`);
    },
  );

stateCmd
  .command('list')
  .description('Show derived status (locked/available/in_progress/submitted/achieved) per skill')
  .argument('<tree-dir>', 'directory containing tree.yaml')
  .requiredOption('-s, --state <path>', 'state file path')
  .option('--filter <status>', 'show only one status (e.g. in_progress)')
  .option('--no-color', 'disable colored output')
  .action(async (input: string, opts: { state: string; filter?: string; color: boolean }) => {
    const inputDir = resolveInputDir(input);
    const statePath = isAbsolute(opts.state) ? opts.state : resolve(invocationCwd(), opts.state);
    const result = await compile(inputDir);
    if (!result.ir) {
      process.stderr.write('build failed\n');
      process.exit(1);
    }
    let userState: TreeState | null = null;
    if (existsSync(statePath)) {
      const raw = JSON.parse(readFileSync(statePath, 'utf8')) as unknown;
      userState = treeStateSchema.parse(raw);
    }
    const statuses = deriveStatuses(result.ir, userState);
    const filter = opts.filter as NodeStatus | undefined;
    const statusColor = (s: NodeStatus): ((x: string) => string) => {
      if (!opts.color) return (x) => x;
      switch (s) {
        case 'achieved':
          return chalk.green;
        case 'in_progress':
          return chalk.yellow;
        case 'submitted':
          return chalk.magenta;
        case 'pending_approval':
          return chalk.blueBright;
        case 'rejected':
          return chalk.red;
        case 'available':
          return chalk.cyan;
        case 'locked':
          return chalk.gray;
      }
    };
    for (const n of result.ir.nodes) {
      const s = statuses.get(n.id) ?? 'available';
      if (filter && s !== filter) continue;
      const tag = statusColor(s)(`[${s}]`.padEnd(14));
      process.stdout.write(`${tag} ${n.id}  ${n.title}\n`);
    }
  });

// --- skilltree new ----------------------------------------------------------

const newCmd = program.command('new').description('Scaffold a new skill or theme YAML file');

newCmd
  .command('skill')
  .description('Create a new *.skill.yaml inside a tree from a skeleton')
  .argument('<tree-dir>', 'tree root (skills are placed under <tree-dir>/skills/<era>/...)')
  .argument('<id>', 'skill id (e.g., personal.foundations/typing)')
  .option('-t, --title <title>', 'human-readable title (default: derived from id)')
  .option(
    '-o, --out <path>',
    'override output path (default: <tree-dir>/skills/<last-namespace>/<name>.skill.yaml)',
  )
  .option('--force', 'overwrite if file exists', false)
  .action(
    (treeDirArg: string, id: string, opts: { title?: string; out?: string; force: boolean }) => {
      const treeDir = resolveInputDir(treeDirArg);
      const outPath = opts.out
        ? resolveOutPath(opts.out, opts.out)
        : resolve(invocationCwd(), suggestSkillPath(id, treeDir));
      if (existsSync(outPath) && !opts.force) {
        process.stderr.write(`refusing to overwrite ${outPath} (use --force)\n`);
        process.exit(1);
      }
      mkdirSync(dirname(outPath), { recursive: true });
      writeFileSync(outPath, skillScaffold({ id, title: opts.title }), 'utf8');
      process.stdout.write(`wrote ${outPath}\n`);
    },
  );

newCmd
  .command('theme')
  .description('Create a new *.theme.yaml from a skeleton')
  .argument('<id>', 'theme id (e.g., my-org-dark)')
  .option('-t, --title <title>', 'human-readable title (default: id)')
  .option(
    '-d, --tree-dir <dir>',
    'place the theme inside a tree (default: <cwd>/themes/<id>.theme.yaml)',
  )
  .option('-o, --out <path>', 'fully override the output path')
  .option('--force', 'overwrite if file exists', false)
  .action(
    (id: string, opts: { title?: string; treeDir?: string; out?: string; force: boolean }) => {
      const treeDir = opts.treeDir ? resolveInputDir(opts.treeDir) : undefined;
      const outPath = opts.out
        ? resolveOutPath(opts.out, opts.out)
        : resolve(invocationCwd(), suggestThemePath(id, treeDir));
      if (existsSync(outPath) && !opts.force) {
        process.stderr.write(`refusing to overwrite ${outPath} (use --force)\n`);
        process.exit(1);
      }
      mkdirSync(dirname(outPath), { recursive: true });
      writeFileSync(outPath, themeScaffold({ id, title: opts.title }), 'utf8');
      process.stdout.write(`wrote ${outPath}\n`);
    },
  );

// --- skilltree rename -------------------------------------------------------

program
  .command('rename')
  .description("Rename a skill across a tree (auto-adds old id to that skill's aliases)")
  .argument('<tree-dir>', 'tree root containing tree.yaml + *.skill.yaml files')
  .argument('<old-id>', 'current id of the skill being renamed')
  .argument('<new-id>', 'new id (must satisfy the id format)')
  .option('--no-alias', "skip adding old-id to the renamed skill's aliases")
  .option('--dry-run', 'print the plan without modifying files', false)
  .option('--no-color', 'disable colored output')
  .action(
    (
      input: string,
      oldId: string,
      newId: string,
      opts: { alias: boolean; dryRun: boolean; color: boolean },
    ) => {
      const inputDir = resolveInputDir(input);
      const loaded = loadTree(inputDir);
      const plan = renameInTree(loaded, { oldId, newId, addAlias: opts.alias }, !opts.dryRun);
      printDiagnostics(plan.diagnostics, opts.color);
      if (plan.changes.length === 0 && plan.diagnostics.length === 0) {
        process.stdout.write(`no changes\n`);
      }
      for (const c of plan.changes) {
        process.stdout.write(
          `${opts.dryRun ? '[dry-run] ' : ''}${c.filePath} — ${c.reasons.join(', ')}\n`,
        );
      }
      if (errorCount(plan.diagnostics) > 0) process.exit(1);
    },
  );

// --- skilltree theme --------------------------------------------------------

const themeCmd = program.command('theme').description('Theme authoring tools');

themeCmd
  .command('preview')
  .description(
    'Generate a synthetic preview IR + state that exercises every category x status x edge for a theme. Then run the viewer pointed at the output dir.',
  )
  .argument('<theme-file>', 'path to a *.theme.yaml file')
  .option('-o, --out <dir>', 'output directory (default: <theme-dir>/preview)')
  .action((themeFileArg: string, opts: { out?: string }) => {
    const themePath = isAbsolute(themeFileArg)
      ? themeFileArg
      : resolve(invocationCwd(), themeFileArg);
    if (!existsSync(themePath)) {
      process.stderr.write(`theme file not found: ${themePath}\n`);
      process.exit(1);
    }
    const text = readFileSync(themePath, 'utf8');
    const parsed = themeSchema.safeParse(parseYaml(text));
    if (!parsed.success) {
      process.stderr.write(`theme validation failed:\n`);
      for (const issue of parsed.error.issues) {
        process.stderr.write(`  - ${issue.path.join('.')}: ${issue.message}\n`);
      }
      process.exit(1);
    }
    const theme = parsed.data;
    const outDir = opts.out
      ? isAbsolute(opts.out)
        ? opts.out
        : resolve(invocationCwd(), opts.out)
      : resolve(dirname(themePath), 'preview');
    mkdirSync(outDir, { recursive: true });

    const preview = generateThemePreview(theme);
    const irPath = resolve(outDir, 'tree.ir.json');
    const statePath = resolve(outDir, 'preview.state.json');
    const themeOutPath = resolve(outDir, `${theme.id}.theme.yaml`);

    writeFileSync(irPath, stableStringify(preview.ir) + '\n', 'utf8');
    writeFileSync(statePath, stableStringify(preview.state) + '\n', 'utf8');
    // Copy the theme alongside so the preview is self-contained.
    writeFileSync(themeOutPath, text, 'utf8');

    process.stdout.write(`wrote theme preview to ${outDir}\n`);
    process.stdout.write(`  IR:     ${irPath}\n`);
    process.stdout.write(`  State:  ${statePath}\n`);
    process.stdout.write(`  Theme:  ${themeOutPath}\n`);
    process.stdout.write(
      `\nTo view: copy ${irPath} into packages/viewer/public/ir/preview.ir.json and add it to IR_OPTIONS,\n`,
    );
    process.stdout.write(
      `or in Phase-4 watch mode: \`skilltree serve\` against this preview dir.\n`,
    );
  });

// --- skilltree schema -------------------------------------------------------

const schemaCmd = program
  .command('schema')
  .description('JSON Schema export for IDE tooling (Phase 4)');

schemaCmd
  .command('docs')
  .description('Generate a human-readable markdown reference for the skill / theme / tree schemas')
  .requiredOption('-o, --out <path>', 'output markdown file path')
  .action((opts: { out: string }) => {
    const outPath = isAbsolute(opts.out) ? opts.out : resolve(invocationCwd(), opts.out);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, generateSchemaDocs(), 'utf8');
    process.stdout.write(`wrote ${outPath}\n`);
  });

schemaCmd
  .command('export')
  .description('Write skill / theme / tree JSON Schemas + a README snippet to a directory')
  .requiredOption('-o, --out <dir>', 'output directory')
  .action((opts: { out: string }) => {
    const outDir = isAbsolute(opts.out) ? opts.out : resolve(invocationCwd(), opts.out);
    mkdirSync(outDir, { recursive: true });

    writeFileSync(
      resolve(outDir, 'skill.schema.json'),
      JSON.stringify(jsonSchemas.skill, null, 2) + '\n',
    );
    writeFileSync(
      resolve(outDir, 'theme.schema.json'),
      JSON.stringify(jsonSchemas.theme, null, 2) + '\n',
    );
    writeFileSync(
      resolve(outDir, 'tree.schema.json'),
      JSON.stringify(jsonSchemas.tree, null, 2) + '\n',
    );

    const readme = `# Skill Tree JSON Schemas

Use these schemas in your editor for inline validation and autocomplete on
\`*.skill.yaml\`, \`*.theme.yaml\`, and \`tree.yaml\` files. They are generated
from the Zod definitions in \`@echozedlabs/techtree-schema\` and should be regenerated
whenever that package's schema version bumps.

## VS Code

Install the YAML extension (\`redhat.vscode-yaml\`) and add to your workspace
\`.vscode/settings.json\`:

\`\`\`json
{
  "yaml.schemas": {
    "./schemas/skill.schema.json": ["**/*.skill.yaml", "**/*.skill.yml"],
    "./schemas/theme.schema.json": ["**/*.theme.yaml", "**/*.theme.yml"],
    "./schemas/tree.schema.json":  ["**/tree.yaml", "**/tree.yml"]
  }
}
\`\`\`

(Adjust the schema paths if you exported elsewhere.)

## CI / Pre-commit

These schemas are not the canonical validator — \`skilltree lint\` runs the
full Zod schemas plus semantic lint rules (cycles, orphans, unknown refs).
Use the JSON Schemas for *editor* feedback and \`skilltree lint\` for CI.
`;
    writeFileSync(resolve(outDir, 'README.md'), readme);

    process.stdout.write(`wrote schemas to ${outDir}\n`);
  });

program.parseAsync().catch((err) => {
  process.stderr.write(`unexpected error: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(2);
});
