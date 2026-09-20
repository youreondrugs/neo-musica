import { Link, Route, Routes } from "react-router-dom";

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
  return (
    <>
      <header className="site-header">
        <Link className="brand" to="/">
          Neo Musica
        </Link>
        <nav aria-label="Primary navigation">
          <Link to="/">Home</Link>
          <Link to="/about">About</Link>
        </nav>
      </header>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}
