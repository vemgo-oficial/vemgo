import { FeatureUnavailable } from "@/components/vemgo/FeatureUnavailable";

export default async function ProfessionalFeatureUnavailablePage({
  params,
}: {
  params: Promise<{ feature: string }>;
}) {
  const { feature } = await params;
  return <FeatureUnavailable role="professional" feature={feature} />;
}
