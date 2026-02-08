export default function LoginPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-6 py-12">
      <section className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg">
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <p className="mt-2 text-sm text-slate-400">
          Access your Generic Music World dashboard.
        </p>

        <form className="mt-6 space-y-4">
          <label className="block text-sm text-slate-300">
            Email
            <input
              type="email"
              name="email"
              placeholder="you@example.com"
              className="mt-2 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600"
            />
          </label>

          <label className="block text-sm text-slate-300">
            Password
            <input
              type="password"
              name="password"
              placeholder="••••••••"
              className="mt-2 w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600"
            />
          </label>

          <button
            type="button"
            disabled
            className="w-full cursor-not-allowed rounded-md border border-slate-800 bg-slate-800/60 px-4 py-2 text-sm font-medium text-slate-300 opacity-70"
          >
            Sign in
          </button>
        </form>
      </section>
    </main>
  );
}
