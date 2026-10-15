export default function Loading() {
  return (
    <main className="loading-state" role="status">
      <span className="brand-mark">✳︎</span>
      <div className="skeleton" />
      <p>Something good is coming…</p>
    </main>
  );
}
