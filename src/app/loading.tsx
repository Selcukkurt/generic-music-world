export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80">
      <img
        src="/brand-loader.gif"
        alt="Loading"
        className="h-20 w-20"
      />
    </div>
  );
}
