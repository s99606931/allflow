import { ProjectDetailRoute } from '@/components/screens/project-detail-route';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  return <ProjectDetailRoute projectId={id} />;
}
