import { Module, Thread, Agent, Event } from '@/data/mockData';
import { mockMissionControlData as missionControlData } from '@/data/missionControl';
import { mockSEOThreads, mockSEOMetrics } from '@/data/seoCluster';
import { contentThreads, contentFactoryMetrics } from '@/data/contentFactory';
import { socialThreads, socialMetrics } from '@/data/socialGrowth';
import { saasLaunchOpsThreads, saasLaunchOpsMetrics } from '@/data/saasLaunchOps';

// Helper function to simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Random delay between min and max milliseconds
const randomDelay = (min: number = 800, max: number = 1500) => {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return delay(ms);
};

/**
 * Fetches a module by ID
 * @param id - The module identifier
 * @returns Promise resolving to the Module object with additional metadata
 */
export async function getModule(id: string): Promise<Module & { metrics?: any; threads?: any[] }> {
  await randomDelay(900, 1400);

  // Add module-specific data based on the module ID
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

/**
 * Fetches a thread by ID
 * @param id - The thread identifier
 * @returns Promise resolving to the Thread object
 */
export async function getThread(id: string): Promise<Thread> {
  await randomDelay(1000, 1500);
  
  // Search for the thread across all module data
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
  
  // Type assertion to handle different thread types in mock data
  return thread as Thread;
}

/**
 * Posts a command to a thread
 * @param threadId - The thread identifier
 * @param text - The command text to post
 * @returns Promise resolving to the updated Thread object
 */
export async function postCommand(threadId: string, text: string): Promise<Thread> {
  await randomDelay(500, 1000);
  
  // Create a mock user agent
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
  
  // Create a new message event
  const newEvent: Event = {
    type: 'message',
    timestamp: new Date().toISOString(),
    agent: userAgent,
    content: text,
    meta: {
      source: 'user_command'
    }
  };
  
  // Get the current thread and add the new event
  const thread = await getThread(threadId);
  thread.events = [...thread.events, newEvent];
  
  return thread;
}

/**
 * Fetches mission control data for a workspace
 * @param workspaceId - The workspace identifier
 * @returns Promise resolving to mission control data
 */
export async function getMissionControlData(workspaceId: string) {
  await randomDelay(800, 1300);
  return missionControlData;
}
