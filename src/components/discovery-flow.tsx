"use client";
import { useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  Check,
  Clock3,
  Heart,
  Info,
  RotateCcw,
  Shuffle,
  Sparkles,
  Swords,
  X,
} from "lucide-react";
import type { CSSProperties } from "react";
import { dishes, dishById, restaurantById } from "@/lib/data";
import { money, shortlist, faceOffWinner } from "@/lib/domain";
import { eligible, scoreDish } from "@/lib/recommendations";
import type { MoodFoodApp } from "@/lib/use-moodfood";
import { DishTile, FoodPhoto, EmptyState } from "./ui";
export function Deck({
  app,
  onDish,
}: {
  app: MoodFoodApp;
  onDish: (id: string) => void;
}) {
  const index = app.deck.history.length;
  const dish = dishById(app.deck.ids[index]);
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const [drag, setDrag] = useState(0);
  const card = useRef<HTMLElement>(null);
  const swiping = useRef(false);
  const [leaving, setLeaving] = useState(false);
  async function decide(decision: "like" | "skip") {
    if (swiping.current) return;
    swiping.current = true;
    setLeaving(true);
    const direction = decision === "like" ? 1 : -1;
    if (card.current && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      await card.current.animate(
        [{ transform: `translateX(${drag}px) rotate(${drag / 25}deg)`, opacity: 1 },
         { transform: `translateX(${direction * 460}px) rotate(${direction * 18}deg)`, opacity: 0 }],
        { duration: 220, easing: "cubic-bezier(.2,.7,.3,1)" },
      ).finished.catch(() => {});
    }
    setDrag(0);
    app.swipe(decision);
    swiping.current = false;
    setLeaving(false);
  }
  if (!dish)
    return (
      <EmptyState
        icon={<Shuffle />}
        title="Ready for a fresh start?"
        description="Your next food mood is waiting."
        action="Back to Discover"
        onAction={() => app.setView("discover")}
      />
    );
  return (
    <section className="deck-page">
      <div className="flow-heading">
        <button className="back-button" onClick={() => app.setView("discover")}>
          <ArrowLeft size={17} />
          Discover
        </button>
        <span className="eyebrow">A LITTLE GUT FEELING</span>
        <span className="deck-count">
          {index + 1} of {app.deck.ids.length}
        </span>
      </div>
      <div className="deck-title">
        <h1>
          Looks like your <em>kind of hungry.</em>
        </h1>
        <p>Skip what doesn’t speak to you. Heart what does.</p>
      </div>
      <div
        className="deck-progress"
        aria-label={`Dish ${index + 1} of ${app.deck.ids.length}`}
      >
        {app.deck.ids.map((id, i) => (
          <span key={id} className={i <= index ? "active" : ""} />
        ))}
      </div>
      <div className="deck-stage">
        <div className="card-shadow shadow-two" />
        <div className="card-shadow shadow-one" />
        <article
          key={dish.id}
          ref={card}
          className={`swipe-card ${drag ? "is-dragging" : ""}`}
          tabIndex={0}
          aria-label={`${dish.name}. Use the Skip or Like buttons, or left and right arrow keys.`}
          onKeyDown={(e) => {
            if (e.target !== e.currentTarget) return;
            if (e.key === "ArrowRight") {
              e.preventDefault();
              void decide("like");
            }
            if (e.key === "ArrowLeft") {
              e.preventDefault();
              void decide("skip");
            }
          }}
          style={
            {
              transform: `translateX(${drag}px) rotate(${drag / 25}deg)`,
            } as CSSProperties
          }
          onPointerDown={(e) => {
            if (swiping.current || (e.target as HTMLElement).closest("button") || e.button !== 0) return;
            pointer.current = { x: e.clientX, y: e.clientY };
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (pointer.current) {
              const dx = e.clientX - pointer.current.x;
              const dy = e.clientY - pointer.current.y;
              if (Math.abs(dx) > Math.abs(dy) * 1.5) setDrag(dx);
            }
          }}
          onPointerUp={(e) => {
            if (pointer.current) {
              const dx = e.clientX - pointer.current.x;
              const dy = e.clientY - pointer.current.y;
              if (Math.abs(dx) > 85 && Math.abs(dx) > Math.abs(dy) * 1.5)
                void decide(dx > 0 ? "like" : "skip");
            }
            pointer.current = null;
            setDrag(0);
          }}
          onPointerCancel={() => {
            pointer.current = null;
            setDrag(0);
          }}
        >
          <div className="swipe-photo">
            <FoodPhoto dish={dish} priority />
            <span className="photo-pill">
              <Clock3 size={13} />
              {dish.minutes.join("–")} min
            </span>
            <span
              className={`swipe-feedback ${drag > 50 ? "show-like" : drag < -50 ? "show-skip" : ""}`}
            >
              {drag > 0 ? "YES PLEASE" : "NOT TODAY"}
            </span>
          </div>
          <div className="swipe-content">
            <div className="swipe-title">
              <h2>{dish.name}</h2>
              <strong>{money(dish.price)}</strong>
            </div>
            <p>{dish.description}</p>
            <div className="tag-row">
              {dish.tags.map((t) => (
                <span key={t}>{t}</span>
              ))}
            </div>
            <div className="swipe-info">
              <span>
                Delivery {money(restaurantById(dish.restaurantId).deliveryFee)}{" "}
                · fees & tax at checkout
              </span>
              <button
                onClick={() => onDish(dish.id)}
                aria-label="Reveal kitchen, ingredients, and allergen information"
              >
                <Info size={16} />
                Dish & kitchen info
              </button>
            </div>
          </div>
        </article>
      </div>
      <div className="deck-secondary-actions" aria-label="Card tools">
        <button className="round-action undo-action" onClick={app.goBack}
          disabled={!index || leaving} aria-label="Undo last swipe" title="Undo last swipe">
          <RotateCcw size={20} />
        </button>
        <span>Swipe left to skip · right to like</span>
        <button className={`round-action save-action ${app.saved.includes(dish.id) ? "is-saved" : ""}`}
          onClick={() => app.toggleSave(dish.id)} disabled={leaving}
          aria-label={app.saved.includes(dish.id) ? "Remove bookmark" : "Bookmark for later"}
          title="Save for later" aria-pressed={app.saved.includes(dish.id)}>
          <Bookmark size={20} fill={app.saved.includes(dish.id) ? "currentColor" : "none"} />
        </button>
      </div>
      <div className="swipe-actions">
        <button className="primary-swipe skip-action" onClick={() => void decide("skip")}
          disabled={leaving} aria-label="Skip dish">
          <X size={27} /><span>Not today</span>
        </button>
        <button className="primary-swipe like-action" onClick={() => void decide("like")}
          disabled={leaving} aria-label="Like dish">
          <Heart size={27} /><span>Yes, please</span>
        </button>
      </div>
      <p className="deck-hint">
        A heart means “maybe for today.” An order is always your choice.
      </p>
    </section>
  );
}
export function Finalists({
  app,
  onDish,
}: {
  app: MoodFoodApp;
  onDish: (id: string) => void;
}) {
  const liked = shortlist(app.deck)
    .map((id) => dishById(id)!)
    .filter(Boolean);
  const ranked = liked
    .filter((d) => eligible(d, app.preferences, app.address.zip, app.intent))
    .sort(
      (a, b) =>
        scoreDish(b, app.selection, app.preferences, app.intent, app.feedback)
          .score -
        scoreDish(a, app.selection, app.preferences, app.intent, app.feedback)
          .score,
    );
  const top = ranked[0];
  return (
    <section className="flow-page">
      <div className="flow-heading">
        <button
          className="back-button"
          onClick={app.goBack}
          disabled={!app.deck.history.length}
        >
          <RotateCcw size={16} />
          Undo last swipe
        </button>
        <span className="eyebrow">LESS THINKING, MORE EATING</span>
      </div>
      <div className="page-intro">
        <span className="intro-icon">✳︎</span>
        <h1>
          Your food <em>finalists.</em>
        </h1>
        <p>
          {liked.length
            ? "Your gut has good taste. Here’s what caught your eye."
            : "Nothing felt quite right? There’s more good food where that came from."}
        </p>
      </div>
      {top && (
        <article className="top-pick">
          <button
            className="top-pick-photo"
            onClick={() => onDish(top.id)}
            aria-label={`View ${top.name}`}
          >
            <FoodPhoto dish={top} />
          </button>
          <div className="top-pick-content">
            <span className="eyebrow">
              <Sparkles size={15} />
              MOODFOOD’S TOP PICK FOR YOU
            </span>
            <h2>{top.name}</h2>
            <span className="restaurant-name">
              {restaurantById(top.restaurantId).name} · Fictional demo kitchen
            </span>
            <p>
              {
                scoreDish(
                  top,
                  app.selection,
                  app.preferences,
                  app.intent,
                  app.feedback,
                ).explanation
              }
            </p>
            <div className="pick-meta">
              <strong>{money(top.price)}</strong>
              <span>
                <Clock3 size={15} />
                {top.minutes.join("–")} min
              </span>
            </div>
            <button className="primary-button" onClick={() => onDish(top.id)}>
              This looks like the one <ArrowUpRight size={18} />
            </button>
          </div>
        </article>
      )}
      {liked.length > 0 && !top && (
        <p className="inline-info">
          Your saved likes no longer meet your current delivery or dietary
          settings. Update your preferences or explore a new deck.
        </p>
      )}
      <div className="finalist-actions">
        <button
          className="secondary-button"
          disabled={liked.length < 2}
          onClick={() => app.setView("faceoff")}
        >
          <Swords size={19} />
          Can’t decide? Food Face-Off
        </button>
        <span>
          {liked.length < 2
            ? "Like at least two dishes to compare."
            : "A quick little game for a very tasty tie."}
        </span>
      </div>
      {liked.length > 0 && (
        <>
          <h2 className="subsection-title">
            {top ? "The rest of your good taste" : "Your liked dishes"}
          </h2>
          <div className="dish-grid">
            {liked
              .filter((d) => d.id !== top?.id)
              .map((d) => (
                <DishTile
                  key={d.id}
                  dish={d}
                  saved={app.saved.includes(d.id)}
                  onSave={() => app.toggleSave(d.id)}
                  onOpen={() => onDish(d.id)}
                />
              ))}
          </div>
        </>
      )}
      <div className="refresh-panel">
        <Shuffle size={26} />
        <h2>A different kind of hungry?</h2>
        <p>Explore another seven. Your preferences come along.</p>
        <button
          className="primary-button"
          disabled={app.busy}
          onClick={() => app.refreshDeck()}
        >
          {app.busy ? "Finding more…" : "Explore another seven"}
          <ArrowRight size={18} />
        </button>
        <div className="refinement-row">
          {[
            "Something cheaper",
            "Something lighter",
            "Something spicier",
            "Something completely different",
          ].map((t) => (
            <button
              key={t}
              onClick={() => app.refreshDeck(t)}
              disabled={app.busy}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
export function FaceOff({
  app,
  onDish,
}: {
  app: MoodFoodApp;
  onDish: (id: string) => void;
}) {
  const original = shortlist(app.deck);
  const [remaining, setRemaining] = useState(original);
  const winner = remaining.length === 1 ? dishById(remaining[0]) : null;
  return (
    <section className="flow-page">
      <button className="back-button" onClick={() => app.setView("shortlist")}>
        <ArrowLeft size={17} />
        Back to your shortlist
      </button>
      <div className="page-intro">
        <span className="eyebrow">
          <Swords size={15} />
          FOOD FACE-OFF
        </span>
        <h1>
          {winner ? (
            <>
              Your appetite <em>has spoken!</em>
            </>
          ) : (
            <>
              Follow your <em>first instinct.</em>
            </>
          )}
        </h1>
        <p>
          {winner
            ? "One very delicious decision, made."
            : "Which would you rather eat right now?"}
        </p>
      </div>
      {winner ? (
        <div className="winner-card">
          <FoodPhoto dish={winner} />
          <span className="eyebrow">THE WINNER</span>
          <h2>{winner.name}</h2>
          <p>{restaurantById(winner.restaurantId).name}</p>
          <p>
            {money(winner.price)} · {winner.minutes.join("–")} min
          </p>
          <button className="primary-button" onClick={() => onDish(winner.id)}>
            View dish & order <ArrowUpRight size={18} />
          </button>
        </div>
      ) : (
        <div className="faceoff-grid">
          {remaining.slice(0, 2).map((id, i) => {
            const d = dishById(id)!;
            return (
              <div key={id} className="faceoff-card">
                <FoodPhoto dish={d} />
                <h2>{d.name}</h2>
                <p>{restaurantById(d.restaurantId).name}</p>
                <span>
                  {money(d.price)} · {d.minutes.join("–")} min
                </span>
                <button
                  className="primary-button"
                  onClick={() => setRemaining(faceOffWinner(remaining, id))}
                >
                  This one <Heart size={17} />
                </button>
                {i === 0 && <span className="versus">or</span>}
              </div>
            );
          })}
        </div>
      )}
      <div className="center-actions">
        <button className="text-link" onClick={() => setRemaining(original)}>
          <RotateCcw size={16} />
          Restart comparison
        </button>
        <p>Your shortlist and bookmarks stay just as you left them.</p>
      </div>
    </section>
  );
}
