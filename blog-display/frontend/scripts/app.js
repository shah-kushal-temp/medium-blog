const LIVE_RENDER_BACKEND = 'https://medium-blog-jygn.onrender.com';
const LIVE_RENDER_API = `${LIVE_RENDER_BACKEND}/api`;

const API_BASE = (() => {
  if (window.__API_BASE__) return window.__API_BASE__;
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  const stored = localStorage.getItem('kushal_blog_api_url');
  if (stored) return stored;
  return ['localhost', '127.0.0.1'].includes(window.location.hostname) ? 'http://localhost:3001/api' : LIVE_RENDER_API;
})();

function getBackendBase() {
  if (window.__BACKEND_URL__) return window.__BACKEND_URL__;
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_BACKEND_URL) return import.meta.env.VITE_BACKEND_URL;
  const stored = localStorage.getItem('kushal_blog_api_url');
  if (stored) return stored.replace(/\/api\/?$/, '');
  return ['localhost', '127.0.0.1'].includes(window.location.hostname) ? 'http://localhost:3001' : LIVE_RENDER_BACKEND;
}

// ============ Router ============
class Router {
  constructor() {
    this.routes = {};
    this.currentRoute = null;
    window.addEventListener('popstate', () => this.resolve());
    window.addEventListener('hashchange', () => this.resolve());
  }

  on(path, handler) {
    this.routes[path] = handler;
  }

  resolve() {
    const rawHash = window.location.hash.slice(1) || '/';
    const cleanHash = rawHash.split('?')[0].split('#')[0];
    const parts = cleanHash.split('/').filter(Boolean);

    if (parts[0] === 'post' && parts[1]) {
      const rawPostSlug = decodeURIComponent(parts.slice(1).join('/'));
      this.routes['/post'](rawPostSlug);
      this.currentRoute = '/post';
    } else if (parts[0] === 'stories' || parts[0] === 'all') {
      const page = parseInt(parts[1], 10) || 1;
      this.routes['/stories'](page);
      this.currentRoute = '/stories';
    } else if (parts[0] === 'projects') {
      this.routes['/projects']();
      this.currentRoute = '/projects';
    } else if (parts[0] === 'tag' && parts[1]) {
      const tag = decodeURIComponent(parts[1]);
      const page = parseInt(parts[2], 10) || 1;
      this.routes['/tag'](tag, page);
      this.currentRoute = '/tag';
    } else if (parts[0] === 'about' || parts[0] === 'profile') {
      this.routes['/about']();
      this.currentRoute = '/about';
    } else {
      this.routes['/'](null);
      this.currentRoute = '/';
    }
  }

  navigate(path) {
    window.location.hash = path;
  }
}

