import Swiper from "swiper";
import { Autoplay, Pagination } from "swiper/modules";
import {
  getTrending,
  getPopularMovies,
  getPopularTv,
  getTopRated,
  searchMulti,
  getDetails,
  getImageUrl,
  getBackdropUrl,
  getDisplayTitle,
  getReleaseYear,
  getStreamSources,
} from "./api";
import type { TMDBItem } from "./api";

let heroSwiperInstance: Swiper | null = null;
let categorySwiperInstances: Swiper[] = [];

document.addEventListener("DOMContentLoaded", () => {
  // Theme toggle click
  const themeBtn = document.querySelector("#theme-switcher");
  themeBtn?.addEventListener("click", () => changeTheme());

  // Mobile menu toggle click
  const menuBtns = document.querySelectorAll(
    "#show-mobile-header-menu, #close-mobile-header-menu"
  );
  menuBtns.forEach((menuBtn) =>
    menuBtn?.addEventListener("click", () => toggleMobileMenu())
  );

  // Initial Swipers (fallback)
  initSwipers();

  // Change header background on initial page load & scroll
  handleHeaderBackgroundChange();
  window.addEventListener("scroll", handleHeaderBackgroundChange);

  // Load images
  loadImages();
  loadBackgroundImages();

  // Share buttons
  setupShareButtons();

  // Global search form listeners
  setupSearchForms();

  // Initialize Page-specific dynamic logic
  initPageRouter();
});

function initSwipers() {
  categorySwiperInstances.forEach((s) => s.destroy(true, true));
  categorySwiperInstances = [];

  document.querySelectorAll<HTMLElement>(".swiper:not(.hero-swiper)").forEach((el) => {
    const s = new Swiper(el, {
      slidesPerView: "auto",
      spaceBetween: 15,
    });
    categorySwiperInstances.push(s);
  });

  const heroEl = document.querySelector<HTMLElement>(".hero-swiper");
  if (heroEl) {
    if (heroSwiperInstance) heroSwiperInstance.destroy(true, true);
    heroSwiperInstance = new Swiper(heroEl, {
      loop: true,
      slidesPerView: 1,
      autoplay: { delay: 7000, disableOnInteraction: false },
      modules: [Autoplay, Pagination],
      pagination: {
        el: ".swiper-pagination",
        clickable: true,
      },
    });
  }
}

function setupShareButtons() {
  const shareBtns = document.querySelectorAll(".share-btn");
  shareBtns.forEach((shareBtn) =>
    shareBtn?.addEventListener("click", (event) => shareContent(event))
  );
}

function setupSearchForms() {
  const forms = document.querySelectorAll<HTMLFormElement>("form");
  forms.forEach((form) => {
    const searchInput = form.querySelector<HTMLInputElement>(
      'input[name="q"], input[name="search"]'
    );
    if (searchInput) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const val = searchInput.value.trim();
        if (val) {
          window.location.href = `browse.html?search=${encodeURIComponent(val)}`;
        }
      });
    }
  });
}

function initPageRouter() {
  const path = window.location.pathname.toLowerCase();

  if (
    path.endsWith("single.html") ||
    path.endsWith("/single") ||
    document.querySelector("#detail-title") ||
    new URLSearchParams(window.location.search).has("id") && path.includes("single")
  ) {
    loadSinglePage();
  } else if (
    path.endsWith("watch.html") ||
    path.endsWith("/watch") ||
    document.querySelector("#player-container")
  ) {
    loadWatchPage();
  } else if (
    path.endsWith("browse.html") ||
    path.endsWith("/browse") ||
    document.querySelector(".movies-grid")
  ) {
    loadBrowsePage();
  } else {
    // Default to Home page logic
    loadHomePage();
  }
}

