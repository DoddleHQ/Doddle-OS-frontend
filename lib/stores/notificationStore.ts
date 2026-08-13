'use client';

import { create } from 'zustand';

/*
 * Notification store — lightweight v2 replacement for react-toastify.
 *
 * Usage:
 *   import { notify } from '@/lib/stores/notificationStore';
 *   notify('Workspace created', 'success');
 *   notify('Failed to save', 'error');
 *
 * The <Notifications /> component (mounted once in providers) renders
 * the active notifications and auto-dismisses them after 4s.
 */

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
    id: string;
    message: string;
    type: NotificationType;
}

interface NotificationState {
    notifications: Notification[];
    notify: (message: string, type?: NotificationType) => void;
    dismiss: (id: string) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
    notifications: [],

    notify: (message, type = 'info') => {
        const id = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        set((prev) => ({
            notifications: [...prev.notifications, { id, message, type }],
        }));
        // Auto-dismiss after 4s
        setTimeout(() => {
            set((prev) => ({
                notifications: prev.notifications.filter((n) => n.id !== id),
            }));
        }, 4000);
    },

    dismiss: (id) => {
        set((prev) => ({
            notifications: prev.notifications.filter((n) => n.id !== id),
        }));
    },
}));

/** Convenience function for imperative use outside React components */
export const notify = (message: string, type: NotificationType = 'info') => {
    useNotificationStore.getState().notify(message, type);
};