// ============ API ============
async function fetchWithFallback(path) {
  let url = `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
  try {
    const res = await fetch(url);
    if (res.ok) return await res.json();
    throw new Error(`HTTP ${res.status}`);
  } catch (err) {
    const fallbackBase = API_BASE.includes('localhost') ? LIVE_RENDER_API : 'http://localhost:3001/api';
    try {
      const fbRes = await fetch(`${fallbackBase}${path.startsWith('/') ? '' : '/'}${path}`);
      if (fbRes.ok) return await fbRes.json();
    } catch {
      // ignore
    }
    throw err;
  }
}

async function fetchPosts() {
  try {
    const data = await fetchWithFallback('/posts');
    return Array.isArray(data.posts) ? data.posts : (Array.isArray(data) ? data : []);
  } catch (e) {
    console.warn('fetchPosts fallback notice:', e);
    return [];
  }
}

async function fetchCurated() {
  try {
    const data = await fetchWithFallback('/curated');
    return data;
  } catch {
    const all = await fetchPosts();
    return { hero: all[0] || null, pinned: [], recent: all.slice(1, 10), all };
  }
}

async function fetchPaginatedPosts(page = 1, limit = 9, tag = null) {
  let endpoint = `/posts?page=${page}&limit=${limit}`;
  if (tag) endpoint += `&tag=${encodeURIComponent(tag)}`;
  return await fetchWithFallback(endpoint);
}

async function fetchPost(slug) {
  const cleanSlug = encodeURIComponent(slug);
  try {
    const data = await fetchWithFallback(`/posts/${cleanSlug}`);
    return data.post;
  } catch (e) {
    if (cleanSlug !== slug) {
      const data = await fetchWithFallback(`/posts/${slug}`);
      return data.post;
    }
    throw e;
  }
}

async function searchPosts(query) {
  try {
    const data = await fetchWithFallback(`/search?q=${encodeURIComponent(query)}`);
    return data.posts || [];
  } catch {
    return [];
  }
}

async function fetchTags() {
  try {
    const data = await fetchWithFallback('/tags');
    return data.tags || [];
  } catch {
    return [];
  }
}

async function fetchProfile() {
  try {
    const res = await fetch(`${API_BASE}/profile`);
    if (!res.ok) throw new Error('Failed to fetch profile');
    const data = await res.json();
    return data.profile;
  } catch {
    return {
      name: "Kushal Shah",
      tagline: "Software Engineer, Writer & Open Source Enthusiast",
      bio: "Writing about modern web technologies, distributed systems, clean code, and engineering architecture.",
      about: "Hi! I am Kushal Shah, a software engineer passionate about building high-performance systems and writing clean code.",
      avatar: "",
      links: [
        { label: "GitHub", url: "https://github.com" },
        { label: "Twitter / X", url: "https://twitter.com" },
        { label: "LinkedIn", url: "https://linkedin.com" }
      ]
    };
  }
}

async function fetchHomepage() {
  try {
    const res = await fetch(`${API_BASE}/homepage`);
    if (!res.ok) throw new Error('Failed to fetch homepage');
    const data = await res.json();
    return data.homepage || {};
  } catch {
    return {
      heroLabel: "Stories & Ideas",
      heroTitle: "Welcome to Stories",
      heroSubtitle: "Thoughts on technology, development, and life — curated articles and deep engineering breakdowns.",
      ctaText: "Browse All Stories",
      ctaLink: "#/stories/1",
      secondaryCtaText: "Explore Projects",
      secondaryCtaLink: "#/projects",
      storiesTitle: "Curated & Recent Stories",
      projectsTitle: "Featured Projects & Open Source",
      projectsSubtitle: "Real-world tools, systems, and open source repositories I've built.",
      showHero: true,
      showProjects: true,
      showTags: true,
      showTrending: true
    };
  }
}

async function fetchProjects() {
  try {
    const res = await fetch(`${API_BASE}/projects`);
    if (!res.ok) throw new Error('Failed to fetch projects');
    const data = await res.json();
    return {
      githubUsername: data.githubUsername || '',
      showGithubLink: data.showGithubLink !== false,
      projects: Array.isArray(data.projects) ? data.projects : []
    };
  } catch {
    return { githubUsername: '', showGithubLink: true, projects: [] };
  }
}

// ============ Theme & View State ============
let currentDisplayView = localStorage.getItem('kushal_blog_display_view') || 'list';

function initTheme() {
  const savedTheme = localStorage.getItem('kushal_blog_theme') || 'light';
  setTheme(savedTheme);

  const toggleBtn = document.getElementById('btn-theme-toggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
      setTheme(current === 'dark' ? 'light' : 'dark');
    });
  }
}

function setTheme(theme) {
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  localStorage.setItem('kushal_blog_theme', theme);
  applyMatchCoverBackground(currentActivePost);
}

// ============ Match Cover Image Background Engine (Post-specific Only) ============
let currentActivePost = null;
const _coverColorCache = new Map();

function getDisabledBlogSlugs() {
  try {
    return JSON.parse(localStorage.getItem('match_cover_bg_disabled_blogs') || '[]');
  } catch {
    return [];
  }
}

function setBlogMatchCoverBgDisabled(slug, disabled) {
  if (!slug) return;
  let slugs = getDisabledBlogSlugs();
  if (disabled) {
    if (!slugs.includes(slug)) slugs.push(slug);
  } else {
    slugs = slugs.filter(s => s !== slug);
  }
  localStorage.setItem('match_cover_bg_disabled_blogs', JSON.stringify(slugs));
}

function getFallbackColor(seed = '') {
  const PALETTES = [
    { r: 45, g: 90, b: 180 },   // Royal Blue
    { r: 26, g: 137, b: 80 },   // Emerald Green
    { r: 180, g: 70, b: 60 },   // Crimson Rose
    { r: 130, g: 60, b: 180 },  // Violet
    { r: 200, g: 110, b: 30 },  // Amber Warm
    { r: 30, g: 140, b: 160 },  // Cyan Teal
    { r: 160, g: 50, b: 120 },  // Magenta
    { r: 70, g: 110, b: 140 }   // Slate Blue
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) & 0xffffffff;
  return PALETTES[Math.abs(hash) % PALETTES.length];
}

async function extractCoverColor(imageUrl, storedColor = '') {
  if (storedColor && storedColor.startsWith('#')) {
    const hex = storedColor.slice(1);
    const r = parseInt(hex.substring(0, 2), 16) || 40;
    const g = parseInt(hex.substring(2, 4), 16) || 120;
    const b = parseInt(hex.substring(4, 6), 16) || 80;
    return { r, g, b };
  }

  if (!imageUrl) return null;
  if (_coverColorCache.has(imageUrl)) return _coverColorCache.get(imageUrl);

  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 16;
          canvas.height = 16;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, 16, 16);
          const data = ctx.getImageData(0, 0, 16, 16).data;
          let r = 0, g = 0, b = 0, count = 0;
          for (let i = 0; i < data.length; i += 16) {
            const pr = data[i], pg = data[i + 1], pb = data[i + 2];
            const lum = 0.299 * pr + 0.587 * pg + 0.114 * pb;
            if (lum > 25 && lum < 235) {
              r += pr; g += pg; b += pb;
              count++;
            }
          }
          if (count === 0) count = 1;
          const res = { r: Math.round(r / count), g: Math.round(g / count), b: Math.round(b / count) };
          _coverColorCache.set(imageUrl, res);
          resolve(res);
        } catch {
          const fallback = getFallbackColor(imageUrl);
          _coverColorCache.set(imageUrl, fallback);
          resolve(fallback);
        }
      };
      img.onerror = () => {
        const fallback = getFallbackColor(imageUrl);
        _coverColorCache.set(imageUrl, fallback);
        resolve(fallback);
      };
      img.src = imageUrl;
    } catch {
      resolve(getFallbackColor(imageUrl));
    }
  });
}

async function applyMatchCoverBackground(post = currentActivePost) {
  // Match cover background ONLY applies when viewing a single post reading page
  if (post && post.title) {
    currentActivePost = post;
    const slug = post.slug || post.id;
    const authorEnabled = post.matchCoverBackground !== false;
    const disabledSlugs = getDisabledBlogSlugs();
    const isBlogDisabledByUser = disabledSlugs.includes(slug);
    const canApply = authorEnabled && !isBlogDisabledByUser && post.coverImage;

    const pill = document.getElementById('post-match-bg-pill');
    const pillState = document.getElementById('post-match-bg-state');

    if (pill) {
      if (!authorEnabled) {
        pill.title = 'Match cover image background was disabled for this story by the author.';
        pill.style.opacity = '0.6';
        if (pillState) pillState.textContent = 'Disabled by Author';
        pill.classList.remove('active');
      } else if (isBlogDisabledByUser) {
        pill.title = 'Match cover image background is turned OFF for this story. Click to turn ON.';
        pill.style.opacity = '0.75';
        if (pillState) pillState.textContent = 'OFF';
        pill.classList.remove('active');
      } else {
        pill.title = 'Match cover image background: ON for this story. Click to turn OFF.';
        pill.style.opacity = '1';
        if (pillState) pillState.textContent = 'ON';
        pill.classList.add('active');
      }
    }

    if (canApply) {
      const coverUrl = getImageUrl(post.coverImage);
      const rgb = await extractCoverColor(coverUrl, post.coverColor || '');
      if (rgb) {
        const { r, g, b } = rgb;
        document.documentElement.style.setProperty('--matched-cover-r', `${r}`);
        document.documentElement.style.setProperty('--matched-cover-g', `${g}`);
        document.documentElement.style.setProperty('--matched-cover-b', `${b}`);
        document.body.classList.add('has-matched-cover-bg');
        return;
      }
    }

    // Default: Clear matched background from body -> returns to pure default black or white!
    document.body.classList.remove('has-matched-cover-bg');
    return;
  }

  // Outside a single post reading page (Home, All Stories, tags, about): strictly default clean background!
  currentActivePost = null;
  document.body.classList.remove('has-matched-cover-bg');
}

function setDisplayView(view) {
  currentDisplayView = view;
  localStorage.setItem('kushal_blog_display_view', view);
  const container = document.getElementById('feed-posts');
  if (container) {
    container.className = `feed-posts view-${view}`;
  }
  const switcher = document.getElementById('display-view-switcher');
  if (switcher) {
    switcher.querySelectorAll('.feed-view-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === view);
    });
  }
}

let currentProjectDisplayView = localStorage.getItem('kushal_blog_projects_view') || 'grid';

function setProjectsDisplayView(view) {
  currentProjectDisplayView = view;
  localStorage.setItem('kushal_blog_projects_view', view);
  document.querySelectorAll('.projects-grid').forEach(el => {
    el.className = `projects-grid view-${view}`;
  });
  document.querySelectorAll('.projects-view-switcher').forEach(switcher => {
    switcher.querySelectorAll('.feed-view-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === view);
    });
  });
}

function initAuth() {
  const authBtn = document.getElementById('btn-client-auth');
  const authBtnText = document.getElementById('client-auth-btn-text');
  const loginOverlay = document.getElementById('login-modal-overlay');
  const closeBtn = document.getElementById('login-modal-close');
  const backBtn = document.getElementById('client-btn-back');
  const loginForm = document.getElementById('client-login-form');

  const updateAuthUI = () => {
    const token = localStorage.getItem('kushal_blog_token') || (localStorage.getItem('author_auth') === 'true');
    const label = token ? 'Log out' : 'Log in';
    if (authBtnText) {
      authBtnText.textContent = label;
    } else if (authBtn) {
      authBtn.textContent = label;
    }
    if (authBtn) {
      authBtn.title = token ? 'Logged in as author. Click to log out.' : 'Sign in with email';
    }
  };

  const loadNavProfile = async () => {
    try {
      const res = await fetch('/api/profile');
      if (!res.ok) return;
      const data = await res.json();
      const p = data.profile;
      if (!p) return;

      const navImg = document.getElementById('client-nav-profile-avatar-img');
      const navInitials = document.getElementById('client-nav-profile-avatar-initials');
      const dropImg = document.getElementById('client-dropdown-avatar-img');
      const dropInitials = document.getElementById('client-dropdown-avatar-initials');
      const dropName = document.getElementById('client-dropdown-name');
      const dropTagline = document.getElementById('client-dropdown-tagline');

      if (dropName && p.name) dropName.textContent = p.name;
      if (dropTagline && (p.tagline || p.bio)) dropTagline.textContent = p.tagline || p.bio;

      const initials = (p.name || 'KS').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'KS';
      if (navInitials) navInitials.textContent = initials;
      if (dropInitials) dropInitials.textContent = initials;

      if (p.avatar) {
        const src = getImageUrl(p.avatar);
        if (navImg) {
          navImg.src = src;
          navImg.style.display = 'block';
          if (navInitials) navInitials.style.display = 'none';
        }
        if (dropImg) {
          dropImg.src = src;
          dropImg.style.display = 'block';
          if (dropInitials) dropInitials.style.display = 'none';
        }
      }
    } catch {}
  };

  const openModal = () => {
    if (loginOverlay) loginOverlay.style.display = 'flex';
  };

  const closeModal = () => {
    if (loginOverlay) loginOverlay.style.display = 'none';
  };

  if (authBtn) {
    authBtn.addEventListener('click', () => {
      const token = localStorage.getItem('kushal_blog_token') || (localStorage.getItem('author_auth') === 'true');
      if (token) {
        localStorage.removeItem('kushal_blog_token');
        localStorage.setItem('author_auth', 'false');
        updateAuthUI();
        alert('You have been logged out.');
      } else {
        openModal();
      }
    });
  }

  if (closeBtn) closeBtn.onclick = closeModal;
  if (backBtn) backBtn.onclick = closeModal;
  if (loginOverlay) {
    loginOverlay.onclick = (e) => {
      if (e.target === loginOverlay) closeModal();
    };
  }

  if (loginForm) {
    loginForm.onsubmit = (e) => {
      e.preventDefault();
      const emailInput = document.getElementById('client-login-email');
      const email = emailInput?.value?.trim() || 'user@example.com';
      const remember = document.getElementById('client-login-remember')?.checked;
      localStorage.setItem('kushal_blog_token', 'token_' + Date.now());
      localStorage.setItem('author_auth', 'true');
      if (remember) {
        localStorage.setItem('saved_email', email);
      }
      closeModal();
      updateAuthUI();
      alert(`Welcome back! Signed in with ${email}.`);
    };
  }

  updateAuthUI();
  loadNavProfile();
}

// ============ Utilities ============
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getInitials(name) {
  if (!name || typeof name !== 'string') return 'KS';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'KS';
  return parts.slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

function showToast(message, actionText = '', actionUrl = '') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <span>${escapeHtml(message)}</span>
    ${actionText && actionUrl ? `<a href="${escapeHtml(actionUrl)}" style="color:#4ade80;font-weight:600;margin-left:8px;text-decoration:underline;">${escapeHtml(actionText)}</a>` : ''}
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('out');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function getImageUrl(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//') || url.startsWith('data:')) {
    return url;
  }
  const base = getBackendBase();
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
}

// Icon helper for social & custom link buttons
function getLinkIcon(label = '', url = '', iconId = '') {
  // Social icon SVGs map
  const ICON_MAP = {
    github: `<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>`,
    twitter: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,
    linkedin: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>`,
    youtube: `<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`,
    instagram: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>`,
    facebook: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`,
    dribbble: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 24C5.385 24 0 18.615 0 12S5.385 0 12 0s12 5.385 12 12-5.385 12-12 12z"/></svg>`,
    medium: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M13.54 12a6.8 6.8 0 01-6.77 6.82A6.8 6.8 0 010 12a6.8 6.8 0 016.77-6.82A6.8 6.8 0 0113.54 12zM20.96 12c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42M24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12z"/></svg>`,
    discord: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.79 19.79 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.865-.608 1.25a18.27 18.27 0 00-5.487 0c-.164-.393-.406-.874-.618-1.25a.077.077 0 00-.079-.036 19.74 19.74 0 00-4.885 1.515.07.07 0 00-.032.028C.533 9.046-.32 13.58.099 18.058a.082.082 0 00.031.056c2.053 1.508 4.041 2.423 5.993 3.03a.078.078 0 00.084-.028c.462-.63.873-1.295 1.226-1.994a.076.076 0 00-.042-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 01.078-.01c3.928 1.793 8.18 1.793 12.061 0a.074.074 0 01.079.009c.12.1.246.198.373.292a.077.077 0 01-.006.127 12.3 12.3 0 01-1.873.892.076.076 0 00-.041.107c.36.698.772 1.363 1.225 1.993a.076.076 0 00.084.029c1.961-.607 3.95-1.522 6.002-3.03a.077.077 0 00.031-.055c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.029z"/></svg>`,
    reddit: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0z"/></svg>`,
    tiktok: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>`,
    twitch: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/></svg>`,
    spotify: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0z"/></svg>`,
    pinterest: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12.017 24c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641.001 12.017.001z"/></svg>`,
    website: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
    email: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`,
  };

  // If an explicit icon ID is provided, use it
  if (iconId && ICON_MAP[iconId]) {
    return ICON_MAP[iconId];
  }

  // Fallback: match by label/URL
  const l = (label || '').toLowerCase();
  const u = (url || '').toLowerCase();
  if (l.includes('github') || u.includes('github.com')) return ICON_MAP.github;
  if (l.includes('twitter') || l.includes('x.com') || u.includes('twitter.com') || u.includes('x.com')) return ICON_MAP.twitter;
  if (l.includes('linkedin') || u.includes('linkedin.com')) return ICON_MAP.linkedin;
  if (l.includes('youtube') || u.includes('youtube.com')) return ICON_MAP.youtube;
  if (l.includes('instagram') || u.includes('instagram.com')) return ICON_MAP.instagram;
  if (l.includes('facebook') || u.includes('facebook.com')) return ICON_MAP.facebook;
  if (l.includes('discord') || u.includes('discord')) return ICON_MAP.discord;
  if (l.includes('reddit') || u.includes('reddit.com')) return ICON_MAP.reddit;
  if (l.includes('tiktok') || u.includes('tiktok.com')) return ICON_MAP.tiktok;
  if (l.includes('twitch') || u.includes('twitch.tv')) return ICON_MAP.twitch;
  if (l.includes('spotify') || u.includes('spotify.com')) return ICON_MAP.spotify;
  if (l.includes('medium') || u.includes('medium.com')) return ICON_MAP.medium;
  if (l.includes('dribbble') || u.includes('dribbble.com')) return ICON_MAP.dribbble;
  if (l.includes('pinterest') || u.includes('pinterest.com')) return ICON_MAP.pinterest;
  if (l.includes('mail') || u.startsWith('mailto:')) return ICON_MAP.email;
  return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`;
}

