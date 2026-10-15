"use client";
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="empty-state">
      <span className="brand-mark">✳︎</span>
      <h1>A little hiccup in the kitchen.</h1>
      <p>
        Something didn’t load correctly. Your next food mood is worth another
        try.
      </p>
      <button className="primary-button" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
