import { useEffect, useRef, useState } from "react";
import {
  Link,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
const AUTH_TOKEN_STORAGE_KEY = "neo-musica-token";
const THEME_STORAGE_KEY = "neo-musica-theme";
const LANGUAGE_STORAGE_KEY = "neo-musica-language";
const BRAND_STYLES = [
  ["Georgia", "#ff1744"],
  ['"Courier New"', "#00e5ff"],
  ["Impact", "#ffea00"],
  ['"Arial Black"', "#76ff03"],
  ["Palatino", "#f500ff"],
  ['"Trebuchet MS"', "#ff6d00"],
  ["Verdana", "#2979ff"],
  ["Garamond", "#00c853"],
  ["Didot", "#d500f9"],
  ["Copperplate", "#ff3d00"],
  ["Futura", "#00bfa5"],
  ["Baskerville", "#c51162"],
  ["Optima", "#304ffe"],
  ["Menlo", "#aeea00"],
  ["Monaco", "#ff4081"],
  ["Papyrus", "#00b8d4"],
  ["Chalkduster", "#ffab00"],
  ["Avenir", "#651fff"],
  ["Helvetica", "#00e676"],
  ["Arial", "#ff5252"],
  ["Times", "#18ffff"],
  ["Cochin", "#ffd600"],
  ["Hoefler Text", "#64dd17"],
  ["Rockwell", "#e040fb"],
  ["Gill Sans", "#ff9100"],
  ["Charter", "#448aff"],
  ["Skia", "#1de9b6"],
  ["Trattatello", "#ff1744"],
  ["Noteworthy", "#c6ff00"],
  ["Snell Roundhand", "#7c4dff"],
  ["DIN Condensed", "#00e5ff"],
  ["Marker Felt", "#ff6e40"],
  ["Courier", "#69f0ae"],
  ["Geneva", "#ff4081"],
  ["Lucida Grande", "#40c4ff"],
  ["American Typewriter", "#ffff00"],
  ["Bradley Hand", "#b2ff59"],
  ["Brush Script MT", "#ea80fc"],
  ["Comic Sans MS", "#ffab40"],
  ["Andale Mono", "#82b1ff"],
  ["Bookman", "#00e676"],
  ["Candara", "#ff5252"],
  ["Century Gothic", "#84ffff"],
  ["Franklin Gothic Medium", "#ffff8d"],
  ["Herculanum", "#ccff90"],
  ["Lucida Console", "#b388ff"],
  ["Phosphate", "#ff8a80"],
  ["PT Sans", "#80d8ff"],
  ["Tahoma", "#f4ff81"],
  ["Zapfino", "#ff80ab"],
];
const BRAND_VARIANT_COUNT = BRAND_STYLES.length;
const THEMES = [
  { id: "sea", label: "Sea glass", swatch: "#006d77" },
  { id: "dark-red", label: "Dark red", swatch: "#8f1d2c" },
  { id: "sun", label: "Sun washed", swatch: "#b58500" },
  { id: "mint", label: "Mint fog", swatch: "#7ec4a7" },
  { id: "lilac", label: "Lilac smoke", swatch: "#9b7ede" },
  { id: "peach", label: "Peach haze", swatch: "#e69b72" },
  { id: "graphite", label: "Graphite", swatch: "#38414a" },
  { id: "electric", label: "Electric blue", swatch: "#2563eb" },
  { id: "acid", label: "Acid lime", swatch: "#b6ff00" },
  { id: "bubblegum", label: "Bubblegum", swatch: "#ff4fb3" },
  { id: "frost", label: "Frost", swatch: "#dbeafe" },
  { id: "rosewater", label: "Rosewater", swatch: "#ffe4ec" },
  { id: "paper", label: "Paper", swatch: "#f8f4df" },
  { id: "dayglow", label: "Dayglow", swatch: "#e9ff70" },
];
const LANGUAGES = [
  { id: "en", label: "US" },
  { id: "lt", label: "LT" },
];
const TRANSLATIONS = {
  en: {
    artist: "Artist",
    artistName: "Artist name",
    artists: "Artists",
    contact: "Contact",
    contactEmail: "realmartynassutkus@gmail.com",
    currentPassword: "Current password",
    displayName: "Display name",
    editProfile: "Edit profile",
    emptyInfo: "More discovery notes can live here later.",
    followers: "followers",
    following: "following",
    home: "Home",
    language: "Language",
    listenerProfile: "Listener profile",
    login: "Login",
    music: "Music",
    newPassword: "New password",
    noSongsAvailable: "No songs are available yet.",
    photo: "Photo",
    playForward: "Press PLAY",
    playForwardAction: "PLAY",
    playForwardLead: "Press",
    profile: "Profile",
    profileHint: "Profile customization and listener points can grow from here next.",
    randomDiscovery: "Find new songs",
    register: "Register",
    search: "Search",
    searchLabel: "Search songs and artists",
    searchPlaceholder: "Song title or artist name",
    saveProfile: "Save profile",
    song: "Song",
    songs: "Songs",
    streams: "streams",
    theme: "Theme",
    topSongs: "Top 10",
    topSongsHeading: "This Month",
    uploadPhoto: "Upload photo",
  },
  lt: {
    artist: "Atlikejas",
    artistName: "Atlikejo vardas",
    artists: "Atlikejai",
    contact: "Kontaktai",
    contactEmail: "realmartynassutkus@gmail.com",
    currentPassword: "Dabartinis slaptazodis",
    displayName: "Vardas",
    editProfile: "Keisti profili",
    emptyInfo: "Veliau cia gali atsirasti daugiau atradimu.",
    followers: "sekejai",
    following: "sekami",
    home: "Pradzia",
    language: "Kalba",
    listenerProfile: "Klausytojo profilis",
    login: "Prisijungti",
    music: "Muzika",
    newPassword: "Naujas slaptazodis",
    noSongsAvailable: "Kol kas nera dainu.",
    photo: "Nuotrauka",
    playForward: "Spausk PLAY",
    playForwardAction: "PLAY",
    playForwardLead: "Spausk",
    profile: "Profilis",
    profileHint: "Profilio spalvos ir klausytojo taskai gali augti cia.",
    randomDiscovery: "Atrask naujas dainas",
    register: "Registruotis",
    search: "Ieskoti",
    searchLabel: "Ieskoti dainu ir atlikeju",
    searchPlaceholder: "Dainos arba atlikejo vardas",
    saveProfile: "Issaugoti profili",
    song: "Daina",
    songs: "Dainos",
    streams: "perklausos",
    theme: "Tema",
    topSongs: "Top 10",
    topSongsHeading: "Si Menesi",
    uploadPhoto: "Ikelti nuotrauka",
  },
};

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

function getArtistProfilePath(artistId, currentUser, songId = null) {
  const basePath = currentUser?.id === artistId ? "/profile" : `/artists/${artistId}`;

  return songId ? `${basePath}?song=${songId}` : basePath;
}

function createObjectUrl(file) {
  if (!(file instanceof File) || file.size === 0) {
    return "";
  }

  return URL.createObjectURL(file);
}

function ArtistAvatar({ artist, className = "artist-avatar" }) {
  if (artist?.profileImageUrl) {
    return (
      <img
        className={className}
        src={getAssetUrl(artist.profileImageUrl)}
        alt={`${artist.displayName} profile`}
      />
    );
  }

  return <span className={className}>{artist?.displayName?.slice(0, 1).toUpperCase() || "?"}</span>;
}

function CoverMarquee({ covers }) {
  const visibleCovers = covers.filter(Boolean);

  if (visibleCovers.length === 0) {
    return null;
  }

  const loopCovers = Array.from(
    { length: 12 },
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

function SlideshowBackdrop({ images }) {
  const visibleImages = images.filter(Boolean);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [visibleImages.join("|")]);

  useEffect(() => {
    if (visibleImages.length <= 1) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((currentIndex) => (currentIndex + 1) % visibleImages.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [visibleImages.length]);

  if (visibleImages.length === 0) {
    return null;
  }

  return <CoverMarquee covers={[visibleImages[activeIndex]]} />;
}

function VideoBackdrop({ videoUrl }) {
  const [shouldRepeat, setShouldRepeat] = useState(false);

  if (!videoUrl) {
    return null;
  }

  function handleMetadata(event) {
    const video = event.currentTarget;
    const aspectRatio = video.videoWidth / video.videoHeight;
    setShouldRepeat(aspectRatio < 1.15);
  }

  const copies = shouldRepeat ? [0, 1, 2] : [0];

  return (
    <div className={`video-backdrop${shouldRepeat ? " is-repeating" : ""}`} aria-hidden="true">
      {copies.map((index) => (
        <video
          autoPlay
          loop
          muted
          onLoadedMetadata={index === 0 ? handleMetadata : undefined}
          playsInline
          src={getAssetUrl(videoUrl)}
          key={`${videoUrl}-${index}`}
        />
      ))}
    </div>
  );
}

function SongBackdrop({ song, fallbackImages = [] }) {
  if (song?.backgroundVideoUrl) {
    return <VideoBackdrop videoUrl={song.backgroundVideoUrl} />;
  }

  if (song?.slideshowImageUrls?.length) {
    return <SlideshowBackdrop images={song.slideshowImageUrls} />;
  }

  return <SlideshowBackdrop images={song?.coverUrl ? [song.coverUrl] : fallbackImages} />;
}

function getSongBackdropImages(songs) {
  return songs.flatMap((song) => {
    if (song.slideshowImageUrls?.length) {
      return song.slideshowImageUrls;
    }

    return song.coverUrl ? [song.coverUrl] : [];
  });
}

function validateVideoDuration(file, maxSeconds) {
  if (!file) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const objectUrl = URL.createObjectURL(file);

    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl);

      if (video.duration > maxSeconds) {
        reject(new Error(`Background video must be ${maxSeconds} seconds or shorter.`));
        return;
      }

      resolve();
    };
    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not read the background video."));
    };
    video.src = objectUrl;
  });
}

