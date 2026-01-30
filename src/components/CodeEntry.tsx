"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";

const CODE_LENGTH = 6;

export default function CodeEntry() {
  const router = useRouter();
  const [values, setValues] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const submitCode = useCallback(
    async (code: string) => {
      setChecking(true);
      setError(null);
      try {
        const res = await fetch(`/api/lookup/${code}`, { method: "POST" });
        const data = await res.json();
        if (data.valid) {
          router.push(`/${code}`);
        } else {
          setError("Invalid or expired code");
          setChecking(false);
        }
      } catch {
        setError("Something went wrong");
        setChecking(false);
      }
    },
    [router],
  );

  function handleChange(index: number, value: string) {
    const char = value.slice(-1).toUpperCase();
    if (char && !/^[A-Z0-9]$/.test(char)) return;

    const next = [...values];
    next[index] = char;
    setValues(next);
    setError(null);

    if (char && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    const code = next.join("");
    if (code.length === CODE_LENGTH && next.every(Boolean)) {
      submitCode(code);
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !values[index] && index > 0) {
      const next = [...values];
      next[index - 1] = "";
      setValues(next);
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, CODE_LENGTH);

    if (!pasted) return;

    const next = Array(CODE_LENGTH).fill("");
    for (let i = 0; i < pasted.length; i++) {
      next[i] = pasted[i];
    }
    setValues(next);
    setError(null);

    const focusIndex = Math.min(pasted.length, CODE_LENGTH - 1);
    inputRefs.current[focusIndex]?.focus();

    if (pasted.length === CODE_LENGTH) {
      submitCode(pasted);
    }
  }

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex gap-2" onPaste={handlePaste}>
        {values.map((val, i) => (
          <input
            key={i}
            ref={(el) => {
              inputRefs.current[i] = el;
            }}
            type="text"
            inputMode="text"
            autoCapitalize="characters"
            maxLength={1}
            value={val}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            disabled={checking}
            className="h-14 w-11 rounded-lg border border-zinc-700 bg-zinc-900 text-center font-mono text-xl text-white outline-none transition focus:border-zinc-400 disabled:opacity-50 sm:h-16 sm:w-13 sm:text-2xl"
          />
        ))}
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {checking && <p className="text-sm text-zinc-400">Checking...</p>}
    </div>
  );
}
