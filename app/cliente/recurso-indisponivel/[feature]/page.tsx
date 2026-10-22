import { FeatureUnavailable } from "@/components/vemgo/FeatureUnavailable";

export default async function ClienteFeatureUnavailablePage({
  params,
}: {
  params: Promise<{ feature: string }>;
}) {
  const { feature } = await params;
  return <FeatureUnavailable role="client" feature={feature} />;
}
