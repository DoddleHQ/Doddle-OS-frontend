'use client';

import { CommandDesk } from '@/components/demo/dashboard/CommandDesk';
import { StateBoard } from '@/components/demo/dashboard/StateBoard';

export default function DemoDashboardPage() {
  return (
    <div className="absolute inset-0 flex flex-col lg:flex-row z-20 fade-in">
      <CommandDesk />
      <StateBoard />
    </div>
  );
}
