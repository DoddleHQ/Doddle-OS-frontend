#!/usr/bin/env node
/**
 * Backfill workspace_id onto legacy power-agent threads.
 *
 * BEFORE the workspace-scoping fix, threads created by /api/power-agents/*
 * carried only agent_key metadata. After the fix, every session list filters
 * on workspace_id — so legacy threads match no workspace and disappear from
 * the UI (they still exist on the LangGraph server). This script patches
 * workspace_id into their metadata so they become visible again.
 *
 * Usage:
 *   node scripts/backfill-thread-workspace.mjs \
 *     --langgraph-url http://langgraph:2024 \
 *     --token <bearer-token-the-server-accepts> \
 *     --workspace <workspaceId-to-assign> \
 *     [--apply]            # without it, runs as a dry-run report only
 *     [--map agent_key=workspaceId ...]   # per-agent overrides
 *
 * Safety:
 *   - Dry-run by default; prints what it would change.
 *   - Only touches threads that HAVE agent_key and LACK workspace_id.
 *     Threads from other flows (content-factory links its LangGraph threads
 *     via the DB) are left untouched.
 *   - Metadata PATCH merges keys, so agent_key/title/assistant_id survive.
 *
 * Run this BEFORE deploying the frontend fix (the old UI doesn't filter, so
 * patched threads stay visible during the transition either way).
 */

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const APPLY = args.includes('--apply');

const baseUrl = flag('langgraph-url')?.replace(/\/$/, '');
const token = flag('token');
const defaultWorkspace = flag('workspace');
// collect everything after each --map flag: --map agent=workspaceId
const perAgent = {};
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--map' && args[i + 1]?.includes('=')) {
    const [agent, ws] = args[i + 1].split('=');
    perAgent[agent] = ws;
  }
}

if (!baseUrl || !token || (!defaultWorkspace && Object.keys(perAgent).length === 0)) {
  console.error('Required: --langgraph-url, --token, and --workspace (and/or --map agent=workspaceId)');
  process.exit(1);
}

const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

async function searchPage(offset) {
  const res = await fetch(`${baseUrl}/threads/search`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ limit: 100, offset, sort_by: 'updated_at', sort_order: 'desc' }),
  });
  if (!res.ok) throw new Error(`threads/search ${res.status}: ${await res.text()}`);
  return res.json();
}

async function patchThread(id, workspaceId) {
  const res = await fetch(`${baseUrl}/threads/${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ metadata: { workspace_id: workspaceId } }),
  });
  if (!res.ok) throw new Error(`threads/${id} PATCH ${res.status}: ${await res.text()}`);
}

async function main() {
  console.log(`${APPLY ? 'APPLY' : 'DRY RUN'} — legacy power-agent threads on ${baseUrl}`);
  if (defaultWorkspace) console.log(`default workspace: ${defaultWorkspace}`);
  const overrides = Object.entries(perAgent);
  if (overrides.length) console.log(`per-agent overrides: ${overrides.map(([a, w]) => `${a} -> ${w}`).join(', ')}`);

  const legacy = [];
  let offset = 0;
  for (;;) {
    const page = await searchPage(offset);
    for (const t of page) {
      const md = t.metadata || {};
      if ('agent_key' in md && !('workspace_id' in md)) legacy.push(t);
    }
    if (page.length < 100) break;
    offset += 100;
  }

  if (legacy.length === 0) {
    console.log('No legacy threads found (everything with agent_key already has workspace_id).');
    return;
  }

  let patched = 0;
  let skipped = 0;
  for (const t of legacy) {
    const agent = t.metadata.agent_key;
    const target = perAgent[agent] ?? defaultWorkspace;
    const title = t.metadata.title ?? 'untitled';
    if (!target) {
      console.log(`  SKIP   ${t.thread_id.slice(0, 8)}  [${agent}] "${title}" — no workspace mapping`);
      skipped++;
      continue;
    }
    console.log(`  ${APPLY ? 'PATCH ' : 'WOULD '} ${t.thread_id.slice(0, 8)}  [${agent}] "${title}" -> ${target}`);
    if (APPLY) {
      await patchThread(t.thread_id, target);
      patched++;
    }
  }

  console.log(`\n${legacy.length} legacy thread(s); ${APPLY ? `${patched} patched` : `${legacy.length - skipped} would be patched`}, ${skipped} skipped.`);
  if (!APPLY) console.log('Re-run with --apply to write the metadata.');
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
