"use client";
import { useRef, useState } from "react";
import { Camera, Upload } from "lucide-react";
import s from "./merchant.module.css";

export function DishPhotoUpload({
  photo,
  onChange,
}: {
  photo: string;
  onChange: (photo: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const request = useRef(0);
  async function read(file: File) {
    const current = ++request.current;
    setError("");
    setBusy(true);
    try {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
        throw new Error("Choose a JPG, PNG, or WebP image.");
      if (file.size > 8 * 1024 * 1024)
        throw new Error("Choose an image smaller than 8 MB.");
      const bitmap = await createImageBitmap(file);
      try {
        const scale = Math.min(1, 960 / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));
        const context = canvas.getContext("2d");
        if (!context)
          throw new Error("Image preview is unavailable. Try another browser.");
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        const data = canvas.toDataURL("image/jpeg", 0.78);
        if (data.length > 450000)
          throw new Error(
            "This image is too detailed for demo storage. Choose a smaller image.",
          );
        if (current === request.current) onChange(data);
      } finally {
        bitmap.close();
      }
    } catch (problem) {
      if (current === request.current)
        setError(
          problem instanceof Error
            ? problem.message
            : "Could not read this image. Try another photo.",
        );
    } finally {
      if (current === request.current) setBusy(false);
    }
  }
  return (
    <section className={s.photoUpload} aria-label="Add a Dish Photo">
      <h3>
        <Camera size={20} aria-hidden="true" /> Add a Dish Photo
      </h3>
      {photo ? (
        <img src={photo} alt="Dish photo preview" className={s.uploadPreview} />
      ) : (
        <p className={s.muted}>Choose a photo from your device.</p>
      )}
      <div className={s.inlineActions}>
        <label className={s.photoPicker}>
          <Upload size={18} aria-hidden="true" />
          {photo ? "Replace photo" : "Upload photo"}
          <input
            type="file"
            aria-label="Upload dish photo"
            accept="image/jpeg,image/png,image/webp"
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void read(file);
              event.target.value = "";
            }}
          />
        </label>
        {photo && (
          <button
            type="button"
            className={s.secondary}
            onClick={() => {
              request.current++;
              setBusy(false);
              setError("");
              onChange("");
            }}
          >
            Remove photo
          </button>
        )}
      </div>
      <p role="status">{busy ? "Preparing photo…" : ""}</p>
      {error && <p role="alert">{error}</p>}
      <small>
        JPG, PNG or WebP · Up to 8 MB. Demo photos are resized and saved only in this browser. Clearing browser data removes them.
      </small>
    </section>
  );
}
