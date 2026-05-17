import { AlertDetailClient } from "@/components/AlertDetailClient";

export default function AlertDetailPage({ params }: { params: { id: string } }) {
  return <AlertDetailClient alertId={params.id} />;
}
