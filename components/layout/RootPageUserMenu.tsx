'use client';

import { UserMenu } from './UserMenu';

/**
 * RootPageUserMenu — thin client wrapper so the Server Component root page
 * can render the interactive UserMenu with the dark variant (for the dark
 * hero background).
 */
export function RootPageUserMenu() {
    return <UserMenu variant="dark" />;
}
