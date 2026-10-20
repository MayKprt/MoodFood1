"use client";

import { useEffect, useRef, useState } from "react";
import styles from "@/app/iphone-test/iphone-test.module.css";

export default function IPhonePreview({ experimental = false }: { experimental?: boolean }) {
  const stage = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setScale(Math.min(1, entry.contentRect.width / 414));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <main className={styles.preview}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>{experimental ? "LOCAL EXPERIMENT" : "MOODFOOD"}</p>
        <h1>MoodFood, pocket-sized.</h1>
        <p>Your existing Customer app · 390 × 844 viewport</p>
        <a href="/customer" target="_blank" rel="noopener noreferrer">
          Open Full App <span aria-hidden="true">↗</span>
        </a>
      </header>
      <div ref={stage} className={styles.stage} style={{ height: 912 * scale }}>
        <div className={styles.phone} style={{ transform: `scale(${scale})` }}>
          <div className={styles.volume} aria-hidden="true" />
          <div className={styles.power} aria-hidden="true" />
          <div className={styles.screen}>
            <div className={styles.statusBar} aria-hidden="true">
              <span>9:41</span>
              <div className={styles.island} />
              <svg width="58" height="16" viewBox="0 0 58 16" fill="currentColor">
                <path d="M0 12h3v3H0zm5-3h3v6H5zm5-4h3v10h-3zm5-4h3v14h-3z" />
                <path d="M22 5q7-7 14 0l-2 2q-5-5-10 0zm3 4q4-4 8 0l-2 2q-2-2-4 0zm3 4 1-1 1 1-1 1z" />
                <rect x="40" y="3" width="15" height="10" rx="2" fill="none" stroke="currentColor" />
                <rect x="42" y="5" width="11" height="6" rx="1" />
                <path d="M56 6h2v4h-2z" />
              </svg>
            </div>
            <iframe
              className={styles.app}
              src="/customer"
              title="MoodFood Customer — interactive iPhone preview"
              width="390"
              height="844"
              onLoad={(event) => {
                // This visual override exists only in this experimental iframe.
                const document = event.currentTarget.contentDocument;
                if (!document || document.getElementById("iphone-preview-alignment")) return;
                const style = document.createElement("style");
                style.id = "iphone-preview-alignment";
                style.textContent = `
                  .hero-copy > .feed-button { display: flex; margin-inline: auto; }
                  .hero-copy > p { text-align: center; }
                  .hero-copy > .hero-footnote { justify-content: center; text-align: center; }
                `;
                document.head.appendChild(style);
              }}
            />
            <div className={styles.homeIndicator} aria-hidden="true" />
          </div>
        </div>
      </div>
      <p className={styles.note}>Demo ordering. Use fictional details when testing.</p>
    </main>
  );
}
