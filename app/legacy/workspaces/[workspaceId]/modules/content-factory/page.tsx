'use client';

import React, { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { PenTool, Globe, ArrowRight, Layout } from 'lucide-react';

interface GraphTool {
    id: string;
    name: string;
    description: string;
    icon: React.ReactNode;
    gradient: string;
    shadowColor: string;
    hoverBorder: string;
}

const graphTools: GraphTool[] = [
    {
        id: 'content-architect',
        name: 'Content Architect',
        description: 'AI-powered content analysis and generation. Enter a website URL to analyze and generate optimized content strategies.',
        icon: <Globe className="w-6 h-6 text-white" />,
        gradient: 'from-blue-600 to-indigo-500',
        shadowColor: 'shadow-blue-500/20',
        hoverBorder: 'hover:border-blue-300',
    },
    {
        id: 'magento-content-writer',
        name: 'Magento Content Writer',
        description: 'Write content for product, category, and collection pages — and push directly to Magento.',
        icon: <PenTool className="w-6 h-6 text-white" />,
        gradient: 'from-purple-600 to-pink-500',
        shadowColor: 'shadow-purple-500/20',
        hoverBorder: 'hover:border-purple-300',
    },
    {
        id: 'interactive-website-architect',
        name: 'Interactive Website Architect',
        description: 'Design and build interactive websites with AI-powered architecture and real-time collaboration.',
        icon: <Layout className="w-6 h-6 text-white" />,
        gradient: 'from-emerald-600 to-teal-500',
        shadowColor: 'shadow-emerald-500/20',
        hoverBorder: 'hover:border-emerald-300',
    },
];

export default function ContentFactoryPage() {
    const params = useParams();
    const router = useRouter();
    const workspaceId = params.workspaceId as string;

    useEffect(() => {
        if (!workspaceId || workspaceId === 'undefined') {
            router.push('/legacy/workspaces');
        }
    }, [workspaceId, router]);

    if (!workspaceId || workspaceId === 'undefined') {
        return null;
    }

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold mb-1">Content Factory</h1>
                <p className="text-muted-foreground">Choose a graph tool to start creating content</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {graphTools.map((tool) => (
                    <Link
                        key={tool.id}
                        href={`/legacy/workspaces/${workspaceId}/modules/content-factory/${tool.id}`}
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
    );
}
