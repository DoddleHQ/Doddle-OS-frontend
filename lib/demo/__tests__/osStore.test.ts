import { aggregateStatus, progressPct, runCost, useOS } from '../osStore';
import type { ThreadState } from '../types';

const thread = (over: Partial<ThreadState>): ThreadState => ({
  id: 't',
  title: 'thread',
  agentId: 'data',
  objective: '',
  status: 'queued',
  progress: 0,
  tokens: 0,
  steps: 4,
  logs: [],
  startedAt: null,
  endedAt: null,
  ...over,
});

describe('progressPct', () => {
  it('is 0 before any logs and 100 when done', () => {
    expect(progressPct(0, 4, 'queued')).toBe(0);
    expect(progressPct(2, 4, 'running')).toBe(50);
    expect(progressPct(2, 4, 'done')).toBe(100);
  });

  it('caps at 95 while still running', () => {
    expect(progressPct(8, 4, 'running')).toBe(95);
  });
});

describe('runCost', () => {
  it('prices tokens at 4e-6 USD each', () => {
    expect(runCost(250_000)).toBeCloseTo(1, 5);
    expect(runCost(0)).toBe(0);
  });
});

describe('aggregateStatus', () => {
  it('reports running while any thread runs', () => {
    const threads = [thread({ status: 'done' }), thread({ status: 'running' })];
    expect(aggregateStatus(threads)).toBe('running');
  });

  it('reports completed only when every thread is done', () => {
    expect(aggregateStatus([thread({ status: 'done' }), thread({ status: 'done' })])).toBe('completed');
    expect(aggregateStatus([thread({ status: 'done' }), thread({ status: 'failed' })])).toBe('halted');
    expect(aggregateStatus([thread({ status: 'done' }), thread({ status: 'aborted' })])).toBe('halted');
    expect(aggregateStatus([])).toBe('idle');
  });
});

describe('osStore triage + toasts', () => {
  beforeEach(() => {
    useOS.setState({ triage: [], toasts: [] });
  });

  it('resolves static triage cards and removes them from the queue', () => {
    useOS.getState().addTriage({ id: 'a', kind: 'breaker', tag: 'CIRCUIT_BREAKER', title: 't', desc: 'd' });
    expect(useOS.getState().triage).toHaveLength(1);

    useOS.getState().resolveTriage('a', 'restarted');
    expect(useOS.getState().triage).toHaveLength(0);
  });

  it('fires engine callbacks on resolve', () => {
    const onApprove = jest.fn();
    useOS.setState({ triage: [{ id: 'g', kind: 'approval', tag: 'APPROVAL_REQ', title: 't', desc: 'd', onApprove }] });
    useOS.getState().resolveTriage('g', 'approved');
    expect(onApprove).toHaveBeenCalledTimes(1);
  });

  it('keeps at most four toasts', () => {
    jest.useFakeTimers();
    for (let i = 0; i < 6; i++) useOS.getState().pushToast(`msg-${i}`);
    expect(useOS.getState().toasts).toHaveLength(4);
    expect(useOS.getState().toasts[0].msg).toBe('msg-2');
    jest.useRealTimers();
  });
});
