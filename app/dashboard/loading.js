// Phase 14 — "Loading state: Not a blank screen." Before this file
// existed, there was no loading.js anywhere in the app at all — every
// single navigation showed a blank white page for however long the
// destination page's server-side data fetching took. This is a
// Suspense boundary Next.js shows automatically for every route under
// /dashboard while that route's page.js is still loading.
export default function DashboardLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-3 w-24 bg-black/[0.06] rounded mb-3" />
      <div className="h-7 w-64 bg-black/[0.08] rounded mb-8" />

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white border border-black/[0.06] rounded-2xl p-5">
            <div className="w-9 h-9 rounded-[10px] bg-black/[0.06] mb-3.5" />
            <div className="h-6 w-16 bg-black/[0.08] rounded mb-2" />
            <div className="h-3 w-28 bg-black/[0.06] rounded" />
          </div>
        ))}
      </div>

      <div className="mt-6 bg-white border border-black/[0.06] rounded-2xl p-5">
        <div className="h-4 w-32 bg-black/[0.06] rounded mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-9 bg-black/[0.04] rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