// ---------------- HOME PAGE LOGIC ----------------
async function loadHomePage() {
  const heroWrapper = document.querySelector("#hero-swiper-wrapper");
  const latestWrapper = document.querySelector("#latest-releases-wrapper");
  const mostWatchedWrapper = document.querySelector("#most-watched-wrapper");
  const topRatedWrapper = document.querySelector("#top-rated-wrapper");

  if (!heroWrapper && !latestWrapper && !mostWatchedWrapper && !topRatedWrapper) {
    return;
  }

  try {
    // 1. Trending for Hero & Latest Releases
    const trending = await getTrending("all", "day");

    if (heroWrapper && trending.length > 0) {
      heroWrapper.innerHTML = trending
        .slice(0, 5)
        .map((item) => createHeroSlideHTML(item))
        .join("");
    }

    if (latestWrapper && trending.length > 0) {
      latestWrapper.innerHTML = trending
        .slice(5, 17)
        .map((item) => createCardSlideHTML(item))
        .join("");
    }

    // 2. Popular Movies for Most Watched
    if (mostWatchedWrapper) {
      const popularMovies = await getPopularMovies(1);
      mostWatchedWrapper.innerHTML = popularMovies
        .slice(0, 12)
        .map((item) => createCardSlideHTML(item))
        .join("");
    }

    // 3. Top Rated Movies & Series
    if (topRatedWrapper) {
      const topRated = await getTopRated("movie", 1);
      topRatedWrapper.innerHTML = topRated
        .slice(0, 12)
        .map((item) => createCardSlideHTML(item))
        .join("");
    }

    // Re-initialize Swipers and background images
    initSwipers();
    loadImages();
    loadBackgroundImages();
    setupShareButtons();
  } catch (err) {
    console.warn("Using fallback static items due to TMDB load notice:", err);
  }
}

function createHeroSlideHTML(item: TMDBItem): string {
  const title = getDisplayTitle(item);
  const year = getReleaseYear(item);
  const fullTitle = year ? `${title} (${year})` : title;
  const overview = item.overview || "Stream now in HD on PopStream.";
  const backdrop = getBackdropUrl(item.backdrop_path, "w1280");
  const poster = getImageUrl(item.poster_path, "w500");
  const type = item.media_type || "movie";

  return `
    <div
      class="swiper-slide lazy-bg !size-full bg-cover bg-[position:center_center] will-change-transform motion-reduce:transform-none"
      data-bg="${backdrop}"
      data-gradient="linear-gradient(to top, rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.4))"
    >
      <div
        class="mx-auto flex h-full max-w-[1140px] flex-row items-center px-4 sm:gap-20 sm:px-6 md:px-8 lg:gap-32 xl:px-0"
      >
        <div
          class="xs:gap-3 dark:text-foreground text-foreground-inverse flex max-w-[90vw] flex-col gap-[10px] sm:mb-8 sm:max-w-[80vw] sm:gap-5 md:max-w-[480px]"
        >
          <h2
            class="xs:text-3xl xs:leading-normal !w-full text-[28.75px] leading-snug font-extrabold sm:text-4xl sm:leading-[1.2] rtl:self-end rtl:text-right"
          >
            ${fullTitle}
          </h2>
          <p
            class="xs:text-[15.75px] text-[14.25px] leading-relaxed sm:text-base rtl:text-right line-clamp-3"
          >
            ${overview}
          </p>
          <div class="xs:mt-5 mt-[18px] flex flex-row items-center gap-4 sm:mt-6">
            <a
              href="single.html?id=${item.id}&type=${type}#trailer"
              class="xs:text-[14.75px] xs:py-2 xs:px-5 text-shadow watch-trailer rounded-full px-[18px] py-[6px] text-[13.75px] font-medium transition-all duration-300 hover:-translate-y-[2px] active:translate-y-[1px] sm:px-6 sm:text-base"
            >
              Watch trailer
            </a>
            <a
              href="watch.html?id=${item.id}&type=${type}"
              class="xs:text-[14.75px] xs:py-2 xs:px-5 shadow-glow bg-primary rounded-full px-[18px] py-[6px] text-[13.75px] font-medium !text-white transition-all duration-300 hover:-translate-y-[2px] active:translate-y-[1px] sm:px-6 sm:text-base"
            >
              Watch now
            </a>
          </div>
        </div>
        <div class="mr-auto hidden md:block rtl:mr-0 rtl:ml-auto">
          <div
            class="h-[380px] w-[254px] transition-all duration-300 ease-in-out hover:scale-105"
          >
            <a href="single.html?id=${item.id}&type=${type}">
              <img
                loading="lazy"
                src="${poster}"
                alt="${title}"
                height="380"
                width="254"
                class="lazy-fade rounded-xl object-cover shadow-lg transition-all duration-300 ease-in"
              />
            </a>
          </div>
        </div>
      </div>
    </div>
  `;
}

