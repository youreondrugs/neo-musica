import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App.jsx";

describe("App", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ song: null, artists: [] }),
      })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the homepage", () => {
    render(
      <MemoryRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText(/song title or artist name/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /press play/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /this month/i })).toBeInTheDocument();
  });

  it("renders the register page", () => {
    render(
      <MemoryRouter
        initialEntries={["/register"]}
        future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
      >
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Register" })).toBeInTheDocument();
    expect(screen.getByLabelText(/display name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });
});
