#!/usr/bin/env node
import { Command } from 'commander';
import { resolve } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { buildServer } from './app.js';
import { parseTokenString } from './auth.js';

const program = new Command();
program
  .name('skilltree-server')
  .description('Phase 5 enterprise-readiness preview HTTP server.')
  .argument('<ir-dir>', 'directory containing tree.ir.json (from `skilltree build`)')
  .option('-p, --port <port>', 'HTTP port', (v) => parseInt(v, 10), 7748)
  .option(
    '-d, --db <path>',
    'SQLite file path (use :memory: for ephemeral)',
    './skilltree-server.db',
  )
  .option(
    '-t, --tokens <spec>',
    'Token spec: comma-separated token:role:user_id. Defaults to TOKENS env var.',
  )
  .option('--tokens-file <path>', 'Read token spec from file instead of --tokens/$TOKENS')
  .action(
    async (
      irDir: string,
      opts: { port: number; db: string; tokens?: string; tokensFile?: string },
    ) => {
      const resolvedIrDir = resolve(process.cwd(), irDir);
      if (!existsSync(resolve(resolvedIrDir, 'tree.ir.json'))) {
        process.stderr.write(
          `tree.ir.json not found in ${resolvedIrDir}. Run \`skilltree build\` first.\n`,
        );
        process.exit(1);
      }
      const tokenSpec =
        opts.tokens ??
        (opts.tokensFile
          ? readFileSync(resolve(process.cwd(), opts.tokensFile), 'utf8')
          : process.env.TOKENS);
      if (!tokenSpec || !tokenSpec.trim()) {
        process.stderr.write(
          'no tokens configured. Provide --tokens, --tokens-file, or set $TOKENS.\n' +
            'Example: --tokens "alice-secret:author:alice,bob-secret:learner:bob"\n',
        );
        process.exit(1);
      }
      const auth = parseTokenString(tokenSpec);

      const app = buildServer({
        irDir: resolvedIrDir,
        dbPath: opts.db === ':memory:' ? ':memory:' : resolve(process.cwd(), opts.db),
        auth,
        logger: true,
      });

      try {
        const addr = await app.listen({ port: opts.port, host: '0.0.0.0' });
        process.stdout.write(`skilltree-server listening on ${addr}\n`);
        process.stdout.write(`  IR dir: ${resolvedIrDir}\n`);
        process.stdout.write(`  DB:     ${opts.db}\n`);
        process.stdout.write(`  tokens: ${auth.tokens.size} configured\n`);
      } catch (err) {
        process.stderr.write(
          `failed to start: ${err instanceof Error ? err.message : String(err)}\n`,
        );
        process.exit(1);
      }
    },
  );

program.parseAsync(process.argv).catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
