'use client';

import { CommandDesk } from '@/components/demo/dashboard/CommandDesk';
import { StateBoard } from '@/components/demo/dashboard/StateBoard';

export default function DemoDashboardPage() {
  return (
    <div className="absolute inset-0 z-20 fade-in flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">
      <CommandDesk />
      <StateBoard />
    </div>
  );
}