function createCardSlideHTML(item: TMDBItem): string {
  const title = getDisplayTitle(item);
  const year = getReleaseYear(item);
  const fullTitle = year ? `${title} (${year})` : title;
  const poster = getImageUrl(item.poster_path, "w500");
  const type = item.media_type || (item.first_air_date ? "tv" : "movie");

  return `
    <div
      class="swiper-slide xs:gap-[14px] mt-1 !flex max-w-[170px] flex-col gap-2 rounded-lg"
    >
      <a
        class="group bg-foreground-muted relative h-[250px] w-[170px] overflow-hidden rounded-lg select-none"
        href="single.html?id=${item.id}&type=${type}"
      >
        <img
          loading="lazy"
          src="${poster}"
          alt="${title}"
          height="250"
          width="170"
          class="lazy-fade scale-100 rounded-lg object-cover shadow-md drop-shadow-md transition-all duration-300 ease-in-out group-hover:shadow-none group-hover:drop-shadow-none"
        />
        <div
          class="absolute top-0 left-0 flex h-full w-[170px] items-center justify-center rounded-lg bg-[rgba(0,0,0,0.6)] opacity-0 transition-all duration-300 group-hover:opacity-100"
        >
          <div
            class="xs:text-[48px] text-primary scale-[0.4] text-[42px] transition-all duration-300 group-hover:scale-100"
          >
            <svg
              stroke="currentColor"
              fill="currentColor"
              stroke-width="0"
              height="1em"
              width="1em"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
            >
              <path
                d="M10 15.5v-7c0-.41.47-.65.8-.4l4.67 3.5c.27.2.27.6 0 .8l-4.67 3.5c-.33.25-.8.01-.8-.4Zm11.96-4.45c.58 6.26-4.64 11.48-10.9 10.9 -4.43-.41-8.12-3.85-8.9-8.23 -.26-1.42-.19-2.78.12-4.04 .14-.58.76-.9 1.31-.7v0c.47.17.75.67.63 1.16 -.2.82-.27 1.7-.19 2.61 .37 4.04 3.89 7.25 7.95 7.26 4.79.01 8.61-4.21 7.94-9.12 -.51-3.7-3.66-6.62-7.39-6.86 -.83-.06-1.63.02-2.38.2 -.49.11-.99-.16-1.16-.64v0c-.2-.56.12-1.17.69-1.31 1.79-.43 3.75-.41 5.78.37 3.56 1.35 6.15 4.62 6.5 8.4ZM5.5 4C4.67 4 4 4.67 4 5.5 4 6.33 4.67 7 5.5 7 6.33 7 7 6.33 7 5.5 7 4.67 6.33 4 5.5 4Z"
              ></path>
            </svg>
          </div>
        </div>
      </a>
      <h4
        class="xs:text-[14.75px] dark:text-foreground cursor-default text-center text-[14px] font-medium capitalize sm:text-base line-clamp-1"
        title="${title}"
      >
        ${fullTitle}
      </h4>
    </div>
  `;
}

