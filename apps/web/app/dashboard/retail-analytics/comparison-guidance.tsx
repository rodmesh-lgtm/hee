import { comparisonReadiness, peerInsights } from '../../lib/retail-analytics/comparison-insights';
import type { ComparisonRow, ComparisonSource } from '../../lib/retail-analytics/comparison';

export default function ComparisonGuidance({ sources, rows, complete, from, until, english }: {
  sources: ComparisonSource[]; rows: ComparisonRow[]; complete: boolean; from: string; until: string; english: boolean;
}) {
  const t = (ar: string, en: string) => english ? en : ar;
  const states = {
    ready: t('جاهز للمقارنة', 'Ready to compare'), pending: t('بانتظار قراءة التقرير', 'Waiting for report'),
    failed: t('تعذرت القراءة؛ أعد التحديث', 'Read failed; refresh'), period: t('القراءة تخص فترة أخرى؛ أعد التحديث', 'Different period; refresh'),
    partial: t('القراءة جزئية؛ اختر فترة أقصر', 'Partial read; choose a shorter period'),
  };
  const insights = peerInsights(rows, complete);
  return <div className="space-y-4">
    <details className="rounded-2xl border border-teal-500/30 p-4">
      <summary className="cursor-pointer font-bold">{t('جاهزية البيانات وخطوتك التالية', 'Data readiness and your next step')}</summary>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">{sources.map(source => {
        const state = comparisonReadiness(source, { from, until });
        return <li key={source.id} className="min-w-0 rounded-xl border border-slate-500/25 p-4">
          <h3 className="break-words font-bold">{source.name}</h3><p className="mt-2 text-sm">{states[state]}</p>
          {state === 'ready' ? <p className="mt-2 text-sm leading-7">{source.report?.locationsReadable === true
            ? t('قراءة مواقع البيع متاحة؛ قد تبقى الطلبات الإلكترونية دون موقع بيع.', 'Sales-location reading is available; online orders may have no sales location.')
            : t('صلاحية مواقع البيع غير مؤكدة لهذه القراءة. اطلب تفعيلها من دعم INFRO دون فصل الحساب الحالي؛ تقارير الحساب تستمر بالعمل.', 'Sales-location access is not confirmed for this read. Ask INFRO support to enable it without disconnecting your current account; account reports remain available.')}</p> : null}
        </li>;
      })}</ul>
      {!sources.length ? <p className="mt-3">{t('اختر حسابًا مرتبطًا ثم حدّث التقارير.', 'Select a connected account, then refresh reports.')}</p> : null}
    </details>
    <section aria-label={t('فرص تستحق المراجعة', 'Opportunities to review')} className="rounded-2xl border border-teal-500/30 p-5">
      <h3 className="text-lg font-bold">{t('فرص تستحق المراجعة', 'Opportunities to review')}</h3>
      <p className="mt-2 text-sm leading-7">{t('مقارنة وصفية مع وسيط حسابين أو فرعين آخرين على الأقل، بنفس العملة والفترة. ليست توقعًا أو حكمًا على جودة الفرع؛ اختلاف المنتجات والقنوات قد يفسّر الفروق.', 'Descriptive comparison with the median of at least two other accounts or locations, in the same currency and period. Not a forecast or a quality judgment; product and channel differences may explain gaps.')}</p>
      {insights.length ? <ul className="mt-4 grid gap-4 lg:grid-cols-2">{insights.map(insight => <li key={`${insight.row.id}:${insight.kind}`} className="min-w-0 rounded-xl border border-amber-500/30 p-4">
        <h4 className="break-words font-bold">{insight.row.account} · {insight.row.name} · {insight.row.currency}</h4>
        <p className="mt-2 leading-7">{insight.kind === 'average'
          ? t(`متوسط الطلب أقل من وسيط المقارنة بنسبة ${(100 * (1 - insight.observed / insight.benchmark)).toFixed(1)}٪. راجع تشكيلة المنتجات والخصومات وقنوات البيع قبل اتخاذ إجراء.`, `Average order value is ${(100 * (1 - insight.observed / insight.benchmark)).toFixed(1)}% below the peer median. Review product mix, discounts and sales channels before acting.`)
          : t(`الإلغاء ${insight.observed.toFixed(1)}٪ مقابل وسيط ${insight.benchmark.toFixed(1)}٪. راجع أسباب الإلغاء وتوافر المنتجات قبل تغيير التشغيل.`, `Cancellation is ${insight.observed.toFixed(1)}% versus a ${insight.benchmark.toFixed(1)}% peer median. Review cancellation reasons and availability before changing operations.`)}</p>
        <p className="mt-2 text-sm">{t(`المقارنة مع ${insight.peers} حسابات/فروع أخرى؛ ${insight.row.orders} طلبًا في النطاق الحالي.`, `Compared with ${insight.peers} other accounts/locations; ${insight.row.orders} orders in this scope.`)}</p>
      </li>)}</ul> : <p className="mt-4 text-sm">{t('لا توجد إشارة تستوفي شروط المراجعة حاليًا، أو لم تكتمل القراءات/العينة. هذا لا يعني خلو النشاط من فرص التحسين.', 'No signal meets the review criteria yet, or reads/sample sizes are insufficient. This does not mean there are no improvement opportunities.')}</p>}
      <details className="mt-4 text-sm"><summary className="cursor-pointer">{t('قواعد التنبيه', 'Signal rules')}</summary><p className="mt-2 leading-7">{t('المتوسط: 10 طلبات غير ملغاة على الأقل لكل طرف، وفارق 20٪ أو أكثر عن وسيط الآخرين. الإلغاء: 20 طلبًا لكل طرف، و3 إلغاءات على الأقل، وفارق 5 نقاط مئوية أو أكثر. تتوقف الإشارات عند نقص أي قراءة محددة.', 'Average: at least 10 non-cancelled orders per participant and at least 20% below peer median. Cancellation: 20 orders per participant, at least 3 cancellations and at least 5 percentage points above peer median. Signals stop when any selected read is incomplete.')}</p></details>
    </section>
  </div>;
}
