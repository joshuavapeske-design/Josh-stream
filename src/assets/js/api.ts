const TMDB_API_KEY =
  (import.meta as any).env?.VITE_TMDB_API_KEY ||
  "49d1ae904aea49977797eded8effa7e6";
const BASE_URL = "https://api.themoviedb.org/3";
const IMAGE_BASE_URL = "https://image.tmdb.org/t/p";

export interface TMDBItem {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  vote_count?: number;
  release_date?: string;
  first_air_date?: string;
  media_type?: "movie" | "tv" | "person";
  genre_ids?: number[];
  genres?: Array<{ id: number; name: string }>;
  runtime?: number;
  number_of_seasons?: number;
  number_of_episodes?: number;
  seasons?: Array<{
    id: number;
    name: string;
    season_number: number;
    episode_count: number;
    poster_path: string | null;
  }>;
  tagline?: string;
  credits?: {
    cast: Array<{ id: number; name: string; character: string; profile_path: string | null }>;
    crew: Array<{ id: number; name: string; job: string }>;
  };
  videos?: {
    results: Array<{ key: string; site: string; type: string; name: string }>;
  };
}

export interface TMDBEpisode {
  id: number;
  episode_number: number;
  season_number: number;
  name: string;
  overview: string;
  still_path: string | null;
  air_date?: string;
  vote_average?: number;
  runtime?: number;
}

export interface TMDBSeasonDetails {
  _id?: string;
  id?: number;
  name: string;
  season_number: number;
  overview?: string;
  episodes: TMDBEpisode[];
}

export function getImageUrl(path: string | null | undefined, size = "w500"): string {
  if (!path) return "images/1.webp";
  return `${IMAGE_BASE_URL}/${size}${path}`;
}

export function getBackdropUrl(path: string | null | undefined, size = "w1280"): string {
  if (!path) return "images/background.webp";
  return `${IMAGE_BASE_URL}/${size}${path}`;
}

export function getDisplayTitle(item: TMDBItem): string {
  return item.title || item.name || item.original_title || item.original_name || "Untitled";
}

export function getReleaseYear(item: TMDBItem): string {
  const date = item.release_date || item.first_air_date;
  if (!date) return "";
  return new Date(date).getFullYear().toString();
}

async function fetchFromTMDB<T>(endpoint: string, params: Record<string, string | number> = {}): Promise<T> {
  const url = new URL(`${BASE_URL}${endpoint}`);
  url.searchParams.set("api_key", TMDB_API_KEY);
  Object.entries(params).forEach(([key, val]) => {
    url.searchParams.set(key, String(val));
  });

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`TMDB error ${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export async function getTrending(mediaType: "all" | "movie" | "tv" = "all", timeWindow: "day" | "week" = "day"): Promise<TMDBItem[]> {
  const data = await fetchFromTMDB<{ results: TMDBItem[] }>(`/trending/${mediaType}/${timeWindow}`);
  return data.results.filter(item => item.media_type !== "person" && item.backdrop_path);
}

export async function getPopularMovies(page = 1): Promise<TMDBItem[]> {
  const data = await fetchFromTMDB<{ results: TMDBItem[] }>("/movie/popular", { page });
  return data.results.map(item => ({ ...item, media_type: "movie" as const }));
}

export async function getPopularTv(page = 1): Promise<TMDBItem[]> {
  const data = await fetchFromTMDB<{ results: TMDBItem[] }>("/tv/popular", { page });
  return data.results.map(item => ({ ...item, media_type: "tv" as const }));
}

export async function getTopRated(mediaType: "movie" | "tv" = "movie", page = 1): Promise<TMDBItem[]> {
  const data = await fetchFromTMDB<{ results: TMDBItem[] }>(`/${mediaType}/top_rated`, { page });
  return data.results.map(item => ({ ...item, media_type: mediaType }));
}

export async function searchMulti(query: string, page = 1): Promise<TMDBItem[]> {
  if (!query.trim()) return [];
  const data = await fetchFromTMDB<{ results: TMDBItem[] }>("/search/multi", {
    query: query.trim(),
    page,
    include_adult: "false"
  });
  return data.results.filter(item => item.media_type !== "person" && (item.poster_path || item.backdrop_path));
}

export async function getDetails(id: number | string, type: "movie" | "tv" = "movie"): Promise<TMDBItem> {
  return fetchFromTMDB<TMDBItem>(`/${type}/${id}`, {
    append_to_response: "credits,videos,recommendations"
  });
}

export async function getTvSeason(tvId: number | string, seasonNumber: number): Promise<TMDBSeasonDetails> {
  return fetchFromTMDB<TMDBSeasonDetails>(`/tv/${tvId}/season/${seasonNumber}`);
}

export function getStreamSources(id: number | string, type: "movie" | "tv" = "movie", season = 1, episode = 1) {
  if (type === "tv") {
    return [
      { name: "Server 1 (AutoEmbed)", url: `https://player.autoembed.cc/embed/tv/${id}/${season}/${episode}` },
      { name: "Server 2 (VidLink)", url: `https://vidlink.pro/tv/${id}/${season}/${episode}` },
      { name: "Server 3 (Smashy)", url: `https://player.smashy.stream/tv/${id}?s=${season}&e=${episode}` },
      { name: "Server 4 (VidSrc)", url: `https://vidsrc.to/embed/tv/${id}/${season}/${episode}` }
    ];
  }

  return [
    { name: "Server 1 (AutoEmbed)", url: `https://player.autoembed.cc/embed/movie/${id}` },
    { name: "Server 2 (VidLink)", url: `https://vidlink.pro/movie/${id}` },
    { name: "Server 3 (Smashy)", url: `https://player.smashy.stream/movie/${id}` },
    { name: "Server 4 (VidSrc)", url: `https://vidsrc.to/embed/movie/${id}` }
  ];
}
