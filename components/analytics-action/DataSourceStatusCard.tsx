'use client';

import { Card } from '@/components/ui/Card';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

type DataSourceStatus = 'connected' | 'syncing' | 'disconnected' | 'error';

interface DataSource {
    name: string;
    status: DataSourceStatus;
    detail?: string;
}

interface DataSourceStatusCardProps {
    sources?: DataSource[];
}

const defaultSources: DataSource[] = [
    { name: 'Meta Ads', status: 'connected' },
    { name: 'GA4', status: 'syncing', detail: 'Syncing...' },
    { name: 'Shopify', status: 'connected' },
];

function StatusIcon({ status }: { status: DataSourceStatus }) {
    switch (status) {
        case 'connected':
            return <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />;
        case 'syncing':
            return <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin" />;
        case 'error':
            return <AlertCircle className="w-3.5 h-3.5 text-red-500" />;
        case 'disconnected':
        default:
            return <AlertCircle className="w-3.5 h-3.5 text-slate-400" />;
    }
}

function StatusLabel({ status }: { status: DataSourceStatus }) {
    const config = {
        connected: { label: 'Connected', className: 'text-emerald-600' },
        syncing: { label: 'Syncing...', className: 'text-amber-600' },
        error: { label: 'Error', className: 'text-red-600' },
        disconnected: { label: 'Disconnected', className: 'text-slate-500' },
    };

    const { label, className } = config[status];
    return <span className={`text-xs ${className}`}>{label}</span>;
}

export function DataSourceStatusCard({ sources = defaultSources }: DataSourceStatusCardProps) {
    const connectedCount = sources.filter(s => s.status === 'connected').length;

    return (
        <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-neutral-900">Data Sources</h3>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {connectedCount}/{sources.length} connected
                </div>
            </div>
            <div className="flex gap-2 flex-wrap">
                {sources.map((source) => (
                    <div
                        key={source.name}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-50 border border-neutral-200"
                    >
                        <StatusIcon status={source.status} />
                        <span className="text-sm text-neutral-700">{source.name}</span>
                        <StatusLabel status={source.status} />
                    </div>
                ))}
            </div>
        </Card>
    );
}
