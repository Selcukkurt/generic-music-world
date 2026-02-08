const modules = Array.from({ length: 6 }, (_, index) => index + 1);

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-6 py-12">
      <div className="mx-auto w-full max-w-5xl">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="mt-2 text-sm text-slate-400">Modules</p>

        <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((module) => (
            <div
              key={module}
              className="flex h-28 items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-900/60 text-sm text-slate-400"
            >
              Module Card
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