// ---------------- BROWSE PAGE LOGIC ----------------
async function loadBrowsePage() {
  const grid = document.querySelector<HTMLElement>(".movies-grid");
  if (!grid) return;

  const urlParams = new URLSearchParams(window.location.search);
  const query = urlParams.get("search");
  const type = (urlParams.get("type") as "movie" | "tv") || "movie";

  const heading = document.querySelector<HTMLElement>("main h2");

  try {
    let items: TMDBItem[] = [];

    if (query) {
      if (heading) heading.textContent = `Search: "${query}"`;
      items = await searchMulti(query);
      if (items.length === 0) {
        grid.innerHTML = `
          <div class="col-span-full py-16 text-center text-lg text-foreground-muted">
            No results found for "${query}". Try another search term!
          </div>
        `;
        return;
      }
    } else {
      if (type === "tv") {
        if (heading) heading.textContent = "Browse TV Shows";
        items = await getPopularTv(1);
      } else {
        if (heading) heading.textContent = "Browse Movies";
        items = await getPopularMovies(1);
      }
    }

    grid.innerHTML = items
      .map((item) => {
        const title = getDisplayTitle(item);
        const year = getReleaseYear(item);
        const fullTitle = year ? `${title} (${year})` : title;
        const poster = getImageUrl(item.poster_path, "w500");
        const mediaType = item.media_type || type;

        return `
          <div
            class="xs:gap-4 xs:max-w-[170px] mb-[10px] flex w-full max-w-[150px] flex-col items-center gap-2 rounded-lg sm:mb-4 md:mb-5 lg:mb-6"
          >
            <a
              class="group bg-foreground-muted xs:w-[170px] xs:h-[250px] relative h-[220px] w-[150px] overflow-hidden rounded-lg select-none"
              href="single.html?id=${item.id}&type=${mediaType}"
            >
              <img
                loading="lazy"
                src="${poster}"
                alt="${title}"
                height="250"
                width="170"
                class="lazy-fade scale-100 rounded-lg object-cover shadow-md drop-shadow-md transition-all duration-300 ease-in-out group-hover:shadow-none group-hover:drop-shadow-none"
              />
              <div
                class="absolute top-0 left-0 flex h-full w-[170px] items-center justify-center rounded-lg bg-[rgba(0,0,0,0.6)] opacity-0 transition-all duration-300 group-hover:opacity-100"
              >
                <div
                  class="xs:text-[48px] text-primary scale-[0.4] text-[42px] transition-all duration-300 group-hover:scale-100"
                >
                  <svg
                    stroke="currentColor"
                    fill="currentColor"
                    stroke-width="0"
                    height="1em"
                    width="1em"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M10 15.5v-7c0-.41.47-.65.8-.4l4.67 3.5c.27.2.27.6 0 .8l-4.67 3.5c-.33.25-.8.01-.8-.4Zm11.96-4.45c.58 6.26-4.64 11.48-10.9 10.9 -4.43-.41-8.12-3.85-8.9-8.23 -.26-1.42-.19-2.78.12-4.04 .14-.58.76-.9 1.31-.7v0c.47.17.75.67.63 1.16 -.2.82-.27 1.7-.19 2.61 .37 4.04 3.89 7.25 7.95 7.26 4.79.01 8.61-4.21 7.94-9.12 -.51-3.7-3.66-6.62-7.39-6.86 -.83-.06-1.63.02-2.38.2 -.49.11-.99-.16-1.16-.64v0c-.2-.56.12-1.17.69-1.31 1.79-.43 3.75-.41 5.78.37 3.56 1.35 6.15 4.62 6.5 8.4ZM5.5 4C4.67 4 4 4.67 4 5.5 4 6.33 4.67 7 5.5 7 6.33 7 7 6.33 7 5.5 7 4.67 6.33 4 5.5 4Z"
                    ></path>
                  </svg>
                </div>
              </div>
            </a>
            <h4
              class="xs:text-[14.75px] dark:text-foreground cursor-default text-center text-[14px] font-medium capitalize sm:text-base line-clamp-1"
              title="${title}"
            >
              ${fullTitle}
            </h4>
          </div>
        `;
      })
      .join("");

    loadImages();
  } catch (err) {
    console.error("Error loading browse page:", err);
  }
}

