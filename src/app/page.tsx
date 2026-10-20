"use client";

import { useEffect, useState } from "react";
import MoodFoodApp from "@/components/moodfood-app";
import IPhonePreview from "@/components/iphone-preview";

export default function Page() {
  const [mobile, setMobile] = useState<boolean | null>(null);

  useEffect(() => {
    // Render only one app instance; do not load a hidden second session.
    const query = window.matchMedia(
      "(max-width: 767px), (pointer: coarse) and (max-width: 1024px) and (max-height: 500px)",
    );
    const update = () => setMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  if (mobile === null) return <p role="status">Loading MoodFood…</p>;
  return mobile ? <MoodFoodApp /> : <IPhonePreview />;
}
