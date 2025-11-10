import nextDynamic from 'next/dynamic';

interface TokenPageProps {
  params: { id: string };
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const TokenPageClient = nextDynamic(
  () =>
    import('@/components/token/TokenPageClient').then((mod) => ({
      default: mod.TokenPageClient,
    })),
  { ssr: false },
);

export default function TokenPage({ params }: TokenPageProps) {
  return <TokenPageClient tokenId={params.id} />;
}
