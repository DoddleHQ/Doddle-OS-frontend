import { redirect } from 'next/navigation';

export default function MagentoContentThreadRedirect({
    params,
}: {
    params: { workspaceId: string; threadId: string };
}) {
    redirect(
        `/workspaces/${params.workspaceId}/modules/content-factory/v2/magento-content/${params.threadId}`,
    );
}
