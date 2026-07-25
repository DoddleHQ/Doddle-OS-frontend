'use client';

import React, { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { BarChart3, Store, ArrowRight } from 'lucide-react';

interface AnalyticsTool {
    id: string;
    name: string;
    description: string;
    icon: React.ReactNode;
    gradient: string;
    shadowColor: string;
    hoverBorder: string;
}

const analyticsTools: AnalyticsTool[] = [
    {
        id: 'google-analyst',
        name: 'Google Analyst',
        description: 'AI-powered analytics analysis. Connect GA4 for automated insights and marketing maneuvers.',
        icon: <BarChart3 className="w-6 h-6 text-white" />,
        gradient: 'from-orange-500 to-red-500',
        shadowColor: 'shadow-orange-500/20',
        hoverBorder: 'hover:border-orange-300',
    },
    {
        id: 'merchant-analyst',
        name: 'Merchant Analyst',
        description: 'AI-powered Google Merchant Center analysis. Analyze product feeds, account health, and performance data.',
        icon: <Store className="w-6 h-6 text-white" />,
        gradient: 'from-blue-500 to-indigo-500',
        shadowColor: 'shadow-blue-500/20',
        hoverBorder: 'hover:border-blue-300',
    },
];

export default function AnalyticsActionPage() {
    const params = useParams();
    const router = useRouter();
    const workspaceId = params.workspaceId as string;

    useEffect(() => {
        if (!workspaceId || workspaceId === 'undefined') {
            router.push('/workspaces');
        }
    }, [workspaceId, router]);

    if (!workspaceId || workspaceId === 'undefined') {
        return null;
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold mb-1">Analytics Action</h1>
                <p className="text-muted-foreground">Turning raw data into automated marketing maneuvers</p>
            </div>

            {/* Analytics Tool Cards */}
            <div>
                <h2 className="text-lg font-semibold mb-4">Analytics Tools</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {analyticsTools.map((tool) => (
                        <Link
                            key={tool.id}
                            href={`/workspaces/${workspaceId}/modules/analytics-action/${tool.id}`}
                        >
                            <Card className={`p-5 ${tool.hoverBorder} transition-all cursor-pointer group h-full`}>
                                <div className="flex items-start gap-4">
                                    <div className={`flex-shrink-0 w-12 h-12 bg-gradient-to-tr ${tool.gradient} rounded-xl shadow-lg ${tool.shadowColor} flex items-center justify-center group-hover:scale-105 transition-transform`}>
                                        {tool.icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-slate-900 mb-1">{tool.name}</h3>
                                        <p className="text-sm text-muted-foreground line-clamp-2">
                                            {tool.description}
                                        </p>
                                    </div>
                                    <ArrowRight className="h-5 w-5 text-muted-foreground mt-1 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </Card>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
