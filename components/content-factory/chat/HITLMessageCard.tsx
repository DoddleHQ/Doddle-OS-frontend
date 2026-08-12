'use client';

import React, { useState, useEffect } from 'react';
import { HITLOption, HITLRequestPayload } from '@/lib/types/graph-events.types';
import MarkdownRenderer from './artifacts/MarkdownRenderer';

interface HITLMessageCardProps {
    request: HITLRequestPayload;
    onRespond: (response: Record<string, unknown>) => void;
    onAppendToInput?: (text: string) => void;
    disabled?: boolean;
}

export default function HITLMessageCard({ request, onRespond, onAppendToInput, disabled = false }: HITLMessageCardProps) {
    const [selectedOptions, setSelectedOptions] = useState<unknown[]>([]);
    const [feedbackText, setFeedbackText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const isDisabled = disabled || isSubmitted;
    const [pageFeedback, setPageFeedback] = useState<Record<string, string>>({});

    // Structured field values for data_input with fields
    const fields = Array.isArray(request.data?.fields)
        ? request.data.fields as Array<{ key: string; label: string; type: string; placeholder?: string; required?: boolean }>
        : null;
    const [fieldValues, setFieldValues] = useState<Record<string, string>>(() => {
        if (!fields) return {};
        const initial: Record<string, string> = {};
        for (const field of fields) {
            initial[field.key] = '';
        }
        return initial;
    });

    useEffect(() => {
        if (request.default !== undefined) {
            const maxSel = (request.data?.max_selections as number) || 5;
            const validValues = request.options?.map(opt => opt.value) || [];
            if (Array.isArray(request.default)) {
                const validDefaults = request.default.filter(v => validValues.length === 0 || validValues.includes(v));
                setSelectedOptions(validDefaults.slice(0, maxSel));
            } else {
                if (validValues.length === 0 || validValues.includes(request.default)) {
                    setSelectedOptions([request.default]);
                }
            }
        }
    }, [request.default, request.options, request.data?.max_selections]);

    const handleConfirmation = (confirmed: boolean) => {
        setIsSubmitting(true);
        onRespond({ confirmed });
        setIsSubmitted(true);
    };

    const handleSelection = (isMulti: boolean = false) => {
        if (selectedOptions.length === 0) return;
        setIsSubmitting(true);
        if (isMulti) {
            // For multi-select, append comma-separated values to chat input
            const selectedValues = request.options
                ?.filter(opt => selectedOptions.includes(opt.value))
                .map(opt => String(opt.value)) || [];
            if (onAppendToInput) {
                onAppendToInput(selectedValues.join(', '));
            } else {
                // Send both 'value' and 'selected' keys — different backend graphs
                // check different keys (content_architect niche selection checks
                // 'selected', while other graphs use extract_user_response which
                // checks 'value'). Sending both ensures compatibility.
                onRespond({ value: selectedOptions, selected: selectedOptions });
            }
        } else {
            // Single select — send both 'value' and 'selected' for the same reason.
            onRespond({ value: selectedOptions[0], selected: selectedOptions[0] });
        }
        setIsSubmitted(true);
    };

    const handleFeedback = () => {
        if (!feedbackText.trim()) return;
        setIsSubmitting(true);
        onRespond({ feedback: feedbackText });
        setIsSubmitted(true);
    };

    const handleFieldSubmit = () => {
        if (!fields) return;
        // Check all required fields are filled
        const allRequiredFilled = fields
            .filter(f => f.required !== false)
            .every(f => fieldValues[f.key]?.trim());
        if (!allRequiredFilled) return;
        setIsSubmitting(true);
        // Send response as an object with field keys matching backend expectations
        const response: Record<string, unknown> = {};
        for (const field of fields) {
            response[field.key] = fieldValues[field.key].trim();
        }
        onRespond(response);
        setIsSubmitted(true);
    };

    const toggleOption = (optionValue: unknown) => {
        setSelectedOptions(prev => {
            const maxSel = (request.data?.max_selections as number) || request.options?.length || 5;
            if (prev.includes(optionValue)) {
                return prev.filter(v => v !== optionValue);
            } else if (prev.length >= maxSel) {
                return prev;
            }
            return [...prev, optionValue];
        });
    };

    const selectSingleOption = (optionValue: unknown) => {
        setSelectedOptions([optionValue]);
    };

    const getMessage = () => request.message || request.prompt || 'Your input is required';

    if (request.requestType === 'confirmation') {
        return (
            <div className="bg-white border border-amber-200 rounded-2xl p-6 max-w-md shadow-sm hover:shadow-md transition-shadow relative overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-400"></div>
                <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <div className="flex-1">
                        <h4 className="text-[13px] font-bold text-amber-600 uppercase tracking-wider mb-1.5">Action Required</h4>
                        <div className="text-[15px] text-slate-700 mb-5 leading-relaxed">
                            <MarkdownRenderer content={getMessage()} accentColor="amber" />
                        </div>
                        <div className="flex gap-2.5">
                            <button
                                onClick={() => handleConfirmation(true)}
                                disabled={isSubmitting}
                                className="flex-1 px-4 py-2.5 bg-slate-900 text-white text-[14px] font-medium rounded-xl hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow active:scale-[0.98]"
                            >
                                Yes, Confirm
                            </button>
                            <button
                                onClick={() => handleConfirmation(false)}
                                disabled={isSubmitting}
                                className="flex-1 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 text-[14px] font-medium rounded-xl hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm active:scale-[0.98]"
                            >
                                No, Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (request.requestType === 'selection' && request.options) {
        return (
            <div className="bg-white border border-blue-200 rounded-2xl p-6 w-full max-w-2xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500"></div>
                <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                    </div>
                    <div className="flex-1">
                        <h4 className="text-[13px] font-bold text-blue-600 uppercase tracking-wider mb-1.5">Selection Required</h4>
                        <div className="text-[15px] text-slate-700 mb-5 leading-relaxed">
                            <MarkdownRenderer content={getMessage()} accentColor="blue" />
                        </div>

                        <div className="space-y-2 mb-5 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                            {request.options.map((option: HITLOption) => (
                                <div
                                    key={option.id}
                                    onClick={() => selectSingleOption(option.value)}
                                    className={`flex items-start gap-3 p-3.5 rounded-xl cursor-pointer transition-all border ${selectedOptions.includes(option.value)
                                        ? 'bg-blue-50/80 border-blue-300 shadow-sm'
                                        : 'bg-white border-slate-200 hover:border-blue-200 hover:bg-slate-50'
                                        }`}
                                >
                                    <input
                                        type="radio"
                                        name="selection-option"
                                        checked={selectedOptions.includes(option.value)}
                                        onChange={() => selectSingleOption(option.value)}
                                        onClick={(e) => e.stopPropagation()}
                                        className="mt-0.5 h-4 w-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <span className="text-[14px] font-medium text-slate-800 block leading-tight break-all">{option.label}</span>
                                        {option.description && (
                                            <p className="text-[13px] text-slate-500 mt-1.5 leading-relaxed break-words">{option.description}</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={() => handleSelection(false)}
                            disabled={isDisabled || isSubmitting || selectedOptions.length === 0}
                            className="w-full px-4 py-2.5 bg-slate-900 text-white text-[14px] font-medium rounded-xl hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow active:scale-[0.98]"
                        >
                            {isDisabled ? 'Submitted' : isSubmitting ? 'Submitting...' : 'Confirm Selection'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (request.requestType === 'multi_selection' && request.options) {
        const maxSelections = (request.data?.max_selections as number) || request.options.length;
        return (
            <div className="bg-white border border-indigo-200 rounded-2xl p-6 w-full max-w-2xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500"></div>
                <div className="flex items-start gap-4 min-w-0">
                    <div className="flex-shrink-0 w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="text-[13px] font-bold text-indigo-600 uppercase tracking-wider mb-1.5">Multiple Selection Required</h4>
                        <div className="text-[15px] text-slate-700 leading-relaxed mb-4">
                            <MarkdownRenderer content={getMessage()} accentColor="indigo" />
                        </div>

                        <div className="space-y-2 mb-5 max-h-[250px] overflow-y-auto overflow-x-hidden pr-2 custom-scrollbar">
                            {request.options.map((option: HITLOption) => {
                                const displayLabel = option.label && option.label.trim() !== '' && option.label !== String(option.value)
                                    ? option.label
                                    : String(option.value);
                                return (
                                    <div
                                        key={option.id}
                                        onClick={() => { if (!(selectedOptions.length >= maxSelections && !selectedOptions.includes(option.value))) toggleOption(option.value); }}
                                        className={`flex items-start gap-3 p-3.5 rounded-xl cursor-pointer transition-all border overflow-hidden ${selectedOptions.includes(option.value)
                                            ? 'bg-indigo-50/80 border-indigo-300 shadow-sm'
                                            : 'bg-white border-slate-200 hover:border-indigo-200 hover:bg-slate-50'
                                            } ${selectedOptions.length >= maxSelections && !selectedOptions.includes(option.value)
                                                ? 'opacity-50 cursor-not-allowed'
                                                : ''}`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedOptions.includes(option.value)}
                                            onChange={() => toggleOption(option.value)}
                                            onClick={(e) => e.stopPropagation()}
                                            disabled={selectedOptions.length >= maxSelections && !selectedOptions.includes(option.value)}
                                            className="mt-0.5 h-4 w-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <span className="text-[14px] font-medium text-slate-800 block leading-tight break-all">{displayLabel}</span>
                                            {option.label && option.label.trim() !== '' && option.label !== String(option.value) && String(option.value).startsWith('http') && (
                                                <p className="text-[12px] text-slate-400 mt-1 leading-relaxed break-all">{String(option.value)}</p>
                                            )}
                                            {option.description && (
                                                <p className="text-[13px] text-slate-500 mt-1.5 leading-relaxed break-words">{option.description}</p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <button
                            onClick={() => handleSelection(true)}
                            disabled={isDisabled || isSubmitting || selectedOptions.length === 0}
                            className="w-full px-4 py-2.5 bg-slate-900 text-white text-[14px] font-medium rounded-xl hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow active:scale-[0.98]"
                        >
                            {isDisabled ? 'Submitted' : isSubmitting ? 'Submitting...' : `Confirm Selection ${selectedOptions.length > 0 ? `(${selectedOptions.length}/${maxSelections})` : ''}`}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (request.requestType === 'feedback') {
        return (
            <div className="bg-white border border-purple-200 rounded-2xl p-6 max-w-md shadow-sm hover:shadow-md transition-shadow relative overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-purple-500"></div>
                <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-purple-50 border border-purple-100 rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                    </div>
                    <div className="flex-1">
                        <h4 className="text-[13px] font-bold text-purple-600 uppercase tracking-wider mb-1.5">Feedback Requested</h4>
                        <div className="text-[15px] text-slate-700 mb-4 leading-relaxed">
                            <MarkdownRenderer content={getMessage()} accentColor="purple" />
                        </div>

                        <textarea
                            value={feedbackText}
                            onChange={(e) => setFeedbackText(e.target.value)}
                            placeholder="Type your feedback here..."
                            rows={3}
                            className="w-full px-4 py-3 text-[14px] border border-slate-200 bg-slate-50 rounded-xl focus:bg-white focus:outline-none focus:ring-0 focus:border-purple-400 focus:shadow-sm resize-none transition-all placeholder:text-slate-400"
                        />

                        <button
                            onClick={handleFeedback}
                            disabled={isDisabled || isSubmitting || !feedbackText.trim()}
                            className="w-full mt-4 px-4 py-2.5 bg-slate-900 text-white text-[14px] font-medium rounded-xl hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow active:scale-[0.98]"
                        >
                            {isDisabled ? 'Submitted' : isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (request.requestType === 'data_input') {
        // Structured fields mode — render individual form fields
        if (fields) {
            const allRequiredFilled = fields
                .filter(f => f.required !== false)
                .every(f => fieldValues[f.key]?.trim());

            return (
                <div className="bg-white border border-teal-200 rounded-2xl p-6 max-w-lg shadow-sm hover:shadow-md transition-shadow relative overflow-hidden animate-in zoom-in-95 duration-300">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-teal-500"></div>
                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-10 h-10 bg-teal-50 border border-teal-100 rounded-xl flex items-center justify-center">
                            <svg className="w-5 h-5 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <h4 className="text-[13px] font-bold text-teal-600 uppercase tracking-wider mb-1.5">Input Required</h4>
                            <div className="text-[15px] text-slate-700 mb-4 leading-relaxed">
                                <MarkdownRenderer content={getMessage()} accentColor="teal" />
                            </div>

                            <div className="space-y-3 mb-4">
                                {fields.map((field) => (
                                    <div key={field.key}>
                                        <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                                            {field.label}
                                            {field.required !== false && <span className="text-red-400 ml-0.5">*</span>}
                                        </label>
                                        <input
                                            type={field.type === 'password' ? 'password' : field.type === 'url' ? 'url' : 'text'}
                                            value={fieldValues[field.key] || ''}
                                            onChange={(e) => setFieldValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                                            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
                                            disabled={isDisabled}
                                            className="w-full px-4 py-2.5 text-[14px] border border-slate-200 bg-slate-50 rounded-xl focus:bg-white focus:outline-none focus:ring-0 focus:border-teal-400 focus:shadow-sm transition-all placeholder:text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed"
                                        />
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={handleFieldSubmit}
                                disabled={isDisabled || isSubmitting || !allRequiredFilled}
                                className="w-full px-4 py-2.5 bg-slate-900 text-white text-[14px] font-medium rounded-xl hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow active:scale-[0.98]"
                            >
                                {isDisabled ? 'Submitted' : isSubmitting ? 'Submitting...' : 'Submit'}
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        // Freeform textarea mode (fallback when no structured fields)
        return (
            <div className="bg-white border border-teal-200 rounded-2xl p-6 max-w-md shadow-sm hover:shadow-md transition-shadow relative overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-teal-500"></div>
                <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-teal-50 border border-teal-100 rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                    </div>
                    <div className="flex-1">
                        <h4 className="text-[13px] font-bold text-teal-600 uppercase tracking-wider mb-1.5">Input Required</h4>
                        <div className="text-[15px] text-slate-700 mb-4 leading-relaxed">
                            <MarkdownRenderer content={getMessage()} accentColor="teal" />
                        </div>

                        <textarea
                            value={feedbackText}
                            onChange={(e) => setFeedbackText(e.target.value)}
                            placeholder="Type your input here..."
                            rows={3}
                            className="w-full px-4 py-3 text-[14px] border border-slate-200 bg-slate-50 rounded-xl focus:bg-white focus:outline-none focus:ring-0 focus:border-teal-400 focus:shadow-sm resize-none transition-all placeholder:text-slate-400"
                        />

                        <button
                            onClick={handleFeedback}
                            disabled={isDisabled || isSubmitting || !feedbackText.trim()}
                            className="w-full mt-4 px-4 py-2.5 bg-slate-900 text-white text-[14px] font-medium rounded-xl hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow active:scale-[0.98]"
                        >
                            {isDisabled ? 'Submitted' : isSubmitting ? 'Submitting...' : 'Submit Input'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (request.requestType === 'topic_input') {
        return (
            <div className="bg-white border border-cyan-200 rounded-2xl p-6 max-w-md shadow-sm hover:shadow-md transition-shadow relative overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-cyan-500"></div>
                <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-cyan-50 border border-cyan-100 rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div className="flex-1">
                        <h4 className="text-[13px] font-bold text-cyan-600 uppercase tracking-wider mb-1.5">Topic Required</h4>
                        <div className="text-[15px] text-slate-700 mb-4 leading-relaxed">
                            <MarkdownRenderer content={getMessage()} accentColor="cyan" />
                        </div>

                        <textarea
                            value={feedbackText}
                            onChange={(e) => setFeedbackText(e.target.value)}
                            placeholder="Enter your topic or question..."
                            rows={3}
                            className="w-full px-4 py-3 text-[14px] border border-slate-200 bg-slate-50 rounded-xl focus:bg-white focus:outline-none focus:ring-0 focus:border-cyan-400 focus:shadow-sm resize-none transition-all placeholder:text-slate-400"
                        />

                        <button
                            onClick={handleFeedback}
                            disabled={isDisabled || isSubmitting || !feedbackText.trim()}
                            className="w-full mt-4 px-4 py-2.5 bg-slate-900 text-white text-[14px] font-medium rounded-xl hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow active:scale-[0.98]"
                        >
                            {isDisabled ? 'Submitted' : isSubmitting ? 'Submitting...' : 'Submit Topic'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (request.requestType === 'url_selection' && request.options) {
        const maxSelections = (request.data?.max_selections as number) || request.options.length;
        return (
            <div className="bg-white border border-emerald-200 rounded-2xl p-6 max-w-lg shadow-sm hover:shadow-md transition-shadow relative overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500"></div>
                <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                    </div>
                    <div className="flex-1">
                        <h4 className="text-[13px] font-bold text-emerald-600 uppercase tracking-wider mb-1.5">URL Selection Required</h4>
                        <div className="text-[15px] text-slate-700 mb-4 leading-relaxed">
                            <MarkdownRenderer content={getMessage()} accentColor="emerald" />
                        </div>

                        <div className="space-y-2 mb-5 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                            {request.options.map((option: HITLOption) => (
                                <div
                                    key={option.id}
                                    onClick={() => { if (!(selectedOptions.length >= maxSelections && !selectedOptions.includes(option.value))) toggleOption(option.value); }}
                                    className={`flex items-start gap-3 p-3.5 rounded-xl cursor-pointer transition-all border ${selectedOptions.includes(option.value)
                                        ? 'bg-emerald-50/80 border-emerald-300 shadow-sm'
                                        : 'bg-white border-slate-200 hover:border-emerald-200 hover:bg-slate-50'
                                        } ${selectedOptions.length >= maxSelections && !selectedOptions.includes(option.value)
                                            ? 'opacity-50 cursor-not-allowed'
                                            : ''}`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedOptions.includes(option.value)}
                                        onChange={() => toggleOption(option.value)}
                                        onClick={(e) => e.stopPropagation()}
                                        disabled={selectedOptions.length >= maxSelections && !selectedOptions.includes(option.value)}
                                        className="mt-0.5 h-4 w-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <span className="text-[14px] font-medium text-slate-800 block leading-tight break-all">{option.label}</span>
                                        {option.label && option.label.trim() !== '' && option.label !== String(option.value) && String(option.value).startsWith('http') && (
                                            <p className="text-[12px] text-slate-400 mt-1 leading-relaxed break-all">{String(option.value)}</p>
                                        )}
                                        {option.description && (
                                            <p className="text-[13px] text-slate-500 mt-1.5 leading-relaxed break-words">{option.description}</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={() => handleSelection(true)}
                            disabled={isDisabled || isSubmitting || selectedOptions.length === 0}
                            className="w-full px-4 py-2.5 bg-slate-900 text-white text-[14px] font-medium rounded-xl hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow active:scale-[0.98]"
                        >
                            {isDisabled ? 'Submitted' : isSubmitting ? 'Submitting...' : `Confirm Selection ${selectedOptions.length > 0 ? `(${selectedOptions.length}/${maxSelections})` : ''}`}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (request.requestType === 'content_review') {
        return (
            <div className="bg-white border border-rose-200 rounded-2xl p-6 max-w-lg shadow-sm hover:shadow-md transition-shadow relative overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-500"></div>
                <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-rose-50 border border-rose-100 rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <div className="flex-1">
                        <h4 className="text-[13px] font-bold text-rose-600 uppercase tracking-wider mb-1.5">Content Review Required</h4>
                        <div className="text-[15px] text-slate-700 mb-4 leading-relaxed">
                            <MarkdownRenderer content={getMessage()} accentColor="rose" />
                        </div>

                        {request.data && (
                            <div className="mb-4 p-4 bg-slate-50 rounded-xl border border-slate-200 max-h-[200px] overflow-y-auto">
                                <pre className="text-[13px] text-slate-700 whitespace-pre-wrap font-mono">
                                    {JSON.stringify(request.data, null, 2)}
                                </pre>
                            </div>
                        )}

                        <textarea
                            value={feedbackText}
                            onChange={(e) => setFeedbackText(e.target.value)}
                            placeholder="Provide your feedback or approval..."
                            rows={3}
                            className="w-full px-4 py-3 text-[14px] border border-slate-200 bg-slate-50 rounded-xl focus:bg-white focus:outline-none focus:ring-0 focus:border-rose-400 focus:shadow-sm resize-none transition-all placeholder:text-slate-400"
                        />

                        <div className="flex gap-2.5 mt-4">
                            <button
                                onClick={() => handleConfirmation(true)}
                                disabled={isSubmitting}
                                className="flex-1 px-4 py-2.5 bg-emerald-600 text-white text-[14px] font-medium rounded-xl hover:bg-emerald-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow active:scale-[0.98]"
                            >
                                Approve
                            </button>
                            <button
                                onClick={handleFeedback}
                                disabled={isSubmitting || !feedbackText.trim()}
                                className="flex-1 px-4 py-2.5 bg-amber-600 text-white text-[14px] font-medium rounded-xl hover:bg-amber-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow active:scale-[0.98]"
                            >
                                Request Changes
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (request.requestType === 'per_page_feedback') {
        const pages = Array.isArray(request.data?.pages) ? request.data.pages : [];
        const auditReport = typeof request.data?.audit_report === 'string' ? request.data.audit_report : '';

        const handlePageFeedbackChange = (url: string, value: string) => {
            setPageFeedback(prev => ({ ...prev, [url]: value }));
        };

        const handleApproveAll = () => {
            setIsSubmitting(true);
            onRespond({ action: 'approve_all' });
            setIsSubmitted(true);
        };

        const handleSubmitFeedback = () => {
            setIsSubmitting(true);
            onRespond({ action: 'provide_feedback', feedback: pageFeedback });
            setIsSubmitted(true);
        };

        return (
            <div className="bg-white border border-violet-200 rounded-2xl p-6 max-w-2xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-violet-500"></div>
                <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-violet-50 border border-violet-100 rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <div className="flex-1">
                        <h4 className="text-[13px] font-bold text-violet-600 uppercase tracking-wider mb-1.5">Page Feedback Required</h4>
                        <div className="text-[15px] text-slate-700 mb-4 leading-relaxed">
                            <MarkdownRenderer content={getMessage()} accentColor="violet" />
                        </div>

                        {auditReport && (
                            <div className="mb-4 p-4 bg-slate-50 rounded-xl border border-slate-200 max-h-[300px] overflow-y-auto">
                                <div className="text-[13px] text-slate-700 whitespace-pre-wrap">
                                    <MarkdownRenderer content={auditReport} accentColor="slate" />
                                </div>
                            </div>
                        )}

                        <div className="space-y-4 mb-5">
                            {pages.map((page: any, index: number) => (
                                <div key={index} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-[12px] font-bold text-violet-600 uppercase tracking-wider">
                                            Page {index + 1}
                                        </span>
                                        {page.name && (
                                            <span className="text-[14px] font-medium text-slate-800">
                                                - {page.name}
                                            </span>
                                        )}
                                    </div>
                                    {page.url && (
                                        <a
                                            href={page.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[12px] text-blue-600 hover:text-blue-800 font-mono block mb-2"
                                        >
                                            {page.url}
                                        </a>
                                    )}
                                    <textarea
                                        value={pageFeedback[page.url] || ''}
                                        onChange={(e) => handlePageFeedbackChange(page.url, e.target.value)}
                                        placeholder="Provide feedback for this page (leave empty to approve)..."
                                        rows={3}
                                        className="w-full px-3 py-2 text-[13px] border border-slate-200 bg-white rounded-lg focus:bg-white focus:outline-none focus:ring-0 focus:border-violet-400 focus:shadow-sm resize-none transition-all placeholder:text-slate-400"
                                    />
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-2.5">
                            <button
                                onClick={handleApproveAll}
                                disabled={isSubmitting}
                                className="flex-1 px-4 py-2.5 bg-emerald-600 text-white text-[14px] font-medium rounded-xl hover:bg-emerald-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow active:scale-[0.98]"
                            >
                                {isDisabled ? 'Submitted' : 'Approve All'}
                            </button>
                            <button
                                onClick={handleSubmitFeedback}
                                disabled={isSubmitting}
                                className="flex-1 px-4 py-2.5 bg-violet-600 text-white text-[14px] font-medium rounded-xl hover:bg-violet-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow active:scale-[0.98]"
                            >
                                {isDisabled ? 'Submitted' : 'Submit Feedback'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 max-w-md shadow-sm">
            <div className="text-sm text-gray-600">
                <MarkdownRenderer content={request.prompt || 'Please continue'} accentColor="slate" />
            </div>
            <button
                onClick={() => onRespond({})}
                className="mt-3 px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
            >
                Continue
            </button>
        </div>
    );
}
