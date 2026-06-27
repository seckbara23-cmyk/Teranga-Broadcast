"use client";

import { Suspense, useState, type CSSProperties, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        setError(signInError.message);
        return;
      }
      const dest = searchParams.get("redirectedFrom") || "/";
      router.replace(dest);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
      }}
    >
      <form
        onSubmit={onSubmit}
        style={{
          width: "100%",
          maxWidth: "22rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          background: "#141416",
          border: "1px solid #26262b",
          borderRadius: "0.75rem",
          padding: "1.5rem",
        }}
      >
        <span
          style={{
            fontSize: "0.7rem",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "#1f9d55",
          }}
        >
          Teranga Broadcast
        </span>
        <h1 style={{ fontSize: "1.25rem", margin: "0 0 0.5rem" }}>Connexion</h1>

        <label style={{ fontSize: "0.8rem", color: "#a1a1aa" }}>
          Email
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />
        </label>

        <label style={{ fontSize: "0.8rem", color: "#a1a1aa" }}>
          Mot de passe
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
          />
        </label>

        {error ? (
          <p
            role="alert"
            style={{ color: "#f87171", fontSize: "0.8rem", margin: 0 }}
          >
            {error}
          </p>
        ) : null}

        <button type="submit" disabled={loading} style={buttonStyle}>
          {loading ? "Connexion…" : "Se connecter"}
        </button>
      </form>
    </main>
  );
}

const inputStyle: CSSProperties = {
  display: "block",
  width: "100%",
  marginTop: "0.35rem",
  padding: "0.5rem 0.65rem",
  background: "#0a0a0b",
  border: "1px solid #2f2f37",
  borderRadius: "0.5rem",
  color: "#fafafa",
  fontSize: "0.9rem",
  boxSizing: "border-box",
};

const buttonStyle: CSSProperties = {
  marginTop: "0.5rem",
  padding: "0.6rem",
  background: "#1f9d55",
  color: "#031b0f",
  border: "none",
  borderRadius: "0.5rem",
  fontWeight: 600,
  cursor: "pointer",
};