// ---------------- SINGLE MOVIE DETAILS LOGIC ----------------
async function loadSinglePage() {
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get("id");
  const type = (urlParams.get("type") as "movie" | "tv") || "movie";

  if (!id) return; // Keep template static placeholder if no query ID

  try {
    const item = await getDetails(id, type);
    const title = getDisplayTitle(item);
    const year = getReleaseYear(item);
    const fullTitle = year ? `${title} (${year})` : title;

    document.title = `${fullTitle} - PopStream`;

    // Title
    const titleEl = document.querySelector("#detail-title");
    if (titleEl) {
      titleEl.textContent = fullTitle;
    } else {
      const h1Span = document.querySelector("main section h1 span");
      if (h1Span) h1Span.textContent = fullTitle;
    }

    // Hero background
    const heroSection = document.querySelector<HTMLElement>("main > section:first-child");
    if (heroSection && item.backdrop_path) {
      const bgUrl = getBackdropUrl(item.backdrop_path, "w1280");
      heroSection.style.backgroundImage = `linear-gradient(to top, rgb(0, 0, 0), rgba(0, 0, 0, 0.98), rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.4)), url("${bgUrl}")`;
    }

    // Poster
    const posterImg = document.querySelector<HTMLImageElement>("main section img.lazy-fade");
    if (posterImg && item.poster_path) {
      posterImg.src = getImageUrl(item.poster_path, "w500");
      posterImg.alt = title;
    }

    // Genres
    if (item.genres && item.genres.length > 0) {
      const genreContainer = document.querySelector(".genre")?.parentElement;
      if (genreContainer) {
        genreContainer.innerHTML = item.genres
          .map(
            (g) => `
            <span class="genre xs:text-[11.75px] cursor-pointer rounded-full px-[10px] py-[2.75px] text-[10.75px] hover:underline sm:px-3 sm:py-1 sm:text-[12px] md:text-[12.75px]">
              ${g.name}
            </span>
          `
          )
          .join("");
      }
    }

    // Overview
    const descP = document.querySelector(".movie-description p");
    if (descP && item.overview) {
      descP.textContent = item.overview;
    }

    // Watch Now link
    const watchNowBtn = document.querySelector<HTMLAnchorElement>('a[name="watch-now"]');
    if (watchNowBtn) {
      watchNowBtn.href = `watch.html?id=${id}&type=${type}`;
    }

    // Trailer
    const videos = item.videos?.results || [];
    const trailer =
      videos.find((v) => v.site === "YouTube" && v.type === "Trailer") ||
      videos.find((v) => v.site === "YouTube");

    const trailerIframe = document.querySelector<HTMLIFrameElement>("#trailer iframe");
    if (trailerIframe && trailer) {
      trailerIframe.src = `https://www.youtube.com/embed/${trailer.key}?autoplay=0`;
    }

    loadImages();
  } catch (err) {
    console.error("Error loading single page data:", err);
  }
}

