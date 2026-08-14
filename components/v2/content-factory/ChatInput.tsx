'use client';

import { useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { Send } from 'lucide-react';

const EASE = [0.16, 1, 0.3, 1] as const;

/*
 * ChatInput — v2 Specimen Terminal input bar.
 *
 * Paper-register translucent surface, vermilion send button when there's text.
 * Operate mode: single sans, accent only on the active send button.
 */

interface ChatInputProps {
    onSend: (message: string) => void;
    disabled?: boolean;
    placeholder?: string;
}

export function ChatInput({ onSend, disabled = false, placeholder = 'Enter your website URL...' }: ChatInputProps) {
    const [value, setValue] = useState('');

    const handleSubmit = useCallback(() => {
        const trimmed = value.trim();
        if (!trimmed || disabled) return;
        onSend(trimmed);
        setValue('');
    }, [value, disabled, onSend]);

    return (
        <div
            className="flex items-center gap-2 p-1.5 rounded-[14px]"
            style={{
                background: 'rgba(255,255,255,0.5)',
                border: '1px solid var(--v2-paper-rule)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
            }}
        >
            <input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit();
                    }
                }}
                placeholder={placeholder}
                disabled={disabled}
                className="flex-1 bg-transparent px-3.5 py-2.5 outline-none"
                style={{
                    fontFamily: 'var(--v2-font-sans)',
                    fontSize: '0.82rem',
                    color: 'var(--v2-paper-ink)',
                }}
            />
            <motion.button
                onClick={handleSubmit}
                disabled={disabled || !value.trim()}
                whileTap={{ scale: disabled || !value.trim() ? 1 : 0.92 }}
                transition={{ duration: 0.1 }}
                className="w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0 transition-colors"
                style={{
                    background: value.trim() && !disabled ? 'var(--v2-vermilion)' : 'var(--v2-paper-rule-strong)',
                    color: 'var(--v2-vermilion-ink)',
                    opacity: disabled || !value.trim() ? 0.4 : 1,
                }}
                aria-label="Send"
            >
                <Send className="w-4 h-4" />
            </motion.button>
        </div>
    );
}
