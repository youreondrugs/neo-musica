import { useEffect, useState } from "react";
import { Link, Route, Routes, useNavigate } from "react-router-dom";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
const AUTH_TOKEN_STORAGE_KEY = "neo-musica-token";

async function requestJson(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  if (response.status === 204) {
    return null;
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Request failed.");
  }

  return data;
}

function HomePage() {
  return (
    <main className="page-shell">
      <section className="hero">
        <p className="eyebrow">Music discovery for emerging artists</p>
        <h1>Neo Musica</h1>
        <p>
          A future home for random music discovery, creator profiles, listener rewards, and
          recognition for unknown artists who are still waiting to be found.
        </p>
      </section>
    </main>
  );
}

function AboutPage() {
  return (
    <main className="page-shell">
      <section className="content-panel">
        <h1>About</h1>
        <p>
          This project is currently a clean foundation. Product features will be added after the
          core app structure, tooling, and development workflow are stable.
        </p>
      </section>
    </main>
  );
}

function AuthPage({ mode, onAuthSuccess }) {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isRegistering = mode === "register";

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      email: formData.get("email"),
      password: formData.get("password"),
    };

    if (isRegistering) {
      payload.displayName = formData.get("displayName");
    }

    try {
      const data = await requestJson(`/api/auth/${mode}`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      onAuthSuccess(data);
      navigate("/profile");
    } catch (authError) {
      setError(authError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="content-panel auth-panel">
        <p className="eyebrow">{isRegistering ? "Create your account" : "Welcome back"}</p>
        <h1>{isRegistering ? "Register" : "Login"}</h1>
        <form className="auth-form" onSubmit={handleSubmit}>
          {isRegistering ? (
            <label>
              Display name
              <input name="displayName" minLength="2" required />
            </label>
          ) : null}
          <label>
            Email
            <input name="email" type="email" required />
          </label>
          <label>
            Password
            <input name="password" type="password" minLength="8" required />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Please wait..." : isRegistering ? "Create account" : "Login"}
          </button>
        </form>
        <p className="helper-text">
          {isRegistering ? "Already have an account?" : "Need an account?"}{" "}
          <Link to={isRegistering ? "/login" : "/register"}>
            {isRegistering ? "Login" : "Register"}
          </Link>
        </p>
      </section>
    </main>
  );
}

function ProfilePage({ currentUser }) {
  if (!currentUser) {
    return (
      <main className="page-shell">
        <section className="content-panel">
          <h1>Profile</h1>
          <p>You need to login before viewing your profile.</p>
          <Link className="text-link" to="/login">
            Go to login
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="content-panel profile-panel">
        <p className="eyebrow">Signed in</p>
        <h1>{currentUser.displayName}</h1>
        <p>{currentUser.email}</p>
        <div className="profile-preview">
          <span>{currentUser.displayName.slice(0, 1).toUpperCase()}</span>
          <div>
            <strong>Listener profile</strong>
            <p>Profile customization and listener points can grow from here next.</p>
          </div>
        </div>
      </section>
    </main>
  );
}

function NotFoundPage() {
  return (
    <main className="page-shell">
      <section className="content-panel">
        <h1>Page not found</h1>
        <Link to="/">Return home</Link>
      </section>
    </main>
  );
}

export default function App() {
  const [authToken, setAuthToken] = useState(() => localStorage.getItem(AUTH_TOKEN_STORAGE_KEY));
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    if (!authToken) {
      setCurrentUser(null);
      return;
    }

    let isCurrent = true;

    requestJson("/api/auth/me", {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    })
      .then((data) => {
        if (isCurrent) {
          setCurrentUser(data.user);
        }
      })
      .catch(() => {
        localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
        setAuthToken(null);
      });

    return () => {
      isCurrent = false;
    };
  }, [authToken]);

  function handleAuthSuccess(data) {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, data.token);
    setAuthToken(data.token);
    setCurrentUser(data.user);
  }

  async function handleLogout() {
    if (authToken) {
      await requestJson("/api/auth/logout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
    }

    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    setAuthToken(null);
    setCurrentUser(null);
  }

  return (
    <>
      <header className="site-header">
        <Link className="brand" to="/">
          Neo Musica
        </Link>
        <nav aria-label="Primary navigation">
          <Link to="/">Home</Link>
          <Link to="/about">About</Link>
          {currentUser ? <Link to="/profile">Profile</Link> : null}
          {currentUser ? (
            <button className="nav-button" type="button" onClick={handleLogout}>
              Logout
            </button>
          ) : (
            <>
              <Link to="/login">Login</Link>
              <Link to="/register">Register</Link>
            </>
          )}
        </nav>
      </header>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/login" element={<AuthPage mode="login" onAuthSuccess={handleAuthSuccess} />} />
        <Route
          path="/register"
          element={<AuthPage mode="register" onAuthSuccess={handleAuthSuccess} />}
        />
        <Route path="/profile" element={<ProfilePage currentUser={currentUser} />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}
