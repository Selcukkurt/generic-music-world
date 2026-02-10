export default function Loading() {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-slate-950/80"
      style={{ zIndex: "var(--z-modal)" }}
    >
      <img src="/brand-loader.gif" alt="Loading" className="h-20 w-20" />
    </div>
  );
}
