import { redirect } from 'next/navigation';

export default function MagentoContentRedirect({
    params,
}: {
    params: { workspaceId: string };
}) {
    redirect(`/legacy/workspaces/${params.workspaceId}/modules/content-factory/v2/magento-content`);
}
