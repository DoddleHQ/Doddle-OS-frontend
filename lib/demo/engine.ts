import { useOS } from './osStore';
import { SQL_ARTIFACT } from './data';
import type { TriageItem } from './types';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const engine = { abortAll: false };
const killRequested = new Set<string>();

class Aborted extends Error {}
function chk(threadId: string) {
  if (engine.abortAll || killRequested.has(threadId)) throw new Aborted('aborted');
}
async function guard(threadId: string, ms: number) {
  await sleep(ms);
  chk(threadId);
}

function requestWriteScope(): Promise<boolean> {
  return new Promise((resolve) => {
    const s = useOS.getState();
    const item: TriageItem = {
      id: `gate-${Date.now()}`,
      kind: 'approval',
      tag: 'APPROVAL_REQ · human_in_loop',
      title: 'ClickHouse write scope',
      desc: 'Grant @Data_Wrangler write scope on gsc_local_audits? Escalation raised mid-stream during buffer commit.',
      preview: `GRANT INSERT, SELECT ON gsc_local_audits TO 'wrangler_rw';`,
      onApprove: () => resolve(true),
      onReject: () => resolve(false),
    };
    useOS.setState({ triage: [item, ...s.triage] });
    s.pushToast('@Sec_Sentinel needs your approval', 'warn');
    useOS.getState().pushFeed({
      kind: 'gate',
      id: `f-gate-${Date.now()}`,
      triageId: item.id,
      text: `Grant @Data_Wrangler write scope on gsc_local_audits? Escalation raised mid-stream during buffer commit.`,
      preview: `GRANT INSERT, SELECT ON gsc_local_audits TO 'wrangler_rw';`,
      ts: new Date().toLocaleTimeString([], { hour12: false }),
    });
  });
}

async function runInfra() {
  const s = useOS.getState();
  s.setThreadStatus('infra', 'running');
  try {
    s.pushThreadLog('infra', 'Initializing architecture evaluation...', 'prompt');
    await guard('infra', 700);
    s.pushThreadLog('infra', 'Benchmarking ClickHouse node (local)... latency 8ms.');
    await guard('infra', 550);
    s.pushThreadLog('infra', 'DECISION: ClickHouse selected for optimal local IOPS.', 'success');
    s.pushThreadLog('infra', 'Compiling DDL schema...', 'prompt');
    await guard('infra', 650);
    s.setThreadStatus('infra', 'done');
  } catch {
    useOS.getState().setThreadStatus('infra', 'aborted');
    useOS.getState().pushThreadLog('infra', 'Thread aborted by operator.', 'warn');
  }
}

async function runSec() {
  const s = useOS.getState();
  s.setThreadStatus('sec', 'running');
  try {
    s.pushThreadLog('sec', 'Connecting to local credential vault...', 'prompt');
    await guard('sec', 550);
    s.pushThreadLog('sec', 'Scanning in-memory hashes for Acme SaaS namespace...');
    await guard('sec', 650);
    s.pushThreadLog('sec', '12 Active API JSONs mapped to memory vectors.');
    await guard('sec', 450);
    s.pushThreadLog('sec', 'Intercept proxy active. External parameters secured.', 'success');
    s.setThreadStatus('sec', 'done');
  } catch {
    useOS.getState().setThreadStatus('sec', 'aborted');
    useOS.getState().pushThreadLog('sec', 'Thread aborted by operator.', 'warn');
  }
}

async function runData(infraRun: Promise<void>, secRun: Promise<void>) {
  const s = useOS.getState();
  s.setThreadStatus('data', 'running');
  try {
    s.pushThreadLog('data', 'Awaiting Infra and Security handshakes...', 'prompt');
    await Promise.all([infraRun, secRun]);
    chk('data');
    await guard('data', 250);
    useOS.getState().pushThreadLog('data', 'Handshakes received. Establishing API tunnel.', 'success');
    await guard('data', 350);
    useOS.getState().pushThreadLog('data', 'Escalation: write scope required for buffer commits.', 'warn');
    await guard('data', 400);
    const approved = await requestWriteScope();
    chk('data');
    const st = useOS.getState();
    if (!approved) throw new Error('denied');
    st.pushThreadLog('data', 'Scope granted. Opening API tunnel.', 'success');
    st.pushThreadLog('data', 'Initiating live metric stream to ClickHouse buffer...', 'prompt');
    await guard('data', 900);
    useOS.getState().pushThreadLog('data', 'Stream closed. 24,500 records committed.', 'success');
    useOS.getState().setThreadStatus('data', 'done');
  } catch (e) {
    const st = useOS.getState();
    if (e instanceof Error && e.message === 'denied') {
      st.setThreadStatus('data', 'failed');
      st.pushThreadLog('data', 'REJECTED: write scope denied by operator. Halting stream.', 'error');
      st.addTriage({
        id: `breaker-${Date.now()}`,
        kind: 'breaker',
        tag: 'CIRCUIT_BREAKER',
        title: 'mcp_stream halted',
        desc: '@Data_Wrangler was denied ClickHouse write scope. Circuit breaker froze the swarm state for review.',
      });
    } else {
      st.setThreadStatus('data', 'aborted');
      st.pushThreadLog('data', 'Thread aborted by operator.', 'warn');
    }
  }
}

export async function startRun(prompt: string) {
  const s = useOS.getState();
  if (s.runActive) return;

  if (s.runStartedAt) s.archiveRun();

  engine.abortAll = false;
  killRequested.clear();
  s.beginRun(prompt);
  s.pushToast('Swarm spawned — 3 threads decomposed by @Dod_Orchestrator', 'info');
  const ts = () => new Date().toLocaleTimeString([], { hour12: false });
  useOS.getState().pushFeed({
    kind: 'system',
    id: `f-sys-${Date.now()}`,
    text: 'Pipeline decomposed into 3 parallel threads. Human approval gate armed before DB writes.',
    ts: ts(),
  });
  useOS.getState().pushFeed({ kind: 'threads', id: `f-threads-${Date.now()}`, ts: ts() });
  useOS.getState().setActiveThread('infra');

  const infraRun = runInfra();
  const secRun = runSec();
  const dataRun = runData(infraRun, secRun);
  await Promise.allSettled([infraRun, secRun, dataRun]);

  const done = useOS.getState();
  const bad = Object.values(done.threads).filter(
    (t) => t.status === 'failed' || t.status === 'aborted',
  );
  done.endRun(bad.length > 0);
  done.pushToast(
    bad.length ? 'Run finished with issues' : 'Swarm run completed',
    bad.length ? 'error' : 'success',
  );
  useOS.getState().pushFeed({
    kind: 'summary',
    id: `f-sum-${Date.now()}`,
    ok: bad.length === 0,
    text: bad.length === 0
      ? 'All threads finished. Select a thread block to review artifacts.'
      : `${bad.length} thread(s) did not finish (${bad.map((t) => t.title).join(', ')}). State frozen — see triage_queue.`,
    ts: new Date().toLocaleTimeString([], { hour12: false }),
  });
}

export function abortRun() {
  if (!useOS.getState().runActive) return;
  engine.abortAll = true;
  useOS.getState().pushToast('SIGKILL sent to all threads', 'error');
}

export function killThread(id: string) {
  const t = useOS.getState().threads[id];
  if (!t || t.status !== 'running') return;
  killRequested.add(id);
  useOS.getState().pushToast(`Kill signal sent to ${t.title}`, 'warn');
}

export const DEMO_ARTIFACT = SQL_ARTIFACT;
