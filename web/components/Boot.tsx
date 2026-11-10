"use client";

import { useEffect, useState } from "react";

declare global {
  interface Window {
    __CREMA_DATA__?: unknown;
  }
}

// Module-level so React's dev double-render can't load the script twice.
let booting: Promise<void> | null = null;

function boot() {
  booting ??= (async () => {
    const res = await fetch("/api/directory");
    if (!res.ok) throw new Error(`directory ${res.status}`);
    window.__CREMA_DATA__ = await res.json();
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "/crema.js";
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("crema.js failed to load"));
      document.body.appendChild(s);
    });
  })().catch((e) => {
    booting = null;
    throw e;
  });
  return booting;
}

/** Loads the directory from Supabase (via /api/directory), then starts the page script. */
export default function Boot() {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    const nav = document.querySelector(".nav");
    const toggle = document.getElementById("menuToggle");
    const more = document.getElementById("navMore") as HTMLDetailsElement | null;
    const closeMenu = () => {
      nav?.classList.remove("menu-open");
      toggle?.setAttribute("aria-expanded", "false");
      if (more) more.open = false;
    };
    const toggleMenu = () => {
      const open = nav?.classList.toggle("menu-open") ?? false;
      toggle?.setAttribute("aria-expanded", String(open));
    };
    const onClick = (event: MouseEvent) => {
      const target = event.target as Element;
      const anchor = target.closest<HTMLAnchorElement>("a");
      if (anchor?.hash === "#main" || anchor?.hash === "#preview-note") {
        event.preventDefault();
        const destination = document.querySelector<HTMLElement>(anchor.hash);
        destination?.scrollIntoView({ block: "start" });
        if (anchor.hash === "#main") destination?.focus({ preventScroll: true });
      }
      if (target.closest(".links a") || !target.closest(".nav")) closeMenu();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (nav?.classList.contains("menu-open")) {
        closeMenu();
        toggle?.focus();
      } else if (more?.open) {
        more.open = false;
        more.querySelector("summary")?.focus();
      }
    };
    const desktop = window.matchMedia("(min-width: 901px)");
    toggle?.addEventListener("click", toggleMenu);
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    desktop.addEventListener("change", closeMenu);
    boot().then(
      () => setState("ready"),
      (e) => {
        console.error(e);
        setState("error");
      },
    );
    return () => {
      toggle?.removeEventListener("click", toggleMenu);
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
      desktop.removeEventListener("change", closeMenu);
    };
  }, []);

  if (state === "ready") return null;
  return (
    <div
      role="status"
      style={{
        position: "fixed", left: "50%", bottom: 24, transform: "translateX(-50%)", zIndex: 100,
        background: "var(--ink, #1d1410)", color: "#fff", padding: "10px 18px", borderRadius: 999,
        font: "600 0.95rem/1.3 'Hanken Grotesk', system-ui, sans-serif", boxShadow: "0 6px 24px rgba(0,0,0,.18)",
      }}
    >
      {state === "loading" ? (
        "Loading coffees…"
      ) : (
        <>
          Couldn&apos;t load the coffee directory.{" "}
          <button
            onClick={() => location.reload()}
            style={{ background: "none", border: 0, color: "inherit", textDecoration: "underline", font: "inherit", cursor: "pointer" }}
          >
            Try again
          </button>
        </>
      )}
    </div>
  );
}