// ---------------- WATCH STREAMING PLAYER LOGIC ----------------
async function loadWatchPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get("id") || "550"; // default Fight Club or first movie if none
  const type = (urlParams.get("type") as "movie" | "tv") || "movie";
  const season = parseInt(urlParams.get("s") || "1", 10);
  const episode = parseInt(urlParams.get("e") || "1", 10);

  const sources = getStreamSources(id, type, season, episode);

  // Player container
  const playerContainer =
    document.querySelector<HTMLElement>("#player-container") ||
    document.querySelector<HTMLElement>("main section .aspect-video");

  const titleHeading = document.querySelector<HTMLElement>("main section h1");

  try {
    const item = await getDetails(id, type);
    const title = getDisplayTitle(item);
    if (titleHeading) {
      titleHeading.textContent = `Watch ${title} ${type === "tv" ? `Season ${season} Ep ${episode}` : ""}`;
    }
    document.title = `Watch ${title} - PopStream`;
  } catch (err) {
    console.warn("Watch page details notice:", err);
  }

  // Render iframe player
  function setPlayerServer(serverIndex: number) {
    if (!playerContainer) return;
    const selected = sources[serverIndex] || sources[0];

    playerContainer.innerHTML = `
      <iframe
        src="${selected.url}"
        class="w-full h-full rounded-lg"
        frameborder="0"
        allowfullscreen
        allow="autoplay; encrypted-media; picture-in-picture"
      ></iframe>
    `;

    // Highlight active player button
    document.querySelectorAll(".players a").forEach((btn, idx) => {
      if (idx === serverIndex) {
        btn.classList.add("border-primary", "bg-primary", "text-white");
      } else {
        btn.classList.remove("border-primary", "bg-primary", "text-white");
      }
    });
  }

  // Build player buttons
  const playersContainer = document.querySelector<HTMLElement>(".players");
  if (playersContainer) {
    playersContainer.innerHTML = sources
      .map(
        (src, idx) => `
        <a
          href="javascript:void(0)"
          data-server="${idx}"
          class="hover:border-primary hover:bg-primary flex cursor-pointer items-center justify-center gap-1 rounded-full border px-[10px] py-[2.75px] hover:text-white sm:px-3 sm:py-1 ${idx === 0 ? "border-primary bg-primary text-white" : ""}"
        >
          <svg class="size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="6 3 20 12 6 21 6 3"></polygon>
          </svg>
          ${src.name}
        </a>
      `
      )
      .join("");

    playersContainer.querySelectorAll("a").forEach((btn, idx) => {
      btn.addEventListener("click", () => setPlayerServer(idx));
    });
  }

  // Load first server initially
  setPlayerServer(0);
}

// ---------------- SHARED UTILITIES ----------------
function changeTheme(theme: string | null = null) {
  const root = window.document.documentElement;
  if (theme) {
    root.classList.add(theme);
    return;
  }

  const isDark = root.classList.contains("dark");
  root.classList.remove("light", "dark");
  if (isDark) {
    root.classList.add("light");
    localStorage.setItem("APP_THEME", "light");
  } else {
    root.classList.add("dark");
    localStorage.setItem("APP_THEME", "dark");
  }
}

function toggleMobileMenu() {
  const menu = document.querySelector(".mobile-menu");
  const isHidden = menu?.classList.contains("hidden");
  const body = document.body;
  if (isHidden) {
    menu?.classList.remove("hidden");
    body?.classList.add("no-scroll");
  } else {
    menu?.classList.add("hidden");
    body?.classList.remove("no-scroll");
  }
}

function handleHeaderBackgroundChange() {
  const body = document.body;
  const header = document.querySelector("header");

  if (window.scrollY > 0 || parseFloat(body.style.top) * -1 > 0) {
    header?.classList.add("header-bg");
    header?.classList.remove("header-bg-transparent");
  } else {
    header?.classList.add("header-bg-transparent");
    header?.classList.remove("header-bg");
  }
}

function loadImages() {
  const imgs: NodeListOf<HTMLImageElement> = document.querySelectorAll("img.lazy-fade");

  imgs.forEach((img) => {
    if (img.complete) {
      img.classList.add("is-loaded");
    } else {
      img.addEventListener("load", () => img.classList.add("is-loaded"));
      img.addEventListener("error", () => img.classList.add("is-loaded"));
    }
  });
}

function loadBackgroundImages() {
  const blocks: NodeListOf<HTMLElement> = document.querySelectorAll(".lazy-bg[data-bg]");

  blocks.forEach((block) => {
    const url = block.dataset.bg;
    const gradient = block.dataset.gradient;

    if (!url) return;
    const img = new Image();
    img.onload = () => {
      block.style.backgroundImage = gradient
        ? `${gradient}, url("${url}")`
        : `url("${url}")`;
    };
    img.src = url;
  });
}

async function shareContent(event: Event) {
  event.preventDefault();
  const title = document.title;
  const url = window.location.href;

  if (navigator.share) {
    try {
      await navigator.share({ title, url });
    } catch (err: any) {
      if (err.name !== "AbortError") {
        await copyToClipboard(url);
        alert("Link copied to clipboard!");
      }
    }
  } else {
    await copyToClipboard(url);
    alert("Link copied to clipboard!");
  }
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (err) {
    console.error("Failed to copy:", err);
  }
}
