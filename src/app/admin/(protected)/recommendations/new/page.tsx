import { RecommendationForm } from '@/components/admin/RecommendationForm';

export const dynamic = 'force-dynamic';

export default function NewRecommendationPage() {
  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-2xl text-text-primary">新建推荐</h1>
      <RecommendationForm initial={null} />
    </div>
  );
}
