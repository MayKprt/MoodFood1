"use client";
import { useState } from "react";
import {
  ArrowUpRight,
  Bookmark,
  Heart,
  LogOut,
  MapPin,
  Settings2,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import type { MoodFoodApp } from "@/lib/use-moodfood";
import { defaultPreferences } from "@/lib/domain";
export function Profile({
  app,
  onAddress,
  onAuth,
}: {
  app: MoodFoodApp;
  onAddress: () => void;
  onAuth: () => void;
}) {
  const [allergies, setAllergies] = useState(
    app.preferences.allergies.join(", "),
  );
  const update = (patch: Partial<typeof app.preferences>) =>
    app.setPreferences((old) => ({ ...old, ...patch }));
  async function signOut() {
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "signout" }),
      });
      if (!response.ok)
        throw new Error("Could not sign out. Please try again.");
      await app.loadSession();
      app.setNotice("Signed out. Your guest space is ready.");
    } catch (e) {
      app.setError((e as Error).message);
    }
  }
  return (
    <section className="flow-page profile-page">
      <div className="page-intro align-left">
        <span className="eyebrow">A LITTLE MORE YOU</span>
        <h1>
          Your taste. <em>Your rules.</em>
        </h1>
        <p>Only share what you want. Good food doesn’t need a questionnaire.</p>
      </div>
      <div className="profile-grid">
        <aside>
          <div className="panel profile-account">
            <span className="profile-avatar">
              <UserRound size={30} />
            </span>
            <h2>
              {app.user?.kind === "account"
                ? "Your MoodFood account"
                : "Hey, hungry friend."}
            </h2>
            <p>{app.user?.email || "Exploring as a guest"}</p>
            <span className="demo-badge">Demo ordering</span>
            {app.user?.kind === "guest" ? (
              <>
                <p className="muted">
                  Your saved dishes and preferences stay in this browser. Sign
                  in to sync preferences, saved dishes, and your Home address
                  through a configured Supabase project.
                </p>
                <button className="secondary-button" onClick={onAuth}>
                  Sign in / create account <ArrowUpRight size={16} />
                </button>
              </>
            ) : (
              <button
                className="secondary-button"
                onClick={() => void signOut()}
              >
                <LogOut size={16} />
                Sign out
              </button>
            )}
          </div>
          <div className="panel profile-links">
            <button onClick={() => app.setView("saved")}>
              <Bookmark size={18} />
              Saved dishes<span>{app.saved.length}</span>
            </button>
            <button onClick={() => app.setView("orders")}>
              <Heart size={18} />
              Order history
              <ArrowUpRight size={16} />
            </button>
            <button onClick={onAddress}>
              <MapPin size={18} />
              Delivery address
              <ArrowUpRight size={16} />
            </button>
          </div>
        </aside>
        <form
          className="panel preferences-form"
          onSubmit={(e) => {
            e.preventDefault();
            update({
              allergies: allergies
                .split(",")
                .map((x) => x.trim().toLowerCase())
                .filter(Boolean),
            });
            app.setNotice(
              "Preferences saved. New decks will use your updated choices.",
            );
          }}
        >
          <div className="panel-title">
            <Settings2 size={19} />
            <h2>A taste of your preferences</h2>
          </div>
          <fieldset>
            <legend>How you like to eat</legend>
            <p className="muted">
              Explicit dietary choices filter every new deck.
            </p>
            <div className="preference-options">
              {["Vegetarian", "Vegan", "Gluten-free"].map((d) => (
                <label key={d}>
                  <input
                    type="checkbox"
                    checked={app.preferences.diets.includes(d)}
                    onChange={() =>
                      update({
                        diets: app.preferences.diets.includes(d)
                          ? app.preferences.diets.filter((x) => x !== d)
                          : [...app.preferences.diets, d],
                      })
                    }
                  />
                  {d}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="form-group">
            <label className="form-label" htmlFor="allergies">
              Allergies & ingredient restrictions
            </label>
            <input
              id="allergies"
              value={allergies}
              onChange={(e) => {
                setAllergies(e.target.value);
                update({
                  allergies: e.target.value
                    .split(",")
                    .map((x) => x.trim().toLowerCase())
                    .filter(Boolean),
                });
              }}
              placeholder="e.g. sesame, milk, peanut"
              maxLength={500}
            />
            <p className="form-help">
              Separate each restriction with a comma. Restrictions are explicit
              and never inferred from swipes.
            </p>
            <div className="safety-note">
              <ShieldCheck size={20} />
              <span>
                Recipes here are fictional. Real ingredients and cross-contact
                must be confirmed with the merchant. Filtering cannot guarantee
                allergy safety.
              </span>
            </div>
          </div>
          <fieldset>
            <legend>Your go-to cuisines</legend>
            <div className="craving-chips">
              {[
                "Korean",
                "Japanese",
                "Italian",
                "Mexican",
                "Mediterranean",
                "American",
                "Thai",
                "Chinese",
              ].map((c) => (
                <button
                  type="button"
                  key={c}
                  className={`chip ${app.preferences.cuisines.includes(c) ? "selected" : ""}`}
                  aria-pressed={app.preferences.cuisines.includes(c)}
                  onClick={() =>
                    update({
                      cuisines: app.preferences.cuisines.includes(c)
                        ? app.preferences.cuisines.filter((x) => x !== c)
                        : [...app.preferences.cuisines, c],
                    })
                  }
                >
                  {c}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="form-group">
            <label className="form-label" htmlFor="disliked">
              Ingredients you’d rather skip
            </label>
            <input
              id="disliked"
              placeholder="e.g. mushroom, cilantro"
              maxLength={500}
              value={app.preferences.disliked}
              onChange={(e) => update({ disliked: e.target.value })}
            />
            <p className="form-help">
              A gentle preference, not an allergy restriction.
            </p>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="budget">
              Dish budget <strong>${app.preferences.budget}</strong>
            </label>
            <input
              id="budget"
              type="range"
              min="10"
              max="50"
              step="1"
              value={app.preferences.budget}
              onChange={(e) => update({ budget: Number(e.target.value) })}
            />
            <p className="form-help">
              Per dish, before delivery, service fee, and tax.
            </p>
          </div>
          <label className="option-row">
            <span>
              <input
                type="checkbox"
                checked={app.preferences.notifications}
                onChange={(e) => update({ notifications: e.target.checked })}
              />
              In-app order status updates
            </span>
          </label>
          <p className="form-help">
            Orders update when the Orders screen is open. No push or email
            notifications are sent.
          </p>
          <div className="form-actions">
            <button className="primary-button" type="submit">
              Save preferences <ArrowUpRight size={17} />
            </button>
            <button
              className="text-link"
              type="button"
              onClick={() => {
                app.setPreferences(defaultPreferences);
                setAllergies("");
                app.setNotice("Personalization cleared.");
              }}
            >
              Clear personalization
            </button>
          </div>
          <p className="form-help">
            {app.user?.kind === "account"
              ? "Synced to your configured account, with a local backup on this device."
              : "Stored locally on this device. You can change or clear these at any time."}
          </p>
        </form>
      </div>
    </section>
  );
}
