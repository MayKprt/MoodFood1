"use client";
import { useState } from "react";
import { Sparkles, X } from "lucide-react";
import type { MenuDish } from "./merchant-data";
import s from "./merchant.module.css";

export function FoodSuggestions({
  dish,
  onChange,
}: {
  dish: MenuDish;
  onChange: (dish: MenuDish) => void;
}) {
  const [tag, setTag] = useState("");
  const [mood, setMood] = useState("");
  const [error, setError] = useState("");
  function update(field: "foodTags" | "suggestedMoods", values: string[]) {
    onChange({ ...dish, [field]: values, suggestionsEdited: true });
    setError("");
  }
  function add(
    field: "foodTags" | "suggestedMoods",
    text: string,
    clear: () => void,
  ) {
    const value = text.trim();
    if (!value) return;
    if (
      dish[field].some(
        (existing) => existing.toLowerCase() === value.toLowerCase(),
      )
    ) {
      setError("Already added.");
      return;
    }
    if (dish[field].length >= 12) {
      setError("Keep up to 12 suggestions per group.");
      return;
    }
    update(field, [...dish[field], value]);
    clear();
  }
  return (
    <section
      className={s.foodSuggestions}
      aria-label={`MoodFood AI Suggestions for ${dish.name || "new dish"}`}
    >
      <h3>
        <Sparkles size={18} aria-hidden="true" /> MoodFood AI Suggestions
      </h3>
      <p className={s.demoNote}>
        Demo suggestions · No live AI or Customer catalog connection.
      </p>
      {!dish.foodTags.length &&
        !dish.suggestedMoods.length &&
        !dish.suggestionsEdited && (
          <p>
            Add a descriptive dish name or food notes for suggestions. You can
            also add your own.
          </p>
        )}
      {[
        {
          field: "foodTags" as const,
          label: "Food Tags",
          text: tag,
          set: setTag,
          placeholder: "e.g. Creamy",
        },
        {
          field: "suggestedMoods" as const,
          label: "Suggested Moods",
          text: mood,
          set: setMood,
          placeholder: "e.g. Comfort Food",
        },
      ].map((group) => (
        <div key={group.field} className={s.suggestionGroup}>
          <strong>{group.label}</strong>
          <div className={s.suggestionChips}>
            {dish[group.field].map((value) => (
              <button
                type="button"
                key={value}
                className={s.suggestionChip}
                aria-label={`Remove ${group.label}: ${value}`}
                onClick={() =>
                  update(
                    group.field,
                    dish[group.field].filter((item) => item !== value),
                  )
                }
              >
                {value}
                <X size={14} aria-hidden="true" />
              </button>
            ))}
          </div>
          <div className={s.suggestionEntry}>
            <input
              aria-label={`Add ${group.label}`}
              placeholder={group.placeholder}
              maxLength={40}
              value={group.text}
              onChange={(event) => group.set(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  add(group.field, group.text, () => group.set(""));
                }
              }}
            />
            <button
              type="button"
              className={s.secondary}
              disabled={!group.text.trim()}
              onClick={() => add(group.field, group.text, () => group.set(""))}
            >
              Add<span className={s.suggestionHidden}> {group.label}</span>
            </button>
          </div>
        </div>
      ))}
      {dish.suggestionsEdited && (
        <small>Your corrections are kept when dish details change.</small>
      )}
      {error && <p role="status">{error}</p>}
    </section>
  );
}
