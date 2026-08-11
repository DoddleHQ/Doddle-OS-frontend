/**
 * Cron helpers — convert user-friendly sync frequencies to cron expressions.
 *
 * End users should never have to type "0 2 * * *". They pick a frequency from
 * a dropdown and we convert it to the 5-field cron the backend expects.
 */

export type SyncFrequency = 'manual' | 'hourly' | 'every-6h' | 'every-12h' | 'daily';

export interface FrequencyOption {
    value: SyncFrequency;
    label: string;
    /** 5-field cron expression, or null for manual-only. */
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

/** Convert a cron expression back to the closest matching frequency value. */
export function cronToFrequency(cron: string | null | undefined): SyncFrequency {
    if (!cron) return 'manual';
    const match = FREQUENCY_OPTIONS.find((opt) => opt.cron === cron);
    return match?.value || 'daily';
}
