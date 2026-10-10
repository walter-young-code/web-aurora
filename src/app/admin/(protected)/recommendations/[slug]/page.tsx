import { notFound } from 'next/navigation';
import { getRecommendation } from '@/lib/content';
import { RecommendationForm } from '@/components/admin/RecommendationForm';

export const dynamic = 'force-dynamic';

export default async function EditRecommendationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const rec = await getRecommendation(slug);
  if (!rec) notFound();

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-2xl text-text-primary">
        编辑推荐 <span className="font-mono text-base text-text-muted">{slug}</span>
      </h1>
      <RecommendationForm initial={rec} />
    </div>
  );
}
