export type SyncFrequency = 'manual' | 'hourly' | 'every-6h' | 'every-12h' | 'daily';

export interface FrequencyOption {
    value: SyncFrequency;
    label: string;
    cron: string | null;
    description: string;
}

export const FREQUENCY_OPTIONS: FrequencyOption[] = [
    { value: 'daily', label: 'Daily (2:00 AM)', cron: '0 2 * * *', description: 'Once a day at 2:00 AM UTC' },
    { value: 'every-12h', label: 'Every 12 hours', cron: '0 */12 * * *', description: 'Twice a day' },
    { value: 'every-6h', label: 'Every 6 hours', cron: '0 */6 * * *', description: 'Four times a day' },
    { value: 'hourly', label: 'Hourly', cron: '0 * * * *', description: 'Every hour' },
    { value: 'manual', label: 'Manual only', cron: null, description: 'No automatic sync — trigger manually' },
];

export function cronToFrequency(cron: string | null | undefined): SyncFrequency {
    if (!cron) return 'manual';
    const match = FREQUENCY_OPTIONS.find((opt) => opt.cron === cron);
    return match?.value || 'daily';
}