function renderLinkPill(link) {
  const icon = getLinkIcon(link.label, link.url, link.icon || '');
  const href = link.url.startsWith('http') || link.url.startsWith('mailto:') ? link.url : `https://${link.url}`;
  return `
    <a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" class="profile-pill-btn">
      <span class="profile-pill-icon">${icon}</span>
      <span class="profile-pill-label">${escapeHtml(link.label || 'Link')}</span>
    </a>
  `;
}

// ============ Components ============
function renderLoading() {
  return `
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <p class="loading-text">Loading stories...</p>
    </div>
  `;
}

function renderEmpty(title = 'No stories yet', text = 'Check back soon for new content.') {
  return `
    <div class="empty-state">
      <div class="empty-state-icon">📝</div>
      <h2 class="empty-state-title">${title}</h2>
      <p class="empty-state-text">${text}</p>
    </div>
  `;
}

function renderPostCard(post, index = 0) {
  const delay = index * 0.08;
  const coverHtml = post.coverImage
    ? `<div class="post-card-cover"><img src="${getImageUrl(post.coverImage)}" alt="${escapeHtml(post.title)}" loading="lazy" /></div>`
    : '';

  const tagsHtml = (post.tags || [])
    .slice(0, 2)
    .map(t => `<span class="post-card-tag">${escapeHtml(t)}</span>`)
    .join('');

  const coverUrl = post.coverImage ? getImageUrl(post.coverImage) : '';
  const coverColor = post.coverColor || '';
  const excerpt = (post.contentPreview || post.subtitle || '').trim();

  return `
    <article class="post-card ${post.coverImage ? 'has-cover' : 'no-cover'}" data-slug="${escapeHtml(post.slug)}" data-cover="${escapeHtml(coverUrl)}" data-color="${escapeHtml(coverColor)}" data-match-bg="${post.matchCoverBackground !== false ? 'true' : 'false'}" style="animation-delay: ${delay}s" onclick="window.location.hash='#/post/${post.slug}'">
      ${coverHtml}
      <div class="post-card-body">
        <h2 class="post-card-title">${escapeHtml(post.title)}</h2>
        ${excerpt ? `<p class="post-card-excerpt">${escapeHtml(excerpt)}</p>` : ''}
        <div class="post-card-footer">
          <span class="post-card-date">${formatDate(post.createdAt)}</span>
          ${tagsHtml ? `<div class="post-card-tags">${tagsHtml}</div>` : ''}
        </div>
      </div>
    </article>
  `;
}

function renderFeaturedPost(post) {
  const coverHtml = post.coverImage
    ? `<div class="post-card-cover"><img src="${getImageUrl(post.coverImage)}" alt="${escapeHtml(post.title)}" loading="lazy" /></div>`
    : '';
  const coverUrl = post.coverImage ? getImageUrl(post.coverImage) : '';
  const coverColor = post.coverColor || '';
  const excerpt = (post.contentPreview || post.subtitle || '').trim();

  return `
    <article class="featured-post ${post.coverImage ? 'has-cover' : 'no-cover'}" data-slug="${escapeHtml(post.slug)}" data-cover="${escapeHtml(coverUrl)}" data-color="${escapeHtml(coverColor)}" data-match-bg="${post.matchCoverBackground !== false ? 'true' : 'false'}" onclick="window.location.hash='#/post/${post.slug}'">
      ${coverHtml}
      <div class="post-card-body">
        <div class="featured-label">
          <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
          Featured Story
        </div>
        <h2 class="post-card-title">${escapeHtml(post.title)}</h2>
        ${excerpt ? `<p class="post-card-excerpt">${escapeHtml(excerpt)}</p>` : ''}
        <div class="post-card-footer">
          <span class="post-card-date">${formatDate(post.createdAt)}</span>
        </div>
      </div>
    </article>
  `;
}

