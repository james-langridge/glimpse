import AnalyticsDashboard from "@/src/components/AnalyticsDashboard";

export default function AnalyticsPage() {
  return (
    <div className="px-6 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-2xl font-light tracking-widest text-white">
            ANALYTICS
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            View traffic and engagement data
          </p>
        </div>
        <AnalyticsDashboard />
      </div>
    </div>
  );
}
