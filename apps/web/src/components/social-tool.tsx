"use client";
import { useState } from "react";
import { inspectSocialUrl } from "../../../../packages/core/social";
import { Button } from "./ui/button";
export function SocialTool() {
  const [url, setUrl] = useState(""),
    [error, setError] = useState(""),
    [result, setResult] = useState<ReturnType<typeof inspectSocialUrl> | null>(
      null,
    );
  return (
    <div className="audit-workspace">
      <form
        className="url-form"
        onSubmit={(e) => {
          e.preventDefault();
          setError("");
          setResult(null);
          try {
            setResult(inspectSocialUrl(url));
          } catch (e) {
            setError(e instanceof Error ? e.message : "Invalid link.");
          }
        }}
      >
        <label htmlFor="social-url">Social platform URL</label>
        <div className="url-input-row">
          <input
            id="social-url"
            type="url"
            required
            maxLength={2048}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=…"
          />
          <Button>Inspect link</Button>
        </div>
        <p className="setting-note">
          Validation runs in your browser. This tool does not fetch media,
          bypass restrictions or advertise unsupported downloads.
        </p>
      </form>
      {error && (
        <p role="alert" className="tool-error">
          {error}
        </p>
      )}
      {result && (
        <section className="audit-report">
          <h2>{result.platform} link identified</h2>
          <dl className="metadata-list">
            <div>
              <dt>Hostname</dt>
              <dd>{result.hostname}</dd>
            </div>
            <div>
              <dt>Path</dt>
              <dd>{result.path}</dd>
            </div>
            <div>
              <dt>Content path</dt>
              <dd>
                {result.hasContentPath
                  ? "Present; content availability not verified"
                  : "Profile/homepage only"}
              </dd>
            </div>
            <div>
              <dt>Media downloads</dt>
              <dd>Not enabled</dd>
            </div>
          </dl>
          <p>{result.note}</p>
          <p className="inventory-note">
            Domain identification is not proof that content exists, is public,
            or can legally be downloaded.
          </p>
        </section>
      )}
    </div>
  );
}
