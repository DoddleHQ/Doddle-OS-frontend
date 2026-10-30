import { redirect } from 'next/navigation';

export default function MagentoContentNewRedirect({
    params,
}: {
    params: { workspaceId: string };
}) {
    redirect(`/workspaces/${params.workspaceId}/modules/content-factory/v2/magento-content/new`);
}
