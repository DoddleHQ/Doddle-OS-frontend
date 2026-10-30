import { debugLog } from '../utils/debugLog';

export type LangGraphEnvironment = 'local' | 'tunnel' | 'production';

export interface LangGraphConfig {
    environment: LangGraphEnvironment;
    baseUrl: string;
    isDevelopment: boolean;
    isProduction: boolean;
    isTunnelActive: boolean;
}

function getLangGraphEnvironment(): LangGraphEnvironment {
    const tunnelActive = process.env.NEXT_PUBLIC_LANGGRAPH_TUNNEL_ACTIVE === 'true';
    const nodeEnv = process.env.NODE_ENV;

    if (tunnelActive) {
        return 'tunnel';
    }

    if (nodeEnv === 'production') {
        return 'production';
    }

    return 'local';
}

function getLangGraphBaseUrl(): string {
    const environment = getLangGraphEnvironment();

    switch (environment) {
        case 'tunnel':
            return process.env.NEXT_PUBLIC_LANGGRAPH_TUNNEL_URL || 'https://localhost:2024';

        case 'production':
            return process.env.LANGGRAPH_API_URL || process.env.NEXT_PUBLIC_LANGGRAPH_PRODUCTION_URL || '';

        case 'local':
        default:
            return process.env.NEXT_PUBLIC_LANGGRAPH_LOCAL_URL || 'http://127.0.0.1:2024';
    }
}

export function getLangGraphConfig(): LangGraphConfig {
    const environment = getLangGraphEnvironment();
    const baseUrl = getLangGraphBaseUrl();

    return {
        environment,
        baseUrl,
        isDevelopment: environment !== 'production',
        isProduction: environment === 'production',
        isTunnelActive: environment === 'tunnel',
    };
}

export function getLangGraphApiUrl(): string {
    const config = getLangGraphConfig();

    if (config.isProduction && !config.baseUrl) {
        console.error(
            '[LangGraph Config] Production URL not configured. ' +
            'Please set NEXT_PUBLIC_LANGGRAPH_PRODUCTION_URL in your environment.'
        );
        throw new Error('LangGraph production URL not configured');
    }

    if (config.isDevelopment) {
        debugLog('[LangGraph Config]', {
            environment: config.environment,
            baseUrl: config.baseUrl,
        });
    }

    return config.baseUrl;
}

export function getLangGraphEndpoint(path: string): string {
    const baseUrl = getLangGraphApiUrl();
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${normalizedPath}`;
}

export function validateLangGraphConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const config = getLangGraphConfig();

    switch (config.environment) {
        case 'tunnel':
            if (!process.env.NEXT_PUBLIC_LANGGRAPH_TUNNEL_URL) {
                errors.push('NEXT_PUBLIC_LANGGRAPH_TUNNEL_URL is not set but tunnel is active');
            }
            break;

        case 'production':
            if (!process.env.NEXT_PUBLIC_LANGGRAPH_PRODUCTION_URL) {
                errors.push('NEXT_PUBLIC_LANGGRAPH_PRODUCTION_URL is required in production');
            }
            break;

        case 'local':
            if (!process.env.NEXT_PUBLIC_LANGGRAPH_LOCAL_URL) {
                console.warn('[LangGraph Config] Using default local URL (http://127.0.0.1:2024)');
            }
            break;
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}

export const langGraphConfig = getLangGraphConfig();

export function langgraphAuthHeaders(
    req: import('next/server').NextRequest,
): Record<string, string> {
    const token = req.cookies.get('access_token')?.value;
    return token ? { Authorization: `Bearer ${token}` } : {};
}
