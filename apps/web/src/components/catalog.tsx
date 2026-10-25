"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, ArrowUpRight, Star, X } from "lucide-react";
import { tools, categories, toolHref, effectivelyAvailable as effAvail } from "@/lib/catalog";
import { CategoryIcon } from "./icon";
export function Catalog({
  initialCategory = "",
  compact = false,
  initialQuery = "",
  mediaJobsEnabled = false,
}: {
  initialCategory?: string;
  compact?: boolean;
  initialQuery?: string;
  // Whether THIS running deployment has the self-hosted Postgres/Redis/
  // worker installation configured (process.env.MEDIA_JOBS_ENABLED, read
  // server-side and passed down — this client component can't read server
  // env itself). When true, the "self-hosted setup required" tools
  // (background-remover, ai-image-upscaler, video-compressor,
  // video-converter) are genuinely working right here, right now, not just
  // "set up correctly elsewhere" — the badge should say so.
  mediaJobsEnabled?: boolean;
}) {
  const effectivelyAvailable = (t: (typeof tools)[number]) =>
    effAvail(t, mediaJobsEnabled);
  const [query, setQuery] = useState(initialQuery),
    [category, setCategory] = useState(initialCategory),
    [live, setLive] = useState(false),
    [consent, setConsent] = useState(false),
    [favorites, setFavorites] = useState<string[]>([]),
    [onlyFavorites, setOnlyFavorites] = useState(false),
    [recent, setRecent] = useState<string[]>([]);
  useEffect(() => {
    try {
      const enabled = localStorage.getItem("toolroom-consent") === "yes";
      setConsent(enabled);
      if (enabled) {
        setFavorites(
          JSON.parse(localStorage.getItem("toolroom-favorites") || "[]"),
        );
        setRecent(JSON.parse(localStorage.getItem("toolroom-recent") || "[]"));
      }
    } catch {}
  }, []);
  useEffect(() => setQuery(initialQuery), [initialQuery]);
  function toggle(id: string) {
    const next = favorites.includes(id)
      ? favorites.filter((x) => x !== id)
      : [...favorites, id];
    setFavorites(next);
    if (consent)
      localStorage.setItem("toolroom-favorites", JSON.stringify(next));
  }
  const matches = tools.filter(
    (t) =>
      (!category || t.category === category) &&
      (!live || effectivelyAvailable(t)) &&
      (!onlyFavorites || favorites.includes(t.id)) &&
      [t.name, t.description, ...t.keywords]
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <div className="catalog">
      {!compact && consent && recent.length > 0 && (
        <div className="recent-tools">
          Recently used:{" "}
          {recent
            .map((id) => tools.find((t) => t.id === id))
            .filter((t) => !!t)
            .map((t) => (
              <Link key={t.id} href={toolHref(t)}>
                {t.name}
              </Link>
            ))}
        </div>
      )}
      <div className="searchbox">
        <Search size={21} />
        <input
          aria-label="Search tools"
          placeholder="What would you like to do?"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query ? (
          <button aria-label="Clear search" onClick={() => setQuery("")}>
            <X size={18} />
          </button>
        ) : (
          <kbd>Search tools</kbd>
        )}
      </div>
      <div className="filters" aria-label="Filter tools">
        <button
          className={!category ? "active" : ""}
          onClick={() => setCategory("")}
        >
          All tools
        </button>
        {categories.slice(0, 4).map((c) => (
          <button
            key={c.slug}
            className={category === c.slug ? "active" : ""}
            onClick={() => setCategory(c.slug)}
          >
            {c.name.replace(" tools", "")}
          </button>
        ))}
        <label className="live-filter">
          <input
            type="checkbox"
            checked={live}
            onChange={(e) => setLive(e.target.checked)}
          />{" "}
          Available now
        </label>
      </div>
      {!compact && (
        <div className="saved-options">
          <label>
            <input
              type="checkbox"
              checked={onlyFavorites}
              onChange={(e) => setOnlyFavorites(e.target.checked)}
            />{" "}
            Favorites
          </label>
          <label>
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => {
                const enabled = e.target.checked;
                setConsent(enabled);
                if (enabled) {
                  localStorage.setItem("toolroom-consent", "yes");
                  localStorage.setItem(
                    "toolroom-favorites",
                    JSON.stringify(favorites),
                  );
                } else {
                  setRecent([]);
                  [
                    "toolroom-consent",
                    "toolroom-favorites",
                    "toolroom-recent",
                  ].forEach((k) => localStorage.removeItem(k));
                }
              }}
            />{" "}
            Remember favorites and recent tools on this device
          </label>
        </div>
      )}
      <div className="result-meta" role="status">
        {matches.length} {matches.length === 1 ? "tool" : "tools"}
        {compact ? " · Available tools and the roadmap" : ""}
      </div>
      <div className="tool-grid">
        {(compact ? matches.filter(t => !["jpg-to-webp", "png-to-jpg", "webp-to-png"].includes(t.id)).slice(0, 6) : matches).map((t) => (
          <article className="tool-card" key={t.id}>
            <div className="tool-card-top">
              <span className={"tool-icon " + t.category}>
                <CategoryIcon category={t.category} />
              </span>
              <div>
                {effectivelyAvailable(t) ? (
                  <span className="status live">Available</span>
                ) : (
                  <span className="status">
                    {t.status === "requires-configuration"
                      ? t.execution !== "provider"
                        ? "Self-hosted setup required"
                        : t.id === "semrush-keyword-metrics" ? "API access required" : "API quota required"
                      : "Planned"}
                  </span>
                )}
                {!compact && (
                  <button
                    className={
                      "favorite " + (favorites.includes(t.id) ? "selected" : "")
                    }
                    aria-label={`Favorite ${t.name}`}
                    aria-pressed={favorites.includes(t.id)}
                    onClick={() => toggle(t.id)}
                  >
                    <Star size={17} />
                  </button>
                )}
              </div>
            </div>
            <Link href={toolHref(t)} className="tool-title">
              {t.name}
              <ArrowUpRight size={18} />
            </Link>
            <p>{t.description}</p>
            <div className="tool-card-footer">
              {categories.find((c) => c.slug === t.category)?.name}
              <span>
                {effectivelyAvailable(t)
                  ? "Open tool"
                  : t.status === "requires-configuration"
                    ? "View integration"
                    : "View roadmap"}{" "}
                →
              </span>
            </div>
          </article>
        ))}
      </div>
      {matches.length === 0 && (
        <div className="empty">
          <h3>No tools found</h3>
          <p>Try “image”, “WebP” or clear a filter.</p>
          <button
            className="button outline"
            onClick={() => {
              setQuery("");
              setCategory("");
              setLive(false);
              setOnlyFavorites(false);
            }}
          >
            Reset filters
          </button>
        </div>
      )}
    </div>
  );
}
