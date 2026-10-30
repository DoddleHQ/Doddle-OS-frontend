'use client';

import { create } from 'zustand';

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

export const notify = (message: string, type: NotificationType = 'info') => {
    useNotificationStore.getState().notify(message, type);
};