function TrackPlayButton({ song, isActive, isPlaying, onPlay, onTogglePlayback }) {
  function handleClick() {
    if (isActive) {
      onTogglePlayback();
      return;
    }

    onPlay(song);
  }

  return (
    <button
      type="button"
      className="inline-play-button"
      onClick={handleClick}
      aria-label={isActive ? `Pause ${song.title}` : `Play ${song.title}`}
    >
      {isActive && isPlaying ? "Ⅱ" : "▶"}
    </button>
  );
}

function GlobalSongPlayer({
  song,
  authToken,
  isPlaying,
  setIsPlaying,
  onEnded,
  onNext,
  onPrevious,
  onStatsChange,
  canNext = true,
  canPrevious = true,
}) {
  const audioRef = useRef(null);
  const [volume, setVolume] = useState(0.85);
  const [lastVolume, setLastVolume] = useState(0.85);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [stats, setStats] = useState({
    likeCount: song?.likeCount || 0,
    isLiked: song?.isLiked || false,
  });

  useEffect(() => {
    setStats({
      likeCount: song?.likeCount || 0,
      isLiked: song?.isLiked || false,
    });
  }, [song?.id, song?.isLiked, song?.likeCount]);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    audio.volume = volume;
  }, [volume]);

  useEffect(() => {
    setProgress(0);
    setDuration(0);
  }, [song?.id]);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio || !song) {
      return;
    }

    if (isPlaying) {
      audio.play().catch(() => setIsPlaying(false));
      return;
    }

    audio.pause();
  }, [isPlaying, setIsPlaying, song]);

  function handleTogglePlay() {
    const audio = audioRef.current;

    if (!audio || !song) {
      return;
    }

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    setIsPlaying(true);
  }

  function handleSeek(event) {
    const audio = audioRef.current;
    const nextProgress = Number(event.target.value);

    setProgress(nextProgress);

    if (audio) {
      audio.currentTime = nextProgress;
    }
  }

  function handleTimeUpdate() {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    setProgress(audio.currentTime || 0);
  }

  function handleLoadedMetadata() {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
  }

  function handleVolumeChange(event) {
    const nextVolume = Number(event.target.value);
    setVolume(nextVolume);

    if (nextVolume > 0) {
      setLastVolume(nextVolume);
    }
  }

  function handleMuteToggle() {
    if (volume > 0) {
      setLastVolume(volume);
      setVolume(0);
      return;
    }

    setVolume(lastVolume || 0.85);
  }

  function handleEnded() {
    const listenedSeconds = audioRef.current?.currentTime || 0;
    setIsPlaying(false);
    requestJson(`/api/songs/${song.id}/stream`, {
      method: "POST",
      headers: getAuthHeaders(authToken),
      body: JSON.stringify({ seconds: listenedSeconds }),
    })
      .then((data) => {
        onStatsChange?.(data.song);
        setStats({
          likeCount: data.song.likeCount || 0,
          isLiked: data.song.isLiked || false,
        });
      })
      .catch(() => {});
    onEnded?.();
  }

  async function handleLike() {
    try {
      const data = await requestJson(`/api/songs/${song.id}/like`, {
        method: "POST",
        headers: getAuthHeaders(authToken),
      });
      onStatsChange?.(data.song);
      setStats({
        likeCount: data.song.likeCount || 0,
        isLiked: data.isLiked || false,
      });
    } catch {
      setStats((currentStats) => currentStats);
    }
  }

  if (!song) {
    return null;
  }

  return (
    <div className="custom-player">
      <audio
        ref={audioRef}
        src={getAssetUrl(song.audioUrl)}
        onEnded={handleEnded}
        onLoadedMetadata={handleLoadedMetadata}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onTimeUpdate={handleTimeUpdate}
      />
      <div className="player-track-info">
        {song.coverUrl ? (
          <img src={getAssetUrl(song.coverUrl)} alt={`${song.title} cover`} />
        ) : (
          <span>♪</span>
        )}
        <div>
          <strong>{song.title}</strong>
          <p>{song.artistName}</p>
        </div>
      </div>
      <div className="player-control-cluster">
        <input
          className="seek-control"
          type="range"
          min="0"
          max={duration || 0}
          step="0.01"
          value={Math.min(progress, duration || progress)}
          onChange={handleSeek}
          aria-label="Song progress"
        />
        <div className="player-button-row">
          <button
            type="button"
            className="player-icon-button"
            onClick={onPrevious}
            disabled={!canPrevious}
            aria-label="Previous song"
          >
            ←
          </button>
          <button
            type="button"
            className="player-play-button"
            onClick={handleTogglePlay}
            aria-label={isPlaying ? "Pause song" : "Play song"}
          >
            {isPlaying ? "Ⅱ" : "▶"}
          </button>
          <button
            type="button"
            className="player-icon-button"
            onClick={onNext}
            disabled={!canNext}
            aria-label="Next song"
          >
            →
          </button>
          <button
            type="button"
            className="player-like-button"
            aria-label={stats.isLiked ? "Unlike song" : "Like song"}
            aria-pressed={stats.isLiked}
            onClick={handleLike}
          >
            {stats.isLiked ? "♥" : "♡"}
          </button>
        </div>
      </div>
      <div className="volume-control">
        <button
          type="button"
          className="volume-toggle"
          onClick={handleMuteToggle}
          aria-label={volume > 0 ? "Mute volume" : "Unmute volume"}
        >
          {volume > 0 ? "◒" : "⊘"}
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={handleVolumeChange}
          aria-label="Volume"
        />
      </div>
    </div>
  );
}

