import { redirect } from 'next/navigation';

/*
 * Magento Content lives in the v2 content factory — this path is kept as a
 * redirect for continuity with the earlier white-interface page.
 */
export default function MagentoContentNewRedirect({
    params,
}: {
    params: { workspaceId: string };
}) {
    redirect(`/workspaces/${params.workspaceId}/modules/content-factory/v2/magento-content/new`);
}
