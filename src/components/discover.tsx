"use client";
import {
  ArrowRight,
  ArrowUpRight,
  Sparkles,
  Send,
  Clock3,
  Leaf,
  Heart,
  Shuffle,
} from "lucide-react";
import { dishes, moods, cravings } from "@/lib/data";
import { eligible, scoreDish, parseIntent } from "@/lib/recommendations";
import type { MoodFoodApp } from "@/lib/use-moodfood";
import { DishTile, FoodPhoto, SectionHeading } from "./ui";
export function Discover({
  app,
  onDish,
  onAuth,
}: {
  app: MoodFoodApp;
  onDish: (id: string) => void;
  onAuth: () => void;
}) {
  const { selection, setSelection } = app;
  const suggestions = dishes
    .filter((d) => eligible(d, app.preferences, app.address.zip))
    .slice(0, 4);
  return (
    <>
      {!app.welcomed && (
        <div className="welcome-strip">
          <span>
            <span className="tiny-sun">✳︎</span> Your next favorite meal starts
            here.
          </span>
          <div>
            <button
              onClick={() => {
                app.setWelcomed(true);
                app.setNotice(
                  "Welcome in. No account needed to find your next favorite.",
                );
              }}
            >
              Continue as guest <ArrowRight size={14} />
            </button>
            <button onClick={onAuth}>Sign in</button>
          </div>
        </div>
      )}
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">
            <span className="small-line" />
            GOOD FOOD. ZERO OVERTHINKING.
          </span>
          <h1>
            Hey, what’s the
            <br />
            <em>food mood?</em>
            <span className="heading-spark" aria-hidden="true">
              ✳︎
            </span>
          </h1>
          <p>
            No thinking required.
            <br className="mobile-break" /> We’ll figure it out together.
          </p>
          <button
            className="primary-button feed-button"
            onClick={() => void app.startDeck()}
            disabled={!app.ready || app.busy}
          >
            <Shuffle size={19} />
            {app.busy ? "Finding your food…" : "Just feed me"}
            <ArrowUpRight size={21} />
          </button>
          <div className="hero-footnote">
            <span className="mini-avatars">
              <i>🍜</i>
              <i>🥑</i>
              <i>🌮</i>
            </span>
            <span>7 dishes. One delicious decision.</span>
          </div>
        </div>
        <div className="hero-art" aria-label="Featured food">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <span className="art-star star-one" aria-hidden="true">
            ✦
          </span>
          <span className="art-star star-two" aria-hidden="true">
            ✧
          </span>
          <button
            className="hero-food"
            onClick={() => onDish("gochujang")}
            aria-label="View Gochujang Chicken Bowl"
          >
            <FoodPhoto dish={dishes[0]} priority />
          </button>
          <span className="handwritten hero-note">
            a little sweet.
            <br />a little heat.
            <svg viewBox="0 0 80 60" aria-hidden="true">
              <path d="M3 5 Q66 2 61 43 M52 34 L61 46 L73 36" />
            </svg>
          </span>
          <div className="hero-food-label">
            <div className="label-icon">
              <Heart size={19} />
            </div>
            <div>
              <span>MEET YOUR NEXT CRAVING</span>
              <strong>Gochujang Chicken Bowl</strong>
            </div>
          </div>
        </div>
      </section>
      <section className="mood-section">
        <SectionHeading title="A little mood check.">
          <span className="section-aside">
            Pick a feeling. Or follow your stomach.
          </span>
        </SectionHeading>
        <div className="mood-grid">
          {moods.map((m) => (
            <button
              key={m.name}
              className={`mood-option ${selection.mood === m.name ? "selected" : ""}`}
              aria-pressed={selection.mood === m.name}
              onClick={() =>
                setSelection({
                  ...selection,
                  mood: selection.mood === m.name ? "" : m.name,
                })
              }
            >
              <span className="mood-emoji">{m.emoji}</span>
              <strong>{m.name}</strong>
              <small>{m.hint}</small>
              <span className="mood-check" aria-hidden="true">
                ✓
              </span>
            </button>
          ))}
        </div>
      </section>
      <section className="craving-section">
        <div>
          <h3>Or, chasing a craving?</h3>
          <p>You can pick a few. We get it.</p>
        </div>
        <div className="craving-chips">
          {cravings.map((c) => (
            <button
              key={c}
              className={`chip ${selection.cravings.includes(c) ? "selected" : ""}`}
              aria-pressed={selection.cravings.includes(c)}
              onClick={() =>
                setSelection({
                  ...selection,
                  cravings: selection.cravings.includes(c)
                    ? selection.cravings.filter((x) => x !== c)
                    : [...selection.cravings, c],
                })
              }
            >
              {c === "Spicy" ? "🌶 " : c === "Crispy" ? "✦ " : ""}
              {c}
            </button>
          ))}
        </div>
      </section>
      <div className="conversation-row">
        <div className="conversation-icon">
          <Sparkles size={23} />
        </div>
        <div className="conversation-copy">
          <strong>A craving you can’t quite name?</strong>
          <span>Tell us a little. We’ll take it from here.</span>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void app.startDeck();
          }}
        >
          <label className="sr-only" htmlFor="food-request">
            Tell me what sounds good
          </label>
          <input
            id="food-request"
            placeholder="Something comforting, but not too heavy…"
            maxLength={500}
            value={selection.text}
            onChange={(e) =>
              setSelection({ ...selection, text: e.target.value })
            }
          />
          <button
            type="submit"
            aria-label="Find dishes for my craving"
            disabled={!app.ready || app.busy}
          >
            <ArrowRight size={21} />
          </button>
        </form>
      </div>
      {(selection.mood || selection.cravings.length > 0) && (
        <div className="selection-bar">
          <span>
            Your mood:{" "}
            {[selection.mood, ...selection.cravings]
              .filter(Boolean)
              .join(" + ")}
          </span>
          <button onClick={() => void app.startDeck()} disabled={app.busy}>
            Find my seven <ArrowRight size={16} />
          </button>
          <button
            className="text-button"
            onClick={() => setSelection({ mood: "", cravings: [], text: "" })}
          >
            Clear
          </button>
        </div>
      )}
      <section className="today-section">
        <SectionHeading
          eyebrow="A TASTE OF WHAT’S WAITING"
          title="Good things are on the menu."
        >
          <button
            className="text-link"
            onClick={() => void app.startDeck()}
            disabled={!app.ready || app.busy}
          >
            Find your match <ArrowUpRight size={16} />
          </button>
        </SectionHeading>
        <div className="dish-grid">
          {suggestions.map((d) => (
            <DishTile
              key={d.id}
              dish={d}
              saved={app.saved.includes(d.id)}
              onSave={() => app.toggleSave(d.id)}
              onOpen={() => onDish(d.id)}
            />
          ))}
        </div>
        {!suggestions.length && (
          <p className="inline-info">
            No demo dishes match your current preferences and delivery ZIP. Edit
            your profile or delivery location to explore.
          </p>
        )}
      </section>
      <div className="discovery-promise">
        <span>✳︎</span>
        <div>
          <h3>Trust your taste. We’ll handle the choices.</h3>
          <p>
            No endless menus. No pressure. Just a little nudge toward something
            delicious.
          </p>
        </div>
        <span className="promise-note">hungry looks good on you.</span>
      </div>
    </>
  );
}
