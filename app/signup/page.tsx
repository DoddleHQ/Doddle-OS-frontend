'use client';

import { useReducer, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { Eye, EyeOff, Sparkles, Lock, ArrowRight, Check, X } from 'lucide-react';
import { signup } from '@/lib/services/authService';

const PASSWORD_RULES = [
    { label: '8\u201315 characters', test: (p: string) => /^.{8,15}$/.test(p) },
    { label: 'At least one uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
    { label: 'At least one lowercase letter', test: (p: string) => /[a-z]/.test(p) },
    { label: 'At least one digit', test: (p: string) => /[0-9]/.test(p) },
    { label: 'No whitespace', test: (p: string) => p.length > 0 && !/\s/.test(p) },
    { label: 'ASCII characters only', test: (p: string) => p.length > 0 && /^[\x20-\x7E]+$/.test(p) },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type SignupState = {
    orgName: string;
    email: string;
    password: string;
};

type SignupAction =
    | { type: 'SET_ORG_NAME'; payload: string }
    | { type: 'SET_EMAIL'; payload: string }
    | { type: 'SET_PASSWORD'; payload: string };

type FieldErrors = {
    orgName?: string;
    email?: string;
    password?: string;
};

const signupReducer = (state: SignupState, action: SignupAction): SignupState => {
    switch (action.type) {
        case 'SET_ORG_NAME':
            return { ...state, orgName: action.payload };
        case 'SET_EMAIL':
            return { ...state, email: action.payload };
        case 'SET_PASSWORD':
            return { ...state, password: action.payload };
        default:
            return state;
    }
};

const initialState: SignupState = {
    orgName: '',
    email: '',
    password: '',
};

const SignUpPage = () => {
    const router = useRouter();
    const [state, dispatch] = useReducer(signupReducer, initialState);
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [apiError, setApiError] = useState('');
    const [errors, setErrors] = useState<FieldErrors>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});

    const { orgName, email, password } = state;

    const passedCount = password
        ? PASSWORD_RULES.filter((r) => r.test(password)).length
        : 0;

    const strengthMeta = passedCount <= 2
        ? { label: 'Weak', color: 'bg-error-500', width: `${(passedCount / 6) * 100}%` }
        : passedCount <= 4
            ? { label: 'Medium', color: 'bg-warning-500', width: `${(passedCount / 6) * 100}%` }
            : { label: 'Strong', color: 'bg-success-500', width: `${(passedCount / 6) * 100}%` };

    const validateField = (field: string, value: string) => {
        const errs: FieldErrors = {};
        switch (field) {
            case 'orgName':
                if (!value.trim()) errs.orgName = 'Organization name is required.';
                break;
            case 'email':
                if (!value.trim()) errs.email = 'Work email is required.';
                else if (!EMAIL_RE.test(value)) errs.email = 'Please enter a valid email address.';
                break;
            case 'password':
                if (!value) errs.password = 'Password is required.';
                else if (!PASSWORD_RULES.every((r) => r.test(value)))
                    errs.password = 'Password does not meet all requirements.';
                break;
        }
        return errs;
    };

    const handleBlur = (field: string, value: string) => {
        setTouched((prev) => ({ ...prev, [field]: true }));
        const fieldErrors = validateField(field, value);
        setErrors((prev) => ({ ...prev, ...fieldErrors }));
    };

    const clearFieldError = (field: keyof FieldErrors) => {
        if (errors[field]) {
            setErrors((prev) => {
                const next = { ...prev };
                delete next[field];
                return next;
            });
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setApiError('');
        const allErrors: FieldErrors = {
            ...validateField('orgName', orgName),
            ...validateField('email', email),
            ...validateField('password', password),
        };
        setTouched({ orgName: true, email: true, password: true });
        setErrors(allErrors);
        if (Object.keys(allErrors).length > 0) return;
        setIsLoading(true);
        try {
            const result = await signup({ orgName, email, password });
            toast.success(result.message, { autoClose: 5000 });
            router.push(`/check-email?email=${encodeURIComponent(email)}`);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
            setApiError(message);
        } finally {
            setIsLoading(false);
        }
    };

    const inputClass = (field: keyof FieldErrors) =>
        touched[field] && errors[field]
            ? 'border-error-500 focus:ring-2 focus:ring-error-500 focus:border-error-500'
            : 'border-neutral-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500';

    return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4 py-8 sm:px-6">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-2xl shadow-lg border border-neutral-200 p-6 sm:p-8">
                    <div className="flex flex-col items-center mb-8">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-9 h-9 rounded-lg bg-primary-600 flex items-center justify-center">
                                <Sparkles className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-lg font-semibold text-neutral-900">
                                Doddle OS
                            </span>
                        </div>
                        <p className="text-sm text-neutral-500 text-center">
                            Let agents handle the hustle, not you.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                        <div>
                            <label
                                htmlFor="orgName"
                                className="block text-sm font-medium text-neutral-700 mb-1.5"
                            >
                                Organization name
                            </label>
                            <input
                                id="orgName"
                                type="text"
                                required
                                autoComplete="organization"
                                placeholder="Acme Corp"
                                value={orgName}
                                onChange={(e) => { dispatch({ type: 'SET_ORG_NAME', payload: e.target.value }); clearFieldError('orgName'); }}
                                onBlur={() => handleBlur('orgName', orgName)}
                                className={`w-full rounded-lg border px-4 py-3 text-base text-neutral-900 placeholder:text-neutral-400 focus:outline-none transition-colors ${inputClass('orgName')}`}
                            />
                            {touched.orgName && errors.orgName && (
                                <p className="mt-1.5 text-xs text-error-600">{errors.orgName}</p>
                            )}
                        </div>

                        <div>
                            <label
                                htmlFor="email"
                                className="block text-sm font-medium text-neutral-700 mb-1.5"
                            >
                                Work email
                            </label>
                            <input
                                id="email"
                                type="email"
                                required
                                autoComplete="email"
                                placeholder="you@company.com"
                                value={email}
                                onChange={(e) => { dispatch({ type: 'SET_EMAIL', payload: e.target.value }); clearFieldError('email'); }}
                                onBlur={() => handleBlur('email', email)}
                                className={`w-full rounded-lg border px-4 py-3 text-base text-neutral-900 placeholder:text-neutral-400 focus:outline-none transition-colors ${inputClass('email')}`}
                            />
                            {touched.email && errors.email && (
                                <p className="mt-1.5 text-xs text-error-600">{errors.email}</p>
                            )}
                        </div>

                        <div>
                            <label
                                htmlFor="password"
                                className="block text-sm font-medium text-neutral-700 mb-1.5"
                            >
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    autoComplete="new-password"
                                    placeholder="8\u201315 characters"
                                    value={password}
                                    onChange={(e) => { dispatch({ type: 'SET_PASSWORD', payload: e.target.value }); clearFieldError('password'); }}
                                    onBlur={() => handleBlur('password', password)}
                                    className={`w-full rounded-lg border px-4 py-3 pr-12 text-base text-neutral-900 placeholder:text-neutral-400 focus:outline-none transition-colors ${inputClass('password')}`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-600 focus:outline-none focus:text-neutral-600"
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>

                            {password && (
                                <div className="mt-2">
                                    <div className="h-1.5 w-full rounded-full bg-neutral-200 overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-300 ${strengthMeta.color}`}
                                            style={{ width: strengthMeta.width }}
                                        />
                                    </div>
                                    <ul className="mt-2 space-y-1">
                                        {PASSWORD_RULES.map((rule) => {
                                            const passed = rule.test(password);
                                            return (
                                                <li
                                                    key={rule.label}
                                                    className={`flex items-center gap-1.5 text-xs ${passed ? 'text-success-600' : 'text-neutral-400'}`}
                                                >
                                                    {passed ? <Check className="w-3.5 h-3.5 shrink-0" /> : <X className="w-3.5 h-3.5 shrink-0" />}
                                                    {rule.label}
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            )}
                            {touched.password && errors.password && !password && (
                                <p className="mt-1.5 text-xs text-error-600">{errors.password}</p>
                            )}
                        </div>

                        {apiError && (
                            <div className="rounded-lg bg-error-50 border border-error-200 px-4 py-3 text-sm text-error-700">
                                {apiError}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-3 text-base font-semibold text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {isLoading ? (
                                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            ) : (
                                <>
                                    Create Account
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-neutral-400">
                        <Lock className="w-3.5 h-3.5" />
                        <span>Enterprise-grade security</span>
                    </div>

                    <p className="mt-3 text-center text-xs text-neutral-400">
                        By continuing, you agree to our{' '}
                        <Link href="/terms" className="text-primary-600 hover:text-primary-700 underline">
                            Terms of Service
                        </Link>{' '}
                        and{' '}
                        <Link href="/privacy" className="text-primary-600 hover:text-primary-700 underline">
                            Privacy Policy
                        </Link>
                        .
                    </p>
                </div>

                <p className="mt-6 text-center text-sm text-neutral-500">
                    Already have an account?{' '}
                    <Link href="/login" className="font-medium text-primary-600 hover:text-primary-700">
                        Log in
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default SignUpPage;