function renderSidebarPost(post, number) {
  return `
    <div class="sidebar-post" onclick="window.location.hash='#/post/${post.slug}'">
      <span class="sidebar-post-number">${String(number).padStart(2, '0')}</span>
      <div class="sidebar-post-body">
        <h3 class="sidebar-post-title">${escapeHtml(post.title)}</h3>
        <p class="sidebar-post-meta">${formatDate(post.createdAt)}</p>
      </div>
    </div>
  `;
}

// ============ Pagination Helper ============
function renderPaginationControls(pagination, baseUrl = '#/stories') {
  if (!pagination || pagination.totalPages <= 1) return '';

  const { page, totalPages, totalPosts, hasNext, hasPrev } = pagination;

  let pages = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('...');
    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);
    for (let i = start; i <= end; i++) {
      if (!pages.includes(i)) pages.push(i);
    }
    if (page < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  const prevLink = hasPrev ? `${baseUrl}/${page - 1}` : 'javascript:void(0)';
  const nextLink = hasNext ? `${baseUrl}/${page + 1}` : 'javascript:void(0)';

  return `
    <div class="pagination-container">
      <nav class="pagination-nav" aria-label="Page navigation">
        <a href="${prevLink}" class="pagination-btn ${hasPrev ? '' : 'disabled'}" ${hasPrev ? '' : 'aria-disabled="true" tabindex="-1"'}>
          ← Previous
        </a>

        ${pages.map(p => {
          if (p === '...') {
            return `<span class="pagination-ellipsis">…</span>`;
          }
          const isActive = p === page;
          return `
            <a href="${baseUrl}/${p}" class="pagination-btn ${isActive ? 'active' : ''}" ${isActive ? 'aria-current="page"' : ''}>
              ${p}
            </a>
          `;
        }).join('')}

        <a href="${nextLink}" class="pagination-btn ${hasNext ? '' : 'disabled'}" ${hasNext ? '' : 'aria-disabled="true" tabindex="-1"'}>
          Next →
        </a>
      </nav>
      <div class="pagination-summary">
        Showing Page <strong>${page}</strong> of <strong>${totalPages}</strong> (${totalPosts} stories total)
      </div>
    </div>
  `;
}

// ============ Pages ============

// Main Homepage: Shows Hero Story, Curated/Pinned Stories in exact order (NO pin icon shown), Top Recent stories, and Projects
async function renderHomePage() {
  const main = document.getElementById('main-content');
  main.innerHTML = renderLoading();

  try {
    const [curatedData, tags, homepage, projectsData] = await Promise.all([
      fetchCurated().catch(() => ({ hero: null, pinned: [], recent: [], all: [] })),
      fetchTags().catch(() => []),
      fetchHomepage().catch(() => ({})),
      fetchProjects().catch(() => ({ projects: [] }))
    ]);
    const { hero, pinned, recent, all } = curatedData || { hero: null, pinned: [], recent: [], all: [] };

    const showHero = homepage.showHero !== false;
    const heroLabel = homepage.heroLabel || 'Stories & Ideas';
    const heroTitle = homepage.heroTitle || 'Welcome to Stories';
    const heroSubtitle = homepage.heroSubtitle || 'Thoughts on technology, development, and life — curated articles and deep engineering breakdowns.';
    const ctaText = homepage.ctaText || 'Browse All Stories';
    const ctaLink = homepage.ctaLink || '#/stories/1';
    const secondaryCtaText = homepage.secondaryCtaText || 'Explore Projects';
    const secondaryCtaLink = homepage.secondaryCtaLink || '#/projects';

    const heroHtml = showHero ? `
      <section class="hero">
        <div class="hero-container">
          <div class="hero-label">
            <span class="hero-label-dot"></span>
            ${escapeHtml(heroLabel)}
          </div>
          <h1 class="hero-title">${escapeHtml(heroTitle)}</h1>
          <p class="hero-subtitle">${escapeHtml(heroSubtitle)}</p>
          <div class="hero-cta-group">
            <a href="${ctaLink}" class="hero-btn-primary">${escapeHtml(ctaText)} →</a>
            ${secondaryCtaText ? `<a href="${secondaryCtaLink}" class="hero-btn-secondary">${escapeHtml(secondaryCtaText)}</a>` : ''}
          </div>
        </div>
      </section>
    ` : '';

    if (!hero && all.length === 0) {
      main.innerHTML = `
        ${heroHtml}
        ${renderEmpty()}
      `;
      return;
    }

    // Combine pinned stories and recent stories for the feed (NO pin icon displayed on client side)
    const feedStories = [...pinned, ...recent];

    // Build tags bar
    const showTags = homepage.showTags !== false;
    const tagsHtml = (showTags && tags.length > 0)
      ? `
        <section class="tags-section">
          <div class="tags-container">
            <button class="tag-pill active" onclick="window.location.hash='#/'">Featured</button>
            <button class="tag-pill" onclick="window.location.hash='#/stories'">All Stories (${all.length})</button>
            ${tags.slice(0, 8).map(t => `
              <button class="tag-pill" onclick="window.location.hash='#/tag/${encodeURIComponent(t)}'">${escapeHtml(t)}</button>
            `).join('')}
          </div>
        </section>
      `
      : '';

    // Trending sidebar stories
    const showTrending = homepage.showTrending !== false;
    const sidebarPosts = all.slice(0, 5);

    // Projects section on Homepage
    const showProjects = homepage.showProjects !== false;
    const projectsList = projectsData.projects || [];
    const ghUser = projectsData.githubUsername || '';
    const ghUrl = ghUser.startsWith('http') ? ghUser : (ghUser ? `https://github.com/${ghUser}` : '');
    const projectsSectionHtml = (showProjects && (projectsList.length > 0 || ghUrl)) ? `
      <section class="projects-section">
        <div class="projects-container">
          <div class="projects-header">
            <div class="projects-heading-group">
              <h2 class="projects-heading">${escapeHtml(homepage.projectsTitle || 'Featured Projects & Open Source')}</h2>
              <p class="projects-subheading">${escapeHtml(homepage.projectsSubtitle || 'Software applications, developer tools, and open source contributions.')}</p>
            </div>
            <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
              <div class="feed-view-switcher projects-view-switcher" id="home-projects-view-switcher">
                <button class="feed-view-btn ${currentProjectDisplayView === 'grid' ? 'active' : ''}" data-view="grid" title="Grid View" aria-label="Grid view">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                </button>
                <button class="feed-view-btn ${currentProjectDisplayView === 'list' ? 'active' : ''}" data-view="list" title="List View" aria-label="List view">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                </button>
                <button class="feed-view-btn ${currentProjectDisplayView === 'compact' ? 'active' : ''}" data-view="compact" title="Compact View" aria-label="Compact view">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
                </button>
              </div>
              ${ghUrl && projectsData.showGithubLink !== false ? `
                <a href="${ghUrl}" target="_blank" rel="noopener noreferrer" class="github-profile-pill">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                  <span>GitHub Profile</span>
                </a>
              ` : ''}
            </div>
          </div>
          <div class="projects-grid view-${currentProjectDisplayView}" id="home-projects-grid">
            ${projectsList.slice(0, 6).map(renderProjectCard).join('')}
          </div>
        </div>
      </section>
    ` : '';

    main.innerHTML = `
      ${heroHtml}

      ${tagsHtml}

      <section class="feed-section">
        <div class="feed-layout">
          <div class="feed-main">
            ${hero ? renderFeaturedPost(hero) : ''}

            ${feedStories.length > 0 ? `
              <div class="feed-header">
                <h2 class="feed-heading">${escapeHtml(homepage.storiesTitle || 'Curated & Recent Stories')}</h2>
                <div class="feed-view-switcher" id="display-view-switcher">
                  <button class="feed-view-btn ${currentDisplayView === 'list' ? 'active' : ''}" data-view="list" title="List View" aria-label="List view">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                  </button>
                  <button class="feed-view-btn ${currentDisplayView === 'grid' ? 'active' : ''}" data-view="grid" title="Grid View" aria-label="Grid view">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                  </button>
                  <button class="feed-view-btn ${currentDisplayView === 'compact' ? 'active' : ''}" data-view="compact" title="Compact View" aria-label="Compact view">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
                  </button>
                </div>
              </div>
              <div class="feed-posts view-${currentDisplayView}" id="feed-posts">
                ${feedStories.map((p, i) => renderPostCard(p, i)).join('')}
              </div>

              <!-- Browse All Stories Button / Callout -->
              <div style="text-align: center; margin: 40px 0 20px 0;">
                <a href="#/stories/1" class="pagination-btn" style="display:inline-flex;padding:12px 28px;background:var(--color-accent);color:#fff;border-color:var(--color-accent);font-weight:600;font-size:15px;text-decoration:none;box-shadow:0 4px 14px rgba(26,137,23,0.25);">
                  Browse All Stories (${all.length}+) with Pagination →
                </a>
              </div>
            ` : ''}
          </div>

          ${(showTrending || (showTags && tags.length > 0)) ? `
            <aside class="feed-sidebar">
              ${(showTags && tags.length > 0) ? `
                <div class="sidebar-section">
                  <h3 class="sidebar-title">Discover Topics</h3>
                  <div class="sidebar-tags">
                    ${tags.map(t => `
                      <button class="sidebar-tag" onclick="window.location.hash='#/tag/${encodeURIComponent(t)}'">${escapeHtml(t)}</button>
                    `).join('')}
                  </div>
                </div>
              ` : ''}

              ${(showTrending && sidebarPosts.length > 0) ? `
                <div class="sidebar-section">
                  <h3 class="sidebar-title">Trending</h3>
                  <div class="sidebar-posts">
                    ${sidebarPosts.map((p, i) => renderSidebarPost(p, i + 1)).join('')}
                  </div>
                </div>
              ` : ''}
            </aside>
          ` : ''}
        </div>
      </section>

      ${projectsSectionHtml}
    `;

    const switcher = document.getElementById('display-view-switcher');
    if (switcher) {
      switcher.querySelectorAll('.feed-view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          setDisplayView(btn.dataset.view);
        });
      });
    }

    const homeProjSwitcher = document.getElementById('home-projects-view-switcher');
    if (homeProjSwitcher) {
      homeProjSwitcher.querySelectorAll('.feed-view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          setProjectsDisplayView(btn.dataset.view);
        });
      });
    }

    applyMatchCoverBackground(null, main);
  } catch (error) {
    console.error('Failed to load home page:', error);
    main.innerHTML = renderEmpty('Could not load stories', 'Please check that the backend server is running.');
  }
}

