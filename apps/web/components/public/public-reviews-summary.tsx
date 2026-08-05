import { BadgeCheck, Star } from "lucide-react";

type ReviewItem = {
  id: string;
  author: string;
  rating: number;
  text: string;
  date: string;
};

type PublicReviewsSummaryProps = {
  slug: string;
};

export type PublicReviewSnapshot = {
  average: number;
  total: number;
};

const demoReviews: ReviewItem[] = [
  { id: "r1", author: "سارة", rating: 5, text: "تجربة ممتازة وسرعة في الخدمة وجودة عالية في الأطباق.", date: "منذ يومين" },
  { id: "r2", author: "عبدالعزيز", rating: 4, text: "المكان مرتب والخدمة لطيفة، أتمنى توسعة قائمة الوجبات.", date: "منذ 5 أيام" },
  { id: "r3", author: "ريم", rating: 5, text: "من أفضل الخيارات للعائلة، الأسعار مناسبة جدًا.", date: "منذ أسبوع" },
];

export function getPublicReviewSnapshot(slug: string): PublicReviewSnapshot | null {
  if (slug !== "demo" || demoReviews.length === 0) {
    return null;
  }

  const total = demoReviews.length;
  const average = Number((demoReviews.reduce((sum, item) => sum + item.rating, 0) / total).toFixed(1));
  return { average, total };
}

function Stars({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-1 text-amber-300">
      {Array.from({ length: 5 }).map((_, index) => (
        <Star key={index} className={`h-4 w-4 ${index < Math.round(value) ? "fill-current" : "text-slate-500"}`} />
      ))}
    </div>
  );
}

export function PublicReviewsSummary({ slug }: PublicReviewsSummaryProps) {
  const snapshot = getPublicReviewSnapshot(slug);
  if (!snapshot) {
    return null;
  }

  const { total, average } = snapshot;
  const distribution = [5, 4, 3, 2, 1].map((value) => ({ value, count: demoReviews.filter((review) => review.rating === value).length }));

  return (
    <section id="reviews-section" className="rounded-[32px] border border-white/10 bg-slate-950/70 p-4 backdrop-blur">
      <h2 className="mb-3 text-xl font-black">آراء العملاء</h2>
      <div className="mb-4 rounded-[24px] border border-white/10 bg-gradient-to-br from-white/10 to-transparent p-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-3xl font-black">{average}</p>
            <div className="mt-1"><Stars value={average} /></div>
            <p className="mt-1 text-xs text-slate-400">بناءً على {total} تقييمات</p>
          </div>
          <div className="min-w-[120px] space-y-2">
            {distribution.map((item) => (
              <div key={item.value} className="flex items-center gap-2 text-[11px] text-slate-300">
                <span>{item.value}★</span>
                <div className="h-2 flex-1 rounded-full bg-white/10">
                  <div className="h-2 rounded-full bg-amber-400" style={{ width: `${(item.count / total) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="space-y-2">
        {demoReviews.map((review) => (
          <article key={review.id} className="rounded-[20px] border border-white/10 bg-white/5 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-500/20 text-sm font-black text-cyan-200">
                  {review.author.slice(0, 1)}
                </div>
                <div>
                  <div className="flex items-center gap-1 text-sm font-bold text-white">
                    {review.author}
                    <BadgeCheck className="h-4 w-4 text-cyan-400" />
                  </div>
                  <p className="text-[11px] text-slate-400">عميل موثق</p>
                </div>
              </div>
              <span className="text-xs text-slate-400">{review.date}</span>
            </div>
            <div className="mt-2">
              <Stars value={review.rating} />
            </div>
            <p className="mt-2 text-xs leading-6 text-slate-300">{review.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
