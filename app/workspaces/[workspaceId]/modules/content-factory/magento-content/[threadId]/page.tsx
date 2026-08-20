import { redirect } from 'next/navigation';

/*
 * Magento Content lives in the v2 content factory — this path is kept as a
 * redirect for continuity with the earlier white-interface page (which
 * rewrote the URL to /magento-content/{dbThreadId} mid-stream).
 */
export default function MagentoContentThreadRedirect({
    params,
}: {
    params: { workspaceId: string; threadId: string };
}) {
    redirect(
        `/workspaces/${params.workspaceId}/modules/content-factory/v2/magento-content/${params.threadId}`,
    );
}