function renderProjectCard(p) {
  const tagsHtml = (p.techStack || [])
    .map(t => `<span class="project-tech-pill">${escapeHtml(t)}</span>`)
    .join('');

  const starBadge = p.stars ? `<span style="font-size:12px;font-weight:600;color:var(--color-text-secondary);display:inline-flex;align-items:center;gap:3px;" title="${p.stars} GitHub stars">★ ${p.stars}</span>` : '';

  return `
    <div class="project-card">
      <div>
        <div class="project-card-header">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <h3 class="project-card-title">${escapeHtml(p.title)}</h3>
            ${starBadge}
          </div>
          ${p.featured ? `<span class="project-card-badge">★ Featured</span>` : ''}
        </div>
        <p class="project-card-desc">${escapeHtml(p.description || '')}</p>
        ${tagsHtml ? `<div class="project-card-tech">${tagsHtml}</div>` : ''}
      </div>
      <div class="project-card-links">
        ${p.githubUrl ? `
          <a href="${p.githubUrl}" target="_blank" rel="noopener noreferrer" class="project-link-btn">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
            <span>Code / Repo</span>
          </a>
        ` : ''}
        ${p.liveUrl ? `
          <a href="${p.liveUrl}" target="_blank" rel="noopener noreferrer" class="project-link-btn" style="color:var(--color-accent);">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            <span>Live Demo</span>
          </a>
        ` : ''}
      </div>
    </div>
  `;
}

