"use client";

import { useCallback, useEffect, useState } from "react";

interface SettingInfo {
  key: string;
  dbValue: string | null;
  envValue: string | null;
  default: string;
}

const LABELS: Record<string, { label: string; description: string }> = {
  CLEANUP_DAYS: {
    label: "Cleanup Days",
    description:
      "Number of days before unlinked photos are eligible for cleanup. Set to 0 to disable cleanup.",
  },
  DISPLAY_TIMEZONE: {
    label: "Display Timezone",
    description:
      "IANA timezone for display (e.g., Europe/London). Leave empty for server default.",
  },
  SITE_URL: {
    label: "Site URL",
    description:
      "Base URL for the app (e.g., https://example.com). Used for OpenGraph metadata.",
  },
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingInfo[]>([]);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successes, setSuccesses] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [lastCleanupAt, setLastCleanupAt] = useState<string | null>(null);
  const [lastCleanupDeleted, setLastCleanupDeleted] = useState<number | null>(
    null,
  );
  const [lastCleanupErrors, setLastCleanupErrors] = useState<number | null>(
    null,
  );

  const fetchSettings = useCallback(async () => {
    setFetchError(false);
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
        setLastCleanupAt(data.lastCleanupAt ?? null);
        setLastCleanupDeleted(data.lastCleanupDeleted ?? null);
        setLastCleanupErrors(data.lastCleanupErrors ?? null);
        const newInputs: Record<string, string> = {};
        for (const s of data.settings) {
          newInputs[s.key] = s.dbValue ?? "";
        }
        setInputs(newInputs);
      } else {
        setFetchError(true);
      }
    } catch {
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  async function handleSave(key: string) {
    setSaving((prev) => ({ ...prev, [key]: true }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
    setSuccesses((prev) => ({ ...prev, [key]: "" }));

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: inputs[key] }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrors((prev) => ({ ...prev, [key]: data.error }));
      } else {
        const msg = data.action === "reset" ? "Reset to default" : "Saved";
        setSuccesses((prev) => ({ ...prev, [key]: msg }));
        setTimeout(
          () => setSuccesses((prev) => ({ ...prev, [key]: "" })),
          3000,
        );
        await fetchSettings();
      }
    } catch {
      setErrors((prev) => ({ ...prev, [key]: "Failed to save" }));
    } finally {
      setSaving((prev) => ({ ...prev, [key]: false }));
    }
  }

  async function handleReset(key: string) {
    setInputs((prev) => ({ ...prev, [key]: "" }));
    setSaving((prev) => ({ ...prev, [key]: true }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
    setSuccesses((prev) => ({ ...prev, [key]: "" }));

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: "" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrors((prev) => ({ ...prev, [key]: data.error }));
      } else {
        setSuccesses((prev) => ({ ...prev, [key]: "Reset to default" }));
        setTimeout(
          () => setSuccesses((prev) => ({ ...prev, [key]: "" })),
          3000,
        );
        await fetchSettings();
      }
    } catch {
      setErrors((prev) => ({ ...prev, [key]: "Failed to reset" }));
    } finally {
      setSaving((prev) => ({ ...prev, [key]: false }));
    }
  }

  function getEffectiveValue(s: SettingInfo) {
    if (s.dbValue !== null) return { value: s.dbValue, source: "Database" };
    if (s.envValue) return { value: s.envValue, source: "Environment variable" };
    return { value: s.default, source: "Default" };
  }

  if (loading) {
    return (
      <div className="px-6 py-8">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8">
            <h1 className="text-2xl font-light tracking-widest text-white">
              SETTINGS
            </h1>
          </div>
          <p className="text-sm text-zinc-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="px-6 py-8">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8">
            <h1 className="text-2xl font-light tracking-widest text-white">
              SETTINGS
            </h1>
          </div>
          <p className="text-sm text-red-400">
            Failed to load settings. Please try again.
          </p>
          <button
            onClick={fetchSettings}
            className="mt-3 rounded-md bg-zinc-700 px-3 py-1.5 text-sm text-white transition hover:bg-zinc-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <h1 className="text-2xl font-light tracking-widest text-white">
            SETTINGS
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Configure application settings. Database values override environment
            variables, which override defaults.
          </p>
        </div>

        <div className="space-y-4">
          {settings.map((s) => {
            const meta = LABELS[s.key];
            const effective = getEffectiveValue(s);
            const hasDbOverride = s.dbValue !== null;

            return (
              <div
                key={s.key}
                className="rounded-lg border border-zinc-800 bg-zinc-900 p-5"
              >
                <div className="mb-3">
                  <h2 className="text-sm font-medium text-white">
                    {meta?.label ?? s.key}
                  </h2>
                  <p className="mt-0.5 text-xs text-zinc-400">
                    {meta?.description}
                  </p>
                  {s.key === "CLEANUP_DAYS" && lastCleanupAt && (
                    <p className="mt-1 text-xs text-zinc-500">
                      Last cleanup run: {lastCleanupAt}
                      {lastCleanupDeleted != null && (
                        <>
                          {" — "}
                          {lastCleanupDeleted} deleted
                          {lastCleanupErrors
                            ? `, ${lastCleanupErrors} error${lastCleanupErrors !== 1 ? "s" : ""}`
                            : ""}
                        </>
                      )}
                    </p>
                  )}
                </div>

                <div className="mb-3 text-xs text-zinc-500">
                  Current value:{" "}
                  <span className="text-zinc-300">
                    {effective.value || "(empty)"}
                  </span>{" "}
                  <span className="text-zinc-600">({effective.source})</span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={inputs[s.key] ?? ""}
                    onChange={(e) =>
                      setInputs((prev) => ({
                        ...prev,
                        [s.key]: e.target.value,
                      }))
                    }
                    placeholder={
                      s.envValue || s.default || "Enter value..."
                    }
                    className="flex-1 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white placeholder-zinc-500 focus:border-zinc-500 focus:outline-none"
                  />
                  <button
                    onClick={() => handleSave(s.key)}
                    disabled={saving[s.key]}
                    className="rounded-md bg-zinc-700 px-3 py-1.5 text-sm text-white transition hover:bg-zinc-600 disabled:opacity-50"
                  >
                    {saving[s.key] ? "Saving..." : "Save"}
                  </button>
                  {hasDbOverride && (
                    <button
                      onClick={() => handleReset(s.key)}
                      disabled={saving[s.key]}
                      className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-200 disabled:opacity-50"
                    >
                      Reset
                    </button>
                  )}
                </div>

                {errors[s.key] && (
                  <p className="mt-2 text-xs text-red-400">{errors[s.key]}</p>
                )}
                {successes[s.key] && (
                  <p className="mt-2 text-xs text-green-400">
                    {successes[s.key]}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
