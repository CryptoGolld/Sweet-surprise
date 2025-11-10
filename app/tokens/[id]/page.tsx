import { TokenPageClient } from '@/components/token/TokenPageClient';

interface TokenPageProps {
  params: { id: string };
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function TokenPage({ params }: TokenPageProps) {
  return <TokenPageClient tokenId={params.id} />;
}