function RandomSongPlayer({ currentUser, song, t, onStartRandom }) {
  const [isInfoOpaque, setIsInfoOpaque] = useState(false);
  const [isDraggingInfo, setIsDraggingInfo] = useState(false);
  const [infoPosition, setInfoPosition] = useState({ x: 0, y: 0 });
  const [activeInfoIndex, setActiveInfoIndex] = useState(0);
  const dragInfoRef = useRef(null);
  const infoCards = song
    ? [
        {
          title: song.title,
          eyebrow: t("song"),
          body: song.description || `${song.streamCount || 0} ${t("streams")}`,
          imageUrl: song.coverUrl,
        },
        {
          title: song.artistName,
          eyebrow: t("artist"),
          body: `${song.streamCount || 0} ${t("streams")}`,
          imageUrl: song.artist?.profileImageUrl || song.coverUrl,
        },
        {
          title: "03",
          eyebrow: "Info",
          body: t("emptyInfo"),
          imageUrl: song.coverUrl,
        },
        {
          title: "04",
          eyebrow: "Info",
          body: t("emptyInfo"),
          imageUrl: song.coverUrl,
        },
      ]
    : [];
  const activeInfoCard = infoCards[activeInfoIndex] || null;

  useEffect(() => {
    setActiveInfoIndex(0);
  }, [song?.id]);

  function handleInfoPointerDown(event) {
    if (event.button !== 0) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    dragInfoRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: infoPosition.x,
      originY: infoPosition.y,
      didMove: false,
    };
    setIsDraggingInfo(true);
  }

  function handleInfoPointerMove(event) {
    const dragState = dragInfoRef.current;

    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - dragState.startX;
    const deltaY = event.clientY - dragState.startY;

    if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
      dragState.didMove = true;
    }

    setInfoPosition({
      x: dragState.originX + deltaX,
      y: dragState.originY + deltaY,
    });
  }

  function handleInfoPointerUp(event) {
    const dragState = dragInfoRef.current;

    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    event.currentTarget.releasePointerCapture(event.pointerId);
    setIsDraggingInfo(false);
    dragInfoRef.current = null;

    if (!dragState.didMove) {
      setIsInfoOpaque((currentValue) => !currentValue);
    }
  }

  function handleInfoPointerCancel() {
    dragInfoRef.current = null;
    setIsDraggingInfo(false);
  }

  function showPreviousInfo(event) {
    event.stopPropagation();
    setActiveInfoIndex((currentIndex) => (currentIndex - 1 + infoCards.length) % infoCards.length);
  }

  function showNextInfo(event) {
    event.stopPropagation();
    setActiveInfoIndex((currentIndex) => (currentIndex + 1) % infoCards.length);
  }

  return (
    <section className="random-player-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{t("randomDiscovery")}</p>
          <h2 className="discovery-play-line">
            {t("playForwardLead")}{" "}
            <button type="button" className="discovery-play-button" onClick={onStartRandom}>
              {t("playForwardAction")}
            </button>
          </h2>
        </div>
      </div>
      {song && activeInfoCard ? (
        <>
          <article
            className={`random-song-card${isInfoOpaque ? " is-opaque" : ""}${
              isDraggingInfo ? " is-dragging" : ""
            }`}
            style={{ transform: `translate3d(${infoPosition.x}px, ${infoPosition.y}px, 0)` }}
            onPointerDown={handleInfoPointerDown}
            onPointerMove={handleInfoPointerMove}
            onPointerUp={handleInfoPointerUp}
            onPointerCancel={handleInfoPointerCancel}
          >
            <button
              type="button"
              className="info-carousel-arrow is-left"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={showPreviousInfo}
              aria-label="Previous info"
            >
              ‹
            </button>
            <button
              type="button"
              className="info-carousel-arrow is-right"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={showNextInfo}
              aria-label="Next info"
            >
              ›
            </button>
            {activeInfoCard.imageUrl ? (
              <img
                src={getAssetUrl(activeInfoCard.imageUrl)}
                alt=""
                draggable="false"
                onDragStart={(event) => event.preventDefault()}
              />
            ) : (
              <div className="song-cover-placeholder">♪</div>
            )}
            <div className="song-details">
              <p className="eyebrow">{activeInfoCard.eyebrow}</p>
              <h3>{activeInfoCard.title}</h3>
              {activeInfoIndex === 1 ? (
                <Link className="text-link" to={getArtistProfilePath(song.artist?.id, currentUser)}>
                  {song.artistName}
                </Link>
              ) : null}
              <p className="song-description">{activeInfoCard.body}</p>
              <div className="info-carousel-dots" aria-hidden="true">
                {infoCards.map((infoCard, index) => (
                  <span
                    className={index === activeInfoIndex ? "is-active" : ""}
                    key={`${infoCard.title}-${index}`}
                  />
                ))}
              </div>
            </div>
          </article>
        </>
      ) : (
        <p className="empty-state">{t("noSongsAvailable")}</p>
      )}
    </section>
  );
}

