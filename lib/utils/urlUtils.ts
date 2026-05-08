export function extractDomainTitle(url: string): string {
    try {
        const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
        let hostname = parsed.hostname.replace(/^www\./, '');

        if (parsed.pathname !== '/' && parsed.pathname.length > 1) {
            const pathSegment = parsed.pathname.split('/').filter(Boolean)[0];
            if (pathSegment) {
                hostname = `${hostname} ${pathSegment}`;
            }
        }

        return hostname
            .split(/[\-.]/)
            .filter(part => part.length > 0)
            .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
            .join(' ');
    } catch {
        return url.substring(0, 80);
    }
}

export function extractDomain(url: string): string {
    try {
        const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
        return parsed.hostname.replace(/^www\./, '');
    } catch {
        return url;
    }
}
