// @echozedlabs/techtree-server
// Phase 5 — Enterprise Readiness Preview.
// Thin HTTP server that serves the compiled IR and implements the StateAdapter
// interface against a SQLite-backed store. Two hardcoded roles (`author`,
// `learner`) authenticated via a token-in-header. See docs/high-level-plan.md §8 Phase 5.

export { buildServer, type BuildServerOptions } from './app.js';
export { SqliteStateStore } from './store.js';
export { type AuthConfig, type Role, type Principal } from './auth.js';
