import { useEffect, useState } from "react";
import { Link, Route, Routes, useNavigate, useParams } from "react-router-dom";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
const AUTH_TOKEN_STORAGE_KEY = "neo-musica-token";

async function requestJson(path, options = {}) {
  const isFormData = options.body instanceof FormData;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
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

function getAuthHeaders(authToken) {
  return authToken ? { Authorization: `Bearer ${authToken}` } : {};
}

function getAssetUrl(path) {
  return path ? `${API_BASE_URL}${path}` : "";
}

function CoverMarquee({ covers }) {
  const visibleCovers = covers.filter(Boolean);

  if (visibleCovers.length === 0) {
    return null;
  }

  const loopCovers = Array.from(
    { length: 16 },
    (_, index) => visibleCovers[index % visibleCovers.length],
  );

  return (
    <div className="cover-marquee" aria-hidden="true">
      <div className="cover-marquee-track">
        {loopCovers.map((coverUrl, index) => (
          <img src={getAssetUrl(coverUrl)} alt="" key={`${coverUrl}-${index}`} />
        ))}
      </div>
    </div>
  );
}

function PublicSongList({ songs }) {
  if (songs.length === 0) {
    return <p className="empty-state">No songs uploaded yet.</p>;
  }

  return (
    <div className="song-list">
      {songs.map((song) => (
        <article className="song-item" key={song.id}>
          {song.coverUrl ? (
            <img src={getAssetUrl(song.coverUrl)} alt={`${song.title} cover`} />
          ) : (
            <div className="song-cover-placeholder">♪</div>
          )}
          <div className="song-details">
            <h3>{song.title}</h3>
            <p>{song.artistName}</p>
            {song.description ? <p className="song-description">{song.description}</p> : null}
            <audio controls src={getAssetUrl(song.audioUrl)} />
          </div>
        </article>
      ))}
    </div>
  );
}

function RandomSongPlayer({ song, setSong }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadRandomSong() {
    setIsLoading(true);
    setError("");

    try {
      const data = await requestJson("/api/songs/random");
      setSong(data.song);
    } catch (randomError) {
      setError(randomError.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadRandomSong();
  }, []);

  return (
    <section className="random-player-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Random discovery</p>
          <h2>Press play, then move forward</h2>
        </div>
        <button type="button" onClick={loadRandomSong} disabled={isLoading}>
          {isLoading ? "Loading..." : song ? "Next song" : "Find a song"}
        </button>
      </div>
      {error ? <p className="form-error">{error}</p> : null}
      {song ? (
        <article className="random-song-card">
          {song.coverUrl ? (
            <img src={getAssetUrl(song.coverUrl)} alt={`${song.title} cover`} />
          ) : (
            <div className="song-cover-placeholder">♪</div>
          )}
          <div className="song-details">
            <h3>{song.title}</h3>
            <p>
              <Link className="text-link" to={`/artists/${song.artist?.id}`}>
                {song.artistName}
              </Link>
            </p>
            {song.description ? <p className="song-description">{song.description}</p> : null}
            <audio controls src={getAssetUrl(song.audioUrl)} />
          </div>
        </article>
      ) : (
        <p className="empty-state">No songs are available yet.</p>
      )}
    </section>
  );
}

function HomePage({ authToken }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [artists, setArtists] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState("");
  const [randomSong, setRandomSong] = useState(null);

  async function handleSearch(event) {
    event.preventDefault();
    setError("");
    setHasSearched(true);

    try {
      const data = await requestJson(
        `/api/artists/search?q=${encodeURIComponent(searchQuery.trim())}`,
        {
          headers: getAuthHeaders(authToken),
        },
      );
      setArtists(data.artists);
    } catch (searchError) {
      setError(searchError.message);
    }
  }

  return (
    <main
      className={`page-shell home-page-shell${randomSong?.coverUrl ? " has-cover-marquee" : ""}`}
    >
      <CoverMarquee covers={randomSong?.coverUrl ? [randomSong.coverUrl] : []} />
      <section className="discovery-panel">
        <form className="artist-search-form" onSubmit={handleSearch}>
          <label htmlFor="artist-search">Search artists</label>
          <div>
            <input
              id="artist-search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Try a display name"
            />
            <button type="submit">Search</button>
          </div>
        </form>
        {error ? <p className="form-error">{error}</p> : null}
        {hasSearched ? (
          <div className="artist-results">
            {artists.length === 0 ? (
              <p className="empty-state">No artists found.</p>
            ) : (
              artists.map((artist) => (
                <Link className="artist-result" to={`/artists/${artist.id}`} key={artist.id}>
                  <span>{artist.displayName.slice(0, 1).toUpperCase()}</span>
                  <div>
                    <strong>{artist.displayName}</strong>
                    <p>
                      {artist.songCount} songs · {artist.followerCount} followers
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        ) : null}
      </section>
      <RandomSongPlayer song={randomSong} setSong={setRandomSong} />
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

function ProfilePage({ currentUser, authToken }) {
  const [songs, setSongs] = useState([]);
  const [songLimit, setSongLimit] = useState(10);
  const [error, setError] = useState("");
  const [editingSongId, setEditingSongId] = useState(null);
  const [editForm, setEditForm] = useState({ title: "", artistName: "", description: "" });

  async function loadSongs() {
    if (!authToken) {
      setSongs([]);
      return;
    }

    try {
      const data = await requestJson("/api/songs/mine", {
        headers: getAuthHeaders(authToken),
      });
      setSongs(data.songs);
      setSongLimit(data.limit);
      setError("");
    } catch (songsError) {
      setError(songsError.message);
    }
  }

  useEffect(() => {
    loadSongs();
  }, [authToken]);

  function startEditing(song) {
    setEditingSongId(song.id);
    setEditForm({
      title: song.title,
      artistName: song.artistName,
      description: song.description,
    });
  }

  async function handleEditSubmit(event, songId) {
    event.preventDefault();

    try {
      await requestJson(`/api/songs/${songId}`, {
        method: "PATCH",
        headers: getAuthHeaders(authToken),
        body: JSON.stringify(editForm),
      });
      setEditingSongId(null);
      await loadSongs();
    } catch (editError) {
      setError(editError.message);
    }
  }

  async function handleDelete(songId) {
    try {
      await requestJson(`/api/songs/${songId}`, {
        method: "DELETE",
        headers: getAuthHeaders(authToken),
      });
      await loadSongs();
    } catch (deleteError) {
      setError(deleteError.message);
    }
  }

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
    <main
      className={`page-shell profile-page-shell${songs.some((song) => song.coverUrl) ? " has-cover-marquee" : ""}`}
    >
      <CoverMarquee covers={songs.map((song) => song.coverUrl)} />
      <section className="content-panel profile-panel">
        <h1>{currentUser.displayName}</h1>
        <p>{currentUser.email}</p>
        <div className="profile-preview">
          <span>{currentUser.displayName.slice(0, 1).toUpperCase()}</span>
          <div>
            <strong>Listener profile</strong>
            <p>Profile customization and listener points can grow from here next.</p>
          </div>
        </div>
        <div className="library-header">
          <div>
            <h2>Your songs</h2>
            <p>
              {songs.length} of {songLimit} uploads used
            </p>
          </div>
          <Link className="text-link" to="/songs/new">
            Add song
          </Link>
        </div>
        {error ? <p className="form-error">{error}</p> : null}
        <div className="song-list">
          {songs.length === 0 ? (
            <p className="empty-state">No songs uploaded yet.</p>
          ) : (
            songs.map((song) => (
              <article className="song-item" key={song.id}>
                {song.coverUrl ? (
                  <img src={getAssetUrl(song.coverUrl)} alt={`${song.title} cover`} />
                ) : (
                  <div className="song-cover-placeholder">♪</div>
                )}
                <div className="song-details">
                  {editingSongId === song.id ? (
                    <form
                      className="song-edit-form"
                      onSubmit={(event) => handleEditSubmit(event, song.id)}
                    >
                      <input
                        aria-label="Song title"
                        value={editForm.title}
                        onChange={(event) =>
                          setEditForm((current) => ({ ...current, title: event.target.value }))
                        }
                        required
                      />
                      <input
                        aria-label="Artist name"
                        value={editForm.artistName}
                        onChange={(event) =>
                          setEditForm((current) => ({ ...current, artistName: event.target.value }))
                        }
                        required
                      />
                      <textarea
                        aria-label="Description"
                        rows="3"
                        value={editForm.description}
                        onChange={(event) =>
                          setEditForm((current) => ({
                            ...current,
                            description: event.target.value,
                          }))
                        }
                      />
                      <div className="song-actions">
                        <button type="submit">Save</button>
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => setEditingSongId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <h3>{song.title}</h3>
                      <p>{song.artistName}</p>
                      {song.description ? (
                        <p className="song-description">{song.description}</p>
                      ) : null}
                      <audio controls src={getAssetUrl(song.audioUrl)} />
                      <div className="song-actions">
                        <button type="button" onClick={() => startEditing(song)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className="danger-button"
                          onClick={() => handleDelete(song.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}

function SongUploadPage({ currentUser, authToken }) {
  const navigate = useNavigate();
  const [songs, setSongs] = useState([]);
  const [songLimit, setSongLimit] = useState(10);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function loadSongs() {
    if (!authToken) {
      setSongs([]);
      return;
    }

    try {
      const data = await requestJson("/api/songs/mine", {
        headers: getAuthHeaders(authToken),
      });
      setSongs(data.songs);
      setSongLimit(data.limit);
    } catch (songsError) {
      setError(songsError.message);
    }
  }

  useEffect(() => {
    loadSongs();
  }, [authToken]);

  async function handleDelete(songId) {
    try {
      await requestJson(`/api/songs/${songId}`, {
        method: "DELETE",
        headers: getAuthHeaders(authToken),
      });
      await loadSongs();
    } catch (deleteError) {
      setError(deleteError.message);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const formData = new FormData(event.currentTarget);
      await requestJson("/api/songs", {
        method: "POST",
        headers: getAuthHeaders(authToken),
        body: formData,
      });
      navigate("/profile");
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!currentUser) {
    return (
      <main className="page-shell">
        <section className="content-panel">
          <h1>Add song</h1>
          <p>You need to login before uploading music.</p>
          <Link className="text-link" to="/login">
            Go to login
          </Link>
        </section>
      </main>
    );
  }

  if (songs.length >= songLimit) {
    return (
      <main className="page-shell">
        <section className="content-panel upload-panel">
          <p className="eyebrow">Upload limit reached</p>
          <h1>Delete one song first</h1>
          <p>
            You can upload up to {songLimit} songs. Delete one from your list to add a new track.
          </p>
          {error ? <p className="form-error">{error}</p> : null}
          <div className="song-list compact-list">
            {songs.map((song) => (
              <article className="song-item" key={song.id}>
                <div className="song-details">
                  <h3>{song.title}</h3>
                  <p>{song.artistName}</p>
                </div>
                <button
                  type="button"
                  className="danger-button"
                  onClick={() => handleDelete(song.id)}
                >
                  Delete
                </button>
              </article>
            ))}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="content-panel upload-panel">
        <p className="eyebrow">Share a track</p>
        <h1>Add song</h1>
        <form className="auth-form upload-form" onSubmit={handleSubmit}>
          <label>
            Song title
            <input name="title" required />
          </label>
          <label>
            Artist name
            <input name="artistName" defaultValue={currentUser.displayName} required />
          </label>
          <label>
            Description
            <textarea name="description" rows="4" placeholder="A few words about the track" />
          </label>
          <label>
            Audio file
            <input name="audioFile" type="file" accept=".mp3,.wav,.m4a,audio/*" required />
          </label>
          <label>
            Cover photo
            <input name="coverImage" type="file" accept=".jpg,.jpeg,.png,.webp,image/*" />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Uploading..." : "Upload song"}
          </button>
        </form>
      </section>
    </main>
  );
}

function ArtistPage({ currentUser, authToken }) {
  const { artistId } = useParams();
  const [artist, setArtist] = useState(null);
  const [songs, setSongs] = useState([]);
  const [error, setError] = useState("");
  const [isFollowing, setIsFollowing] = useState(false);

  async function loadArtist() {
    try {
      const data = await requestJson(`/api/artists/${artistId}`, {
        headers: getAuthHeaders(authToken),
      });
      setArtist(data.artist);
      setSongs(data.songs);
      setIsFollowing(data.artist.isFollowing);
      setError("");
    } catch (artistError) {
      setError(artistError.message);
    }
  }

  useEffect(() => {
    loadArtist();
  }, [artistId, authToken]);

  async function handleFollowToggle() {
    if (!artist) {
      return;
    }

    try {
      const data = await requestJson(`/api/artists/${artist.id}/follow`, {
        method: isFollowing ? "DELETE" : "POST",
        headers: getAuthHeaders(authToken),
      });
      setArtist(data.artist);
      setIsFollowing(data.artist.isFollowing);
    } catch (followError) {
      setError(followError.message);
    }
  }

  if (error && !artist) {
    return (
      <main className="page-shell">
        <section className="content-panel">
          <h1>Artist</h1>
          <p className="form-error">{error}</p>
        </section>
      </main>
    );
  }

  if (!artist) {
    return (
      <main className="page-shell">
        <section className="content-panel">
          <h1>Artist</h1>
          <p>Loading...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="content-panel artist-profile-panel">
        <div className="artist-profile-header">
          <div className="artist-avatar">{artist.displayName.slice(0, 1).toUpperCase()}</div>
          <div>
            <p className="eyebrow">Artist</p>
            <h1>{artist.displayName}</h1>
            <p>
              {artist.songCount} songs · {artist.followerCount} followers
            </p>
          </div>
        </div>
        {artist.isSelf ? (
          <Link className="text-link" to="/profile">
            Manage your profile
          </Link>
        ) : currentUser ? (
          <button type="button" className="follow-button" onClick={handleFollowToggle}>
            {isFollowing ? "Following" : "Follow"}
          </button>
        ) : (
          <Link className="text-link" to="/login">
            Login to follow
          </Link>
        )}
        {error ? <p className="form-error">{error}</p> : null}
        <div className="library-header">
          <div>
            <h2>Music</h2>
            <p>{songs.length} tracks available</p>
          </div>
        </div>
        <PublicSongList songs={songs} />
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
      {currentUser ? (
        <Link className="floating-add-button" to="/songs/new" aria-label="Add song">
          +
        </Link>
      ) : null}
      <Routes>
        <Route path="/" element={<HomePage authToken={authToken} />} />
        <Route
          path="/login"
          element={<AuthPage mode="login" onAuthSuccess={handleAuthSuccess} />}
        />
        <Route
          path="/register"
          element={<AuthPage mode="register" onAuthSuccess={handleAuthSuccess} />}
        />
        <Route
          path="/profile"
          element={<ProfilePage currentUser={currentUser} authToken={authToken} />}
        />
        <Route
          path="/songs/new"
          element={<SongUploadPage currentUser={currentUser} authToken={authToken} />}
        />
        <Route
          path="/artists/:artistId"
          element={<ArtistPage currentUser={currentUser} authToken={authToken} />}
        />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}
