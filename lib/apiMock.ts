import { Module, Thread, Agent, Event } from '@/data/mockData';
import { mockMissionControlData as missionControlData } from '@/data/missionControl';
import { mockSEOThreads, mockSEOMetrics } from '@/data/seoCluster';
import { contentThreads, contentFactoryMetrics } from '@/data/contentFactory';
import { socialThreads, socialMetrics } from '@/data/socialGrowth';
import { saasLaunchOpsThreads, saasLaunchOpsMetrics } from '@/data/saasLaunchOps';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const randomDelay = (min: number = 800, max: number = 1500) => {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return delay(ms);
};

export async function getModule(id: string): Promise<Module & { metrics?: any; threads?: any[] }> {
  await randomDelay(900, 1400);

  const result: Module & { metrics?: any; threads?: any[] } = {
    id,
    name: id.replace(/_/g, ' '),
    description: '',
    activeThreadsCount: 0,
  };
  
  switch (id) {
    case 'SEO_Cluster':
      return { ...result, name: 'SEO Cluster', description: 'Search engine optimization', metrics: mockSEOMetrics, threads: mockSEOThreads };
    case 'Content_Factory':
      return { ...result, name: 'Content Factory', description: 'Content creation pipeline', metrics: contentFactoryMetrics, threads: contentThreads };
    case 'Social_Growth':
      return { ...result, name: 'Social Growth', description: 'Social media amplification', metrics: socialMetrics, threads: socialThreads };
    case 'SaaS_Launch_Ops':
      return { ...result, name: 'SaaS Launch Ops', description: 'Product launch operations', metrics: saasLaunchOpsMetrics, threads: saasLaunchOpsThreads };
    default:
      return { ...result, metrics: {}, threads: [] };
  }
}

export async function getThread(id: string): Promise<Thread> {
  await randomDelay(1000, 1500);
  
  const allThreads = [
    ...mockSEOThreads,
    ...contentThreads,
    ...socialThreads,
    ...saasLaunchOpsThreads
  ];
  
  const thread = allThreads.find(t => t.id === id);
  
  if (!thread) {
    throw new Error(`Thread with id "${id}" not found`);
  }
  
  return thread as Thread;
}

export async function postCommand(threadId: string, text: string): Promise<Thread> {
  await randomDelay(500, 1000);
  
  const userAgent: Agent = {
    id: 'user-001',
    name: 'You',
    role: 'User',
    avatar: '👤',
    metrics: {
      accuracy: 100,
      latency: 0
    }
  };
  
  const newEvent: Event = {
    type: 'message',
    timestamp: new Date().toISOString(),
    agent: userAgent,
    content: text,
    meta: {
      source: 'user_command'
    }
  };
  
  const thread = await getThread(threadId);
  thread.events = [...thread.events, newEvent];
  
  return thread;
}

export async function getMissionControlData(workspaceId: string) {
  await randomDelay(800, 1300);
  return missionControlData;
}