async function renderProjectsPage() {
  const main = document.getElementById('main-content');
  main.innerHTML = renderLoading();

  try {
    const [{ githubUsername, showGithubLink, projects }, homepage] = await Promise.all([fetchProjects(), fetchHomepage()]);
    const ghUrl = githubUsername.startsWith('http') ? githubUsername : (githubUsername ? `https://github.com/${githubUsername}` : '');

    main.innerHTML = `
      <section class="all-stories-hero">
        <div class="projects-container">
          <h1 class="all-stories-hero-title">${escapeHtml(homepage.projectsTitle || 'Projects & Open Source')}</h1>
          <p class="all-stories-hero-desc">${escapeHtml(homepage.projectsSubtitle || 'A showcase of open source repositories, tools, systems, and engineering work.')}</p>
          ${ghUrl && showGithubLink !== false ? `
            <div style="margin-top: 20px;">
              <a href="${ghUrl}" target="_blank" rel="noopener noreferrer" class="github-profile-pill">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                <span>GitHub Profile @${escapeHtml(githubUsername.replace(/^https:\/\/github\.com\//, ''))}</span>
              </a>
            </div>
          ` : ''}
        </div>
      </section>

      <div class="projects-container" style="padding-bottom: 80px;">
        ${projects.length > 0 ? `
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 12px;">
            <span style="font-size: 14px; font-weight: 600; color: var(--color-text-secondary);">${projects.length} Public Projects</span>
            <div class="feed-view-switcher projects-view-switcher" id="page-projects-view-switcher">
              <button class="feed-view-btn ${currentProjectDisplayView === 'grid' ? 'active' : ''}" data-view="grid" title="Grid View" aria-label="Grid view">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              </button>
              <button class="feed-view-btn ${currentProjectDisplayView === 'list' ? 'active' : ''}" data-view="list" title="List View" aria-label="List view">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
              </button>
              <button class="feed-view-btn ${currentProjectDisplayView === 'compact' ? 'active' : ''}" data-view="compact" title="Compact View" aria-label="Compact view">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
              </button>
            </div>
          </div>
          <div class="projects-grid view-${currentProjectDisplayView}" id="page-projects-grid">
            ${projects.map(renderProjectCard).join('')}
          </div>
        ` : `
          <div style="text-align: center; padding: 60px 20px; color: var(--color-text-secondary);">
            <p style="font-size: 18px; margin-bottom: 12px; font-weight:600;">No projects added yet.</p>
            <p style="font-size: 14px;">Add your GitHub repositories and projects via the Studio Editor.</p>
          </div>
        `}
      </div>
    `;

    const pageProjSwitcher = document.getElementById('page-projects-view-switcher');
    if (pageProjSwitcher) {
      pageProjSwitcher.querySelectorAll('.feed-view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          setProjectsDisplayView(btn.dataset.view);
        });
      });
    }

    applyMatchCoverBackground(null, main);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (err) {
    console.error('Failed to load projects:', err);
    main.innerHTML = renderEmpty('Could not load projects', 'Please ensure the backend server is running.');
  }
}

// All Stories Page with Server-Side Pagination
async function renderAllStoriesPage(pageNum = 1, filterTag = null) {
  const main = document.getElementById('main-content');
  main.innerHTML = renderLoading();

  try {
    const page = Math.max(1, parseInt(pageNum, 10) || 1);
    const [{ posts, pagination }, tags] = await Promise.all([
      fetchPaginatedPosts(page, 9, filterTag),
      fetchTags()
    ]);

    // Build tags bar
    const tagsHtml = tags.length > 0
      ? `
        <section class="tags-section">
          <div class="tags-container">
            <button class="tag-pill ${!filterTag ? 'active' : ''}" onclick="window.location.hash='#/stories/1'">All Topics</button>
            ${tags.map(t => `
              <button class="tag-pill ${filterTag && filterTag.toLowerCase() === t.toLowerCase() ? 'active' : ''}"
                onclick="window.location.hash='#/tag/${encodeURIComponent(t)}/1'">${escapeHtml(t)}</button>
            `).join('')}
          </div>
        </section>
      `
      : '';

    const baseUrl = filterTag ? `#/tag/${encodeURIComponent(filterTag)}` : '#/stories';
    const paginationHtml = renderPaginationControls(pagination, baseUrl);

    main.innerHTML = `
      <section class="all-stories-hero">
        <div class="hero-container">
          <h1 class="all-stories-hero-title">${filterTag ? `#${escapeHtml(filterTag)} Stories` : 'All Stories'}</h1>
          <p class="all-stories-hero-desc">
            ${filterTag ? `Articles and tutorials categorized under #${escapeHtml(filterTag)}` : 'Browse our complete catalog with fast server-side pagination.'}
          </p>
        </div>
      </section>

      ${tagsHtml}

      <section class="feed-section">
        <div class="feed-layout" style="grid-template-columns: 1fr;">
          <div class="feed-main" style="max-width: 100%;">
            <div class="feed-header">
              <h2 class="feed-heading">
                ${filterTag ? `Topic: #${escapeHtml(filterTag)}` : 'All Published Stories'}
                <span style="font-size: 14px; font-weight: normal; color: var(--color-text-secondary); margin-left: 8px;">
                  (Page ${page} of ${pagination.totalPages || 1})
                </span>
              </h2>
              <div class="feed-view-switcher" id="display-view-switcher">
                <button class="feed-view-btn ${currentDisplayView === 'list' ? 'active' : ''}" data-view="list" title="List View" aria-label="List view">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                </button>
                <button class="feed-view-btn ${currentDisplayView === 'grid' ? 'active' : ''}" data-view="grid" title="Grid View" aria-label="Grid view">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                </button>
                <button class="feed-view-btn ${currentDisplayView === 'compact' ? 'active' : ''}" data-view="compact" title="Compact View" aria-label="Compact view">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
                </button>
              </div>
            </div>

            ${posts.length > 0 ? `
              <div class="feed-posts view-${currentDisplayView}" id="feed-posts">
                ${posts.map((p, i) => renderPostCard(p, i)).join('')}
              </div>
              ${paginationHtml}
            ` : renderEmpty(`No stories found`, 'Try selecting a different topic.')}
          </div>
        </div>
      </section>
    `;

    const switcher = document.getElementById('display-view-switcher');
    if (switcher) {
      switcher.querySelectorAll('.feed-view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          setDisplayView(btn.dataset.view);
        });
      });
    }

    applyMatchCoverBackground(null, main);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (err) {
    console.error('Error loading paginated stories:', err);
    main.innerHTML = renderEmpty('Could not load stories', err.message);
  }
}

async function renderPostPage(slug) {
  const main = document.getElementById('main-content');
  main.innerHTML = renderLoading();

  try {
    const post = await fetchPost(slug);
    if (!post) {
      main.innerHTML = renderEmpty('Post not found', 'The story you\'re looking for doesn\'t exist or has been removed.');
      document.title = "Not Found — Stories";
      return;
    }

    let allPosts = [];
    try {
      allPosts = await fetchPosts();
      if (!Array.isArray(allPosts)) allPosts = [];
    } catch (e) {
      console.warn('Could not load related stories:', e);
    }

    let profile = null;
    try {
      profile = await fetchProfile();
    } catch {}

    const morePosts = allPosts.filter(p => p.slug !== slug && p.id !== post.id).slice(0, 3);

    const tagsHtml = (post.tags || [])
      .map(t => `<span class="post-tag" onclick="window.location.hash='#/tag/${encodeURIComponent(t)}'">${escapeHtml(t)}</span>`)
      .join('');

    const coverHtml = post.coverImage
      ? `<div class="post-cover"><img src="${getImageUrl(post.coverImage)}" alt="${escapeHtml(post.title)}" /></div>`
      : '';

    const morePostsHtml = morePosts.length > 0
      ? `
        <section class="more-posts">
          <h2 class="more-posts-title">More from ${escapeHtml(post.author || 'Author')}</h2>
          <div class="more-posts-grid">
            ${morePosts.map(p => {
              const mCover = p.coverImage
                ? `<div class="more-post-card-cover"><img src="${getImageUrl(p.coverImage)}" alt="${escapeHtml(p.title)}" loading="lazy" /></div>`
                : `<div class="more-post-card-cover"></div>`;
              return `
                <div class="more-post-card" onclick="window.location.hash='#/post/${p.slug}'">
                  ${mCover}
                  <div class="more-post-card-body">
                    <h3 class="more-post-card-title">${escapeHtml(p.title)}</h3>
                    <p class="more-post-card-meta">${formatDate(p.createdAt)}</p>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </section>
      `
      : '';

    // Generate Table of Contents from headings (Matching Image 1)
    const { modifiedHtml, tocHtml, hasToc } = generateTableOfContents(post.content);

    // Update page title
    document.title = `${post.title} — Stories`;

    // Dynamic Author Avatar & Card info
    const authorAvatarHtml = profile?.avatar
      ? `<img src="${getImageUrl(profile.avatar)}" alt="${escapeHtml(post.author)}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" />`
      : getInitials(post.author);

    const authorBio = profile?.bio || 'Writing about technology, development, and engineering architecture.';
    const authorButtonsHtml = (profile?.links || []).map(renderLinkPill).join('');

    const postSlug = post.slug || post.id;
    const disabledSlugs = getDisabledBlogSlugs();
    const isBlogDisabledByUser = disabledSlugs.includes(postSlug);
    const authorEnabled = post.matchCoverBackground !== false;
    const isStoryBgActive = authorEnabled && !isBlogDisabledByUser;

    let pillStateText = 'OFF';
    if (!authorEnabled) {
      pillStateText = 'Disabled by Author';
    } else if (isBlogDisabledByUser) {
      pillStateText = 'OFF';
    } else {
      pillStateText = 'ON';
    }

    main.innerHTML = `
      <article class="post-page">
        <header class="post-header">
          <a href="#/" class="post-back">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 12H5m0 0 7 7m-7-7 7-7"></path>
            </svg>
            Back to all stories
          </a>
          <h1 class="post-title">${escapeHtml(post.title)}</h1>
          ${post.subtitle ? `<p class="post-subtitle">${escapeHtml(post.subtitle)}</p>` : ''}
          <div class="post-meta">
            <div class="post-author-info" style="margin-left: 0;">
              <p class="post-author-name">${escapeHtml(post.author)}</p>
              <div class="post-meta-details">
                <span>${formatDate(post.createdAt)}</span>
                ${post.coverImage ? `
                  <span style="margin: 0 6px; opacity: 0.5;">•</span>
                  <button type="button" class="post-match-bg-pill ${isStoryBgActive ? 'active' : ''}" id="post-match-bg-pill" title="Toggle Match cover image background for this story">
                    <span class="match-cover-dot" style="display:inline-block;margin-right:2px;"></span>
                    <span>Match Cover BG: <strong id="post-match-bg-state">${pillStateText}</strong></span>
                  </button>
                ` : ''}
              </div>
            </div>
          </div>
        </header>

        ${coverHtml}

        <div class="post-body-container ${hasToc ? '' : 'no-toc'}">
          <div class="post-content">${modifiedHtml}</div>
        </div>

        ${tocHtml}

        ${tagsHtml ? `<div class="post-tags" style="margin-top: 32px; padding-bottom: 24px;">${tagsHtml}</div>` : ''}
      </article>

      ${morePostsHtml}
    `;

    // Initialize syntax highlighting and interactive code block features
    initDisplayCodeBlocks();

    // Initialize TOC scroll observer
    if (hasToc) {
      initTocObserver();
    }

    // Wire up reading page Match Cover BG Pill (Story-specific control)
    const pill = document.getElementById('post-match-bg-pill');
    if (pill) {
      pill.onclick = () => {
        if (post.matchCoverBackground === false) {
          showToast('Match cover image background was disabled for this story by the author.');
          return;
        }

        const slug = post.slug || post.id;
        const disabledSlugs = getDisabledBlogSlugs();
        const isCurrentlyDisabledForBlog = disabledSlugs.includes(slug);

        if (isCurrentlyDisabledForBlog) {
          setBlogMatchCoverBgDisabled(slug, false);
          applyMatchCoverBackground(post);
          showToast('Match cover background enabled for this story ✨');
        } else {
          setBlogMatchCoverBgDisabled(slug, true);
          applyMatchCoverBackground(post);
          showToast('Match cover background turned OFF (Default Black/White)');
        }
      };
    }

    // Apply matched cover image background
    applyMatchCoverBackground(post);

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (error) {
    console.error('Error loading post:', error);
    main.innerHTML = renderEmpty('Post not found', 'The story you\'re looking for doesn\'t exist or has been removed.');
    document.title = "Not Found — Stories";
  }
}

function generateTableOfContents(contentHtml) {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = contentHtml || '';

  // 1. Client-side security & UX: Remove contenteditable and placeholder attributes so readers cannot edit content
  tempDiv.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
  tempDiv.querySelectorAll('[data-placeholder]').forEach(el => el.removeAttribute('data-placeholder'));

  // 2. Remove editor-only UI controls (table actions, add/remove row/col buttons, toolbar overlays)
  tempDiv.querySelectorAll('.table-actions, .table-action-btn, .quote-action-btn, .table-cell-toolbar, .table-quick-toolbar, .floating-toolbar').forEach(el => el.remove());

  // 3. Fix image URLs (support Cloudinary, external URLs, and local uploads seamlessly)
  tempDiv.querySelectorAll('img').forEach(img => {
    const src = img.getAttribute('src');
    if (src && !src.startsWith('http://') && !src.startsWith('https://') && !src.startsWith('//') && !src.startsWith('data:')) {
      img.src = getImageUrl(src);
    }
  });

  const headings = tempDiv.querySelectorAll('h1, h2, h3, h4');
  if (headings.length < 2) {
    return { modifiedHtml: tempDiv.innerHTML, tocHtml: '', hasToc: false };
  }

  const tocItems = [];
  headings.forEach((heading, idx) => {
    const text = heading.textContent.trim();
    if (!text) return;
    const id = `section-${idx + 1}`;
    heading.id = id;
    const level = heading.tagName.toLowerCase(); // h1, h2, h3, h4
    tocItems.push({ id, text, level });
  });

  const tocHtml = `
    <aside class="post-toc-right-dock" id="post-toc-dock" aria-label="Table of contents">
      <!-- Minimalist Resting Strip of dash indicator bars on right margin (Matching Image 1) -->
      <div class="toc-strip" aria-label="Table of contents outline">
        ${tocItems.map((item, idx) => `
          <span class="toc-strip-bar toc-bar-${item.level} ${idx === 0 ? 'active' : ''}" data-target="${item.id}" title="${escapeHtml(item.text)}"></span>
        `).join('')}
      </div>

      <!-- Expandable Sleek Floating Card on hover (Matching Image 2) -->
      <nav class="toc-dock-card" aria-label="Table of contents navigation">
        <ul class="toc-list">
          ${tocItems.map((item, idx) => `
            <li class="toc-item toc-${item.level} ${idx === 0 ? 'active' : ''}" data-target="${item.id}">
              <a href="#${item.id}" class="toc-link" onclick="event.preventDefault(); window.scrollToHeading('${item.id}');">
                <span class="toc-bullet" aria-hidden="true">•</span>
                <span class="toc-text">${escapeHtml(item.text)}</span>
              </a>
            </li>
          `).join('')}
        </ul>
      </nav>
    </aside>
  `;

  return {
    modifiedHtml: tempDiv.innerHTML,
    tocHtml,
    hasToc: true,
    tocItems
  };
}

window.scrollToHeading = function (id) {
  const el = document.getElementById(id);
  if (el) {
    const top = el.getBoundingClientRect().top + window.pageYOffset - 84;
    window.scrollTo({ top, behavior: 'smooth' });
  }
};

function initTocObserver() {
  const items = document.querySelectorAll('.toc-item');
  const stripBars = document.querySelectorAll('.toc-strip-bar');
  if (!items.length && !stripBars.length) return;

  // Clicking an outline strip bar navigates directly to that section
  stripBars.forEach(bar => {
    bar.addEventListener('click', (e) => {
      e.stopPropagation();
      const targetId = bar.dataset.target;
      if (targetId) window.scrollToHeading(targetId);
    });
  });

  const headingEls = Array.from(document.querySelectorAll('.post-content h1, .post-content h2, .post-content h3, .post-content h4'));
  if (!headingEls.length) return;

  let ticking = false;
  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(() => {
        const scrollPos = window.scrollY + 130;
        let currentId = headingEls[0]?.id;

        for (let i = 0; i < headingEls.length; i++) {
          if (headingEls[i].offsetTop <= scrollPos) {
            currentId = headingEls[i].id;
          } else {
            break;
          }
        }

        items.forEach(item => {
          if (item.dataset.target === currentId) {
            item.classList.add('active');
          } else {
            item.classList.remove('active');
          }
        });

        stripBars.forEach(bar => {
          if (bar.dataset.target === currentId) {
            bar.classList.add('active');
          } else {
            bar.classList.remove('active');
          }
        });

        ticking = false;
      });
      ticking = true;
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

// ============ Island Code Block System (Island Dark & Island White) ============
function getCodeIslandTheme() {
  return localStorage.getItem('kushal_code_island_theme') || 'island-dark';
}

function setCodeIslandTheme(theme) {
  localStorage.setItem('kushal_code_island_theme', theme);
  document.querySelectorAll('.code-block-wrapper').forEach(wrapper => {
    wrapper.classList.remove('theme-island-dark', 'theme-island-white');
    wrapper.classList.add(`theme-${theme}`);
    const toggleIcon = wrapper.querySelector('.code-theme-toggle-icon');
    const toggleText = wrapper.querySelector('.code-theme-toggle-text');
    if (toggleIcon) toggleIcon.textContent = theme === 'island-dark' ? '☀️' : '🌙';
    if (toggleText) toggleText.textContent = theme === 'island-dark' ? 'Island Light' : 'Island Dark';
  });
}

function initDisplayCodeBlocks() {
  const content = document.querySelector('.post-content');
  if (!content) return;

  const currentTheme = getCodeIslandTheme();

  // Helper to build header matching user screenshot
  function buildCodeHeader(lang) {
    const displayLang = (lang || 'code').toUpperCase();
    return `
      <div class="code-header-left">
        <svg class="code-file-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
        </svg>
        <span class="code-lang-title">${escapeHtml(displayLang)}</span>
      </div>
      <div class="code-header-actions">
        <button type="button" class="code-action-btn code-format-btn" title="Toggle Line Wrap" aria-label="Toggle Line Wrap">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
        </button>
        <button type="button" class="code-action-btn code-run-btn" title="Run / Preview" aria-label="Run / Preview">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polygon points="6 4 19 12 6 20 6 4"/></svg>
        </button>
        <button type="button" class="code-action-btn code-copy-btn" title="Copy code" aria-label="Copy code">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        </button>
      </div>
    `;
  }

  function bindCodeActions(wrapper, codeEl, lang) {
    const wrapBtn = wrapper.querySelector('.code-format-btn');
    if (wrapBtn) {
      wrapBtn.onclick = () => {
        wrapper.classList.toggle('wrap-lines');
        showToast(wrapper.classList.contains('wrap-lines') ? 'Line wrap enabled' : 'Line wrap disabled');
      };
    }

    const runBtn = wrapper.querySelector('.code-run-btn');
    if (runBtn) {
      runBtn.onclick = () => {
        const rawCode = (codeEl.innerText || codeEl.textContent || '').trim();
        const l = (lang || '').toLowerCase();
        if (l === 'javascript' || l === 'js') {
          try {
            console.log('--- Executing Snippet ---');
            const result = new Function(rawCode)();
            showToast(`Executed: ${result !== undefined ? String(result) : 'Done'}`);
          } catch (e) {
            showToast(`Error: ${e.message}`);
          }
        } else if (l === 'html') {
          showToast('HTML Snippet valid & ready');
        } else {
          showToast(`Running ${l.toUpperCase()} code...`);
        }
      };
    }

    const copyBtn = wrapper.querySelector('.code-copy-btn');
    if (copyBtn && codeEl) {
      copyBtn.onclick = async () => {
        const text = codeEl.innerText || codeEl.textContent;
        try {
          await navigator.clipboard.writeText(text);
          copyBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`;
          copyBtn.classList.add('copied');
          showToast('Code copied to clipboard!');
          setTimeout(() => {
            copyBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
            copyBtn.classList.remove('copied');
          }, 2000);
        } catch {}
      };
    }
  }

  // Enhance any plain <pre><code> into .code-block-wrapper with modern styling
  const plainPres = content.querySelectorAll('pre');
  plainPres.forEach((pre) => {
    if (pre.closest('.code-block-wrapper')) return;
    const codeEl = pre.querySelector('code') || pre;
    let lang = 'javascript';
    const match = (codeEl.className || '').match(/language-([a-z0-9_-]+)/i);
    if (match && match[1]) lang = match[1];

    const wrapper = document.createElement('div');
    wrapper.className = `code-block-wrapper theme-${currentTheme}`;
    wrapper.innerHTML = `
      <div class="code-block-header">
        ${buildCodeHeader(lang)}
      </div>
      <pre><code class="hljs language-${lang}">${codeEl.innerHTML}</code></pre>
    `;
    pre.replaceWith(wrapper);
    bindCodeActions(wrapper, wrapper.querySelector('pre code'), lang);
  });

  // Enhance existing code block wrappers
  content.querySelectorAll('.code-block-wrapper').forEach((wrapper) => {
    wrapper.classList.remove('theme-island-dark', 'theme-island-white');
    wrapper.classList.add(`theme-${currentTheme}`);

    const codeEl = wrapper.querySelector('pre code');
    let lang = 'code';
    if (codeEl) {
      const match = (codeEl.className || '').match(/language-([a-z0-9_-]+)/i);
      if (match && match[1]) lang = match[1];
    }

    let header = wrapper.querySelector('.code-block-header');
    if (!header) {
      header = document.createElement('div');
      header.className = 'code-block-header';
      wrapper.insertBefore(header, wrapper.firstChild);
    }
    header.innerHTML = buildCodeHeader(lang);
    bindCodeActions(wrapper, codeEl, lang);
  });

  // Highlight all code blocks with highlight.js
  content.querySelectorAll('pre code').forEach((codeEl) => {
    if (window.hljs) {
      try {
        window.hljs.highlightElement(codeEl);
      } catch {}
    }
  });
}

// ============ Search ============
function setupSearch() {
  const toggle = document.getElementById('search-toggle');
  const bar = document.getElementById('search-bar');
  const input = document.getElementById('search-input');
  const close = document.getElementById('search-close');

  let searchTimeout;
  let isSearchActive = false;

  const returnHome = () => {
    isSearchActive = false;
    input.value = '';
    bar.classList.remove('active');
    toggle.style.display = '';
    input.blur();
    router.resolve();
  };

  toggle.addEventListener('click', () => {
    bar.classList.add('active');
    toggle.style.display = 'none';
    setTimeout(() => input.focus(), 300);
  });

  close.addEventListener('click', () => {
    returnHome();
  });

  // Clicking logo always clears search and returns to home
  const logoLink = document.getElementById('logo-link');
  if (logoLink) {
    logoLink.addEventListener('click', (e) => {
      e.preventDefault();
      returnHome();
      window.location.hash = '#/';
      renderHomePage(null);
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== input) {
      e.preventDefault();
      bar.classList.add('active');
      toggle.style.display = 'none';
      setTimeout(() => input.focus(), 300);
    }
    if (e.key === 'Escape') {
      if (bar.classList.contains('active') || isSearchActive) {
        returnHome();
      }
    }
  });

  input.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    const query = input.value.trim();

    // If query is empty or cleared, immediately restore home page!
    if (query.length === 0) {
      if (isSearchActive) {
        isSearchActive = false;
        router.resolve();
      }
      return;
    }

    if (query.length < 2) return;

    searchTimeout = setTimeout(async () => {
      const main = document.getElementById('main-content');
      try {
        isSearchActive = true;
        const posts = await searchPosts(query);
        main.innerHTML = `
          <section class="feed-section">
            <div class="feed-main" style="max-width: var(--content-width); margin: 0 auto;">
              <div class="search-header-bar" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; padding-bottom: 14px; border-bottom: 1px solid var(--color-border);">
                <div>
                  <h2 style="font-family: var(--font-display); font-size: 24px; font-weight: 700; color: var(--color-text-primary);">Search results for "${escapeHtml(query)}"</h2>
                  <p style="font-size: 13px; color: var(--color-text-secondary); margin-top: 4px;">Found ${posts.length} ${posts.length === 1 ? 'story' : 'stories'}</p>
                </div>
                <button class="btn-back-home" id="btn-search-back-home" style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 16px; border-radius: 999px; border: 1px solid var(--color-border); background: var(--color-surface); color: var(--color-text-primary); font-size: 13px; font-weight: 500; cursor: pointer; transition: all var(--transition-fast);">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
                  Back to all stories
                </button>
              </div>
              <div class="feed-posts view-${currentDisplayView}" id="feed-posts">
                ${posts.length > 0
                  ? posts.map((p, i) => renderPostCard(p, i)).join('')
                  : renderEmpty('No results found', `No stories matching "${escapeHtml(query)}". Try a different search term.`)
                }
              </div>
            </div>
          </section>
        `;

        document.getElementById('btn-search-back-home')?.addEventListener('click', () => {
          returnHome();
        });
      } catch (error) {
        console.error('Search error:', error);
      }
    }, 300);
  });
}

// ============ Scroll Effects ============
function setupScrollEffects() {
  const navbar = document.getElementById('navbar');
  let lastScroll = 0;

  window.addEventListener('scroll', () => {
    const current = window.scrollY;
    if (current > 10) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
    lastScroll = current;
  });
}

// ============ Profile / About Page ============
async function renderProfilePage() {
  const main = document.getElementById('main-content');
  main.innerHTML = renderLoading();

  try {
    const [profileData, rawPosts] = await Promise.all([
      fetchProfile().catch(() => null),
      fetchPosts().catch(() => [])
    ]);

    const profile = profileData || {
      name: "Kushal Shah",
      tagline: "Software Engineer, Writer & Open Source Enthusiast",
      bio: "Writing about modern web technologies, distributed systems, clean code, and engineering architecture.",
      about: "Hi! I am Kushal Shah, a software engineer passionate about building high-performance systems and writing clean code.",
      avatar: "",
      links: []
    };
    const posts = Array.isArray(rawPosts) ? rawPosts : [];

    document.title = `${profile.name || 'Author'} — About & Profile`;

    const avatarHtml = profile.avatar
      ? `<img src="${getImageUrl(profile.avatar)}" alt="${escapeHtml(profile.name || 'Profile')}" class="profile-page-avatar-img" />`
      : `<div class="profile-page-avatar-initials">${getInitials(profile.name || 'KS')}</div>`;

    const linksHtml = (profile.links || []).map(renderLinkPill).join('');

    main.innerHTML = `
      <div class="profile-page">
        <header class="profile-hero">
          <div class="profile-hero-content">
            <div class="profile-page-avatar">
              ${avatarHtml}
            </div>
            <div class="profile-hero-info">
              <h1 class="profile-page-name">${escapeHtml(profile.name || 'Author')}</h1>
              ${profile.tagline ? `<p class="profile-page-tagline">${escapeHtml(profile.tagline)}</p>` : ''}
              ${profile.bio ? `<p class="profile-page-bio">${escapeHtml(profile.bio)}</p>` : ''}
              ${linksHtml ? `<div class="profile-buttons-bar">${linksHtml}</div>` : ''}
            </div>
          </div>
        </header>

        <main class="profile-page-body">
          ${profile.about ? `
            <section class="profile-about-section">
              <h2 class="profile-section-heading">About</h2>
              <div class="profile-about-text">
                ${profile.about.split('\n\n').map(p => `<p>${escapeHtml(p)}</p>`).join('')}
              </div>
            </section>
          ` : ''}

          <section class="profile-stories-section">
            <h2 class="profile-section-heading">Published Stories (${posts.length})</h2>
            <div class="profile-stories-list">
              ${posts.length > 0
                ? posts.map((post, i) => renderPostCard(post, i)).join('')
                : `<p class="profile-no-stories">No published stories yet.</p>`
              }
            </div>
          </section>
        </main>
      </div>
    `;

    applyMatchCoverBackground(null, main);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (err) {
    console.error('Failed to render profile page:', err);
    main.innerHTML = renderEmpty('Could not load profile', 'Please make sure the backend server is running.');
  }
}

// ============ Init ============
const router = new Router();

router.on('/', () => {
  document.title = "Stories — Thoughts & Engineering";
  renderHomePage();
});

router.on('/stories', (page) => {
  document.title = `All Stories — Page ${page} — Stories`;
  renderAllStoriesPage(page, null);
});

router.on('/tag', (tag, page = 1) => {
  document.title = `#${tag} Stories — Page ${page}`;
  renderAllStoriesPage(page, tag);
});

router.on('/post', (slug) => {
  renderPostPage(slug);
});

router.on('/projects', () => {
  document.title = "Projects — Engineering & Open Source";
  renderProjectsPage();
});

router.on('/about', () => {
  renderProfilePage();
});

router.on('/profile', () => {
  renderProfilePage();
});

// Boot
initTheme();
initAuth();
setupSearch();
setupScrollEffects();
router.resolve();
