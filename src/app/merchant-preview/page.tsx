"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./merchant-preview.module.css";

export default function MerchantPreviewPage() {
  const stage = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState<boolean | null>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 760px)");
    const update = () => setCompact(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const element = stage.current;
    if (!element || compact) return;
    const observer = new ResizeObserver(([entry]) => {
      setScale(Math.min(1, entry.contentRect.width / 1224));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [compact]);

  if (compact === null) return <main className={styles.preview} aria-busy="true" />;
  if (compact) {
    return (
      <main className={styles.compact}>
        <iframe src="/merchant" title="MoodFood Merchant — interactive preview" className={styles.fullScreenApp} />
      </main>
    );
  }

  return (
    <main className={styles.preview}>
      <div ref={stage} className={styles.stage} style={{ height: 864 * scale }}>
        <div className={styles.tablet} style={{ transform: `scale(${scale})` }}>
          <div className={styles.camera} aria-hidden="true" />
          <div className={styles.power} aria-hidden="true" />
          <div className={styles.volume} aria-hidden="true" />
          <div className={styles.screen}>
            <iframe
              src="/merchant"
              title="MoodFood Merchant — interactive landscape iPad preview"
              width="1180"
              height="820"
              className={styles.app}
            />
            <div className={styles.homeIndicator} aria-hidden="true" />
          </div>
        </div>
      </div>
    </main>
  );
}