function HomePage({
  currentUser,
  randomSong,
  prepareFreshRandomQueue,
  startRandomQueue,
  topSongs,
  loadTopSongs,
  searchError,
  t,
}) {
  const [error, setError] = useState("");
  const [isTopSongsOpen, setIsTopSongsOpen] = useState(false);

  useEffect(() => {
    loadTopSongs();
  }, []);

  useEffect(() => {
    prepareFreshRandomQueue().catch((randomError) => setError(randomError.message));
  }, []);

  return (
    <main
      className={`page-shell home-page-shell${
        randomSong?.coverUrl ||
        randomSong?.backgroundVideoUrl ||
        randomSong?.slideshowImageUrls?.length
          ? " has-cover-marquee"
          : ""
      }`}
    >
      <SongBackdrop song={randomSong} />
      <section className="discovery-panel">
        {error || searchError ? <p className="form-error">{error || searchError}</p> : null}
      </section>
      <RandomSongPlayer
        currentUser={currentUser}
        song={randomSong}
        t={t}
        onStartRandom={startRandomQueue}
      />
      <button
        type="button"
        className="top-songs-toggle"
        onClick={() => setIsTopSongsOpen((currentValue) => !currentValue)}
      >
        {t("topSongs")}
      </button>
      <section className={`top-songs-panel${isTopSongsOpen ? " is-open" : ""}`}>
        <div className="section-heading">
          <div>
            <h2>{t("topSongsHeading")}</h2>
          </div>
        </div>
        {topSongs.length ? (
          <div className="top-song-list">
            {topSongs.map((topSong, index) => (
              <Link
                className="top-song-item"
                to={getArtistProfilePath(topSong.artist?.id, currentUser, topSong.id)}
                key={topSong.id}
                onClick={() => setIsTopSongsOpen(false)}
              >
                <strong>{index + 1}</strong>
                {topSong.coverUrl ? (
                  <img src={getAssetUrl(topSong.coverUrl)} alt={`${topSong.title} cover`} />
                ) : (
                  <span>♪</span>
                )}
                <div>
                  <h3>{topSong.title}</h3>
                  <p>
                    {topSong.artistName} · {topSong.likeCount || 0} likes ·{" "}
                    {topSong.streamCount || 0} streams
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="empty-state">No ranked songs yet.</p>
        )}
        <button type="button" className="secondary-button top-songs-more">
          More
        </button>
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

function ProfilePage({
  currentUser,
  authToken,
  onLogout,
  onUserUpdate,
  activeSongId,
  activeSong,
  isPlayerPlaying,
  onPlaySong,
  onTogglePlayback,
  theme,
  onThemeChange,
  language,
  onLanguageChange,
  t,
}) {
  const [searchParams] = useSearchParams();
  const selectedSongId = searchParams.get("song");
  const [songs, setSongs] = useState([]);
  const [songLimit, setSongLimit] = useState(10);
  const [social, setSocial] = useState({ followers: [], following: [] });
  const [openSocialList, setOpenSocialList] = useState(null);
  const [error, setError] = useState("");
  const [profileImageError, setProfileImageError] = useState("");
  const [profilePreviewUrl, setProfilePreviewUrl] = useState("");
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [profileEditError, setProfileEditError] = useState("");
  const [isProfileEditorOpen, setIsProfileEditorOpen] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingProfileImage, setIsUploadingProfileImage] = useState(false);
  const [editingSongId, setEditingSongId] = useState(null);
  const [openSongMenuId, setOpenSongMenuId] = useState(null);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [editForm, setEditForm] = useState({ title: "", description: "", visualMode: "video" });
  const [profileForm, setProfileForm] = useState({
    displayName: currentUser?.displayName || "",
    currentPassword: "",
    newPassword: "",
  });
  const profileFileInputRef = useRef(null);

  useEffect(() => {
    return () => {
      if (profilePreviewUrl) {
        URL.revokeObjectURL(profilePreviewUrl);
      }
    };
  }, [profilePreviewUrl]);

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

  async function loadSocial() {
    if (!authToken) {
      setSocial({ followers: [], following: [] });
      return;
    }

    try {
      const data = await requestJson("/api/profile/social", {
        headers: getAuthHeaders(authToken),
      });
      setSocial(data);
    } catch (socialError) {
      setError(socialError.message);
    }
  }

  useEffect(() => {
    loadSongs();
    loadSocial();
  }, [authToken]);

  useEffect(() => {
    if (!selectedSongId || songs.length === 0) {
      return;
    }

    const selectedIndex = songs.findIndex((song) => song.id === selectedSongId);

    if (selectedIndex >= 0) {
      onPlaySong(songs, selectedIndex);
    }
  }, [selectedSongId, songs]);

  useEffect(() => {
    setProfileForm((currentForm) => ({
      ...currentForm,
      displayName: currentUser?.displayName || "",
    }));
  }, [currentUser?.displayName]);

  function startEditing(song) {
    setEditingSongId(song.id);
    setOpenSongMenuId(null);
    setEditForm({
      title: song.title,
      description: song.description,
      visualMode: song.slideshowImageUrls?.length ? "photos" : "video",
    });
  }

  async function handleEditSubmit(event, songId) {
    event.preventDefault();

    try {
      const formData = new FormData(event.currentTarget);
      const backgroundVideo = formData.get("backgroundVideo");
      const slideshowImages = formData
        .getAll("slideshowImages")
        .filter((file) => file instanceof File && file.size > 0);

      if (backgroundVideo instanceof File && backgroundVideo.size > 0 && slideshowImages.length) {
        throw new Error("Choose either a background video or slideshow photos, not both.");
      }

      if (slideshowImages.length > 5) {
        throw new Error("Choose up to 5 slideshow photos.");
      }

      if (backgroundVideo instanceof File && backgroundVideo.size > 0) {
        await validateVideoDuration(backgroundVideo, 6);
      }

      await requestJson(`/api/songs/${songId}`, {
        method: "PATCH",
        headers: getAuthHeaders(authToken),
        body: formData,
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

  async function handleProfileDetailsSubmit(event) {
    event.preventDefault();
    setProfileEditError("");
    setIsSavingProfile(true);

    try {
      const data = await requestJson("/api/profile", {
        method: "PATCH",
        headers: getAuthHeaders(authToken),
        body: JSON.stringify(profileForm),
      });

      onUserUpdate(data.user);
      await loadSongs();
      setProfileForm((currentForm) => ({
        ...currentForm,
        currentPassword: "",
        newPassword: "",
      }));
      setIsProfileEditorOpen(false);
    } catch (profileError) {
      setProfileEditError(profileError.message);
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handleProfileImageUpload() {
    setProfileImageError("");
    setIsUploadingProfileImage(true);

    try {
      if (!profileImageFile) {
        throw new Error("Choose a profile picture first.");
      }

      const formData = new FormData();
      formData.append("profileImage", profileImageFile);

      const data = await requestJson("/api/profile/image", {
        method: "POST",
        headers: getAuthHeaders(authToken),
        body: formData,
      });

      onUserUpdate(data.user);
      setProfileImageFile(null);
      setProfilePreviewUrl("");
    } catch (uploadError) {
      setProfileImageError(uploadError.message);
    } finally {
      setIsUploadingProfileImage(false);
    }
  }

  function handleProfileImageChange(event) {
    if (profilePreviewUrl) {
      URL.revokeObjectURL(profilePreviewUrl);
    }

    setProfilePreviewUrl(createObjectUrl(event.target.files?.[0]));
    setProfileImageFile(event.target.files?.[0] || null);
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

  const backdropSong = activeSong || songs.find((song) => song.backgroundVideoUrl);

  return (
    <main
      className={`page-shell profile-page-shell${
        backdropSong?.backgroundVideoUrl ||
        backdropSong?.coverUrl ||
        backdropSong?.slideshowImageUrls?.length ||
        getSongBackdropImages(songs).length
          ? " has-cover-marquee"
          : ""
      }`}
    >
      <SongBackdrop song={backdropSong} fallbackImages={getSongBackdropImages(songs)} />
      <section className="content-panel profile-panel">
        <div className="profile-preview">
          <div className="profile-card-menu song-menu">
            <button
              type="button"
              className="song-menu-toggle"
              onClick={() => setIsProfileMenuOpen((currentValue) => !currentValue)}
              aria-label="Profile options"
            >
              ⋮
            </button>
            {isProfileMenuOpen ? (
              <div className="song-menu-popover">
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileEditorOpen(true);
                    setIsProfileMenuOpen(false);
                  }}
                >
                  Edit profile
                </button>
              </div>
            ) : null}
          </div>
          <ArtistAvatar artist={currentUser} className="profile-preview-avatar" />
          <div className="profile-preview-body">
            <h1>{currentUser.displayName}</h1>
            <strong>{t("listenerProfile")}</strong>
            <p>{t("profileHint")}</p>
            <div className="social-summary">
              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  setOpenSocialList(openSocialList === "followers" ? null : "followers")
                }
              >
                {social.followers.length} {t("followers")}
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  setOpenSocialList(openSocialList === "following" ? null : "following")
                }
              >
                {social.following.length} {t("following")}
              </button>
            </div>
          </div>
        </div>
        {isProfileEditorOpen ? (
          <div className="modal-backdrop" role="presentation">
            <section className="profile-edit-modal" aria-label="Edit profile">
              <div className="modal-header">
                <h2>{t("editProfile")}</h2>
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => setIsProfileEditorOpen(false)}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <form className="profile-edit-form" onSubmit={handleProfileDetailsSubmit}>
                <label>
                  {t("artistName")}
                  <input
                    value={profileForm.displayName}
                    onChange={(event) =>
                      setProfileForm((currentForm) => ({
                        ...currentForm,
                        displayName: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
                <section className="profile-photo-editor" aria-label={t("photo")}>
                  <div>
                    <p className="form-label">{t("photo")}</p>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => profileFileInputRef.current?.click()}
                    >
                      {t("uploadPhoto")}
                    </button>
                    <input
                      ref={profileFileInputRef}
                      className="hidden-file-input"
                      name="profileImage"
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,image/*"
                      onChange={handleProfileImageChange}
                    />
                  </div>
                  {profilePreviewUrl ? (
                    <img
                      className="upload-preview-image"
                      src={profilePreviewUrl}
                      alt="Profile preview"
                    />
                  ) : (
                    <ArtistAvatar artist={currentUser} className="profile-preview-avatar" />
                  )}
                  {profileImageError ? <p className="form-error">{profileImageError}</p> : null}
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={handleProfileImageUpload}
                    disabled={isUploadingProfileImage || !profileImageFile}
                  >
                    {isUploadingProfileImage ? "Uploading..." : "Save picture"}
                  </button>
                </section>
                <label>
                  {t("currentPassword")}
                  <input
                    type="password"
                    value={profileForm.currentPassword}
                    onChange={(event) =>
                      setProfileForm((currentForm) => ({
                        ...currentForm,
                        currentPassword: event.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  {t("newPassword")}
                  <input
                    type="password"
                    minLength="8"
                    value={profileForm.newPassword}
                    onChange={(event) =>
                      setProfileForm((currentForm) => ({
                        ...currentForm,
                        newPassword: event.target.value,
                      }))
                    }
                  />
                </label>
                <section className="theme-picker" aria-label="Theme selection">
                  <p className="form-label">{t("theme")}</p>
                  <div>
                    {THEMES.map((themeOption) => (
                      <button
                        type="button"
                        className={theme === themeOption.id ? "is-selected" : ""}
                        style={{ "--swatch-color": themeOption.swatch }}
                        onClick={() => onThemeChange(themeOption.id)}
                        aria-label={themeOption.label}
                        key={themeOption.id}
                      />
                    ))}
                  </div>
                </section>
                <section className="language-picker" aria-label="Language selection">
                  <p className="form-label">{t("language")}</p>
                  <div>
                    {LANGUAGES.map((languageOption) => (
                      <button
                        type="button"
                        className={language === languageOption.id ? "is-selected" : ""}
                        onClick={() => onLanguageChange(languageOption.id)}
                        key={languageOption.id}
                      >
                        {languageOption.label}
                      </button>
                    ))}
                  </div>
                </section>
                {profileEditError ? <p className="form-error">{profileEditError}</p> : null}
                <button type="submit" disabled={isSavingProfile}>
                  {isSavingProfile ? "Saving..." : t("saveProfile")}
                </button>
              </form>
            </section>
          </div>
        ) : null}
        {openSocialList ? (
          <div className="social-list">
            {(openSocialList === "followers" ? social.followers : social.following).length === 0 ? (
              <p className="empty-state">
                {openSocialList === "followers"
                  ? "No followers yet."
                  : "You are not following anyone yet."}
              </p>
            ) : (
              (openSocialList === "followers" ? social.followers : social.following).map(
                (artist) => (
                  <Link className="artist-result" to={`/artists/${artist.id}`} key={artist.id}>
                    <ArtistAvatar artist={artist} />
                    <div>
                      <strong>{artist.displayName}</strong>
                      <p>
                        {artist.songCount} songs · {artist.followerCount} followers
                      </p>
                    </div>
                  </Link>
                ),
              )
            )}
          </div>
        ) : null}
        <div className="library-header">
          <div>
            <h2>Music</h2>
            <p>
              {songs.length} of {songLimit} upload used
            </p>
          </div>
          <Link className="add-song-link" to="/songs/new">
            Add song
          </Link>
        </div>
        {error ? <p className="form-error">{error}</p> : null}
        <div className="song-list">
          {songs.length === 0 ? (
            <p className="empty-state">No songs uploaded yet.</p>
          ) : (
            songs.map((song, index) => (
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
                      <label>
                        Song title
                        <input
                          name="title"
                          value={editForm.title}
                          onChange={(event) =>
                            setEditForm((current) => ({ ...current, title: event.target.value }))
                          }
                          required
                        />
                      </label>
                      <label>
                        Description
                        <textarea
                          name="description"
                          rows="3"
                          value={editForm.description}
                          onChange={(event) =>
                            setEditForm((current) => ({
                              ...current,
                              description: event.target.value,
                            }))
                          }
                        />
                      </label>
                      <label>
                        Cover photo
                        <input
                          name="coverImage"
                          type="file"
                          accept=".jpg,.jpeg,.png,.webp,image/*"
                        />
                      </label>
                      <div className="background-upload-group">
                        <p className="form-label">Background visuals</p>
                        <div
                          className="visual-mode-switch"
                          role="group"
                          aria-label="Edit visual type"
                        >
                          <button
                            type="button"
                            className={editForm.visualMode === "video" ? "is-selected" : ""}
                            onClick={() =>
                              setEditForm((current) => ({ ...current, visualMode: "video" }))
                            }
                          >
                            Video
                          </button>
                          <button
                            type="button"
                            className={editForm.visualMode === "photos" ? "is-selected" : ""}
                            onClick={() =>
                              setEditForm((current) => ({ ...current, visualMode: "photos" }))
                            }
                          >
                            Photos
                          </button>
                        </div>
                        {editForm.visualMode === "video" ? (
                          <label>
                            Short video
                            <input
                              name="backgroundVideo"
                              type="file"
                              accept=".mp4,.webm,.mov,.m4v,video/*"
                            />
                          </label>
                        ) : (
                          <label>
                            Slideshow photos
                            <input
                              name="slideshowImages"
                              type="file"
                              accept=".jpg,.jpeg,.png,.webp,image/*"
                              multiple
                            />
                          </label>
                        )}
                      </div>
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
                    <div className="profile-song-row">
                      <div>
                        <h3>{song.title}</h3>
                        <p>{song.artistName}</p>
                      </div>
                      <TrackPlayButton
                        song={song}
                        isActive={activeSongId === song.id}
                        isPlaying={isPlayerPlaying && activeSongId === song.id}
                        onPlay={() => onPlaySong(songs, index)}
                        onTogglePlayback={onTogglePlayback}
                      />
                      <div className="song-menu">
                        <button
                          type="button"
                          className="song-menu-toggle"
                          onClick={() =>
                            setOpenSongMenuId(openSongMenuId === song.id ? null : song.id)
                          }
                          aria-label={`More options for ${song.title}`}
                        >
                          ⋮
                        </button>
                        {openSongMenuId === song.id ? (
                          <div className="song-menu-popover">
                            <button type="button" onClick={() => startEditing(song)}>
                              Edit
                            </button>
                            <button
                              type="button"
                              className="danger-menu-button"
                              onClick={() => handleDelete(song.id)}
                            >
                              Delete
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>
              </article>
            ))
          )}
        </div>
        <div className="profile-logout">
          <button type="button" className="danger-button" onClick={onLogout}>
            Logout
          </button>
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
  const [visualMode, setVisualMode] = useState("video");
  const [audioFileName, setAudioFileName] = useState("");
  const [coverPreviewUrl, setCoverPreviewUrl] = useState("");
  const [videoPreviewUrl, setVideoPreviewUrl] = useState("");
  const [slideshowPreviewUrls, setSlideshowPreviewUrls] = useState([]);

  useEffect(() => {
    return () => {
      if (coverPreviewUrl) {
        URL.revokeObjectURL(coverPreviewUrl);
      }

      if (videoPreviewUrl) {
        URL.revokeObjectURL(videoPreviewUrl);
      }

      slideshowPreviewUrls.forEach((previewUrl) => URL.revokeObjectURL(previewUrl));
    };
  }, [coverPreviewUrl, slideshowPreviewUrls, videoPreviewUrl]);

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

  function handleAudioChange(event) {
    setAudioFileName(event.target.files?.[0]?.name || "");
  }

  function handleCoverChange(event) {
    if (coverPreviewUrl) {
      URL.revokeObjectURL(coverPreviewUrl);
    }

    setCoverPreviewUrl(createObjectUrl(event.target.files?.[0]));
  }

  function handleVideoChange(event) {
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
    }

    setVideoPreviewUrl(createObjectUrl(event.target.files?.[0]));
  }

  function handleSlideshowChange(event) {
    slideshowPreviewUrls.forEach((previewUrl) => URL.revokeObjectURL(previewUrl));
    const nextPreviewUrls = Array.from(event.target.files || [])
      .slice(0, 5)
      .map(createObjectUrl)
      .filter(Boolean);

    setSlideshowPreviewUrls(nextPreviewUrls);
  }

  function handleVisualModeChange(nextMode) {
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
    }

    slideshowPreviewUrls.forEach((previewUrl) => URL.revokeObjectURL(previewUrl));
    setVisualMode(nextMode);
    setVideoPreviewUrl("");
    setSlideshowPreviewUrls([]);
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

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const formData = new FormData(event.currentTarget);
      const backgroundVideo = formData.get("backgroundVideo");
      const slideshowImages = formData
        .getAll("slideshowImages")
        .filter((file) => file instanceof File && file.size > 0);

      if (backgroundVideo instanceof File && backgroundVideo.size > 0 && slideshowImages.length) {
        throw new Error("Choose either a background video or slideshow photos, not both.");
      }

      if (slideshowImages.length > 5) {
        throw new Error("Choose up to 5 slideshow photos.");
      }

      if (backgroundVideo instanceof File && backgroundVideo.size > 0) {
        await validateVideoDuration(backgroundVideo, 6);
      }

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
        <form className="auth-form upload-form" onSubmit={handleSubmit}>
          <label>
            Song title
            <input name="title" required />
          </label>
          <label>
            Description
            <textarea name="description" rows="4" placeholder="A few words about the track" />
          </label>
          <label>
            Audio file
            <input
              name="audioFile"
              type="file"
              accept=".mp3,.wav,.m4a,audio/*"
              onChange={handleAudioChange}
              required
            />
          </label>
          {audioFileName ? <p className="file-preview-note">Audio: {audioFileName}</p> : null}
          <label>
            Cover photo
            <input
              name="coverImage"
              type="file"
              accept=".jpg,.jpeg,.png,.webp,image/*"
              onChange={handleCoverChange}
            />
          </label>
          {coverPreviewUrl ? (
            <img className="upload-preview-image" src={coverPreviewUrl} alt="Cover preview" />
          ) : null}
          <div className="background-upload-group">
            <p className="form-label">Background visuals</p>
            <div className="visual-mode-switch" role="group" aria-label="Background visual type">
              <button
                type="button"
                className={visualMode === "video" ? "is-selected" : ""}
                onClick={() => handleVisualModeChange("video")}
              >
                Video
              </button>
              <button
                type="button"
                className={visualMode === "photos" ? "is-selected" : ""}
                onClick={() => handleVisualModeChange("photos")}
              >
                Photos
              </button>
            </div>
            {visualMode === "video" ? (
              <>
                <label>
                  Short video
                  <input
                    name="backgroundVideo"
                    type="file"
                    accept=".mp4,.webm,.mov,.m4v,video/*"
                    onChange={handleVideoChange}
                  />
                </label>
                {videoPreviewUrl ? (
                  <video className="upload-preview-video" src={videoPreviewUrl} muted controls />
                ) : null}
              </>
            ) : (
              <>
                <label>
                  Slideshow photos
                  <input
                    name="slideshowImages"
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,image/*"
                    onChange={handleSlideshowChange}
                    multiple
                  />
                </label>
                {slideshowPreviewUrls.length ? (
                  <div className="upload-preview-grid">
                    {slideshowPreviewUrls.map((previewUrl) => (
                      <img src={previewUrl} alt="Slideshow preview" key={previewUrl} />
                    ))}
                  </div>
                ) : null}
              </>
            )}
            <p className="helper-text">Pick one short video up to 6 seconds, or up to 5 photos.</p>
          </div>
          {error ? <p className="form-error">{error}</p> : null}
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Uploading..." : "Upload song"}
          </button>
        </form>
      </section>
    </main>
  );
}

function ArtistPage({
  currentUser,
  authToken,
  activeSongId,
  isPlayerPlaying,
  onPlaySong,
  onTogglePlayback,
}) {
  const navigate = useNavigate();
  const { artistId } = useParams();
  const [searchParams] = useSearchParams();
  const selectedSongId = searchParams.get("song");
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

  useEffect(() => {
    if (artist?.isSelf) {
      navigate(
        selectedSongId ? `/profile?song=${encodeURIComponent(selectedSongId)}` : "/profile",
        {
          replace: true,
        },
      );
    }
  }, [artist?.isSelf, navigate, selectedSongId]);

  useEffect(() => {
    if (!selectedSongId || songs.length === 0) {
      return;
    }

    const selectedIndex = songs.findIndex((song) => song.id === selectedSongId);

    if (selectedIndex >= 0) {
      onPlaySong(songs, selectedIndex);
    }
  }, [selectedSongId, songs]);

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
    <main
      className={`page-shell artist-page-shell${
        getSongBackdropImages(songs).length || songs.some((song) => song.backgroundVideoUrl)
          ? " has-cover-marquee"
          : ""
      }`}
    >
      <SongBackdrop
        song={songs.find((song) => song.backgroundVideoUrl)}
        fallbackImages={getSongBackdropImages(songs)}
      />
      <section className="content-panel profile-panel">
        <div className="profile-preview">
          <ArtistAvatar artist={artist} className="profile-preview-avatar" />
          <div className="profile-preview-body">
            <h1>{artist.displayName}</h1>
            <strong>Artist</strong>
            <p>{artist.songCount} songs</p>
            <div className="social-summary">
              <button type="button" className="secondary-button">
                {artist.followerCount} followers
              </button>
              {currentUser ? (
                <button type="button" className="follow-button" onClick={handleFollowToggle}>
                  {isFollowing ? "Following" : "Follow"}
                </button>
              ) : (
                <Link className="secondary-button profile-action-link" to="/login">
                  Login to follow
                </Link>
              )}
            </div>
          </div>
        </div>
        {error ? <p className="form-error">{error}</p> : null}
        <div className="library-header">
          <div>
            <h2>Music</h2>
            <p>{songs.length} of 10 upload used</p>
          </div>
        </div>
        <div className="song-list">
          {songs.length === 0 ? (
            <p className="empty-state">No songs uploaded yet.</p>
          ) : (
            songs.map((song, index) => (
              <article className="song-item" key={song.id}>
                {song.coverUrl ? (
                  <img src={getAssetUrl(song.coverUrl)} alt={`${song.title} cover`} />
                ) : (
                  <div className="song-cover-placeholder">♪</div>
                )}
                <div className="song-details">
                  <div className="profile-song-row public-song-row">
                    <div>
                      <h3>{song.title}</h3>
                      <p>{song.artistName}</p>
                    </div>
                    <TrackPlayButton
                      song={song}
                      isActive={activeSongId === song.id}
                      isPlaying={isPlayerPlaying && activeSongId === song.id}
                      onPlay={() => onPlaySong(songs, index)}
                      onTogglePlayback={onTogglePlayback}
                    />
                  </div>
                </div>
              </article>
            ))
          )}
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
  const location = useLocation();
  const navigate = useNavigate();
  const [authToken, setAuthToken] = useState(() => localStorage.getItem(AUTH_TOKEN_STORAGE_KEY));
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_STORAGE_KEY) || "sea");
  const [language, setLanguage] = useState(
    () => localStorage.getItem(LANGUAGE_STORAGE_KEY) || "en",
  );
  const [currentUser, setCurrentUser] = useState(null);
  const [playerSong, setPlayerSong] = useState(null);
  const [playerQueue, setPlayerQueue] = useState([]);
  const [playerQueueIndex, setPlayerQueueIndex] = useState(-1);
  const [playerMode, setPlayerMode] = useState(null);
  const [isPlayerPlaying, setIsPlayerPlaying] = useState(false);
  const [randomSong, setRandomSong] = useState(null);
  const [topSongs, setTopSongs] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchArtists, setSearchArtists] = useState([]);
  const [searchSongs, setSearchSongs] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [isFooterVisible, setIsFooterVisible] = useState(false);
  const textHoverRef = useRef(null);

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

  function handleUserUpdate(user) {
    setCurrentUser(user);
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

  async function loadTopSongs() {
    try {
      const data = await requestJson("/api/songs/top", {
        headers: getAuthHeaders(authToken),
      });
      setTopSongs(Array.isArray(data.songs) ? data.songs : []);
    } catch {
      setTopSongs([]);
    }
  }

  useEffect(() => {
    loadTopSongs();
  }, [authToken]);

  async function handleHeaderSearch(event) {
    event.preventDefault();
    const query = searchQuery.trim();

    setSearchError("");
    navigate("/");

    if (!query) {
      setHasSearched(false);
      setIsSearchOpen(false);
      setSearchArtists([]);
      setSearchSongs([]);
      return;
    }

    setHasSearched(true);
    setIsSearchOpen(true);

    try {
      const data = await requestJson(`/api/search?q=${encodeURIComponent(query)}`, {
        headers: getAuthHeaders(authToken),
      });
      setSearchArtists(Array.isArray(data.artists) ? data.artists : []);
      setSearchSongs(Array.isArray(data.songs) ? data.songs : []);
    } catch (error) {
      setSearchError(error.message);
    }
  }

  function clearSearch() {
    setSearchQuery("");
    setSearchArtists([]);
    setSearchSongs([]);
    setHasSearched(false);
    setIsSearchOpen(false);
    setSearchError("");
  }

  useEffect(() => {
    let lastScrollY = window.scrollY;

    function handleScroll() {
      const nextScrollY = window.scrollY;

      if (nextScrollY > lastScrollY + 4) {
        setIsFooterVisible(true);
      }

      if (nextScrollY < lastScrollY - 4) {
        setIsFooterVisible(false);
      }

      lastScrollY = nextScrollY;
    }

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    function handleSearchClickAway(event) {
      if (!isSearchOpen) {
        return;
      }

      if (event.target.closest(".header-search-form, .search-results-popover")) {
        return;
      }

      setIsSearchOpen(false);
    }

    document.addEventListener("pointerdown", handleSearchClickAway);

    return () => document.removeEventListener("pointerdown", handleSearchClickAway);
  }, [isSearchOpen]);

  useEffect(() => {
    function getHoverTextTarget(event) {
      if (event.target.closest("input, textarea, select, audio, video")) {
        return null;
      }

      const target = event.target.closest(
        "button, h1, h2, h3, p, strong, nav a, .text-link, .profile-action-link, .add-song-link, .top-songs-toggle, .empty-state, .form-label",
      );

      if (!target || !target.textContent?.trim() || !/[a-zA-Z0-9]/.test(target.textContent)) {
        return null;
      }

      if (target.matches(".artist-result, .top-song-item")) {
        return null;
      }

      return target;
    }

    function paintHoverText(target) {
      const [fontFamily, color] = BRAND_STYLES[Math.floor(Math.random() * BRAND_VARIANT_COUNT)];
      const [, backgroundColor] = BRAND_STYLES[Math.floor(Math.random() * BRAND_VARIANT_COUNT)];
      target.style.setProperty("--flicker-font", fontFamily);
      target.style.setProperty("--flicker-color", color);
      target.style.setProperty("--flicker-background", backgroundColor);
    }

    function clearTextHover() {
      if (!textHoverRef.current) {
        return;
      }

      window.clearInterval(textHoverRef.current.timer);
      textHoverRef.current.target.classList.remove("is-text-flickering");
      textHoverRef.current.target.removeAttribute("data-flicker-text");
      textHoverRef.current.target.style.removeProperty("--flicker-font");
      textHoverRef.current.target.style.removeProperty("--flicker-color");
      textHoverRef.current.target.style.removeProperty("--flicker-background");
      textHoverRef.current = null;
    }

    function handlePointerOver(event) {
      const target = getHoverTextTarget(event);

      if (!target || textHoverRef.current?.target === target) {
        return;
      }

      clearTextHover();
      target.dataset.flickerText = target.textContent.trim();
      target.classList.add("is-text-flickering");
      paintHoverText(target);
      textHoverRef.current = {
        target,
        timer: window.setInterval(() => paintHoverText(target), 50),
      };
    }

    function handlePointerOut(event) {
      if (
        textHoverRef.current?.target &&
        !textHoverRef.current.target.contains(event.relatedTarget)
      ) {
        clearTextHover();
      }
    }

    document.addEventListener("pointerover", handlePointerOver);
    document.addEventListener("pointerout", handlePointerOut);

    return () => {
      document.removeEventListener("pointerover", handlePointerOver);
      document.removeEventListener("pointerout", handlePointerOut);
      clearTextHover();
    };
  }, []);

  async function loadRandomSong({ autoPlay = true, primePlayer = false } = {}) {
    const data = await requestJson("/api/songs/random", {
      headers: getAuthHeaders(authToken),
    });
    setRandomSong(data.song);

    if (data.song) {
      if (autoPlay || primePlayer) {
        setPlayerSong(data.song);
        setPlayerQueue([data.song]);
        setPlayerQueueIndex(0);
        setPlayerMode("random");
        setIsPlayerPlaying(autoPlay);
      }
    }

    return data.song;
  }

  function prepareFreshRandomQueue() {
    return loadRandomSong({ autoPlay: false, primePlayer: true });
  }

  function startRandomQueue() {
    if (randomSong) {
      setPlayerSong(randomSong);
      setPlayerQueue([randomSong]);
      setPlayerQueueIndex(0);
      setPlayerMode("random");
      setIsPlayerPlaying(true);
      return Promise.resolve(randomSong);
    }

    return loadRandomSong({ autoPlay: true, primePlayer: true });
  }

  function playSongQueue(songs, index) {
    setPlayerSong(songs[index]);
    setPlayerQueue(songs);
    setPlayerQueueIndex(index);
    setPlayerMode("queue");
    setIsPlayerPlaying(true);
  }

  function toggleCurrentSongPlayback() {
    setIsPlayerPlaying((currentValue) => !currentValue);
  }

  function playPreviousSong() {
    if (playerMode === "random") {
      return;
    }

    if (playerQueue.length === 0) {
      return;
    }

    const previousIndex = (playerQueueIndex - 1 + playerQueue.length) % playerQueue.length;
    setPlayerQueueIndex(previousIndex);
    setPlayerSong(playerQueue[previousIndex]);
    setIsPlayerPlaying(true);
  }

  function playNextSong() {
    if (playerMode === "random") {
      loadRandomSong({ autoPlay: true }).catch(() => {});
      return;
    }

    if (playerQueue.length === 0) {
      return;
    }

    const nextIndex = (playerQueueIndex + 1) % playerQueue.length;
    setPlayerQueueIndex(nextIndex);
    setPlayerSong(playerQueue[nextIndex]);
    setIsPlayerPlaying(true);
  }

  function handlePlayerStatsChange(updatedSong) {
    loadTopSongs();

    if (updatedSong) {
      setPlayerSong((currentSong) =>
        currentSong?.id === updatedSong.id ? updatedSong : currentSong,
      );
      setPlayerQueue((currentQueue) =>
        currentQueue.map((queuedSong) =>
          queuedSong.id === updatedSong.id ? updatedSong : queuedSong,
        ),
      );
      setRandomSong((currentRandomSong) =>
        currentRandomSong?.id === updatedSong.id ? updatedSong : currentRandomSong,
      );
      setSearchSongs((currentSongs) =>
        currentSongs.map((searchSong) =>
          searchSong.id === updatedSong.id ? updatedSong : searchSong,
        ),
      );
      setTopSongs((currentSongs) =>
        currentSongs.map((topSong) => (topSong.id === updatedSong.id ? updatedSong : topSong)),
      );
    }
  }

  function handleThemeChange(nextTheme) {
    setTheme(nextTheme);
    localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  }

  function handleLanguageChange(nextLanguage) {
    setLanguage(nextLanguage);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
  }

  function t(key) {
    return TRANSLATIONS[language]?.[key] || TRANSLATIONS.en[key] || key;
  }

  const isProfileRoute = location.pathname === "/profile";
  const shouldShowFooter = isFooterVisible && !isProfileRoute;

  return (
    <div className={`app-shell theme-${theme}${shouldShowFooter ? " is-footer-visible" : ""}`}>
      <header className="site-header">
        <button type="button" className="brand">
          Neo Musica
        </button>
        <form className="artist-search-form header-search-form" onSubmit={handleHeaderSearch}>
          <input
            id="artist-search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchPlaceholder")}
          />
          <button type="submit">{t("search")}</button>
        </form>
        {isSearchOpen && hasSearched ? (
          <section className="search-results-popover" aria-label="Search results">
            <div className="artist-results">
              {searchSongs.length === 0 && searchArtists.length === 0 ? (
                <p className="empty-state">No songs or artists found.</p>
              ) : null}
              {searchSongs.length ? (
                <div className="search-result-group">
                  <p className="eyebrow">{t("songs")}</p>
                  {searchSongs.map((searchSong) => (
                    <Link
                      className="artist-result song-search-result"
                      to={getArtistProfilePath(searchSong.artist?.id, currentUser, searchSong.id)}
                      onClick={() => setIsSearchOpen(false)}
                      key={searchSong.id}
                    >
                      {searchSong.coverUrl ? (
                        <img
                          src={getAssetUrl(searchSong.coverUrl)}
                          alt={`${searchSong.title} cover`}
                        />
                      ) : (
                        <span>♪</span>
                      )}
                      <div>
                        <strong>{searchSong.title}</strong>
                        <p>{searchSong.artistName}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : null}
              {searchArtists.length ? (
                <div className="search-result-group">
                  <p className="eyebrow">{t("artists")}</p>
                  {searchArtists.map((artist) => (
                    <Link
                      className="artist-result"
                      to={getArtistProfilePath(artist.id, currentUser)}
                      onClick={() => setIsSearchOpen(false)}
                      key={artist.id}
                    >
                      <ArtistAvatar artist={artist} />
                      <div>
                        <strong>{artist.displayName}</strong>
                        <p>
                          {artist.songCount} songs · {artist.followerCount} followers
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          </section>
        ) : null}
        <nav aria-label="Primary navigation">
          <Link to="/" onClick={clearSearch}>
            {t("home")}
          </Link>
          {currentUser ? (
            <Link className="profile-nav-link" to="/profile" aria-label={t("profile")}>
              <ArtistAvatar artist={currentUser} className="header-profile-avatar" />
            </Link>
          ) : null}
          {!currentUser ? (
            <>
              <Link to="/login">{t("login")}</Link>
              <Link to="/register">{t("register")}</Link>
            </>
          ) : null}
        </nav>
      </header>
      {currentUser ? (
        <Link className="floating-add-button" to="/songs/new" aria-label="Add song">
          +
        </Link>
      ) : null}
      <Routes>
        <Route
          path="/"
          element={
            <HomePage
              currentUser={currentUser}
              randomSong={randomSong}
              prepareFreshRandomQueue={prepareFreshRandomQueue}
              startRandomQueue={startRandomQueue}
              topSongs={topSongs}
              loadTopSongs={loadTopSongs}
              searchError={searchError}
              t={t}
            />
          }
        />
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
          element={
            <ProfilePage
              currentUser={currentUser}
              authToken={authToken}
              onLogout={handleLogout}
              onUserUpdate={handleUserUpdate}
              activeSongId={playerSong?.id || null}
              activeSong={playerSong}
              isPlayerPlaying={isPlayerPlaying}
              onPlaySong={playSongQueue}
              onTogglePlayback={toggleCurrentSongPlayback}
              theme={theme}
              onThemeChange={handleThemeChange}
              language={language}
              onLanguageChange={handleLanguageChange}
              t={t}
            />
          }
        />
        <Route
          path="/songs/new"
          element={<SongUploadPage currentUser={currentUser} authToken={authToken} />}
        />
        <Route
          path="/artists/:artistId"
          element={
            <ArtistPage
              currentUser={currentUser}
              authToken={authToken}
              activeSongId={playerSong?.id || null}
              isPlayerPlaying={isPlayerPlaying}
              onPlaySong={playSongQueue}
              onTogglePlayback={toggleCurrentSongPlayback}
            />
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <GlobalSongPlayer
        song={playerSong}
        authToken={authToken}
        isPlaying={isPlayerPlaying}
        setIsPlaying={setIsPlayerPlaying}
        canPrevious={playerMode === "random" ? false : playerQueue.length > 1}
        canNext={playerMode === "random" || playerQueue.length > 1}
        onEnded={playNextSong}
        onNext={playNextSong}
        onPrevious={playPreviousSong}
        onStatsChange={handlePlayerStatsChange}
      />
      {isProfileRoute ? null : (
        <footer className={`site-footer${shouldShowFooter ? " is-visible" : ""}`}>
          <p className="eyebrow">Neo Musica</p>
          <h2>{t("contact")}</h2>
          <p>{t("contactEmail")}</p>
        </footer>
      )}
    </div>
  );
}
