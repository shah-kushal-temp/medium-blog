const LIVE_RENDER_BACKEND = 'https://medium-blog-jygn.onrender.com';
const LIVE_RENDER_API = `${LIVE_RENDER_BACKEND}/api`;

const API_BASE = (() => {
  if (window.__API_BASE__) return window.__API_BASE__;
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  const stored = localStorage.getItem('kushal_editor_api_url');
  if (stored && !stored.includes('3001')) return stored; // prevent using reader port 3001
  return ['localhost', '127.0.0.1'].includes(window.location.hostname) ? 'http://localhost:3002/api' : LIVE_RENDER_API;
})();

function getEditorBackendUrl(path) {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:') || path.startsWith('//')) {
    return path;
  }
  const base = window.__BACKEND_URL__ 
    || (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_BACKEND_URL)
    || localStorage.getItem('kushal_editor_backend_url') 
    || (['localhost', '127.0.0.1'].includes(window.location.hostname) ? 'http://localhost:3002' : LIVE_RENDER_BACKEND);
  return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
}

function getReaderLiveUrl(path = '') {
  let base = window.__READER_URL__ 
    || (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_READER_URL)
    || localStorage.getItem('kushal_reader_live_url');

  if (!base) {
    base = 'http://localhost:5173';
  }
  if (!path) return base;
  return `${base.replace(/\/$/, '')}/#/post/${path}`;
}

// ============ State ============
let posts = [];
let currentPostId = null;
let currentFilter = 'all';
let saveTimeout = null;
let coverImageUrl = '';
let unsplashSearchTimeout = null;
let savedSelectionRange = null;
let activeBlock = null;
let currentPostMatchCoverBackground = true;

// ============ Cloudinary Config ============
let CLOUDINARY_CLOUD_NAME = localStorage.getItem('cloudinary_cloud_name') || (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_CLOUDINARY_CLOUD_NAME) || '';
let CLOUDINARY_UPLOAD_PRESET = localStorage.getItem('cloudinary_upload_preset') || (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET) || '';
let CLOUDINARY_ENABLED = localStorage.getItem('cloudinary_enabled') !== 'false' && !!(CLOUDINARY_CLOUD_NAME && CLOUDINARY_UPLOAD_PRESET);

function isCloudinaryActive() {
  return CLOUDINARY_ENABLED && !!CLOUDINARY_CLOUD_NAME && !!CLOUDINARY_UPLOAD_PRESET;
}

// ============ DOM References ============
const storiesView = document.getElementById('stories-view');
const editorView = document.getElementById('editor-view');
const profileView = document.getElementById('profile-view');
const topnavStories = document.getElementById('topnav-stories');
const topnavEditor = document.getElementById('topnav-editor');
const storiesList = document.getElementById('stories-list');
const editorTitle = document.getElementById('editor-title');
const editorSubtitle = document.getElementById('editor-subtitle');
const editorContent = document.getElementById('editor-content');
const floatingToolbar = document.getElementById('floating-toolbar');
const sideToolbar = document.getElementById('side-toolbar');
const sideToolbarToggle = document.getElementById('side-toolbar-toggle');
const sideToolbarMenu = document.getElementById('side-toolbar-menu');
const modalOverlay = document.getElementById('modal-overlay');
const saveStatus = document.getElementById('save-status');
const toastContainer = document.getElementById('toast-container');
const btnPublishNav = document.getElementById('btn-publish');

// Navigation Tabs
const btnNavStories = document.getElementById('btn-nav-stories');
const btnNavProfile = document.getElementById('btn-nav-profile');

// Profile Elements
const profileAvatarImg = document.getElementById('profile-avatar-img');
const profileAvatarInitials = document.getElementById('profile-avatar-initials');
const btnUploadAvatar = document.getElementById('btn-upload-avatar');
const btnRemoveAvatar = document.getElementById('btn-remove-avatar');
const profileAvatarInput = document.getElementById('profile-avatar-input');
const profileName = document.getElementById('profile-name');
const profileTagline = document.getElementById('profile-tagline');
const profileBio = document.getElementById('profile-bio');
const profileAbout = document.getElementById('profile-about');
const profileLinksList = document.getElementById('profile-links-list');
const btnAddProfileLink = document.getElementById('btn-add-profile-link');
const btnSaveProfile = document.getElementById('btn-save-profile');
const profileSaveStatus = document.getElementById('profile-save-status');

// Quote image target tracker
let activeQuoteForImage = null;

// Modals
const promptModal = document.getElementById('prompt-modal');
const promptTitle = document.getElementById('prompt-modal-title');
const promptDesc = document.getElementById('prompt-modal-desc');
const promptInput = document.getElementById('prompt-modal-input');
const promptCancel = document.getElementById('prompt-cancel');
const promptConfirm = document.getElementById('prompt-confirm');

const unsplashModal = document.getElementById('unsplash-modal');
const unsplashClose = document.getElementById('unsplash-close');
const unsplashSearchInput = document.getElementById('unsplash-search-input');
const unsplashGrid = document.getElementById('unsplash-grid');

// Publish Modal Elements
const publishTitleInput = document.getElementById('publish-title-input');
const publishSubtitleInput = document.getElementById('publish-subtitle-input');
const publishPreviewTitle = document.getElementById('publish-preview-title');
const publishPreviewSubtitle = document.getElementById('publish-preview-subtitle');
const publishTagsInput = document.getElementById('publish-tags');
const publishSettingsHeading = document.getElementById('publish-settings-heading');
const btnPublishNow = document.getElementById('btn-publish-now');
const btnSaveDraft = document.getElementById('btn-save-draft');
const btnViewLive = document.getElementById('btn-view-live');

// Cover & Image Elements
const editorCover = document.getElementById('editor-cover');
const editorCoverImg = document.getElementById('editor-cover-img');
const editorCoverActions = document.getElementById('editor-cover-actions');
const btnAddCover = document.getElementById('btn-add-cover');
const editorCoverInput = document.getElementById('editor-cover-input');
const publishCoverInput = document.getElementById('publish-cover-input');
const publishPreviewCover = document.getElementById('publish-preview-cover');

function updateCoverUI() {
  if (coverImageUrl) {
    const src = getEditorBackendUrl(coverImageUrl);
    if (editorCoverImg) editorCoverImg.src = src;
    if (editorCover) editorCover.style.display = '';
    if (editorCoverActions) editorCoverActions.style.display = 'none';
  } else {
    if (editorCover) editorCover.style.display = 'none';
    if (editorCoverActions) {
      editorCoverActions.style.display = '';
      const buttonsRow = document.getElementById('cover-buttons-row');
      if (buttonsRow) buttonsRow.style.display = 'flex';
      const urlBar = document.getElementById('cover-url-input-bar');
      if (urlBar) urlBar.style.display = 'none';
    }
  }

  const matchBar = document.getElementById('editor-match-bg-bar');
  if (matchBar) {
    matchBar.style.display = coverImageUrl ? 'flex' : 'none';
    const toggle = document.getElementById('editor-match-bg-toggle');
    const statusText = document.getElementById('editor-match-bg-status-text');
    if (toggle) toggle.checked = currentPostMatchCoverBackground;
    if (statusText) statusText.textContent = currentPostMatchCoverBackground ? 'Enabled' : 'Disabled';
  }
}

// ============ Selection Helpers ============
function saveCurrentSelection() {
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0) {
    const range = sel.getRangeAt(0);
    if (editorContent.contains(range.commonAncestorContainer)) {
      savedSelectionRange = range.cloneRange();
    }
  }
}

function restoreCurrentSelection() {
  if (!savedSelectionRange) return;
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(savedSelectionRange);
}

// Find closest inline code tag (not inside <pre>)
function getClosestInlineCode() {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return null;
  const range = sel.getRangeAt(0);

  // 1. Check common ancestor
  let node = range.commonAncestorContainer;
  if (node.nodeType === 3) node = node.parentNode;
  while (node && node !== editorContent) {
    if (node.tagName === 'CODE' && node.parentElement?.tagName !== 'PRE') {
      return node;
    }
    node = node.parentNode;
  }

  // 2. Check startContainer
  let startNode = range.startContainer;
  if (startNode.nodeType === 3) startNode = startNode.parentNode;
  while (startNode && startNode !== editorContent) {
    if (startNode.tagName === 'CODE' && startNode.parentElement?.tagName !== 'PRE') {
      return startNode;
    }
    startNode = startNode.parentNode;
  }

  // 3. Check inside range if container has <code>
  if (range.commonAncestorContainer.nodeType === 1) {
    const codeWithin = range.commonAncestorContainer.querySelector('code');
    if (codeWithin && codeWithin.parentElement?.tagName !== 'PRE') {
      return codeWithin;
    }
  }

  return null;
}

// ============ Toast Notifications ============
function showToast(message, actionText = null, actionUrl = null) {
  const toast = document.createElement('div');
  toast.className = 'toast';

  const textSpan = document.createElement('span');
  textSpan.textContent = message;
  toast.appendChild(textSpan);

  if (actionText && actionUrl) {
    const link = document.createElement('a');
    link.href = actionUrl;
    link.target = '_blank';
    link.style.cssText = 'color:#a6e3a1;text-decoration:underline;margin-left:8px;font-weight:600;';
    link.textContent = actionText;
    toast.appendChild(link);
  }

  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('out');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ============ Prompt Modal Utility ============
let promptResolve = null;

function showPromptModal(title, description, placeholder = '', defaultValue = '') {
  saveCurrentSelection();
  return new Promise((resolve) => {
    promptResolve = resolve;
    promptTitle.textContent = title;
    promptDesc.textContent = description;
    promptInput.placeholder = placeholder;
    promptInput.value = defaultValue;
    promptModal.classList.add('active');
    setTimeout(() => {
      promptInput.focus();
      promptInput.select();
    }, 50);
  });
}

function closePromptModal(value = null) {
  promptModal.classList.remove('active');
  if (promptResolve) {
    promptResolve(value);
    promptResolve = null;
  }
}

promptCancel.addEventListener('click', () => closePromptModal(null));
promptConfirm.addEventListener('click', () => {
  const val = promptInput.value.trim();
  closePromptModal(val || null);
});
promptInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    const val = promptInput.value.trim();
    closePromptModal(val || null);
  } else if (e.key === 'Escape') {
    closePromptModal(null);
  }
});
promptModal.addEventListener('click', (e) => {
  if (e.target === promptModal) closePromptModal(null);
});

// ============ Pagination State ============
let editorCurrentPage = 1;
let editorPageLimit = 10;
let editorPaginationData = null;

// ============ API Client ============
function getAuthToken() {
  return localStorage.getItem('kushal_blog_jwt') || 'open-access-token';
}
function authHeaders(extra = {}) {
  const token = getAuthToken();
  const headers = { ...extra };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function safeParseJson(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status}: ${text.substring(0, 80).replace(/<[^>]*>/g, '').trim() || res.statusText}`);
    }
    throw new Error(`Invalid response: ${text.substring(0, 80).replace(/<[^>]*>/g, '').trim()}`);
  }
}

async function apiFetchPosts(page = editorCurrentPage, limit = editorPageLimit) {
  let url = `${API_BASE}/posts?page=${page}&limit=${limit}`;
  if (currentFilter && currentFilter !== 'all') {
    url += `&status=${currentFilter}`;
  }
  const res = await fetch(url);
  const data = await safeParseJson(res);
  posts = data.posts || [];
  editorPaginationData = data.pagination || null;
  return posts;
}

async function apiCreatePost(postData) {
  let targetUrl = `${API_BASE}/posts`;
  try {
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(postData),
    });
    if (res.ok) return await safeParseJson(res);
    throw new Error(`Server status ${res.status}`);
  } catch (netErr) {
    const fallbackBase = API_BASE.includes('localhost') ? LIVE_RENDER_API : 'http://localhost:3002/api';
    try {
      const fbRes = await fetch(`${fallbackBase}/posts`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(postData),
      });
      if (fbRes.ok) return await safeParseJson(fbRes);
    } catch {
      // fallback failed, continue
    }
    throw netErr;
  }
}

async function apiUpdatePost(id, data) {
  let targetUrl = `${API_BASE}/posts/${id}`;
  try {
    const res = await fetch(targetUrl, {
      method: 'PUT',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data),
    });
    if (res.ok) return await safeParseJson(res);
    throw new Error(`Server status ${res.status}`);
  } catch (netErr) {
    const fallbackBase = API_BASE.includes('localhost') ? LIVE_RENDER_API : 'http://localhost:3002/api';
    try {
      const fbRes = await fetch(`${fallbackBase}/posts/${id}`, {
        method: 'PUT',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(data),
      });
      if (fbRes.ok) return await safeParseJson(fbRes);
    } catch {
      // fallback failed, continue
    }
    throw netErr;
  }
}

async function apiTogglePublish(id) {
  const res = await fetch(`${API_BASE}/posts/${id}/publish`, {
    method: 'PUT',
    headers: authHeaders(),
  });
  return await safeParseJson(res);
}

async function apiDeletePost(id) {
  const res = await fetch(`${API_BASE}/posts/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return await safeParseJson(res);
}

async function apiGetPost(id) {
  const res = await fetch(`${API_BASE}/posts/${id}`);
  return await safeParseJson(res);
}

async function apiUploadFile(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    headers: authHeaders(),
    body: formData,
  });
  return await safeParseJson(res);
}

async function apiUploadImage(file) {
  // Try Cloudinary first if configured and active
  if (isCloudinaryActive()) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.secure_url) {
        return { success: true, imageUrl: data.secure_url, provider: 'cloudinary' };
      }
      if (data.error) {
        console.warn('Cloudinary upload error:', data.error.message);
      }
    } catch (e) {
      console.warn('Cloudinary upload failed, falling back to local:', e);
    }
  }
  // Fallback to local upload
  const formData = new FormData();
  formData.append('image', file);
  const res = await fetch(`${API_BASE}/upload-image`, {
    method: 'POST',
    headers: authHeaders(),
    body: formData,
  });
  return await safeParseJson(res);
}

async function apiGetProfile() {
  const res = await fetch(`${API_BASE}/profile`);
  if (!res.ok) throw new Error('Failed to fetch profile');
  return await safeParseJson(res);
}

async function apiUpdateProfile(profileData) {
  const res = await fetch(`${API_BASE}/profile`, {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(profileData),
  });
  if (!res.ok) throw new Error('Failed to update profile');
  return await safeParseJson(res);
}

// Homepage config API
async function apiGetHomepage() {
  const res = await fetch(`${API_BASE}/homepage`);
  return await safeParseJson(res);
}

async function apiUpdateHomepage(data) {
  const res = await fetch(`${API_BASE}/homepage`, {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
  return await safeParseJson(res);
}

// Projects API
async function apiGetProjects() {
  const res = await fetch(`${API_BASE}/projects`);
  return await safeParseJson(res);
}

async function apiUpdateProjects(data) {
  const res = await fetch(`${API_BASE}/projects`, {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
  return await safeParseJson(res);
}

async function apiCreateProject(data) {
  const res = await fetch(`${API_BASE}/projects`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
  return await safeParseJson(res);
}

async function apiUpdateProject(id, data) {
  const res = await fetch(`${API_BASE}/projects/${id}`, {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
  return await safeParseJson(res);
}

async function apiDeleteProject(id) {
  const res = await fetch(`${API_BASE}/projects/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return await safeParseJson(res);
}

function handleAuthExpired() {
  // Authentication disabled per user request - no-op
}

let allAvailableTags = [];
async function apiFetchTags() {
  try {
    const res = await fetch(`${API_BASE}/tags`);
    const data = await res.json();
    allAvailableTags = data.tags || [];
  } catch {
    allAvailableTags = ['JavaScript', 'TypeScript', 'Python', 'Web Development', 'React', 'Node.js', 'System Architecture', 'Distributed Systems', 'CSS', 'HTML', 'Database'];
  }

}

// ============ Helpers ============
function formatDate(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

// Ensure editorContent always has at least a valid editable paragraph
function ensureEditorHasParagraph() {
  if (!editorContent.innerHTML.trim() || editorContent.innerHTML.trim() === '<br>') {
    editorContent.innerHTML = '<p><br></p>';
  }
}

const curateView = document.getElementById('curate-view');
const btnNavCurate = document.getElementById('btn-nav-curate');
const projectsView = document.getElementById('projects-view');
const btnNavProjects = document.getElementById('btn-nav-projects');

function resetNavTabs() {
  btnNavStories?.classList.remove('active');
  btnNavProjects?.classList.remove('active');
  btnNavCurate?.classList.remove('active');
  btnNavProfile?.classList.remove('active');
}

function hideAllViews() {
  storiesView.style.display = 'none';
  if (profileView) profileView.style.display = 'none';
  if (curateView) curateView.style.display = 'none';
  if (projectsView) projectsView.style.display = 'none';
  editorView.style.display = 'none';
}

// ============ View Switching ============
function showStoriesView() {
  hideAllViews();
  storiesView.style.display = '';
  topnavStories.style.display = '';
  topnavEditor.style.display = 'none';
  resetNavTabs();
  btnNavStories?.classList.add('active');
  currentPostId = null;
  document.title = "Your Stories — Stories";
  loadStories();
}

function showProjectsView() {
  hideAllViews();
  if (projectsView) projectsView.style.display = '';
  topnavStories.style.display = '';
  topnavEditor.style.display = 'none';
  resetNavTabs();
  btnNavProjects?.classList.add('active');
  currentPostId = null;
  document.title = "Projects & Open Source — Stories";
  loadProjectsList();
}
window.showProjectsView = showProjectsView;

function showProfileView() {
  hideAllViews();
  if (profileView) profileView.style.display = '';
  topnavStories.style.display = '';
  topnavEditor.style.display = 'none';
  resetNavTabs();
  btnNavProfile?.classList.add('active');
  currentPostId = null;
  document.title = "Profile — Stories";
  loadProfile();
}

function showCurateView() {
  hideAllViews();
  if (curateView) curateView.style.display = '';
  topnavStories.style.display = '';
  topnavEditor.style.display = 'none';
  resetNavTabs();
  btnNavCurate?.classList.add('active');
  currentPostId = null;
  document.title = "Hero & Curation Studio — Stories";
  loadCurationData();
}
window.showCurateView = showCurateView;

function showEditorView(postId = null) {
  if (!isAuthorLoggedIn || !getAuthToken()) {
    showToast('Please log in to write or edit stories');
    openLoginModal();
    return;
  }

  hideAllViews();
  editorView.style.display = '';
  topnavStories.style.display = 'none';
  topnavEditor.style.display = '';
  document.title = "Write — Stories";

  if (postId) {
    currentPostId = postId;
    loadPostIntoEditor(postId);
  } else {
    currentPostId = null;
    currentPostMatchCoverBackground = true;
    editorTitle.textContent = '';
    editorSubtitle.textContent = '';
    editorContent.innerHTML = '<p><br></p>';
    coverImageUrl = '';
    updateCoverUI();
    saveStatus.textContent = 'New draft';
    btnPublishNav.textContent = 'Publish';
  }

  setTimeout(() => {
    updateToolbarActiveStates();
    if (!editorTitle.textContent.trim()) {
      editorTitle.focus();
    } else {
      editorContent.focus();
    }
  }, 100);
}

async function loadPostIntoEditor(postId) {
  try {
    const data = await apiGetPost(postId);
    const post = data.post;

    editorTitle.textContent = post.title || '';
    editorSubtitle.textContent = post.subtitle || '';

    // Strip duplicate leading <h1> if it matches post.title from markdown imports
    let cleanContent = post.content || '';
    cleanContent = cleanContent.replace(/^\s*<h1[^>]*>.*?<\/h1>\s*/i, '');
    if (!cleanContent.trim()) {
      cleanContent = '<p><br></p>';
    }
    editorContent.innerHTML = cleanContent;

    coverImageUrl = post.coverImage || '';
    currentPostMatchCoverBackground = post.matchCoverBackground !== false;
    updateCoverUI();

    // Initialize all code blocks, tables, and blockquotes
    initCodeBlocks();
    initTables();
    initBlockquotes();

    // Update status and publish button label
    if (post.published) {
      saveStatus.textContent = 'Published';
      btnPublishNav.textContent = 'Update';
    } else {
      saveStatus.textContent = 'Draft';
      btnPublishNav.textContent = 'Publish';
    }
  } catch (error) {
    showToast('Failed to load post');
    showStoriesView();
  }
}

// ============ Stories List ============
async function loadStories() {
  try {
    await apiFetchPosts();
    renderStories();
  } catch {
    storiesList.innerHTML = `
      <div class="stories-empty">
        <div class="stories-empty-icon">⚠️</div>
        <h2 class="stories-empty-title">Could not load stories</h2>
        <p class="stories-empty-text">Make sure the editor backend is running on port 3002.</p>
      </div>
    `;
  }
}

let currentEditorView = localStorage.getItem('editor_view_mode') || 'list';
const selectedStoryIds = new Set();

function updateBulkUI() {
  const bulkBar = document.getElementById('bulk-actions-bar');
  const countBadge = document.getElementById('bulk-selected-count');
  const selectAllToggle = document.getElementById('stories-select-all-toggle');

  let filtered = posts;
  if (currentFilter === 'published') filtered = posts.filter(p => p.published);
  else if (currentFilter === 'drafts') filtered = posts.filter(p => !p.published);

  const visibleIds = filtered.map(p => p.id);
  const selectedVisible = visibleIds.filter(id => selectedStoryIds.has(id));

  if (selectAllToggle) {
    if (visibleIds.length > 0 && selectedVisible.length === visibleIds.length) {
      selectAllToggle.classList.add('is-active');
    } else {
      selectAllToggle.classList.remove('is-active');
    }
  }

  if (selectedStoryIds.size === 0) {
    if (bulkBar) bulkBar.style.display = 'none';
    return;
  }

  if (bulkBar) bulkBar.style.display = 'block';
  if (countBadge) {
    countBadge.textContent = `${selectedStoryIds.size} ${selectedStoryIds.size === 1 ? 'story' : 'stories'} selected`;
  }
}

window.toggleStorySelect = function (id) {
  if (selectedStoryIds.has(id)) {
    selectedStoryIds.delete(id);
  } else {
    selectedStoryIds.add(id);
  }

  // Update card selected state directly
  document.querySelectorAll('.story-item').forEach(card => {
    const indicator = card.querySelector(`.story-select-indicator[data-id="${id}"]`);
    if (indicator) {
      card.classList.toggle('is-selected', selectedStoryIds.has(id));
    }
  });

  updateBulkUI();
};

// ============ Editor Pagination Controls ============
function renderEditorPagination() {
  const container = document.getElementById('editor-pagination');
  if (!container) return;

  if (!editorPaginationData || editorPaginationData.totalPages <= 1) {
    container.style.display = 'none';
    container.innerHTML = '';
    return;
  }

  container.style.display = 'flex';
  const { page, totalPages, totalPosts, hasNext, hasPrev, limit } = editorPaginationData;

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

  container.innerHTML = `
    <div class="editor-page-info">
      Showing <strong>${(page - 1) * limit + 1}–${Math.min(page * limit, totalPosts)}</strong> of <strong>${totalPosts}</strong> stories
    </div>
    <div class="editor-pagination-nav">
      <button type="button" class="editor-page-btn" ${hasPrev ? '' : 'disabled'} onclick="goToEditorPage(${page - 1})">
        ← Prev
      </button>
      ${pages.map(p => {
        if (p === '...') return `<span style="padding:0 4px;color:var(--text-tertiary);">…</span>`;
        const isActive = p === page;
        return `
          <button type="button" class="editor-page-btn ${isActive ? 'active' : ''}" onclick="goToEditorPage(${p})">
            ${p}
          </button>
        `;
      }).join('')}
      <button type="button" class="editor-page-btn" ${hasNext ? '' : 'disabled'} onclick="goToEditorPage(${page + 1})">
        Next →
      </button>
    </div>
  `;
}

window.goToEditorPage = async function(p) {
  editorCurrentPage = p;
  await loadStories();
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// ============ Adaptive Image-Based Card Colors (Editor) ============
let isEditorAdaptiveColors = localStorage.getItem('kushal_editor_card_colors') !== 'false';
const _editorColorCache = new Map();

async function extractCoverColorEditor(imageUrl, storedColor = '') {
  if (storedColor && storedColor.startsWith('#')) {
    const hex = storedColor.slice(1);
    const r = parseInt(hex.substring(0, 2), 16) || 40;
    const g = parseInt(hex.substring(2, 4), 16) || 120;
    const b = parseInt(hex.substring(4, 6), 16) || 80;
    return { r, g, b };
  }
  if (!imageUrl) return null;
  if (_editorColorCache.has(imageUrl)) return _editorColorCache.get(imageUrl);

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
          _editorColorCache.set(imageUrl, res);
          resolve(res);
        } catch {
          const PALETTES = [{r:45,g:90,b:180},{r:26,g:137,b:80},{r:180,g:70,b:60},{r:130,g:60,b:180}];
          const res = PALETTES[Math.abs(imageUrl.length) % PALETTES.length];
          _editorColorCache.set(imageUrl, res);
          resolve(res);
        }
      };
      img.onerror = () => {
        const PALETTES = [{r:45,g:90,b:180},{r:26,g:137,b:80},{r:180,g:70,b:60},{r:130,g:60,b:180}];
        const res = PALETTES[Math.abs(imageUrl.length) % PALETTES.length];
        _editorColorCache.set(imageUrl, res);
        resolve(res);
      };
      img.src = imageUrl;
    } catch {
      resolve(null);
    }
  });
}

async function applyEditorCardColors() {
  // Cards on dashboard are strictly black and white - no cover tinting
  const cards = document.querySelectorAll('.story-item');
  cards.forEach((card) => {
    card.classList.remove('has-matched-card-bg', 'has-adaptive-color');
    card.style.removeProperty('--card-adaptive-bg');
    card.style.removeProperty('--card-adaptive-border');
    card.style.removeProperty('--card-adaptive-accent');
    card.style.removeProperty('--card-adaptive-glow');
    card.style.removeProperty('--card-adaptive-glow-hover');
  });
}

function initEditorMatchCoverBgToggle() {
  const btn = document.getElementById('btn-match-cover-toggle-editor');
  if (btn) {
    const updateBtn = () => {
      btn.classList.toggle('is-active', isEditorAdaptiveColors);
      btn.title = isEditorAdaptiveColors
        ? 'Match cover image background: ON (Click to disable and show default background)'
        : 'Match cover image background: OFF (Click to enable)';
      const dot = document.getElementById('match-cover-dot-editor');
      if (dot) dot.style.opacity = isEditorAdaptiveColors ? '1' : '0.4';
    };
    updateBtn();
    btn.addEventListener('click', () => {
      isEditorAdaptiveColors = !isEditorAdaptiveColors;
      localStorage.setItem('kushal_editor_card_colors', String(isEditorAdaptiveColors));
      updateBtn();
      applyEditorCardColors();
      showToast(isEditorAdaptiveColors
        ? 'Match cover image background: ON ✨'
        : 'Match cover image background: OFF (Default Black/White)'
      );
    });
  }

  // Story editor match bg switch
  const editorMatchToggle = document.getElementById('editor-match-bg-toggle');
  if (editorMatchToggle) {
    editorMatchToggle.addEventListener('change', (e) => {
      currentPostMatchCoverBackground = e.target.checked;
      const statusText = document.getElementById('editor-match-bg-status-text');
      if (statusText) statusText.textContent = currentPostMatchCoverBackground ? 'Enabled' : 'Disabled';
      scheduleAutoSave();
      showToast(`Match cover image background: ${currentPostMatchCoverBackground ? 'Enabled' : 'Disabled'}`);
    });
  }
}

// ============ Curation Studio Engine ============
let curationData = {
  heroPostId: null,
  pinnedPostIds: [],
  allPosts: []
};

async function loadCurationData() {
  try {
    const res = await fetch(`${API_BASE}/curation`);
    const data = await res.json();
    if (data.success) {
      curationData = {
        heroPostId: data.heroPostId,
        pinnedPostIds: data.pinnedPostIds || [],
        allPosts: data.allPosts || []
      };
      renderCurationUI();
    }
  } catch (err) {
    console.error('Failed to load curation:', err);
    showToast('Failed to load homepage layout data');
  }
}

function renderCurationUI() {
  const heroSelect = document.getElementById('curate-hero-select');
  const heroBadge = document.getElementById('curate-hero-badge');
  const heroPreview = document.getElementById('curate-hero-preview');
  const pinAddSelect = document.getElementById('curate-pin-add-select');

  // 1. Populate Hero Select
  if (heroSelect) {
    heroSelect.innerHTML = `<option value="">-- No custom hero (uses newest post) --</option>` +
      curationData.allPosts.map(p => `
        <option value="${p.id}" ${p.id === curationData.heroPostId ? 'selected' : ''}>
          ${escapeHtml(p.title)} ${p.published ? '✓' : '(Draft)'}
        </option>
      `).join('');

    heroSelect.onchange = () => {
      curationData.heroPostId = heroSelect.value || null;
      updateHeroPreview();
    };
  }

  function updateHeroPreview() {
    const heroPost = curationData.allPosts.find(p => p.id === curationData.heroPostId);
    if (heroBadge) heroBadge.style.display = heroPost ? 'inline-block' : 'none';
    if (!heroPreview) return;

    if (!heroPost) {
      heroPreview.style.display = 'none';
      heroPreview.innerHTML = '';
      return;
    }

    heroPreview.style.display = 'block';
    const coverSrc = heroPost.coverImage ? getEditorBackendUrl(heroPost.coverImage) : '';

    heroPreview.innerHTML = `
      <div style="display: flex; gap: 16px; align-items: center;">
        ${coverSrc ? `<img src="${coverSrc}" style="width: 80px; height: 60px; object-fit: cover; border-radius: 8px; flex-shrink: 0;" />` : ''}
        <div style="flex: 1; min-width: 0;">
          <h4 style="font-size: 16px; font-weight: 700; margin: 0 0 4px 0; color: var(--text);">${escapeHtml(heroPost.title)}</h4>
          <p style="font-size: 13px; color: var(--text-secondary); margin: 0;">Featured Hero Story • ${heroPost.published ? 'Published' : 'Draft'}</p>
        </div>
        <button type="button" class="btn-ghost-sm danger" onclick="clearHeroPost()">Remove Hero</button>
      </div>
    `;
  }

  window.clearHeroPost = function() {
    curationData.heroPostId = null;
    if (heroSelect) heroSelect.value = '';
    updateHeroPreview();
  };

  updateHeroPreview();

  // 2. Populate Pin Add Select
  if (pinAddSelect) {
    const unpinned = curationData.allPosts.filter(p => !curationData.pinnedPostIds.includes(p.id));
    pinAddSelect.innerHTML = `<option value="">+ Select story to Pin...</option>` +
      unpinned.map(p => `
        <option value="${p.id}">
          ${escapeHtml(p.title)} ${p.published ? '✓' : '(Draft)'}
        </option>
      `).join('');
  }

  renderCuratedPinnedList();
}

function renderCuratedPinnedList() {
  const container = document.getElementById('curate-pinned-list');
  if (!container) return;

  if (curationData.pinnedPostIds.length === 0) {
    container.innerHTML = `
      <div style="padding: 24px; text-align: center; border: 1.5px dashed var(--border); border-radius: 12px; color: var(--text-secondary); font-size: 14px;">
        No stories pinned yet. Use "+ Select story to Pin" above to curate your top order.
      </div>
    `;
    return;
  }

  container.innerHTML = curationData.pinnedPostIds.map((id, index) => {
    const post = curationData.allPosts.find(p => p.id === id) || { id, title: 'Unknown story', published: true };
    const coverSrc = post.coverImage ? getEditorBackendUrl(post.coverImage) : '';

    return `
      <div class="curate-pin-item">
        <span class="curate-pin-order-badge">#${index + 1}</span>
        ${coverSrc ? `<img src="${coverSrc}" class="curate-pin-thumb" />` : '<div class="curate-pin-thumb" style="display:flex;align-items:center;justify-content:center;font-size:18px;">📄</div>'}
        <div class="curate-pin-info">
          <div class="curate-pin-title">${escapeHtml(post.title)}</div>
          <div class="curate-pin-meta">${post.published ? 'Published' : 'Draft'} • Order #${index + 1} on homepage</div>
        </div>
        <div class="curate-pin-actions">
          <button type="button" class="curate-action-btn" title="Move Up (Put earlier)" ${index === 0 ? 'disabled' : ''} onclick="movePinItem(${index}, -1)">▲</button>
          <button type="button" class="curate-action-btn" title="Move Down (Put later)" ${index === curationData.pinnedPostIds.length - 1 ? 'disabled' : ''} onclick="movePinItem(${index}, 1)">▼</button>
          <button type="button" class="curate-action-btn danger" title="Unpin" onclick="removePinItem(${index})">✕</button>
        </div>
      </div>
    `;
  }).join('');
}

window.movePinItem = function(index, direction) {
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= curationData.pinnedPostIds.length) return;
  const temp = curationData.pinnedPostIds[index];
  curationData.pinnedPostIds[index] = curationData.pinnedPostIds[targetIndex];
  curationData.pinnedPostIds[targetIndex] = temp;
  renderCuratedPinnedList();
};

window.removePinItem = function(index) {
  curationData.pinnedPostIds.splice(index, 1);
  renderCurationUI();
};

// Wire Add Pin Button
const btnAddPin = document.getElementById('btn-add-pin-story');
if (btnAddPin) {
  btnAddPin.onclick = () => {
    const select = document.getElementById('curate-pin-add-select');
    const selectedId = select?.value;
    if (!selectedId) {
      showToast('Please select a story to pin');
      return;
    }
    if (!curationData.pinnedPostIds.includes(selectedId)) {
      curationData.pinnedPostIds.push(selectedId);
      renderCurationUI();
      showToast('Story pinned! Arrange its position with ▲ and ▼.');
    }
  };
}

// Wire Save Curation Button
const btnSaveCuration = document.getElementById('btn-save-curation');
if (btnSaveCuration) {
  btnSaveCuration.onclick = async () => {
    btnSaveCuration.disabled = true;
    btnSaveCuration.textContent = 'Saving layout...';
    const statusMsg = document.getElementById('curate-save-status');

    try {
      const res = await fetch(`${API_BASE}/curation`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          heroPostId: curationData.heroPostId,
          pinnedPostIds: curationData.pinnedPostIds
        })
      });
      const data = await res.json();
      if (data.success) {
        if (statusMsg) {
          statusMsg.textContent = 'Homepage layout saved successfully! 🎉';
          setTimeout(() => { if (statusMsg) statusMsg.textContent = ''; }, 3500);
        }
        showToast('Homepage layout saved! Live on display.');
        await loadStories();
      } else {
        throw new Error(data.error || 'Failed to save');
      }
    } catch (err) {
      showToast('Failed to save layout: ' + err.message);
    } finally {
      btnSaveCuration.disabled = false;
      btnSaveCuration.textContent = 'Save Homepage Layout';
    }
  };
}

// Quick action from story card
window.quickSetHero = async function(id) {
  try {
    await fetch(`${API_BASE}/curation`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ heroPostId: id, pinnedPostIds: curationData.pinnedPostIds })
    });
    showToast('Set as Homepage Hero! 👑');
    await loadStories();
  } catch {
    showToast('Failed to set hero');
  }
};

window.quickTogglePin = async function(id) {
  try {
    let pins = curationData.pinnedPostIds.slice();
    if (pins.includes(id)) {
      pins = pins.filter(p => p !== id);
      showToast('Story unpinned');
    } else {
      pins.push(id);
      showToast('Story pinned to homepage! 📌');
    }
    await fetch(`${API_BASE}/curation`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ heroPostId: curationData.heroPostId, pinnedPostIds: pins })
    });
    await loadStories();
  } catch {
    showToast('Failed to update pin');
  }
};

// ============ Render Stories ============
function renderStories() {
  let filtered = posts;
  if (currentFilter === 'published') filtered = posts.filter(p => p.published);
  else if (currentFilter === 'drafts') filtered = posts.filter(p => !p.published);

  if (filtered.length === 0) {
    const msg = currentFilter === 'all'
      ? 'You haven\'t written any stories yet.'
      : `No ${currentFilter} stories on this page.`;
    storiesList.innerHTML = `
      <div class="stories-empty">
        <div class="stories-empty-icon">✍️</div>
        <h2 class="stories-empty-title">No stories</h2>
        <p class="stories-empty-text">${msg}</p>
        <button class="btn-write" onclick="showEditorView()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
          Write your first story
        </button>
      </div>
    `;
    renderEditorPagination();
    updateBulkUI();
    return;
  }

  storiesList.className = `stories-list view-${currentEditorView}`;

  storiesList.innerHTML = filtered.map((post, i) => {
    const status = post.published ? 'published' : 'draft';
    const statusLabel = post.published ? 'Published' : 'Draft';
    const rawPreview = post.contentPreview || post.subtitle || '';
    const cleanPreview = rawPreview.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();
    const excerpt = cleanPreview.substring(0, 160);
    const isSelected = selectedStoryIds.has(post.id);

    const coverUrl = post.coverImage ? getEditorBackendUrl(post.coverImage) : '';
    const coverColor = post.coverColor || '';

    const heroBadge = post.isHero ? `<span class="story-item-status" style="background:#e0f2fe;color:#0284c7;font-weight:700;">👑 Hero</span>` : '';
    const pinBadge = post.isPinned ? `<span class="story-item-status" style="background:#fef3c7;color:#d97706;font-weight:700;">📌 Pinned #${post.pinOrder}</span>` : '';

    const matchBgActive = post.matchCoverBackground !== false;
    const matchBgBtn = post.coverImage ? `
      <button class="story-action-btn ${matchBgActive ? 'active' : ''}" style="${matchBgActive ? 'color:#2ea043;' : 'opacity:0.4;'}" title="Match cover image background: ${matchBgActive ? 'Enabled' : 'Disabled'} (Click to toggle)" onclick="event.stopPropagation(); togglePostMatchBg('${post.id}', ${!matchBgActive})">
        🖼️
      </button>
    ` : '';

    // Compact layout
    if (currentEditorView === 'compact') {
      return `
        <div class="story-item is-${status} ${isSelected ? 'is-selected' : ''}" data-cover="${escapeHtml(coverUrl)}" data-color="${escapeHtml(coverColor)}" data-match-bg="${matchBgActive ? 'true' : 'false'}" style="animation-delay:${i * 0.03}s">
          <div class="story-select-indicator" data-id="${post.id}" onclick="event.stopPropagation(); toggleStorySelect('${post.id}')" title="${isSelected ? 'Deselect' : 'Select'}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div class="story-item-body" onclick="showEditorView('${post.id}')">
            <div style="display:flex;gap:6px;align-items:center;">
              <span class="story-item-status ${status}">${statusLabel}</span>
              ${heroBadge}
              ${pinBadge}
            </div>
            <h3 class="story-item-title">${escapeHtml(post.title)}</h3>
            <div class="story-item-meta">
              <span>${formatDate(post.createdAt)}</span>
            </div>
          </div>
          <div class="story-item-actions">
            ${matchBgBtn}
            <button class="story-action-btn" title="Homepage Curation (Hero / Order)" onclick="event.stopPropagation(); showCurateView()">
              👑
            </button>
            <button class="story-action-btn" title="${post.published ? 'Unpublish' : 'Publish'}" onclick="event.stopPropagation(); handleTogglePublish('${post.id}')">
              ${post.published
                ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a8917" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'
                : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>'
              }
            </button>
            <button class="story-action-btn danger" title="Delete" onclick="event.stopPropagation(); handleDelete('${post.id}', '${escapeHtml(post.title).replace(/'/g, "\\\'")}')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </div>
      `;
    }

    // List & Grid layout
    const coverHtml = post.coverImage
      ? `<div class="story-item-cover"><img src="${coverUrl}" alt="${escapeHtml(post.title)}" /></div>`
      : '';

    return `
      <div class="story-item is-${status} ${post.coverImage ? 'has-cover' : 'no-cover'} ${isSelected ? 'is-selected' : ''}" data-cover="${escapeHtml(coverUrl)}" data-color="${escapeHtml(coverColor)}" data-match-bg="${matchBgActive ? 'true' : 'false'}" style="animation-delay:${i * 0.04}s">
        <div class="story-select-indicator" data-id="${post.id}" onclick="event.stopPropagation(); toggleStorySelect('${post.id}')" title="${isSelected ? 'Deselect' : 'Select'}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        ${coverHtml}
        <div class="story-item-body" onclick="showEditorView('${post.id}')">
          <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:6px;">
            <span class="story-item-status ${status}">${statusLabel}</span>
            ${heroBadge}
            ${pinBadge}
          </div>
          <h3 class="story-item-title">${escapeHtml(post.title)}</h3>
          ${excerpt ? `<p class="story-item-excerpt">${escapeHtml(excerpt)}</p>` : ''}
          <div class="story-item-meta">
            <span>${formatDate(post.createdAt)}</span>
            ${(post.tags || []).length ? `<span class="story-item-meta-dot"></span><span>${post.tags.slice(0, 2).join(', ')}</span>` : ''}
          </div>
        </div>
        <div class="story-item-actions">
          ${matchBgBtn}
          <button class="story-action-btn" title="Homepage Curation (Hero / Order)" onclick="event.stopPropagation(); showCurateView()">
            👑
          </button>
          <button class="story-action-btn" title="${post.published ? 'Unpublish' : 'Publish'}" onclick="event.stopPropagation(); handleTogglePublish('${post.id}')">
            ${post.published
              ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a8917" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'
              : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>'
            }
          </button>
          <button class="story-action-btn danger" title="Delete" onclick="event.stopPropagation(); handleDelete('${post.id}', '${escapeHtml(post.title).replace(/'/g, "\\\'")}')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
    `;
  }).join('');

  window.togglePostMatchBg = async function(id, enable) {
    try {
      await apiUpdatePost(id, { matchCoverBackground: enable });
      showToast(`Match cover image background: ${enable ? 'Enabled' : 'Disabled'}`);
      await loadStories();
    } catch {
      showToast('Failed to update Match cover background');
    }
  };

  renderEditorPagination();
  applyEditorCardColors();
  updateBulkUI();
}

// Select All Toggle (button-based, no checkbox)
const selectAllToggle = document.getElementById('stories-select-all-toggle');
if (selectAllToggle) {
  selectAllToggle.addEventListener('click', () => {
    let filtered = posts;
    if (currentFilter === 'published') filtered = posts.filter(p => p.published);
    else if (currentFilter === 'drafts') filtered = posts.filter(p => !p.published);

    const visibleIds = filtered.map(p => p.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every(id => selectedStoryIds.has(id));

    if (allSelected) {
      // Deselect all
      filtered.forEach(p => selectedStoryIds.delete(p.id));
    } else {
      // Select all
      filtered.forEach(p => selectedStoryIds.add(p.id));
    }
    renderStories();
  });
}

document.getElementById('btn-bulk-publish')?.addEventListener('click', async () => {
  if (selectedStoryIds.size === 0) return;
  const ids = Array.from(selectedStoryIds);
  try {
    const res = await fetch(`${API_BASE}/posts/bulk-publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, published: true })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`${ids.length} ${ids.length === 1 ? 'story' : 'stories'} published`);
      selectedStoryIds.clear();
      await loadStories();
    } else {
      showToast(data.error || 'Failed to publish stories');
    }
  } catch (err) {
    showToast('Failed to publish stories');
  }
});

document.getElementById('btn-bulk-draft')?.addEventListener('click', async () => {
  if (selectedStoryIds.size === 0) return;
  const ids = Array.from(selectedStoryIds);
  try {
    const res = await fetch(`${API_BASE}/posts/bulk-publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, published: false })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`${ids.length} ${ids.length === 1 ? 'story reverted' : 'stories reverted'} to draft`);
      selectedStoryIds.clear();
      await loadStories();
    } else {
      showToast(data.error || 'Failed to revert stories to draft');
    }
  } catch (err) {
    showToast('Failed to revert stories to draft');
  }
});

document.getElementById('btn-bulk-delete')?.addEventListener('click', () => {
  if (selectedStoryIds.size === 0) return;
  const count = selectedStoryIds.size;
  const overlay = document.createElement('div');
  overlay.className = 'confirm-overlay';
  overlay.innerHTML = `
    <div class="confirm-dialog">
      <h3>Delete ${count} stories</h3>
      <p>Are you sure you want to delete ${count} selected stories? This action cannot be undone.</p>
      <div class="confirm-actions">
        <button class="confirm-cancel" id="bulk-confirm-cancel">Cancel</button>
        <button class="confirm-danger" id="bulk-confirm-delete">Delete all</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector('#bulk-confirm-cancel').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#bulk-confirm-delete').addEventListener('click', async () => {
    const ids = Array.from(selectedStoryIds);
    try {
      const res = await fetch(`${API_BASE}/posts/bulk-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`${ids.length} ${ids.length === 1 ? 'story' : 'stories'} deleted`);
        selectedStoryIds.clear();
        overlay.remove();
        await loadStories();
      } else {
        showToast(data.error || 'Failed to delete stories');
        overlay.remove();
      }
    } catch {
      showToast('Failed to delete stories');
      overlay.remove();
    }
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
});

document.getElementById('btn-bulk-clear')?.addEventListener('click', () => {
  selectedStoryIds.clear();
  renderStories();
});

// In-line Write button inside Your Stories header
document.getElementById('btn-stories-write')?.addEventListener('click', () => {
  if (!isAuthorLoggedIn) {
    openLoginModal();
    return;
  }
  showEditorView();
});

// View Switcher logic
function initViewSwitcher() {
  const switcher = document.getElementById('editor-view-switcher');
  if (!switcher) return;

  switcher.querySelectorAll('.view-switch-btn').forEach(btn => {
    btn.onclick = () => {
      currentEditorView = btn.dataset.view;
      localStorage.setItem('editor_view_mode', currentEditorView);
      updateViewSwitcherUI();
      renderStories();
    };
  });

  updateViewSwitcherUI();
}

function updateViewSwitcherUI() {
  const switcher = document.getElementById('editor-view-switcher');
  if (switcher) {
    switcher.querySelectorAll('.view-switch-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === currentEditorView);
    });
  }
  if (storiesList) {
    storiesList.className = `stories-list view-${currentEditorView}`;
  }
}

// ============ Tab Filtering ============
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentFilter = tab.dataset.filter;
    editorCurrentPage = 1;
    loadStories();
  });
});

// ============ Top Nav Links & Dropdown ============
btnNavStories?.addEventListener('click', () => showStoriesView());
btnNavProjects?.addEventListener('click', () => showProjectsView());
btnNavCurate?.addEventListener('click', () => showCurateView());
btnNavProfile?.addEventListener('click', () => showProfileView());
document.getElementById('btn-dropdown-profile')?.addEventListener('click', () => showProfileView());
document.getElementById('nav-dropdown-open-profile')?.addEventListener('click', () => showProfileView());

// GitHub Profile Link Save
document.getElementById('btn-save-github-link')?.addEventListener('click', saveGithubSettings);

// Project Modal & Form
document.getElementById('btn-open-add-project')?.addEventListener('click', () => openProjectModal());
document.getElementById('project-modal-close')?.addEventListener('click', closeProjectModal);
document.getElementById('btn-cancel-project-modal')?.addEventListener('click', closeProjectModal);
document.getElementById('project-form')?.addEventListener('submit', handleProjectSubmit);
document.getElementById('project-modal-overlay')?.addEventListener('click', (e) => {
  if (e.target === document.getElementById('project-modal-overlay')) closeProjectModal();
});

// Dropdown Write button
document.getElementById('btn-dropdown-write')?.addEventListener('click', () => {
  if (!isAuthorLoggedIn || !getAuthToken()) {
    openLoginModal();
    return;
  }
  showEditorView();
});
document.getElementById('btn-back-to-stories')?.addEventListener('click', async () => {
  await autoSave();
  showStoriesView();
});
document.getElementById('logo-link').addEventListener('click', (e) => {
  e.preventDefault();
  showStoriesView();
});

// ============ Auto-Save ============
function scheduleAutoSave() {
  clearTimeout(saveTimeout);
  if (saveStatus) saveStatus.textContent = 'Saving...';
  saveTimeout = setTimeout(() => autoSave(), 800);
}

async function autoSave() {
  const title = editorTitle.textContent.trim();
  const subtitle = editorSubtitle.textContent.trim();
  const content = editorContent.innerHTML.trim();

  if (!title && (!content || content === '<p><br></p>')) return;

  // 1. Immediately cache in localStorage so user work is NEVER lost
  try {
    const draftKey = currentPostId ? `kushal_draft_${currentPostId}` : 'kushal_editor_draft_current';
    localStorage.setItem(draftKey, JSON.stringify({
      id: currentPostId,
      title,
      subtitle,
      content,
      coverImageUrl,
      matchCoverBackground: currentPostMatchCoverBackground,
      savedAt: new Date().toISOString()
    }));
  } catch (storageErr) {
    console.warn('LocalStorage draft cache notice:', storageErr);
  }

  try {
    if (currentPostId) {
      const res = await apiUpdatePost(currentPostId, {
        title,
        subtitle,
        content,
        coverImage: coverImageUrl,
        matchCoverBackground: currentPostMatchCoverBackground,
      });
      if (res && res.post) {
        const idx = posts.findIndex(p => p.id === currentPostId);
        if (idx !== -1) posts[idx] = { ...posts[idx], ...res.post };
      }
    } else {
      const data = await apiCreatePost({
        title: title || 'Untitled',
        subtitle,
        content: content || '<p><br></p>',
        coverImage: coverImageUrl,
        matchCoverBackground: currentPostMatchCoverBackground,
      });
      if (data && data.success && data.post) {
        currentPostId = data.post.id;
        const exists = posts.some(p => p.id === currentPostId);
        if (!exists) posts.unshift(data.post);
      }
    }
    const post = posts.find(p => p.id === currentPostId);
    if (saveStatus) saveStatus.textContent = post?.published ? 'Published' : 'Saved';
  } catch (err) {
    console.warn('Backend save error, draft saved locally:', err);
    if (saveStatus) {
      saveStatus.textContent = 'Saved locally';
      saveStatus.title = 'Saved to browser storage. Will sync to server when available.';
    }
  }
}

editorTitle.addEventListener('input', scheduleAutoSave);
editorSubtitle.addEventListener('input', scheduleAutoSave);
editorContent.addEventListener('input', () => {
  ensureEditorHasParagraph();
  saveCurrentSelection();
  scheduleAutoSave();
  updateSideToolbarPosition();
  initBlockquotes();
});

// Paste Image Support (including pasting inside blockquotes!)
editorContent.addEventListener('paste', async (e) => {
  const items = e.clipboardData?.items;
  if (!items) return;

  for (let i = 0; i < items.length; i++) {
    if (items[i].type.startsWith('image/')) {
      const file = items[i].getAsFile();
      if (!file) continue;

      e.preventDefault();
      try {
        const data = await apiUploadImage(file);
        if (data.success) {
          const fullUrl = getEditorBackendUrl(data.imageUrl);
          const currentBlock = getClosestBlock();

          if (currentBlock && (currentBlock.tagName === 'BLOCKQUOTE' || currentBlock.closest?.('blockquote'))) {
            const bq = currentBlock.tagName === 'BLOCKQUOTE' ? currentBlock : currentBlock.closest('blockquote');
            const img = document.createElement('img');
            img.src = fullUrl;
            img.alt = file.name || 'Pasted image';
            const actionsBar = bq.querySelector(':scope > .quote-actions-bar');
            if (actionsBar) {
              bq.insertBefore(img, actionsBar);
            } else {
              bq.appendChild(img);
            }
            initBlockquotes();
            scheduleAutoSave();
            showToast('Image pasted into quote');
            return;
          }

          const imgHtml = `
            <figure>
              <img src="${fullUrl}" alt="${escapeHtml(file.name || 'Image')}" />
              <figcaption contenteditable="true" data-placeholder="Type caption for image (optional)"><br></figcaption>
            </figure>
            <p><br></p>
          `;
          insertComponentHtml(imgHtml);
          scheduleAutoSave();
          showToast('Image uploaded');
          return;
        }
      } catch {
        showToast('Failed to paste image');
      }
    }
  }
});

// Handle Enter navigation in title & subtitle
editorTitle.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    editorSubtitle.focus();
  }
});
editorSubtitle.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    editorContent.focus();
  }
});

// ============ Enter Key Formatter, Backtick & Reset ============
// When user presses Enter in Headings or Blockquotes, break out into clean normal paragraph!
editorContent.addEventListener('keydown', (e) => {
  // 0. Backtick key (`): wrap selection in inline code
  if (e.key === '`') {
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed && sel.rangeCount > 0) {
      e.preventDefault();
      toggleInlineCode();
      return;
    }
  }

  // Ctrl+E or Ctrl+` shortcut for inline code
  if ((e.ctrlKey || e.metaKey) && (e.key === 'e' || e.key === '`')) {
    e.preventDefault();
    toggleInlineCode();
    return;
  }

  // 1. Inline code exiting on Space or ArrowRight at the end of inline code
  const inlineCode = getClosestInlineCode();
  if (inlineCode) {
    const sel = window.getSelection();
    if (sel && sel.isCollapsed && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      const isAtEnd = (range.endContainer.nodeType === 3 && range.endOffset >= range.endContainer.length) ||
                      (range.endContainer === inlineCode && range.endOffset >= inlineCode.childNodes.length);

      if (isAtEnd && (e.key === ' ' || e.key === 'ArrowRight')) {
        if (e.key === ' ') {
          e.preventDefault();
          const spaceNode = document.createTextNode(' ');
          if (inlineCode.nextSibling) {
            inlineCode.parentNode.insertBefore(spaceNode, inlineCode.nextSibling);
          } else {
            inlineCode.parentNode.appendChild(spaceNode);
          }
          const newRange = document.createRange();
          newRange.setStart(spaceNode, 1);
          newRange.collapse(true);
          sel.removeAllRanges();
          sel.addRange(newRange);
          scheduleAutoSave();
          return;
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          let nextNode = inlineCode.nextSibling;
          if (!nextNode) {
            nextNode = document.createTextNode('');
            inlineCode.parentNode.appendChild(nextNode);
          }
          const newRange = document.createRange();
          newRange.setStart(nextNode, 0);
          newRange.collapse(true);
          sel.removeAllRanges();
          sel.addRange(newRange);
          return;
        }
      }
    }
  }

  // 2. Backspace inside empty blockquote -> revert to paragraph
  if (e.key === 'Backspace') {
    const block = getClosestBlock();
    if (block && block.tagName === 'BLOCKQUOTE') {
      const text = block.textContent.replace(/[\u200B\s]/g, '');
      if (!text) {
        e.preventDefault();
        const p = document.createElement('p');
        p.innerHTML = '<br>';
        block.replaceWith(p);
        const range = document.createRange();
        range.setStart(p, 0);
        range.collapse(true);
        const sel = window.getSelection();
        if (sel) {
          sel.removeAllRanges();
          sel.addRange(range);
        }
        scheduleAutoSave();
        updateSideToolbarPosition();
        return;
      }
    }
  }

  // 3. Enter key handling
  if (e.key === 'Enter' && !e.shiftKey) {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const block = getClosestBlock();

    // In Table cells -> insert line break or move
    if (block && (block.tagName === 'TH' || block.tagName === 'TD' || block.closest?.('th, td'))) {
      e.preventDefault();
      document.execCommand('insertLineBreak');
      return;
    }

    // In Headings -> break out to clean paragraph
    if (block && ['H1', 'H2', 'H3', 'H4'].includes(block.tagName)) {
      e.preventDefault();
      const p = document.createElement('p');
      p.innerHTML = '<br>';
      block.insertAdjacentElement('afterend', p);

      const range = document.createRange();
      range.setStart(p, 0);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);

      scheduleAutoSave();
      updateSideToolbarPosition();
      return;
    }

    // In Blockquotes
    if (block && block.tagName === 'BLOCKQUOTE') {
      const text = block.textContent.replace(/[\u200B\s]/g, '');

      // If quote is completely empty: break out to paragraph
      if (!text) {
        e.preventDefault();
        const p = document.createElement('p');
        p.innerHTML = '<br>';
        block.replaceWith(p);

        const newRange = document.createRange();
        newRange.setStart(p, 0);
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);

        scheduleAutoSave();
        updateSideToolbarPosition();
        return;
      }

      // If user pressed Enter after an already empty line in blockquote (double-Enter)
      if (block.innerHTML.endsWith('<br><br>') || block.innerHTML.endsWith('<br>')) {
        e.preventDefault();
        block.innerHTML = block.innerHTML.replace(/(<br\s*\/?>)+$/, '');
        const p = document.createElement('p');
        p.innerHTML = '<br>';
        block.insertAdjacentElement('afterend', p);

        const newRange = document.createRange();
        newRange.setStart(p, 0);
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);

        scheduleAutoSave();
        updateSideToolbarPosition();
        return;
      }

      // Single Enter: insert newline and stay inside the blockquote
      e.preventDefault();
      document.execCommand('insertLineBreak');
      return;
    }

    // Reset inline styling on new line
    setTimeout(() => {
      try {
        if (document.queryCommandState('bold')) document.execCommand('bold', false, null);
        if (document.queryCommandState('italic')) document.execCommand('italic', false, null);
        if (document.queryCommandState('strikethrough')) document.execCommand('strikethrough', false, null);
      } catch {
        // ignore
      }
    }, 10);
  }
});

// ============ Floating Toolbar & Format Bar ============
function updateFloatingToolbar() {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || !selection.rangeCount) {
    floatingToolbar?.classList.remove('visible');
    return;
  }

  const range = selection.getRangeAt(0);
  const editorArea = document.querySelector('.editor-container');
  if (!editorArea || !editorArea.contains(range.commonAncestorContainer)) {
    floatingToolbar?.classList.remove('visible');
    return;
  }

  saveCurrentSelection();

  const rect = range.getBoundingClientRect();
  if (rect.width === 0) {
    floatingToolbar?.classList.remove('visible');
    return;
  }

  const left = Math.max(160, Math.min(window.innerWidth - 160, rect.left + rect.width / 2));
  // Prevent toolbar from hiding behind fixed topnav (height 65px)
  let top = rect.top - 54;
  if (top < 70) {
    top = rect.bottom + 12;
  }

  floatingToolbar.style.left = `${left}px`;
  floatingToolbar.style.top = `${top}px`;
  floatingToolbar.classList.add('visible');

  updateToolbarActiveStates();
}

function updateToolbarActiveStates() {
  document.querySelectorAll('.toolbar-btn, .format-btn').forEach(btn => {
    const cmd = btn.dataset.command;
    let isActive = false;

    if (cmd === 'bold') isActive = document.queryCommandState('bold');
    else if (cmd === 'italic') isActive = document.queryCommandState('italic');
    else if (cmd === 'strikethrough') isActive = document.queryCommandState('strikethrough');
    else if (cmd === 'insertUnorderedList') isActive = document.queryCommandState('insertUnorderedList');
    else if (cmd === 'insertOrderedList') isActive = document.queryCommandState('insertOrderedList');
    else if (cmd === 'h2' || cmd === 'h3') {
      const block = getClosestBlock();
      isActive = block && block.tagName === cmd.toUpperCase();
    } else if (cmd === 'blockquote') {
      const block = getClosestBlock();
      isActive = block && (block.tagName === 'BLOCKQUOTE' || block.closest?.('blockquote'));
    } else if (cmd === 'code') {
      isActive = Boolean(getClosestInlineCode());
    }

    btn.classList.toggle('active', isActive);
  });
}

function getClosestBlock() {
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount) return null;
  let node = selection.getRangeAt(0).commonAncestorContainer;
  if (node.nodeType === 3) node = node.parentNode;
  while (node && node !== editorContent) {
    if (['H1', 'H2', 'H3', 'H4', 'P', 'BLOCKQUOTE', 'PRE', 'LI', 'DIV', 'FIGURE', 'TABLE', 'TH', 'TD'].includes(node.tagName)) {
      return node;
    }
    node = node.parentNode;
  }
  return null;
}

document.addEventListener('selectionchange', () => {
  requestAnimationFrame(() => {
    updateFloatingToolbar();
    updateToolbarActiveStates();
  });
});

// Prevent toolbar buttons from clearing selection
document.querySelectorAll('.toolbar-btn, .format-btn').forEach(btn => {
  btn.addEventListener('mousedown', (e) => e.preventDefault());
  btn.addEventListener('click', async (e) => {
    e.preventDefault();
    const cmd = btn.dataset.command;
    await executeCommand(cmd);
    updateToolbarActiveStates();
  });
});

async function executeCommand(command) {
  editorContent.focus();

  switch (command) {
    case 'bold':
      document.execCommand('bold');
      break;
    case 'italic':
      document.execCommand('italic');
      break;
    case 'strikethrough':
      document.execCommand('strikethrough');
      break;
    case 'insertUnorderedList':
      document.execCommand('insertUnorderedList');
      break;
    case 'insertOrderedList':
      document.execCommand('insertOrderedList');
      break;
    case 'h2':
      toggleBlockType('H2');
      break;
    case 'h3':
      toggleBlockType('H3');
      break;
    case 'blockquote': {
      const block = getClosestBlock();
      if (block && (block.tagName === 'BLOCKQUOTE' || block.closest?.('blockquote'))) {
        document.execCommand('formatBlock', false, 'P');
      } else {
        document.execCommand('formatBlock', false, 'BLOCKQUOTE');
        const newBlock = getClosestBlock();
        if (newBlock) {
          newBlock.setAttribute('data-placeholder', 'Type a quote...');
          if (!newBlock.textContent.trim()) newBlock.innerHTML = '<br>';
          const range = document.createRange();
          range.setStart(newBlock, 0);
          range.collapse(true);
          const sel = window.getSelection();
          if (sel) {
            sel.removeAllRanges();
            sel.addRange(range);
          }
        }
      }
      break;
    }
    case 'link': {
      const url = await showPromptModal('Add Link', 'Enter the destination URL for your link', 'https://...');
      if (url) {
        restoreCurrentSelection();
        editorContent.focus();
        document.execCommand('createLink', false, url);
      }
      break;
    }
    case 'code': {
      toggleInlineCode();
      break;
    }
  }

  scheduleAutoSave();
}

function toggleInlineCode() {
  editorContent.focus();
  const inlineCodeNode = getClosestInlineCode();

  if (inlineCodeNode) {
    // Toggle OFF: unwrap into plain text
    const parent = inlineCodeNode.parentNode;
    const text = inlineCodeNode.textContent.replace(/\u200B/g, '');
    const textNode = document.createTextNode(text || ' ');
    parent.replaceChild(textNode, inlineCodeNode);
    parent.normalize();

    // Select unwrapped text
    const range = document.createRange();
    range.selectNodeContents(textNode);
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }
    scheduleAutoSave();
    return;
  }

  // Toggle ON: wrap selection or insert inline code
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return;
  const range = sel.getRangeAt(0);
  const text = range.toString();

  if (text.length > 0) {
    const codeEl = document.createElement('code');
    try {
      range.surroundContents(codeEl);
    } catch {
      const contents = range.extractContents();
      codeEl.appendChild(contents);
      range.insertNode(codeEl);
    }
    const postNode = document.createTextNode('\u200B');
    if (codeEl.nextSibling) {
      codeEl.parentNode.insertBefore(postNode, codeEl.nextSibling);
    } else {
      codeEl.parentNode.appendChild(postNode);
    }

    const newRange = document.createRange();
    newRange.selectNodeContents(codeEl);
    sel.removeAllRanges();
    sel.addRange(newRange);
  } else {
    const codeEl = document.createElement('code');
    codeEl.textContent = '\u200B';
    range.insertNode(codeEl);

    const postNode = document.createTextNode('\u200B');
    codeEl.parentNode.insertBefore(postNode, codeEl.nextSibling);

    const newRange = document.createRange();
    newRange.setStart(codeEl.firstChild, 0);
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);
  }

  scheduleAutoSave();
}

function toggleBlockType(tagName) {
  const block = getClosestBlock();
  if (!block) return;
  if (block.tagName === tagName) {
    document.execCommand('formatBlock', false, 'P');
  } else {
    document.execCommand('formatBlock', false, tagName);
  }
}

// Keyboard shortcuts inside editor
editorContent.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey) {
    if (e.key === 'b') { e.preventDefault(); executeCommand('bold'); }
    else if (e.key === 'i') { e.preventDefault(); executeCommand('italic'); }
    else if (e.key === 'k') { e.preventDefault(); executeCommand('link'); }
  }
});

// ============ Side Toolbar (+) ============
function updateSideToolbarPosition() {
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount) {
    sideToolbar.classList.remove('visible');
    return;
  }

  const range = selection.getRangeAt(0);
  if (!editorContent.contains(range.commonAncestorContainer)) {
    sideToolbar.classList.remove('visible');
    return;
  }

  saveCurrentSelection();

  let block = getClosestBlock();
  if (!block) {
    ensureEditorHasParagraph();
    block = editorContent.firstElementChild;
  }

  // Only show on empty lines
  const isEmpty = !block.textContent.trim() || block.innerHTML.trim() === '<br>' || block.innerHTML.trim() === '';
  if (!isEmpty) {
    sideToolbar.classList.remove('visible');
    closeSideMenu();
    return;
  }

  activeBlock = block;
  const rect = block.getBoundingClientRect();
  const containerRect = editorContent.getBoundingClientRect();

  sideToolbar.style.left = `${containerRect.left - 54}px`;
  sideToolbar.style.top = `${rect.top + (rect.height - 36) / 2}px`;
  sideToolbar.classList.add('visible');
}

editorContent.addEventListener('click', () => {
  ensureEditorHasParagraph();
  saveCurrentSelection();
  setTimeout(updateSideToolbarPosition, 10);
});
editorContent.addEventListener('keyup', () => {
  ensureEditorHasParagraph();
  saveCurrentSelection();
  setTimeout(updateSideToolbarPosition, 10);
});

// Prevent mousedown on toggle and items from dropping editor focus
sideToolbarToggle.addEventListener('mousedown', (e) => e.preventDefault());
sideToolbarToggle.addEventListener('click', (e) => {
  e.stopPropagation();
  const isOpen = sideToolbarMenu.classList.contains('open');
  if (isOpen) {
    closeSideMenu();
  } else {
    sideToolbarMenu.classList.add('open');
    sideToolbarToggle.classList.add('open');
  }
});

function closeSideMenu() {
  sideToolbarMenu.classList.remove('open');
  sideToolbarToggle.classList.remove('open');
}

document.addEventListener('click', (e) => {
  if (!sideToolbar.contains(e.target)) {
    closeSideMenu();
  }
});

// Prevent menu items from stealing focus on mousedown
document.querySelectorAll('.side-menu-item').forEach(item => {
  item.addEventListener('mousedown', (e) => e.preventDefault());
  item.addEventListener('click', async (e) => {
    e.stopPropagation();
    const action = item.dataset.action;
    closeSideMenu();
    sideToolbar.classList.remove('visible');

    switch (action) {
      case 'image':
        document.getElementById('editor-image-input').click();
        break;
      case 'unsplash':
        openUnsplashModal();
        break;
      case 'video':
        await handleInsertVideo();
        break;
      case 'codeblock':
        insertCodeBlock();
        break;
      case 'quote':
        insertBlockquote();
        break;
      case 'divider':
        insertDivider();
        break;
      case 'embed':
        await handleInsertEmbed();
        break;
      case 'table':
        insertTable();
        break;
    }
  });
});

// 1. Insert Local Image with placeholder caption hint (not text)
document.getElementById('editor-image-input').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const data = await apiUploadImage(file);
    if (data.success) {
      const fullUrl = getEditorBackendUrl(data.imageUrl);

      // If activeQuoteForImage is targeted, insert directly inside the blockquote
      if (activeQuoteForImage && editorContent.contains(activeQuoteForImage)) {
        const img = document.createElement('img');
        img.src = fullUrl;
        img.alt = file.name;

        const actionsBar = activeQuoteForImage.querySelector(':scope > .quote-actions-bar');
        if (actionsBar) {
          activeQuoteForImage.insertBefore(img, actionsBar);
        } else {
          activeQuoteForImage.appendChild(img);
        }

        const p = document.createElement('p');
        p.innerHTML = '<br>';
        if (actionsBar) {
          activeQuoteForImage.insertBefore(p, actionsBar);
        } else {
          activeQuoteForImage.appendChild(p);
        }

        activeQuoteForImage = null;
        initBlockquotes();
        scheduleAutoSave();
        showToast('Image added to quote');
        e.target.value = '';
        return;
      }

      const imgHtml = `
        <figure>
          <img src="${fullUrl}" alt="${escapeHtml(file.name)}" />
          <figcaption contenteditable="true" data-placeholder="Type caption for image (optional)"><br></figcaption>
        </figure>
        <p><br></p>
      `;
      insertComponentHtml(imgHtml);
      scheduleAutoSave();
      showToast('Image uploaded');
    }
  } catch {
    showToast('Failed to upload image');
  }
  e.target.value = '';
});

// 2. Insert Blockquote with placeholder hint (not text) & action bar for image/inline code
function insertBlockquote() {
  editorContent.focus();
  const sel = window.getSelection();
  const selectedText = sel ? sel.toString().trim() : '';

  const bq = document.createElement('blockquote');
  bq.setAttribute('data-placeholder', 'Type a quote...');
  if (selectedText) {
    bq.textContent = selectedText;
  } else {
    bq.innerHTML = '<br>';
  }

  let block = getClosestBlock();
  if (block && (!block.textContent.trim() || block.innerHTML.trim() === '<br>')) {
    block.replaceWith(bq);
  } else if (block) {
    block.insertAdjacentElement('afterend', bq);
  } else {
    editorContent.appendChild(bq);
  }

  if (!bq.nextElementSibling) {
    const p = document.createElement('p');
    p.innerHTML = '<br>';
    bq.insertAdjacentElement('afterend', p);
  }

  initBlockquotes();

  // Focus caret directly inside the quote
  const range = document.createRange();
  range.setStart(bq, 0);
  range.collapse(true);
  const currentSel = window.getSelection();
  if (currentSel) {
    currentSel.removeAllRanges();
    currentSel.addRange(range);
  }
  bq.focus();
  scheduleAutoSave();
  updateSideToolbarPosition();
}

// Attach action bar (Add Image & Inline Code) to each blockquote
function initBlockquotes() {
  const quotes = editorContent.querySelectorAll('blockquote');
  quotes.forEach(bq => {
    bq.setAttribute('data-placeholder', 'Type a quote...');
    let actionsBar = bq.querySelector(':scope > .quote-actions-bar');
    if (!actionsBar) {
      actionsBar = document.createElement('div');
      actionsBar.className = 'quote-actions-bar';
      actionsBar.contentEditable = 'false';
      actionsBar.innerHTML = `
        <button type="button" class="quote-action-btn quote-add-img-btn" contenteditable="false" title="Add image inside this quote">📷 Add Image</button>
        <button type="button" class="quote-action-btn quote-add-code-btn" contenteditable="false" title="Insert inline code">&lt;/&gt; Inline Code</button>
      `;
      bq.appendChild(actionsBar);
    }

    const imgBtn = actionsBar.querySelector('.quote-add-img-btn');
    if (imgBtn) {
      imgBtn.onmousedown = (e) => e.preventDefault();
      imgBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        activeQuoteForImage = bq;
        document.getElementById('editor-image-input').click();
      };
    }

    const codeBtn = actionsBar.querySelector('.quote-add-code-btn');
    if (codeBtn) {
      codeBtn.onmousedown = (e) => e.preventDefault();
      codeBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        insertInlineCodeIntoQuote(bq);
      };
    }
  });
}

function insertInlineCodeIntoQuote(bq) {
  bq.focus();
  const sel = window.getSelection();
  if (sel && !sel.isCollapsed && sel.rangeCount > 0 && bq.contains(sel.getRangeAt(0).commonAncestorContainer)) {
    toggleInlineCode();
    return;
  }

  // Insert a fresh <code>snippet</code> inside the quote
  const codeEl = document.createElement('code');
  codeEl.textContent = 'inline code';

  if (sel && sel.rangeCount > 0 && bq.contains(sel.getRangeAt(0).startContainer)) {
    const curRange = sel.getRangeAt(0);
    curRange.insertNode(codeEl);
  } else {
    const actionsBar = bq.querySelector(':scope > .quote-actions-bar');
    if (actionsBar) {
      bq.insertBefore(codeEl, actionsBar);
    } else {
      bq.appendChild(codeEl);
    }
  }

  const space = document.createTextNode(' ');
  codeEl.parentNode.insertBefore(space, codeEl.nextSibling);

  const selectRange = document.createRange();
  selectRange.selectNodeContents(codeEl);
  if (sel) {
    sel.removeAllRanges();
    sel.addRange(selectRange);
  }

  scheduleAutoSave();
}

// 3. Insert Divider
function insertDivider() {
  const hrHtml = `<hr><p><br></p>`;
  insertComponentHtml(hrHtml);
  scheduleAutoSave();
}

// 4. Insert Video Embed with placeholder caption hint (not text)
async function handleInsertVideo() {
  const url = await showPromptModal(
    'Embed Video',
    'Paste a YouTube or Vimeo link to embed the video directly in your story',
    'https://www.youtube.com/watch?v=...'
  );
  if (!url) return;

  const embedUrl = parseVideoUrl(url);
  if (!embedUrl) {
    showToast('Please enter a valid YouTube or Vimeo URL');
    return;
  }

  const videoHtml = `
    <figure class="video-embed">
      <div class="video-responsive">
        <iframe src="${embedUrl}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
      </div>
      <figcaption contenteditable="true" data-placeholder="Type caption for video (optional)"><br></figcaption>
    </figure>
    <p><br></p>
  `;
  insertComponentHtml(videoHtml);
  scheduleAutoSave();
  showToast('Video embedded');
}

function parseVideoUrl(url) {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    // YouTube
    if (parsed.hostname.includes('youtube.com')) {
      const v = parsed.searchParams.get('v');
      if (v) return `https://www.youtube.com/embed/${v}`;
      if (parsed.pathname.startsWith('/embed/')) return url;
      if (parsed.pathname.startsWith('/shorts/')) {
        const id = parsed.pathname.split('/')[2];
        return `https://www.youtube.com/embed/${id}`;
      }
    } else if (parsed.hostname === 'youtu.be') {
      const id = parsed.pathname.slice(1);
      return `https://www.youtube.com/embed/${id}`;
    }
    // Vimeo
    else if (parsed.hostname.includes('vimeo.com')) {
      const match = parsed.pathname.match(/\/(\d+)/);
      if (match && match[1]) return `https://player.vimeo.com/video/${match[1]}`;
    }
  } catch {
    return null;
  }
  return null;
}

// 5. Insert Embed Link Card
async function handleInsertEmbed() {
  const url = await showPromptModal(
    'Embed Link',
    'Paste a link to generate a preview bookmark card',
    'https://...'
  );
  if (!url) return;

  let hostname = '';
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    hostname = parsed.hostname;
  } catch {
    hostname = url;
  }

  const embedHtml = `
    <div class="embed-card-wrapper" contenteditable="false">
      <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="embed-card">
        <h4 class="embed-card-title">${escapeHtml(hostname)}</h4>
        <p class="embed-card-desc">${escapeHtml(url)}</p>
        <span class="embed-card-link">🔗 Visit Link</span>
      </a>
    </div>
    <p><br></p>
  `;
  insertComponentHtml(embedHtml);
  scheduleAutoSave();
  showToast('Link embedded');
}

// 6. Insert Code Block (Empty with placeholder hint - no hardcoded comment text!)
// 6. Insert Code Block (Empty with placeholder hint - modern matte dark code block)
function insertCodeBlock(language = 'html') {
  const blockHtml = `
    <div class="code-block-wrapper" contenteditable="false">
      <div class="code-block-header">
        <div class="code-header-left">
          <svg class="code-file-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
          <select class="code-lang-select" aria-label="Select programming language">
            <option value="html" ${language === 'html' ? 'selected' : ''}>HTML</option>
            <option value="javascript" ${language === 'javascript' ? 'selected' : ''}>JavaScript</option>
            <option value="typescript" ${language === 'typescript' ? 'selected' : ''}>TypeScript</option>
            <option value="python" ${language === 'python' ? 'selected' : ''}>Python</option>
            <option value="css" ${language === 'css' ? 'selected' : ''}>CSS</option>
            <option value="json" ${language === 'json' ? 'selected' : ''}>JSON</option>
            <option value="bash" ${language === 'bash' ? 'selected' : ''}>Bash / Shell</option>
            <option value="java" ${language === 'java' ? 'selected' : ''}>Java</option>
            <option value="cpp" ${language === 'cpp' ? 'selected' : ''}>C++</option>
            <option value="csharp" ${language === 'csharp' ? 'selected' : ''}>C#</option>
            <option value="sql" ${language === 'sql' ? 'selected' : ''}>SQL</option>
            <option value="markdown" ${language === 'markdown' ? 'selected' : ''}>Markdown</option>
            <option value="plaintext" ${language === 'plaintext' ? 'selected' : ''}>Plain Text</option>
          </select>
        </div>
        <div class="code-header-actions">
          <button type="button" class="code-action-btn code-format-btn" title="Format & Syntax Highlight" aria-label="Format & Syntax Highlight">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
          </button>
          <button type="button" class="code-action-btn code-run-btn" title="Run / Preview" aria-label="Run / Preview">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polygon points="6 4 19 12 6 20 6 4"/></svg>
          </button>
          <button type="button" class="code-action-btn code-copy-btn" title="Copy code" aria-label="Copy code">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </button>
        </div>
      </div>
      <pre><code class="hljs language-${language}" contenteditable="true" spellcheck="false" data-placeholder="// Write or paste your code here..."></code></pre>
    </div>
    <p><br></p>
  `;

  insertComponentHtml(blockHtml);
  initCodeBlocks();
  scheduleAutoSave();

  // Focus the newly inserted code block
  setTimeout(() => {
    const codeEl = editorContent.querySelector('.code-block-wrapper:last-of-type pre code');
    if (codeEl) codeEl.focus();
  }, 50);
}

// Helper: insert component HTML at activeBlock or caret
function insertComponentHtml(html) {
  editorContent.focus();
  if (activeBlock && editorContent.contains(activeBlock)) {
    activeBlock.insertAdjacentHTML('beforebegin', html);
    activeBlock.remove();
    activeBlock = null;
    return;
  }

  restoreCurrentSelection();
  const sel = window.getSelection();
  if (sel && sel.rangeCount) {
    let range = sel.getRangeAt(0);
    if (!editorContent.contains(range.commonAncestorContainer)) {
      editorContent.insertAdjacentHTML('beforeend', html);
      return;
    }

    const block = getClosestBlock();
    if (block && (block.textContent.trim() === '' || block.innerHTML.trim() === '<br>')) {
      block.insertAdjacentHTML('beforebegin', html);
      block.remove();
      return;
    }

    document.execCommand('insertHTML', false, html);
  } else {
    editorContent.insertAdjacentHTML('beforeend', html);
  }
}

// Initialize all code blocks with clean language switching, formatting, copy, and syntax highlighting
function initCodeBlocks() {
  // Convert any plain <pre><code> into <div class="code-block-wrapper">
  const plainPres = editorContent.querySelectorAll('pre');
  plainPres.forEach((pre) => {
    if (pre.closest('.code-block-wrapper')) return;
    const codeEl = pre.querySelector('code') || pre;
    let lang = 'javascript';
    const match = (codeEl.className || '').match(/language-([a-z0-9_-]+)/i);
    if (match && match[1]) lang = match[1];

    const wrapper = document.createElement('div');
    wrapper.className = 'code-block-wrapper';
    wrapper.contentEditable = 'false';
    wrapper.innerHTML = `
      <div class="code-block-header">
        <div class="code-header-left">
          <svg class="code-file-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
          <select class="code-lang-select" aria-label="Select programming language">
            <option value="html" ${lang === 'html' ? 'selected' : ''}>HTML</option>
            <option value="javascript" ${lang === 'javascript' ? 'selected' : ''}>JavaScript</option>
            <option value="typescript" ${lang === 'typescript' ? 'selected' : ''}>TypeScript</option>
            <option value="python" ${lang === 'python' ? 'selected' : ''}>Python</option>
            <option value="css" ${lang === 'css' ? 'selected' : ''}>CSS</option>
            <option value="json" ${lang === 'json' ? 'selected' : ''}>JSON</option>
            <option value="bash" ${lang === 'bash' ? 'selected' : ''}>Bash / Shell</option>
            <option value="java" ${lang === 'java' ? 'selected' : ''}>Java</option>
            <option value="cpp" ${lang === 'cpp' ? 'selected' : ''}>C++</option>
            <option value="csharp" ${lang === 'csharp' ? 'selected' : ''}>C#</option>
            <option value="sql" ${lang === 'sql' ? 'selected' : ''}>SQL</option>
            <option value="markdown" ${lang === 'markdown' ? 'selected' : ''}>Markdown</option>
            <option value="plaintext" ${lang === 'plaintext' ? 'selected' : ''}>Plain Text</option>
          </select>
        </div>
        <div class="code-header-actions">
          <button type="button" class="code-action-btn code-format-btn" title="Format & Syntax Highlight" aria-label="Format & Syntax Highlight">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
          </button>
          <button type="button" class="code-action-btn code-run-btn" title="Run / Preview" aria-label="Run / Preview">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polygon points="6 4 19 12 6 20 6 4"/></svg>
          </button>
          <button type="button" class="code-action-btn code-copy-btn" title="Copy code" aria-label="Copy code">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </button>
        </div>
      </div>
      <pre><code class="hljs language-${lang}" contenteditable="true" spellcheck="false" data-placeholder="// Write or paste your code here...">${codeEl.innerHTML}</code></pre>
    `;
    pre.replaceWith(wrapper);
  });

  const wrappers = editorContent.querySelectorAll('.code-block-wrapper');
  wrappers.forEach(wrapper => {
    const select = wrapper.querySelector('.code-lang-select');
    const copyBtn = wrapper.querySelector('.code-copy-btn');
    const formatBtn = wrapper.querySelector('.code-format-btn');
    const runBtn = wrapper.querySelector('.code-run-btn');
    const codeEl = wrapper.querySelector('pre code');

    if (!codeEl) return;

    // Detect language from class if exists
    if (select) {
      const match = codeEl.className.match(/language-([a-z0-9_-]+)/i);
      if (match && match[1]) {
        select.value = match[1];
      }

      select.onchange = () => {
        const newLang = select.value;
        codeEl.className = `hljs language-${newLang}`;
        applyCodeFormatting(codeEl, newLang);
        scheduleAutoSave();
      };
    }

    // Format / Highlight button (<>)
    if (formatBtn) {
      formatBtn.onclick = () => {
        const lang = select ? select.value : 'javascript';
        applyCodeFormatting(codeEl, lang);
        formatBtn.classList.add('formatted');
        showToast('Code syntax highlighted');
        setTimeout(() => {
          formatBtn.classList.remove('formatted');
        }, 1500);
        scheduleAutoSave();
      };
    }

    // Run / Preview Button (▷)
    if (runBtn) {
      runBtn.onclick = () => {
        const lang = select ? select.value.toLowerCase() : 'html';
        const rawCode = (codeEl.innerText || codeEl.textContent || '').trim();
        if (lang === 'javascript' || lang === 'js') {
          try {
            console.log('--- Running Snippet ---');
            const result = new Function(rawCode)();
            showToast(`Executed: ${result !== undefined ? String(result) : 'Done'}`);
          } catch (e) {
            showToast(`Error: ${e.message}`);
          }
        } else if (lang === 'html') {
          showToast('HTML snippet is valid');
        } else {
          showToast(`Running ${lang.toUpperCase()} snippet...`);
        }
      };
    }

    // Copy Button (⎘)
    if (copyBtn) {
      copyBtn.onclick = async (e) => {
        e.stopPropagation();
        const codeText = codeEl.innerText || codeEl.textContent;
        try {
          await navigator.clipboard.writeText(codeText);
          copyBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`;
          copyBtn.classList.add('copied');
          showToast('Code copied to clipboard!');
          setTimeout(() => {
            copyBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
            copyBtn.classList.remove('copied');
          }, 2000);
        } catch {
          showToast('Could not copy code');
        }
      };
    }

    // Code editing keyboard behavior: Tab for 2 spaces, Enter for newline
    codeEl.onkeydown = (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        document.execCommand('insertText', false, '  ');
      } else if (e.key === 'Enter') {
        e.preventDefault();
        document.execCommand('insertText', false, '\n');
      }
    };

    // Re-highlight on blur
    codeEl.onblur = () => {
      const lang = select ? select.value : 'javascript';
      applyCodeFormatting(codeEl, lang);
      scheduleAutoSave();
    };

    // Initial highlight if content exists
    if (codeEl.textContent.trim()) {
      const lang = select ? select.value : 'javascript';
      applyCodeFormatting(codeEl, lang);
    }
  });
}

function applyCodeFormatting(codeEl, lang) {
  if (!window.hljs) return;
  const rawText = codeEl.innerText || codeEl.textContent;
  if (!rawText.trim()) return;

  try {
    if (lang && lang !== 'plaintext' && window.hljs.getLanguage(lang)) {
      const result = window.hljs.highlight(rawText, { language: lang });
      codeEl.innerHTML = result.value;
    } else {
      const result = window.hljs.highlightAuto(rawText);
      codeEl.innerHTML = result.value;
    }
  } catch {
    // ignore
  }
}

// ============ Table Insertion & Management ============
// Predefined 2-row x 2-column table with placeholder hints and NO hardcoded data
function insertTable() {
  const tableHtml = `
    <div class="table-wrapper" contenteditable="false">
      <div class="table-actions">
        <button type="button" class="table-action-btn add-row" title="Add Row">+ Row</button>
        <button type="button" class="table-action-btn del-row" title="Delete Row">- Row</button>
        <button type="button" class="table-action-btn add-col" title="Add Column">+ Col</button>
        <button type="button" class="table-action-btn del-col" title="Delete Column">- Col</button>
        <button type="button" class="table-action-btn del-table danger" title="Delete Table">✕ Delete</button>
      </div>
      <div class="table-scroll">
        <table class="editor-table">
          <thead>
            <tr>
              <th contenteditable="true" data-placeholder="Header 1"><br></th>
              <th contenteditable="true" data-placeholder="Header 2"><br></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td contenteditable="true" data-placeholder="Cell 1"><br></td>
              <td contenteditable="true" data-placeholder="Cell 2"><br></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <p><br></p>
  `;
  insertComponentHtml(tableHtml);
  initTables();
  scheduleAutoSave();
}

function initTables() {
  // Wrap any plain <table> imported from markdown/HTML into .table-wrapper if not already wrapped
  const plainTables = editorContent.querySelectorAll('table');
  plainTables.forEach(t => {
    if (t.closest('.table-wrapper')) return;
    t.classList.add('editor-table');
    const wrapper = document.createElement('div');
    wrapper.className = 'table-wrapper';
    wrapper.contentEditable = 'false';
    wrapper.innerHTML = `
      <div class="table-actions">
        <button type="button" class="table-action-btn add-row" title="Add Row">+ Row</button>
        <button type="button" class="table-action-btn del-row" title="Delete Row">- Row</button>
        <button type="button" class="table-action-btn add-col" title="Add Column">+ Col</button>
        <button type="button" class="table-action-btn del-col" title="Delete Column">- Col</button>
        <button type="button" class="table-action-btn del-table danger" title="Delete Table">✕ Delete</button>
      </div>
      <div class="table-scroll"></div>
    `;
    t.parentNode.insertBefore(wrapper, t);
    wrapper.querySelector('.table-scroll').appendChild(t);
  });

  const wrappers = editorContent.querySelectorAll('.table-wrapper');
  wrappers.forEach(wrapper => {
    const table = wrapper.querySelector('table');
    if (!table) return;

    // Ensure table has clean class
    table.classList.add('editor-table');

    // Add Row Button: Appends an empty row with placeholder hints (no hardcoded dummy data)
    const addRowBtn = wrapper.querySelector('.add-row');
    if (addRowBtn) {
      addRowBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const tbody = table.querySelector('tbody') || table;
        const colCount = table.querySelector('tr')?.children.length || 2;
        const rowIndex = tbody.querySelectorAll('tr').length + 1;
        const tr = document.createElement('tr');
        for (let i = 0; i < colCount; i++) {
          const td = document.createElement('td');
          td.contentEditable = 'true';
          td.setAttribute('data-placeholder', `Cell ${i + 1}`);
          td.innerHTML = '<br>';
          tr.appendChild(td);
        }
        tbody.appendChild(tr);
        bindTableCells(table);
        scheduleAutoSave();
      };
    }

    // Delete Row Button
    const delRowBtn = wrapper.querySelector('.del-row');
    if (delRowBtn) {
      delRowBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const tbody = table.querySelector('tbody') || table;
        const rows = tbody.querySelectorAll('tr');
        if (rows.length > 1) {
          rows[rows.length - 1].remove();
          scheduleAutoSave();
        } else {
          showToast('Cannot delete the last row');
        }
      };
    }

    // Add Column Button: Appends empty cells with placeholder hints (no hardcoded data)
    const addColBtn = wrapper.querySelector('.add-col');
    if (addColBtn) {
      addColBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const theadTr = table.querySelector('thead tr') || table.querySelector('tr');
        if (theadTr) {
          const colNum = theadTr.children.length + 1;
          const th = document.createElement(theadTr.firstElementChild?.tagName === 'TH' ? 'th' : 'td');
          th.contentEditable = 'true';
          th.setAttribute('data-placeholder', `Header ${colNum}`);
          th.innerHTML = '<br>';
          theadTr.appendChild(th);
        }
        const tbodyRows = table.querySelectorAll('tbody tr');
        tbodyRows.forEach((r) => {
          const colNum = r.children.length + 1;
          const td = document.createElement('td');
          td.contentEditable = 'true';
          td.setAttribute('data-placeholder', `Cell ${colNum}`);
          td.innerHTML = '<br>';
          r.appendChild(td);
        });
        bindTableCells(table);
        scheduleAutoSave();
      };
    }

    // Delete Column Button
    const delColBtn = wrapper.querySelector('.del-col');
    if (delColBtn) {
      delColBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const theadTr = table.querySelector('thead tr') || table.querySelector('tr');
        if (theadTr && theadTr.children.length > 1) {
          theadTr.lastElementChild.remove();
          const tbodyRows = table.querySelectorAll('tbody tr');
          tbodyRows.forEach(r => {
            if (r.lastElementChild) r.lastElementChild.remove();
          });
          scheduleAutoSave();
        } else {
          showToast('Cannot delete the last column');
        }
      };
    }

    // Delete Table Button
    const delTableBtn = wrapper.querySelector('.del-table');
    if (delTableBtn) {
      delTableBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        wrapper.remove();
        scheduleAutoSave();
        showToast('Table deleted');
      };
    }

    bindTableCells(table);
  });
}

function bindTableCells(table) {
  const tableCellToolbar = document.getElementById('table-cell-toolbar');

  table.querySelectorAll('th, td').forEach(cell => {
    cell.contentEditable = 'true';
    cell.oninput = scheduleAutoSave;

    // Show mini toolbar on cell focus
    cell.onfocus = () => {
      if (tableCellToolbar) {
        const rect = cell.getBoundingClientRect();
        tableCellToolbar.style.left = `${rect.left + rect.width / 2}px`;
        tableCellToolbar.style.top = `${rect.top - 40}px`;
        tableCellToolbar.classList.add('visible');
      }
    };

    cell.onblur = (e) => {
      // Delay hide to allow button clicks
      setTimeout(() => {
        if (tableCellToolbar && !tableCellToolbar.contains(document.activeElement)) {
          tableCellToolbar.classList.remove('visible');
        }
      }, 200);
    };

    cell.onkeydown = (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const allCells = Array.from(table.querySelectorAll('th, td'));
        const curIdx = allCells.indexOf(cell);
        const nextIdx = e.shiftKey ? curIdx - 1 : curIdx + 1;
        if (nextIdx >= 0 && nextIdx < allCells.length) {
          allCells[nextIdx].focus();
        } else if (!e.shiftKey && nextIdx === allCells.length) {
          // Tab on last cell -> append new row with placeholder hints and NO hardcoded data!
          const tbody = table.querySelector('tbody') || table;
          const colCount = table.querySelector('tr')?.children.length || 2;
          const tr = document.createElement('tr');
          for (let i = 0; i < colCount; i++) {
            const td = document.createElement('td');
            td.contentEditable = 'true';
            td.setAttribute('data-placeholder', `Cell ${i + 1}`);
            td.innerHTML = '<br>';
            tr.appendChild(td);
          }
          tbody.appendChild(tr);
          bindTableCells(table);
          tr.firstElementChild?.focus();
          scheduleAutoSave();
        }
      }
    };
  });
}

// Table Cell Toolbar button handlers
(function initTableCellToolbar() {
  const toolbar = document.getElementById('table-cell-toolbar');
  if (!toolbar) return;

  toolbar.querySelectorAll('.tcell-btn').forEach(btn => {
    btn.addEventListener('mousedown', (e) => e.preventDefault());
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const cmd = btn.dataset.cmd;
      if (cmd === 'createLink') {
        const url = prompt('Enter link URL:');
        if (url) document.execCommand('createLink', false, url);
      } else if (cmd === 'removeFormat') {
        document.execCommand('removeFormat');
      } else {
        document.execCommand(cmd);
      }
      scheduleAutoSave();
    });
  });
})();

// ============ Unsplash Search Integration ============
function openUnsplashModal() {
  saveCurrentSelection();
  unsplashModal.classList.add('active');
  unsplashSearchInput.value = '';
  loadUnsplashPhotos('technology');
  setTimeout(() => unsplashSearchInput.focus(), 80);
}

function closeUnsplashModal() {
  unsplashModal.classList.remove('active');
}

unsplashClose.addEventListener('click', closeUnsplashModal);
unsplashModal.addEventListener('click', (e) => {
  if (e.target === unsplashModal) closeUnsplashModal();
});

unsplashSearchInput.addEventListener('input', () => {
  clearTimeout(unsplashSearchTimeout);
  const q = unsplashSearchInput.value.trim();
  if (!q) {
    loadUnsplashPhotos('technology');
    return;
  }
  unsplashSearchTimeout = setTimeout(() => {
    loadUnsplashPhotos(q);
  }, 400);
});

async function loadUnsplashPhotos(query) {
  unsplashGrid.innerHTML = `
    <div class="unsplash-hint">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
      <span style="margin-top:10px;">Searching photos for "${escapeHtml(query)}"...</span>
    </div>
  `;

  try {
    const res = await fetch(`https://unsplash.com/napi/search/photos?query=${encodeURIComponent(query)}&per_page=18`);
    if (!res.ok) throw new Error('Unsplash API error');
    const data = await res.json();
    const results = data.results || [];

    if (results.length === 0) {
      unsplashGrid.innerHTML = `
        <div class="unsplash-hint">
          No photos found for "${escapeHtml(query)}". Try another search term!
        </div>
      `;
      return;
    }

    unsplashGrid.innerHTML = results.map(photo => {
      const thumb = photo.urls.small || photo.urls.thumb;
      const regular = photo.urls.regular;
      const userName = photo.user?.name || 'Unsplash Photographer';
      const userLink = photo.user?.links?.html || 'https://unsplash.com';
      const altText = photo.alt_description || photo.description || 'Unsplash photo';

      return `
        <div class="unsplash-item" data-src="${escapeHtml(regular)}" data-alt="${escapeHtml(altText)}" data-author="${escapeHtml(userName)}" data-userlink="${escapeHtml(userLink)}">
          <img src="${escapeHtml(thumb)}" alt="${escapeHtml(altText)}" loading="lazy" />
          <div class="unsplash-item-author">Photo by ${escapeHtml(userName)}</div>
        </div>
      `;
    }).join('');

    // Click handler on photos
    unsplashGrid.querySelectorAll('.unsplash-item').forEach(item => {
      item.addEventListener('click', () => {
        const src = item.dataset.src;
        const alt = item.dataset.alt;
        const author = item.dataset.author;
        const userlink = item.dataset.userlink;

        const photoHtml = `
          <figure>
            <img src="${src}" alt="${escapeHtml(alt)}" />
            <figcaption contenteditable="true">
              Photo by <a href="${userlink}?utm_source=kushal_blog&utm_medium=referral" target="_blank" rel="noopener">${escapeHtml(author)}</a> on <a href="https://unsplash.com/?utm_source=kushal_blog&utm_medium=referral" target="_blank" rel="noopener">Unsplash</a>
            </figcaption>
          </figure>
          <p><br></p>
        `;

        insertComponentHtml(photoHtml);
        closeUnsplashModal();
        scheduleAutoSave();
        showToast('Photo added from Unsplash');
      });
    });

  } catch {
    unsplashGrid.innerHTML = `
      <div class="unsplash-hint">
        Could not load live Unsplash results. Please check your network connection or upload an image directly.
      </div>
    `;
  }
}

// ============ File Import (.md/.html) ============
document.getElementById('btn-import').addEventListener('click', () => {
  document.getElementById('import-file-input').click();
});

document.getElementById('import-file-input').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  try {
    const data = await apiUploadFile(file);
    if (data.success) {
      currentPostId = data.post.id;
      editorTitle.textContent = data.post.title || '';
      editorSubtitle.textContent = data.post.subtitle || '';
      editorContent.innerHTML = data.post.content || '<p><br></p>';
      initCodeBlocks();
      initTables();
      saveStatus.textContent = 'Imported';
      showToast(`Imported: ${file.name}`);
    }
  } catch {
    showToast('Import failed');
  }
  e.target.value = '';
});

// ============ Publish Flow & Modal ============
btnPublishNav.addEventListener('click', async () => {
  await autoSave();
  openPublishModal();
});

// Interactive Tag Input Elements
const publishTagsWrapper = document.getElementById('publish-tags-wrapper');
const publishTagsChips = document.getElementById('publish-tags-chips');
const publishTagInput = document.getElementById('publish-tag-input');
const tagSuggestionsPopup = document.getElementById('tag-suggestions-popup');
let selectedPublishTags = [];

function renderTagChips() {
  if (!publishTagsChips) return;
  publishTagsChips.innerHTML = selectedPublishTags.map((tag, idx) => `
    <span class="tag-chip" data-index="${idx}">
      ${escapeHtml(tag)}
      <button type="button" class="tag-chip-remove" data-index="${idx}" title="Remove tag">✕</button>
    </span>
  `).join('');

  publishTagsChips.querySelectorAll('.tag-chip-remove').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.index, 10);
      selectedPublishTags.splice(idx, 1);
      renderTagChips();
    };
  });
}

function addPublishTag(tagStr) {
  if (!tagStr) return;
  const clean = tagStr.trim();
  if (!clean) return;

  // Case-insensitive deduplication and normalization:
  // e.g. "java" and "Java" map to the existing canonical tag
  const matchedCanonical = allAvailableTags.find(t => t.toLowerCase() === clean.toLowerCase());
  const finalTag = matchedCanonical || clean;

  const alreadySelected = selectedPublishTags.some(t => t.toLowerCase() === finalTag.toLowerCase());
  if (!alreadySelected) {
    selectedPublishTags.push(finalTag);
    if (!matchedCanonical) {
      allAvailableTags.push(finalTag);
    }
    renderTagChips();
  }

  if (publishTagInput) {
    publishTagInput.value = '';
  }
  hideTagSuggestions();
}

function showTagSuggestions(query = '') {
  if (!tagSuggestionsPopup) return;
  const q = query.trim().toLowerCase();

  // Filter out already selected tags
  const unselectedTags = allAvailableTags.filter(t => !selectedPublishTags.some(st => st.toLowerCase() === t.toLowerCase()));
  const matches = q
    ? unselectedTags.filter(t => t.toLowerCase().includes(q))
    : unselectedTags.slice(0, 8);

  const hasExactMatch = allAvailableTags.some(t => t.toLowerCase() === q);

  let html = '';

  // If user typed something and it doesn't match an existing tag exactly, offer "Create tag"
  if (q && !hasExactMatch) {
    html += `<div class="tag-suggestion-item create-new" data-tag="${escapeHtml(query.trim())}">
      <span>+ Create tag <strong>"${escapeHtml(query.trim())}"</strong></span>
    </div>`;
  }

  matches.forEach(m => {
    html += `<div class="tag-suggestion-item" data-tag="${escapeHtml(m)}">
      <span>${escapeHtml(m)}</span>
    </div>`;
  });

  if (!html) {
    hideTagSuggestions();
    return;
  }

  tagSuggestionsPopup.innerHTML = html;
  tagSuggestionsPopup.style.display = 'flex';

  tagSuggestionsPopup.querySelectorAll('.tag-suggestion-item').forEach(item => {
    item.onclick = (e) => {
      e.stopPropagation();
      addPublishTag(item.dataset.tag);
    };
  });
}

function hideTagSuggestions() {
  if (tagSuggestionsPopup) tagSuggestionsPopup.style.display = 'none';
}

// Tag input events
if (publishTagInput) {
  publishTagInput.addEventListener('input', () => {
    showTagSuggestions(publishTagInput.value);
  });

  publishTagInput.addEventListener('focus', () => {
    showTagSuggestions(publishTagInput.value);
  });

  publishTagInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addPublishTag(publishTagInput.value);
    } else if (e.key === 'Backspace' && !publishTagInput.value && selectedPublishTags.length > 0) {
      selectedPublishTags.pop();
      renderTagChips();
    } else if (e.key === 'Escape') {
      hideTagSuggestions();
    }
  });
}

if (publishTagsWrapper) {
  publishTagsWrapper.addEventListener('click', () => {
    publishTagInput?.focus();
  });
}

document.addEventListener('click', (e) => {
  if (tagSuggestionsPopup && !tagSuggestionsPopup.contains(e.target) && e.target !== publishTagInput) {
    hideTagSuggestions();
  }
});

async function openPublishModal() {
  await apiFetchPosts();
  await apiFetchTags();
  const post = posts.find(p => p.id === currentPostId);

  const title = editorTitle.textContent.trim() || post?.title || 'Untitled';
  const subtitle = editorSubtitle.textContent.trim() || post?.subtitle || '';

  // Sync title & subtitle fields
  publishTitleInput.value = title;
  publishSubtitleInput.value = subtitle;
  publishPreviewTitle.textContent = title;
  publishPreviewSubtitle.textContent = subtitle || 'Tell your story...';

  // Cover image
  const coverDiv = document.getElementById('publish-preview-cover');
  const btnRemoveCover = document.getElementById('btn-publish-remove-cover');
  const urlBox = document.getElementById('publish-cover-url-input-box');
  const btnsBox = document.getElementById('publish-cover-buttons');
  if (urlBox) urlBox.style.display = 'none';
  if (btnsBox) btnsBox.style.display = 'flex';

  if (coverImageUrl) {
    const src = getEditorBackendUrl(coverImageUrl);
    coverDiv.innerHTML = `<img src="${src}" alt="Cover" />`;
    if (btnRemoveCover) btnRemoveCover.style.display = 'inline-flex';
  } else {
    coverDiv.innerHTML = `
      <span class="preview-cover-placeholder">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
        Add cover image
      </span>
    `;
    if (btnRemoveCover) btnRemoveCover.style.display = 'none';
  }

  // Tags Chips initialization
  selectedPublishTags = (post?.tags || []).slice();
  renderTagChips();
  if (publishTagInput) publishTagInput.value = '';
  hideTagSuggestions();

  // Match Cover Image Background toggle in publish modal
  const publishMatchBg = document.getElementById('publish-match-bg');
  if (publishMatchBg) {
    publishMatchBg.checked = currentPostMatchCoverBackground;
  }

  // Update labels depending on published state
  if (post?.published) {
    publishSettingsHeading.innerHTML = `Updating published story on <strong>Stories</strong>`;
    btnPublishNow.textContent = 'Save & publish changes';
    btnSaveDraft.textContent = 'Revert to draft';
    btnViewLive.style.display = 'inline-flex';
    btnViewLive.href = getReaderLiveUrl(post.slug);
  } else {
    publishSettingsHeading.innerHTML = `Publishing to <strong>Stories</strong>`;
    btnPublishNow.textContent = 'Publish now';
    btnSaveDraft.textContent = 'Save as draft';
    btnViewLive.style.display = 'none';
  }

  modalOverlay.classList.add('active');
}

// Two-way synchronization in Publish modal
publishTitleInput.addEventListener('input', () => {
  const val = publishTitleInput.value;
  publishPreviewTitle.textContent = val || 'Untitled';
  editorTitle.textContent = val;
});

publishPreviewTitle.addEventListener('input', () => {
  const val = publishPreviewTitle.textContent;
  publishTitleInput.value = val;
  editorTitle.textContent = val;
});

publishSubtitleInput.addEventListener('input', () => {
  const val = publishSubtitleInput.value;
  publishPreviewSubtitle.textContent = val || 'Tell your story...';
  editorSubtitle.textContent = val;
});

publishPreviewSubtitle.addEventListener('input', () => {
  const val = publishPreviewSubtitle.textContent;
  publishSubtitleInput.value = val;
  editorSubtitle.textContent = val;
});

function closePublishModal() {
  modalOverlay.classList.remove('active');
}

document.getElementById('modal-close').addEventListener('click', closePublishModal);
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closePublishModal();
});

// Editor cover button click
if (btnAddCover) {
  btnAddCover.addEventListener('click', () => {
    editorCoverInput.click();
  });
}

// Cover image from URL handling
const btnAddCoverUrl = document.getElementById('btn-add-cover-url');
const coverUrlInputBar = document.getElementById('cover-url-input-bar');
const coverUrlInput = document.getElementById('cover-url-input');
const btnCoverUrlFetch = document.getElementById('btn-cover-url-fetch');
const btnCoverUrlCancel = document.getElementById('btn-cover-url-cancel');
const coverButtonsRow = document.getElementById('cover-buttons-row');

if (btnAddCoverUrl) {
  btnAddCoverUrl.addEventListener('click', () => {
    if (coverButtonsRow) coverButtonsRow.style.display = 'none';
    if (coverUrlInputBar) {
      coverUrlInputBar.style.display = 'block';
      if (coverUrlInput) {
        coverUrlInput.value = '';
        setTimeout(() => coverUrlInput.focus(), 50);
      }
    }
  });
}

if (btnCoverUrlCancel) {
  btnCoverUrlCancel.addEventListener('click', () => {
    if (coverUrlInputBar) coverUrlInputBar.style.display = 'none';
    if (coverButtonsRow) coverButtonsRow.style.display = 'flex';
  });
}

async function handleFetchCoverUrl() {
  if (!coverUrlInput) return;
  const url = coverUrlInput.value.trim();
  if (!url) {
    showToast('Please enter an image URL');
    return;
  }
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    showToast('URL must start with http:// or https://');
    return;
  }

  if (btnCoverUrlFetch) {
    btnCoverUrlFetch.disabled = true;
    btnCoverUrlFetch.textContent = 'Fetching...';
  }

  try {
    const res = await fetch(`${API_BASE}/fetch-image-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    const data = await res.json();
    if (data.success && data.imageUrl) {
      coverImageUrl = data.imageUrl;
      updateCoverUI();
      scheduleAutoSave();
      showToast(data.direct ? 'Cover set from URL' : 'Image fetched and stored in database');
    } else {
      // Fallback directly to URL
      coverImageUrl = url;
      updateCoverUI();
      scheduleAutoSave();
      showToast('Cover set directly from URL');
    }
  } catch (err) {
    // Fallback directly to URL
    coverImageUrl = url;
    updateCoverUI();
    scheduleAutoSave();
    showToast('Cover set directly from URL');
  } finally {
    if (btnCoverUrlFetch) {
      btnCoverUrlFetch.disabled = false;
      btnCoverUrlFetch.textContent = 'Fetch & Set';
    }
    if (coverUrlInputBar) coverUrlInputBar.style.display = 'none';
    if (coverButtonsRow) coverButtonsRow.style.display = 'flex';
  }
}

if (btnCoverUrlFetch) {
  btnCoverUrlFetch.addEventListener('click', handleFetchCoverUrl);
}

if (coverUrlInput) {
  coverUrlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleFetchCoverUrl();
    } else if (e.key === 'Escape') {
      if (btnCoverUrlCancel) btnCoverUrlCancel.click();
    }
  });
}

// Editor cover file input change
if (editorCoverInput) {
  editorCoverInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const data = await apiUploadImage(file);
      if (data.success) {
        coverImageUrl = data.imageUrl;
        updateCoverUI();
        scheduleAutoSave();
        showToast('Cover image set');
      }
    } catch {
      showToast('Failed to upload cover image');
    }
    e.target.value = '';
  });
}

// Publish modal cover controls
const btnPublishUploadCover = document.getElementById('btn-publish-upload-cover');
const btnPublishUrlCover = document.getElementById('btn-publish-url-cover');
const btnPublishRemoveCover = document.getElementById('btn-publish-remove-cover');
const publishCoverUrlBox = document.getElementById('publish-cover-url-input-box');
const publishCoverButtons = document.getElementById('publish-cover-buttons');
const publishCoverUrlInput = document.getElementById('publish-cover-url-input');
const btnPublishFetchUrl = document.getElementById('btn-publish-fetch-url');
const btnPublishCancelUrl = document.getElementById('btn-publish-cancel-url');

// Clicking the cover image box
if (publishPreviewCover) {
  publishPreviewCover.addEventListener('click', () => {
    if (!coverImageUrl) {
      if (publishCoverInput) publishCoverInput.click();
    }
  });
}

// Upload button in preview
if (btnPublishUploadCover && publishCoverInput) {
  btnPublishUploadCover.addEventListener('click', () => {
    publishCoverInput.click();
  });
}

// URL button in preview
if (btnPublishUrlCover) {
  btnPublishUrlCover.addEventListener('click', () => {
    if (publishCoverButtons) publishCoverButtons.style.display = 'none';
    if (publishCoverUrlBox) {
      publishCoverUrlBox.style.display = 'block';
      if (publishCoverUrlInput) {
        publishCoverUrlInput.value = '';
        setTimeout(() => publishCoverUrlInput.focus(), 50);
      }
    }
  });
}

if (btnPublishCancelUrl) {
  btnPublishCancelUrl.addEventListener('click', () => {
    if (publishCoverUrlBox) publishCoverUrlBox.style.display = 'none';
    if (publishCoverButtons) publishCoverButtons.style.display = 'flex';
  });
}

// Remove button in preview
if (btnPublishRemoveCover) {
  btnPublishRemoveCover.addEventListener('click', () => {
    coverImageUrl = '';
    if (publishPreviewCover) {
      publishPreviewCover.innerHTML = `
        <span class="preview-cover-placeholder">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          Add cover image
        </span>
      `;
    }
    btnPublishRemoveCover.style.display = 'none';
    updateCoverUI();
    scheduleAutoSave();
    showToast('Cover image removed');
  });
}

// Fetch and set cover from URL in publish preview
async function handlePublishFetchUrl() {
  if (!publishCoverUrlInput) return;
  const url = publishCoverUrlInput.value.trim();
  if (!url) {
    showToast('Please enter an image URL');
    return;
  }
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    showToast('URL must start with http:// or https://');
    return;
  }

  if (btnPublishFetchUrl) {
    btnPublishFetchUrl.disabled = true;
    btnPublishFetchUrl.textContent = 'Fetching...';
  }

  try {
    const res = await fetch(`${API_BASE}/fetch-image-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    const data = await res.json();
    const finalUrl = (data.success && data.imageUrl) ? data.imageUrl : url;
    coverImageUrl = finalUrl;
    const src = getEditorBackendUrl(finalUrl);
    if (publishPreviewCover) {
      publishPreviewCover.innerHTML = `<img src="${src}" alt="Cover" />`;
    }
    if (btnPublishRemoveCover) btnRemoveCoverToggle(true);
    updateCoverUI();
    scheduleAutoSave();
    showToast(data.direct ? 'Cover set from URL' : 'Image fetched and saved');
  } catch (err) {
    coverImageUrl = url;
    if (publishPreviewCover) {
      publishPreviewCover.innerHTML = `<img src="${url}" alt="Cover" />`;
    }
    if (btnPublishRemoveCover) btnRemoveCoverToggle(true);
    updateCoverUI();
    scheduleAutoSave();
    showToast('Cover set directly from URL');
  } finally {
    if (btnPublishFetchUrl) {
      btnPublishFetchUrl.disabled = false;
      btnPublishFetchUrl.textContent = 'Fetch & Set';
    }
    if (publishCoverUrlBox) publishCoverUrlBox.style.display = 'none';
    if (publishCoverButtons) publishCoverButtons.style.display = 'flex';
  }
}

function btnRemoveCoverToggle(show) {
  const btn = document.getElementById('btn-publish-remove-cover');
  if (btn) btn.style.display = show ? 'inline-flex' : 'none';
}

if (btnPublishFetchUrl) {
  btnPublishFetchUrl.addEventListener('click', handlePublishFetchUrl);
}

if (publishCoverUrlInput) {
  publishCoverUrlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handlePublishFetchUrl();
    } else if (e.key === 'Escape') {
      if (btnPublishCancelUrl) btnPublishCancelUrl.click();
    }
  });
}

// Publish modal cover file input change
if (publishCoverInput) {
  publishCoverInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const data = await apiUploadImage(file);
      if (data.success) {
        coverImageUrl = data.imageUrl;
        const src = getEditorBackendUrl(data.imageUrl);
        if (publishPreviewCover) {
          publishPreviewCover.innerHTML = `<img src="${src}" alt="Cover" />`;
        }
        btnRemoveCoverToggle(true);
        updateCoverUI();
        scheduleAutoSave();
        showToast('Cover image set');
      }
    } catch {
      showToast('Failed to upload cover image');
    }
    e.target.value = '';
  });
}

// Action: Publish Now / Update Story
btnPublishNow.addEventListener('click', async () => {
  const title = publishTitleInput.value.trim() || editorTitle.textContent.trim() || 'Untitled';
  const subtitle = publishSubtitleInput.value.trim() || editorSubtitle.textContent.trim() || '';
  const tags = selectedPublishTags.slice();
  const content = editorContent.innerHTML.trim() || '<p><br></p>';

  btnPublishNow.disabled = true;
  btnPublishNow.textContent = 'Publishing...';

  const matchCoverBackground = document.getElementById('publish-match-bg')?.checked ?? currentPostMatchCoverBackground;
  currentPostMatchCoverBackground = matchCoverBackground;

  try {
    let slug = '';
    let savedPost = null;

    if (currentPostId) {
      const updateRes = await apiUpdatePost(currentPostId, {
        title,
        subtitle,
        content,
        tags,
        coverImage: coverImageUrl,
        matchCoverBackground,
        published: true,
      });
      if (updateRes && updateRes.success && updateRes.post) {
        savedPost = updateRes.post;
        slug = updateRes.post.slug;
      }
    }

    if (!savedPost) {
      const createRes = await apiCreatePost({
        title,
        subtitle,
        content,
        tags,
        coverImage: coverImageUrl,
        matchCoverBackground,
        published: true,
      });
      if (createRes && createRes.success && createRes.post) {
        savedPost = createRes.post;
        currentPostId = createRes.post.id;
        slug = createRes.post.slug;
      } else {
        throw new Error(createRes?.error || 'Failed to publish story');
      }
    }

    await apiFetchPosts();
    closePublishModal();
    saveStatus.textContent = 'Published';
    btnPublishNav.textContent = 'Update';
    showToast('Story published! 🎉', 'View story', getReaderLiveUrl(slug));
  } catch (err) {
    console.error('Publish error:', err);
    showToast(`Failed to publish: ${err.message || 'Server error'}`);
  } finally {
    btnPublishNow.disabled = false;
    btnPublishNow.textContent = 'Publish now';
  }
});

// Action: Save as Draft
btnSaveDraft.addEventListener('click', async () => {
  const title = publishTitleInput.value.trim() || editorTitle.textContent.trim() || 'Untitled';
  const subtitle = publishSubtitleInput.value.trim() || editorSubtitle.textContent.trim() || '';
  const tags = selectedPublishTags.slice();
  const content = editorContent.innerHTML.trim() || '<p><br></p>';

  const matchCoverBackground = document.getElementById('publish-match-bg')?.checked ?? currentPostMatchCoverBackground;
  currentPostMatchCoverBackground = matchCoverBackground;

  btnSaveDraft.disabled = true;
  btnSaveDraft.textContent = 'Saving...';

  try {
    let savedPost = null;
    if (currentPostId) {
      const updateRes = await apiUpdatePost(currentPostId, {
        title,
        subtitle,
        content,
        tags,
        coverImage: coverImageUrl,
        matchCoverBackground,
        published: false,
      });
      if (updateRes && updateRes.success && updateRes.post) {
        savedPost = updateRes.post;
      }
    }

    if (!savedPost) {
      const createRes = await apiCreatePost({
        title,
        subtitle,
        content,
        tags,
        coverImage: coverImageUrl,
        matchCoverBackground,
        published: false,
      });
      if (createRes && createRes.success && createRes.post) {
        savedPost = createRes.post;
        currentPostId = createRes.post.id;
      } else {
        throw new Error(createRes?.error || 'Failed to save draft');
      }
    }

    await apiFetchPosts();
    closePublishModal();
    saveStatus.textContent = 'Draft';
    btnPublishNav.textContent = 'Publish';
    showToast('Saved as draft');
  } catch (err) {
    console.error('Draft error:', err);
    showToast(`Failed to save draft: ${err.message || 'Server error'}`);
  } finally {
    btnSaveDraft.disabled = false;
    btnSaveDraft.textContent = 'Save as draft';
  }
});

// Cover Image remove in Editor
document.getElementById('cover-remove').addEventListener('click', () => {
  coverImageUrl = '';
  updateCoverUI();
  scheduleAutoSave();
});

// ============ Stories List Global Actions ============
window.showEditorView = showEditorView;
window.showStoriesView = showStoriesView;

window.handleTogglePublish = async function (postId) {
  try {
    const data = await apiTogglePublish(postId);
    const status = data.post.published ? 'published' : 'unpublished';
    showToast(`Story ${status}`);
    await loadStories();
  } catch {
    showToast('Failed to update story');
  }
};

window.handleDelete = function (postId, title) {
  const overlay = document.createElement('div');
  overlay.className = 'confirm-overlay';
  overlay.innerHTML = `
    <div class="confirm-dialog">
      <h3>Delete story</h3>
      <p>Are you sure you want to delete "${title}"? This cannot be undone.</p>
      <div class="confirm-actions">
        <button class="confirm-cancel" id="confirm-cancel">Cancel</button>
        <button class="confirm-danger" id="confirm-delete">Delete</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector('#confirm-cancel').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#confirm-delete').addEventListener('click', async () => {
    try {
      await apiDeletePost(postId);
      showToast('Story deleted');
      overlay.remove();
      await loadStories();
    } catch {
      showToast('Failed to delete story');
      overlay.remove();
    }
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
};

// ============ Profile Section Logic ============
let profileData = null;
let currentProfileAvatar = '';

async function loadProfile() {
  try {
    const data = await apiGetProfile();
    profileData = data.profile || {
      name: 'Kushal Shah',
      tagline: '',
      bio: '',
      about: '',
      avatar: '',
      links: []
    };
    renderProfileForm(profileData);
  } catch (err) {
    console.error('Failed to load profile:', err);
    showToast('Failed to load profile');
  }
}

function renderProfileForm(p) {
  if (profileName) profileName.value = p.name || '';
  if (profileTagline) profileTagline.value = p.tagline || '';
  if (profileBio) profileBio.value = p.bio || '';
  if (profileAbout) profileAbout.value = p.about || '';
  currentProfileAvatar = p.avatar || '';
  updateProfileAvatarUI();
  renderProfileLinks(p.links || []);
  const readerUrlInput = document.getElementById('profile-reader-url');
  if (readerUrlInput) {
    readerUrlInput.value = localStorage.getItem('kushal_reader_live_url') || (['localhost', '127.0.0.1'].includes(window.location.hostname) ? 'http://localhost:5173' : '');
  }
}

function updateProfileAvatarUI() {
  const name = (profileName?.value || profileData?.name || 'Kushal Shah').trim();
  const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'KS';

  // Elements in profile settings view
  const navImg = document.getElementById('nav-profile-avatar-img');
  const navInitials = document.getElementById('nav-profile-avatar-initials');
  const dropImg = document.getElementById('dropdown-avatar-img');
  const dropInitials = document.getElementById('dropdown-avatar-initials');
  const dropName = document.getElementById('dropdown-profile-name');
  const dropTagline = document.getElementById('dropdown-profile-tagline');

  if (dropName) dropName.textContent = name;
  if (dropTagline) dropTagline.textContent = profileTagline?.value || profileData?.tagline || 'Author & Engineer';

  if (currentProfileAvatar) {
    const src = getEditorBackendUrl(currentProfileAvatar);
    if (profileAvatarImg) {
      profileAvatarImg.src = src;
      profileAvatarImg.style.display = 'block';
    }
    if (profileAvatarInitials) profileAvatarInitials.style.display = 'none';
    if (btnRemoveAvatar) btnRemoveAvatar.style.display = 'inline-flex';

    if (navImg) {
      navImg.src = src;
      navImg.style.display = 'block';
    }
    if (navInitials) navInitials.style.display = 'none';

    if (dropImg) {
      dropImg.src = src;
      dropImg.style.display = 'block';
    }
    if (dropInitials) dropInitials.style.display = 'none';
  } else {
    if (profileAvatarImg) {
      profileAvatarImg.src = '';
      profileAvatarImg.style.display = 'none';
    }
    if (profileAvatarInitials) {
      profileAvatarInitials.textContent = initials;
      profileAvatarInitials.style.display = 'block';
    }
    if (btnRemoveAvatar) btnRemoveAvatar.style.display = 'none';

    if (navImg) {
      navImg.src = '';
      navImg.style.display = 'none';
    }
    if (navInitials) {
      navInitials.textContent = initials;
      navInitials.style.display = 'block';
    }

    if (dropImg) {
      dropImg.src = '';
      dropImg.style.display = 'none';
    }
    if (dropInitials) {
      dropInitials.textContent = initials;
      dropInitials.style.display = 'block';
    }
  }
}

// ============ Social Media Icon Map ============
const SOCIAL_ICONS = [
  { id: 'github', label: 'GitHub', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>' },
  { id: 'twitter', label: 'Twitter / X', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>' },
  { id: 'linkedin', label: 'LinkedIn', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>' },
  { id: 'youtube', label: 'YouTube', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"/><polygon fill="white" points="9.545,15.568 15.818,12 9.545,8.432"/></svg>' },
  { id: 'instagram', label: 'Instagram', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>' },
  { id: 'facebook', label: 'Facebook', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>' },
  { id: 'dribbble', label: 'Dribbble', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 24C5.385 24 0 18.615 0 12S5.385 0 12 0s12 5.385 12 12-5.385 12-12 12zm10.12-10.358c-.35-.11-3.17-.953-6.384-.438 1.34 3.684 1.887 6.684 1.992 7.308 2.3-1.555 3.936-4.02 4.395-6.87zm-6.115 7.808c-.153-.9-.75-4.032-2.19-7.77l-.066.02c-5.79 2.015-7.86 6.025-8.04 6.4 1.73 1.358 3.92 2.166 6.29 2.166 1.42 0 2.77-.29 4-.81zm-11.62-2.58c.232-.4 3.045-5.055 8.332-6.765.135-.045.27-.084.405-.12-.26-.585-.54-1.167-.832-1.74C7.17 11.775 2.206 11.71 1.756 11.7l-.004.312c0 2.633.998 5.037 2.634 6.855zm-2.42-8.955c.46.008 4.683.026 9.477-1.248-1.698-3.018-3.53-5.558-3.8-5.928-2.868 1.35-5.01 3.99-5.676 7.17zm7.56-7.872c.282.394 2.145 2.906 3.822 6 3.645-1.365 5.19-3.44 5.373-3.702-1.81-1.61-4.19-2.586-6.795-2.586-.825 0-1.63.1-2.4.29zm10.868 3.638c-.217.29-1.937 2.493-5.753 4.074.25.513.486 1.035.71 1.563.076.18.152.36.226.54 3.38-.425 6.75.26 7.09.33-.02-2.42-.88-4.64-2.272-6.51z"/></svg>' },
  { id: 'medium', label: 'Medium', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.54 12a6.8 6.8 0 01-6.77 6.82A6.8 6.8 0 010 12a6.8 6.8 0 016.77-6.82A6.8 6.8 0 0113.54 12zM20.96 12c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42M24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12z"/></svg>' },
  { id: 'discord', label: 'Discord', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z"/></svg>' },
  { id: 'reddit', label: 'Reddit', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/></svg>' },
  { id: 'tiktok', label: 'TikTok', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>' },
  { id: 'website', label: 'Website', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>' },
  { id: 'email', label: 'Email', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>' },
  { id: 'twitch', label: 'Twitch', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/></svg>' },
  { id: 'spotify', label: 'Spotify', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>' },
  { id: 'pinterest', label: 'Pinterest', svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12.017 24c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641.001 12.017.001z"/></svg>' },
];

function getSocialIconSvg(iconId) {
  const icon = SOCIAL_ICONS.find(i => i.id === iconId);
  return icon ? icon.svg : SOCIAL_ICONS.find(i => i.id === 'website').svg;
}

function renderProfileLinks(links) {
  if (!profileLinksList) return;
  profileLinksList.innerHTML = '';
  links.forEach(link => addProfileLinkItem(link.label, link.url, link.icon || 'website'));
  if (links.length === 0) {
    addProfileLinkItem('GitHub', 'https://github.com', 'github');
  }
}

function addProfileLinkItem(label = '', url = '', iconId = 'website') {
  if (!profileLinksList) return;
  const item = document.createElement('div');
  item.className = 'profile-link-item';
  item.dataset.icon = iconId;

  const iconPicker = document.createElement('div');
  iconPicker.className = 'profile-link-icon-picker';

  const iconBtn = document.createElement('button');
  iconBtn.type = 'button';
  iconBtn.className = 'icon-picker-btn';
  iconBtn.innerHTML = getSocialIconSvg(iconId);
  iconBtn.title = 'Choose icon';

  const dropdown = document.createElement('div');
  dropdown.className = 'icon-picker-dropdown';

  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.className = 'icon-picker-search';
  searchInput.placeholder = 'Search icons...';
  dropdown.appendChild(searchInput);

  const grid = document.createElement('div');
  grid.className = 'icon-picker-grid';
  dropdown.appendChild(grid);

  function renderIconGrid(filter = '') {
    const q = filter.toLowerCase();
    grid.innerHTML = '';
    SOCIAL_ICONS.filter(ic => !q || ic.label.toLowerCase().includes(q) || ic.id.includes(q)).forEach(ic => {
      const opt = document.createElement('button');
      opt.type = 'button';
      opt.className = `icon-picker-option ${ic.id === item.dataset.icon ? 'selected' : ''}`;
      opt.innerHTML = ic.svg;
      opt.title = ic.label;
      opt.addEventListener('click', (e) => {
        e.stopPropagation();
        item.dataset.icon = ic.id;
        iconBtn.innerHTML = ic.svg;
        dropdown.classList.remove('open');
        // Also auto-fill label if empty
        const labelInput = item.querySelector('.profile-link-label');
        if (labelInput && !labelInput.value.trim()) {
          labelInput.value = ic.label;
        }
      });
      grid.appendChild(opt);
    });
  }

  renderIconGrid();

  searchInput.addEventListener('input', () => {
    renderIconGrid(searchInput.value);
  });

  searchInput.addEventListener('click', (e) => e.stopPropagation());

  iconBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    // Close all other dropdowns first
    document.querySelectorAll('.icon-picker-dropdown.open').forEach(dd => {
      if (dd !== dropdown) dd.classList.remove('open');
    });
    dropdown.classList.toggle('open');
    if (dropdown.classList.contains('open')) {
      searchInput.value = '';
      renderIconGrid();
      setTimeout(() => searchInput.focus(), 50);
    }
  });

  iconPicker.appendChild(iconBtn);
  iconPicker.appendChild(dropdown);

  const labelInput = document.createElement('input');
  labelInput.type = 'text';
  labelInput.className = 'form-input profile-link-label';
  labelInput.placeholder = 'Button Label';
  labelInput.value = label;

  const urlInput = document.createElement('input');
  urlInput.type = 'url';
  urlInput.className = 'form-input profile-link-url';
  urlInput.placeholder = 'https://...';
  urlInput.value = url;

  const delBtn = document.createElement('button');
  delBtn.type = 'button';
  delBtn.className = 'profile-link-del';
  delBtn.title = 'Remove button';
  delBtn.textContent = '✕';
  delBtn.addEventListener('click', () => item.remove());

  item.appendChild(iconPicker);
  item.appendChild(labelInput);
  item.appendChild(urlInput);
  item.appendChild(delBtn);

  profileLinksList.appendChild(item);
}

// Close icon picker dropdowns on outside click
document.addEventListener('click', (e) => {
  if (!e.target.closest('.profile-link-icon-picker')) {
    document.querySelectorAll('.icon-picker-dropdown.open').forEach(dd => dd.classList.remove('open'));
  }
});

async function saveProfile() {
  if (!profileName) return;
  const name = profileName.value.trim() || 'Kushal Shah';
  const tagline = profileTagline?.value.trim() || '';
  const bio = profileBio?.value.trim() || '';
  const about = profileAbout?.value.trim() || '';

  const links = [];
  if (profileLinksList) {
    const items = profileLinksList.querySelectorAll('.profile-link-item');
    items.forEach((item, index) => {
      const lbl = item.querySelector('.profile-link-label')?.value.trim();
      const u = item.querySelector('.profile-link-url')?.value.trim();
      const icon = item.dataset?.icon || 'website';
      if (lbl || u) {
        links.push({
          id: String(index + 1),
          label: lbl || 'Link',
          url: u || '#',
          icon: icon
        });
      }
    });
  }

  const payload = {
    name,
    tagline,
    bio,
    about,
    avatar: currentProfileAvatar,
    links
  };

  try {
    if (profileSaveStatus) profileSaveStatus.textContent = 'Saving...';
    const readerUrlInput = document.getElementById('profile-reader-url');
    if (readerUrlInput && readerUrlInput.value.trim()) {
      localStorage.setItem('kushal_reader_live_url', readerUrlInput.value.trim());
      const topLink = document.getElementById('topnav-view-blog-link');
      if (topLink) topLink.href = getReaderLiveUrl();
    }
    const res = await apiUpdateProfile(payload);
    if (res.success) {
      if (profileSaveStatus) {
        profileSaveStatus.textContent = 'Saved successfully!';
        setTimeout(() => {
          if (profileSaveStatus) profileSaveStatus.textContent = '';
        }, 3000);
      }
      showToast('Profile updated successfully');
    }
  } catch (err) {
    console.error('Failed to save profile:', err);
    if (profileSaveStatus) profileSaveStatus.textContent = 'Save failed';
    showToast('Failed to save profile');
  }
}

// Wire Profile UI Events
if (btnAddProfileLink) {
  btnAddProfileLink.addEventListener('click', () => {
    addProfileLinkItem('', 'https://', 'website');
    const items = profileLinksList.querySelectorAll('.profile-link-item');
    const lastItem = items[items.length - 1];
    lastItem?.querySelector('.profile-link-label')?.focus();
  });
}

if (btnUploadAvatar && profileAvatarInput) {
  btnUploadAvatar.addEventListener('click', () => {
    profileAvatarInput.click();
  });

  profileAvatarInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const data = await apiUploadImage(file);
      if (data.success) {
        currentProfileAvatar = data.imageUrl;
        updateProfileAvatarUI();
        showToast('Avatar uploaded');
      }
    } catch {
      showToast('Failed to upload avatar');
    }
    e.target.value = '';
  });
}

if (btnRemoveAvatar) {
  btnRemoveAvatar.addEventListener('click', () => {
    currentProfileAvatar = '';
    updateProfileAvatarUI();
  });
}

if (btnSaveProfile) {
  btnSaveProfile.addEventListener('click', saveProfile);
}

// ============ Dark Mode ============
function initTheme() {
  const savedTheme = localStorage.getItem('kushal_blog_theme') || localStorage.getItem('theme_preference') ||
    (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

  setTheme(savedTheme);

  document.querySelectorAll('.btn-theme-toggle').forEach(btn => {
    btn.onclick = () => {
      const cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      setTheme(cur);
    };
  });
}

function setTheme(theme) {
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  localStorage.setItem('kushal_blog_theme', theme);
  localStorage.setItem('theme_preference', theme);
}

// ============ Auth & Open Access ============
let isAuthorLoggedIn = true;
localStorage.setItem('author_auth', 'true');
localStorage.setItem('kushal_blog_jwt', 'open-access-token');

function initAuth() {
  updateAuthUI();
  closeLoginModal();
}

function updateAuthUI() {
  const authBtn = document.getElementById('btn-auth');
  if (authBtn) authBtn.style.display = 'none';
  const dropdownLogoutBtn = document.getElementById('btn-dropdown-logout');
  if (dropdownLogoutBtn) dropdownLogoutBtn.style.display = 'none';
}

function openLoginModal() {
  // Login modal removed per user request
  closeLoginModal();
}

function closeLoginModal() {
  const overlay = document.getElementById('login-modal-overlay');
  if (overlay) {
    overlay.classList.remove('active');
    overlay.style.display = 'none';
  }
}

// ============ Cloudinary Image Hosting UI ============
function initCloudinaryUI() {
  const enabledInput = document.getElementById('cloudinary-enabled');
  const cloudNameInput = document.getElementById('cloudinary-cloud-name');
  const presetInput = document.getElementById('cloudinary-upload-preset');
  const btnSave = document.getElementById('btn-save-cloudinary');
  const btnTest = document.getElementById('btn-test-cloudinary');
  const statusBadge = document.getElementById('cloudinary-status-badge');
  const saveMsg = document.getElementById('cloudinary-save-msg');

  if (!btnSave) return;

  function updateBadge() {
    if (!statusBadge) return;
    if (isCloudinaryActive()) {
      statusBadge.textContent = 'Cloudinary Active (Cloud CDN)';
      statusBadge.style.background = '#dcfce7';
      statusBadge.style.color = '#15803d';
    } else {
      statusBadge.textContent = 'Local Storage Active';
      statusBadge.style.background = '#f1f5f9';
      statusBadge.style.color = '#64748b';
    }
  }

  // Populate from current settings
  if (enabledInput) enabledInput.checked = CLOUDINARY_ENABLED;
  if (cloudNameInput) cloudNameInput.value = CLOUDINARY_CLOUD_NAME;
  if (presetInput) presetInput.value = CLOUDINARY_UPLOAD_PRESET;
  updateBadge();

  btnSave.addEventListener('click', () => {
    CLOUDINARY_CLOUD_NAME = (cloudNameInput?.value || '').trim();
    CLOUDINARY_UPLOAD_PRESET = (presetInput?.value || '').trim();
    CLOUDINARY_ENABLED = enabledInput?.checked ?? false;

    localStorage.setItem('cloudinary_cloud_name', CLOUDINARY_CLOUD_NAME);
    localStorage.setItem('cloudinary_upload_preset', CLOUDINARY_UPLOAD_PRESET);
    localStorage.setItem('cloudinary_enabled', String(CLOUDINARY_ENABLED));

    updateBadge();

    if (saveMsg) {
      saveMsg.textContent = 'Cloudinary settings saved!';
      saveMsg.style.color = 'var(--green)';
      setTimeout(() => { if (saveMsg) saveMsg.textContent = ''; }, 3000);
    }
    showToast(isCloudinaryActive() ? 'Cloudinary enabled!' : 'Settings saved');
  });

  if (btnTest) {
    btnTest.addEventListener('click', async () => {
      const cName = (cloudNameInput?.value || '').trim();
      const preset = (presetInput?.value || '').trim();

      if (!cName || !preset) {
        if (saveMsg) {
          saveMsg.textContent = 'Please enter both Cloud Name and Upload Preset';
          saveMsg.style.color = '#dc2626';
        }
        showToast('Please fill in both fields first');
        return;
      }

      btnTest.disabled = true;
      btnTest.textContent = 'Testing...';
      if (saveMsg) {
        saveMsg.textContent = 'Testing connection with Cloudinary...';
        saveMsg.style.color = 'var(--text-secondary)';
      }

      try {
        // Upload a 1x1 transparent GIF to test credentials
        const testBase64 = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        const formData = new FormData();
        formData.append('file', testBase64);
        formData.append('upload_preset', preset);

        const res = await fetch(`https://api.cloudinary.com/v1_1/${cName}/image/upload`, {
          method: 'POST',
          body: formData
        });
        const data = await res.json();

        if (data.secure_url) {
          if (saveMsg) {
            saveMsg.textContent = 'Connection successful! Cloudinary is working.';
            saveMsg.style.color = 'var(--green)';
          }
          showToast('Cloudinary connected successfully! 🎉');
        } else {
          const errMsg = data.error?.message || 'Invalid Cloud Name or Preset';
          if (saveMsg) {
            saveMsg.textContent = `Test failed: ${errMsg}`;
            saveMsg.style.color = '#dc2626';
          }
          showToast(`Cloudinary error: ${errMsg}`);
        }
      } catch (err) {
        if (saveMsg) {
          saveMsg.textContent = `Network error: ${err.message}`;
          saveMsg.style.color = '#dc2626';
        }
        showToast('Could not reach Cloudinary');
      } finally {
        btnTest.disabled = false;
        btnTest.textContent = 'Test Connection';
      }
    });
  }
}

// ============ Projects & URL Import Logic ============
let currentProjectsData = { githubUsername: '', showGithubLink: true, projects: [] };
let currentProjectView = 'grid';

async function loadProjectsList() {
  const container = document.getElementById('projects-editor-list');
  if (container) container.innerHTML = '<p style="color:var(--text-secondary);font-size:14px;">Loading projects...</p>';

  try {
    const data = await apiGetProjects();
    currentProjectsData = {
      githubUsername: data.githubUsername || '',
      showGithubLink: data.showGithubLink !== false,
      projects: Array.isArray(data.projects) ? data.projects : []
    };

    const ghInput = document.getElementById('proj-github-username');
    const ghShow = document.getElementById('proj-github-show');
    if (ghInput) ghInput.value = currentProjectsData.githubUsername;
    if (ghShow) ghShow.checked = currentProjectsData.showGithubLink;

    renderProjectsEditorList();
  } catch (err) {
    console.error('Failed to load projects:', err);
    if (container) container.innerHTML = '<p style="color:var(--red);font-size:14px;">Failed to load projects</p>';
  }
}

async function quickAddProjectFromUrl() {
  const input = document.getElementById('proj-quick-url');
  const statusEl = document.getElementById('proj-quick-status');
  const btn = document.getElementById('btn-quick-add-project');
  const rawUrl = (input?.value || '').trim();

  if (!rawUrl) {
    if (statusEl) {
      statusEl.textContent = 'Please enter or paste a GitHub project URL.';
      statusEl.style.color = 'var(--red)';
    }
    input?.focus();
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Importing... ⏳';
  }
  if (statusEl) {
    statusEl.textContent = 'Fetching project details... ⏳';
    statusEl.style.color = 'var(--text-secondary)';
  }

  try {
    let project = null;

    // 1. Direct Client-side GitHub API fetch (fastest, works directly in browser)
    let clean = rawUrl.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/^github\.com\//i, '').replace(/\/$/, '');
    const parts = clean.split('/').filter(Boolean);
    if (parts.length >= 2) {
      const [owner, repo] = parts;
      try {
        const ghRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
        if (ghRes.ok) {
          const ghData = await ghRes.json();
          project = {
            title: ghData.name || repo,
            description: ghData.description || '',
            techStack: [ghData.language, ...(ghData.topics || [])].filter(Boolean),
            githubUrl: ghData.html_url || `https://github.com/${owner}/${repo}`,
            liveUrl: ghData.homepage || '',
            stars: ghData.stargazers_count || 0,
            featured: false
          };
        }
      } catch (ghErr) {
        console.warn('Direct GitHub API fetch warning, trying fallback:', ghErr);
      }
    }

    // 2. Secondary fallback to backend /api/github/repo-info
    if (!project) {
      try {
        const res = await fetch(`${API_BASE}/github/repo-info?url=${encodeURIComponent(rawUrl)}`);
        if (res.ok) {
          const data = await safeParseJson(res);
          if (data && data.success && data.project) {
            project = data.project;
          }
        }
      } catch (backendErr) {
        console.warn('Backend repo-info fetch fallback notice:', backendErr);
      }
    }

    // 3. Fallback: Parse clean title from URL
    if (!project) {
      const cleanParts = rawUrl.replace(/^https?:\/\//i, '').replace(/\/$/, '').split('/');
      const lastPart = cleanParts.pop() || cleanParts.pop() || 'Project';
      const parsedTitle = decodeURIComponent(lastPart).replace(/[-_]/g, ' ');
      project = {
        title: parsedTitle.charAt(0).toUpperCase() + parsedTitle.slice(1),
        description: 'Imported from ' + rawUrl,
        techStack: ['Web'],
        githubUrl: rawUrl.toLowerCase().includes('github.com') ? rawUrl : '',
        liveUrl: !rawUrl.toLowerCase().includes('github.com') ? rawUrl : '',
        stars: 0,
        featured: false
      };
    }

    const newProject = {
      id: 'proj-' + Date.now(),
      title: project.title,
      description: project.description || '',
      techStack: project.techStack || [],
      githubUrl: project.githubUrl || rawUrl,
      liveUrl: project.liveUrl || '',
      stars: project.stars || 0,
      featured: false,
      createdAt: new Date().toISOString()
    };

    // Remove duplicates
    currentProjectsData.projects = currentProjectsData.projects.filter(p => 
      !(p.githubUrl && newProject.githubUrl && p.githubUrl.toLowerCase() === newProject.githubUrl.toLowerCase()) &&
      p.title.toLowerCase() !== newProject.title.toLowerCase()
    );

    // Prepend new project to list
    currentProjectsData.projects.unshift(newProject);
    localStorage.setItem('kushal_saved_projects_backup', JSON.stringify(currentProjectsData));

    renderProjectsEditorList();

    // Sync to backend database
    let synced = true;
    try {
      await apiUpdateProjects(currentProjectsData);
    } catch (saveErr) {
      console.warn('Backend database sync deferred:', saveErr);
      synced = false;
    }

    if (input) input.value = '';
    if (statusEl) {
      statusEl.textContent = synced 
        ? `✓ Project "${newProject.title}" successfully added to website!`
        : `✓ Project "${newProject.title}" added to local editor (backend offline, saved locally).`;
      statusEl.style.color = 'var(--green)';
      setTimeout(() => { if (statusEl) statusEl.textContent = ''; }, 4500);
    }
    showToast(`Project "${newProject.title}" added! 🚀`);
  } catch (err) {
    console.error('Failed to import project:', err);
    if (statusEl) {
      statusEl.textContent = `⚠️ Could not import: ${err.message || 'Check URL'}`;
      statusEl.style.color = 'var(--red)';
    }
    showToast('Failed to import project');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = '+ Add Project';
    }
  }
}

function setProjectsEditorView(view) {
  currentProjectView = view;
  const container = document.getElementById('projects-editor-list');
  if (container) {
    container.className = `projects-editor-container view-${view}`;
  }
  const switcher = document.getElementById('projects-editor-view-switcher');
  if (switcher) {
    switcher.querySelectorAll('.feed-view-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === view);
    });
  }
  renderProjectsEditorList();
}

function renderProjectsEditorList() {
  const container = document.getElementById('projects-editor-list');
  if (!container) return;

  container.className = `projects-editor-container view-${currentProjectView}`;

  if (currentProjectsData.projects.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:32px 16px; border:1px dashed var(--border); border-radius:12px; background:var(--bg-secondary); grid-column: 1 / -1;">
        <p style="font-size:15px; font-weight:600; margin:0 0 6px 0; color:var(--text);">No projects listed on website yet</p>
        <p style="font-size:13px; color:var(--text-secondary); margin:0 0 16px 0;">Connect your GitHub account above to select repositories, or add a custom project.</p>
        <button type="button" class="btn-publish-final" onclick="openProjectModal()" style="width:auto; padding:8px 20px; font-size:13px;">+ Add Custom Project</button>
      </div>
    `;
    return;
  }

  container.innerHTML = currentProjectsData.projects.map((p) => {
    const techPills = (p.techStack || [])
      .map(t => `<span style="display:inline-block; font-size:11px; padding:2px 7px; border-radius:4px; background:var(--bg); border:1px solid var(--border); color:var(--text-secondary); font-family:var(--font-mono);">${escapeHtml(t)}</span>`)
      .join(' ');

    const starBadge = p.stars ? `<span style="font-size:11.5px; font-weight:600; color:var(--text-secondary);">★ ${p.stars}</span>` : '';

    if (currentProjectView === 'compact') {
      return `
        <div class="project-editor-card" style="padding:10px 16px; border-bottom:1px solid var(--border-light); background:var(--bg); display:flex; align-items:center; justify-content:space-between; gap:16px;">
          <div style="display:flex; align-items:center; gap:12px; min-width:0; flex:1;">
            <h4 style="margin:0; font-size:14.5px; font-weight:700; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(p.title)}</h4>
            ${p.featured ? `<span style="font-size:10px; font-weight:700; padding:1px 6px; border-radius:3px; background:rgba(26,137,23,0.12); color:var(--green); flex-shrink:0;">★ Featured</span>` : ''}
            ${starBadge}
            <div style="display:flex; gap:4px; overflow:hidden; white-space:nowrap;">${techPills}</div>
          </div>
          <div style="display:flex; align-items:center; gap:10px; flex-shrink:0;">
            ${p.githubUrl ? `<a href="${p.githubUrl}" target="_blank" style="color:var(--text); font-size:12px; font-weight:600; text-decoration:none;">GitHub ↗</a>` : ''}
            ${p.liveUrl ? `<a href="${p.liveUrl}" target="_blank" style="color:var(--green); font-size:12px; font-weight:600; text-decoration:none;">Demo ↗</a>` : ''}
            <button type="button" class="btn-ghost-sm" onclick="editProjectItem('${p.id}')" style="padding:4px 10px; font-size:11.5px;">Edit</button>
            <button type="button" class="btn-ghost-sm" onclick="deleteProjectItem('${p.id}')" style="padding:4px 10px; font-size:11.5px; color:var(--red);">Delete</button>
          </div>
        </div>
      `;
    }

    if (currentProjectView === 'list') {
      return `
        <div class="project-editor-card" style="display:flex; justify-content:space-between; align-items:center; padding:18px 22px; border:1px solid var(--border); border-radius:12px; background:var(--bg-secondary); gap:20px;">
          <div style="flex:1; min-width:0;">
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:6px;">
              <h4 style="margin:0; font-size:16px; font-weight:700; color:var(--text);">${escapeHtml(p.title)}</h4>
              ${p.featured ? `<span style="font-size:11px; font-weight:600; padding:2px 7px; border-radius:4px; background:rgba(26,137,23,0.12); color:var(--green);">★ Featured</span>` : ''}
              ${starBadge}
            </div>
            <p style="margin:0 0 10px 0; font-size:13.5px; color:var(--text-secondary); line-height:1.5;">${escapeHtml(p.description || 'No description')}</p>
            <div style="display:flex; flex-wrap:wrap; gap:6px;">${techPills}</div>
          </div>
          <div style="display:flex; flex-direction:column; align-items:flex-end; gap:10px; flex-shrink:0;">
            <div style="display:flex; gap:12px; font-size:12.5px;">
              ${p.githubUrl ? `<a href="${p.githubUrl}" target="_blank" style="color:var(--text); text-decoration:none; font-weight:600;">GitHub Repo ↗</a>` : ''}
              ${p.liveUrl ? `<a href="${p.liveUrl}" target="_blank" style="color:var(--green); text-decoration:none; font-weight:600;">Live Demo ↗</a>` : ''}
            </div>
            <div style="display:flex; gap:8px;">
              <button type="button" class="btn-ghost-sm" onclick="editProjectItem('${p.id}')" style="padding:5px 12px; font-size:12px;">Edit</button>
              <button type="button" class="btn-ghost-sm" onclick="deleteProjectItem('${p.id}')" style="padding:5px 12px; font-size:12px; color:var(--red);">Delete</button>
            </div>
          </div>
        </div>
      `;
    }

    // Default Grid view
    return `
      <div class="project-editor-card" style="display:flex; flex-direction:column; justify-content:space-between; padding:20px; border:1px solid var(--border); border-radius:12px; background:var(--bg-secondary); gap:14px;">
        <div>
          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px; margin-bottom:8px;">
            <h4 style="margin:0; font-size:16px; font-weight:700; color:var(--text);">${escapeHtml(p.title)}</h4>
            ${p.featured ? `<span style="font-size:10.5px; font-weight:600; padding:2px 6px; border-radius:4px; background:rgba(26,137,23,0.12); color:var(--green); flex-shrink:0;">★ Featured</span>` : ''}
          </div>
          <p style="margin:0 0 12px 0; font-size:13px; color:var(--text-secondary); line-height:1.5;">${escapeHtml(p.description || 'No description')}</p>
          <div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:12px;">${techPills}</div>
          ${starBadge ? `<div style="margin-bottom:10px;">${starBadge}</div>` : ''}
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; padding-top:12px; border-top:1px solid var(--border); font-size:12.5px;">
          <div style="display:flex; gap:10px;">
            ${p.githubUrl ? `<a href="${p.githubUrl}" target="_blank" style="color:var(--text); text-decoration:none; font-weight:600;">GitHub ↗</a>` : ''}
            ${p.liveUrl ? `<a href="${p.liveUrl}" target="_blank" style="color:var(--green); text-decoration:none; font-weight:600;">Demo ↗</a>` : ''}
          </div>
          <div style="display:flex; gap:6px;">
            <button type="button" class="btn-ghost-sm" onclick="editProjectItem('${p.id}')" style="padding:4px 10px; font-size:11.5px;">Edit</button>
            <button type="button" class="btn-ghost-sm" onclick="deleteProjectItem('${p.id}')" style="padding:4px 10px; font-size:11.5px; color:var(--red);">Delete</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

async function saveGithubSettings() {
  const ghInput = document.getElementById('proj-github-username');
  const ghShow = document.getElementById('proj-github-show');
  const statusEl = document.getElementById('proj-github-save-status');

  const githubUsername = (ghInput?.value || '').trim();
  const showGithubLink = ghShow?.checked ?? true;

  if (statusEl) statusEl.textContent = 'Saving...';

  try {
    await apiUpdateProjects({
      githubUsername,
      showGithubLink,
      projects: currentProjectsData.projects
    });
    currentProjectsData.githubUsername = githubUsername;
    currentProjectsData.showGithubLink = showGithubLink;
    if (statusEl) {
      statusEl.textContent = 'Saved! ✓';
      setTimeout(() => { if (statusEl) statusEl.textContent = ''; }, 3000);
    }
    showToast('GitHub settings updated!');
    if (githubUsername) fetchGithubRepos(githubUsername, false);
  } catch (err) {
    console.error('Failed to save github settings:', err);
    if (statusEl) statusEl.textContent = 'Error saving';
    showToast('Failed to save GitHub settings');
  }
}

function openProjectModal(project = null) {
  const overlay = document.getElementById('project-modal-overlay');
  const heading = document.getElementById('project-modal-heading');
  const idInput = document.getElementById('modal-proj-id');
  const titleInput = document.getElementById('modal-proj-title');
  const descInput = document.getElementById('modal-proj-desc');
  const techInput = document.getElementById('modal-proj-tech');
  const ghInput = document.getElementById('modal-proj-github');
  const liveInput = document.getElementById('modal-proj-live');
  const featuredInput = document.getElementById('modal-proj-featured');

  if (project) {
    if (heading) heading.textContent = 'Edit Project';
    if (idInput) idInput.value = project.id || '';
    if (titleInput) titleInput.value = project.title || '';
    if (descInput) descInput.value = project.description || '';
    if (techInput) techInput.value = Array.isArray(project.techStack) ? project.techStack.join(', ') : (project.techStack || '');
    if (ghInput) ghInput.value = project.githubUrl || '';
    if (liveInput) liveInput.value = project.liveUrl || '';
    if (featuredInput) featuredInput.checked = !!project.featured;
  } else {
    if (heading) heading.textContent = 'Add New Project';
    if (idInput) idInput.value = '';
    if (titleInput) titleInput.value = '';
    if (descInput) descInput.value = '';
    if (techInput) techInput.value = '';
    if (ghInput) ghInput.value = '';
    if (liveInput) liveInput.value = '';
    if (featuredInput) featuredInput.checked = false;
  }

  if (overlay) overlay.classList.add('active');
}

function closeProjectModal() {
  const overlay = document.getElementById('project-modal-overlay');
  if (overlay) overlay.classList.remove('active');
}

async function handleProjectSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('modal-proj-id')?.value;
  const title = document.getElementById('modal-proj-title')?.value?.trim();
  const description = document.getElementById('modal-proj-desc')?.value?.trim();
  const techStack = (document.getElementById('modal-proj-tech')?.value || '').split(',').map(s => s.trim()).filter(Boolean);
  const githubUrl = document.getElementById('modal-proj-github')?.value?.trim();
  const liveUrl = document.getElementById('modal-proj-live')?.value?.trim();
  const featured = document.getElementById('modal-proj-featured')?.checked ?? false;

  if (!title) {
    showToast('Project title is required');
    return;
  }

  try {
    if (id) {
      await apiUpdateProject(id, { title, description, techStack, githubUrl, liveUrl, featured });
      const idx = currentProjectsData.projects.findIndex(p => p.id === id);
      if (idx !== -1) currentProjectsData.projects[idx] = { ...currentProjectsData.projects[idx], title, description, techStack, githubUrl, liveUrl, featured };
      showToast('Project updated! ✨');
    } else {
      const res = await apiCreateProject({ title, description, techStack, githubUrl, liveUrl, featured });
      if (res.project) currentProjectsData.projects.unshift(res.project);
      showToast('Project created! 🚀');
    }
    closeProjectModal();
    renderProjectsEditorList();
  } catch (err) {
    console.error('Failed to save project:', err);
    showToast('Failed to save project: ' + err.message);
  }
}

async function deleteProjectItem(id) {
  if (!confirm('Are you sure you want to delete this project?')) return;
  try {
    await apiDeleteProject(id);
    currentProjectsData.projects = currentProjectsData.projects.filter(p => p.id !== id);
    renderProjectsEditorList();
    showToast('Project deleted');
  } catch (err) {
    console.error('Failed to delete project:', err);
    showToast('Failed to delete project');
  }
}

window.openProjectModal = openProjectModal;
window.editProjectItem = function(id) {
  const p = currentProjectsData.projects.find(x => x.id === id);
  if (p) openProjectModal(p);
};
window.deleteProjectItem = deleteProjectItem;
window.quickAddProjectFromUrl = quickAddProjectFromUrl;

// Attach Projects Event Listeners
document.getElementById('btn-quick-add-project')?.addEventListener('click', quickAddProjectFromUrl);
document.getElementById('proj-quick-url')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    quickAddProjectFromUrl();
  }
});

const projSwitcher = document.getElementById('projects-editor-view-switcher');
if (projSwitcher) {
  projSwitcher.querySelectorAll('.feed-view-btn').forEach(btn => {
    btn.addEventListener('click', () => setProjectsEditorView(btn.dataset.view));
  });
}

// ============ Initialize ============
initTheme();
const topnavBlogLink = document.getElementById('topnav-view-blog-link');
if (topnavBlogLink) {
  topnavBlogLink.href = getReaderLiveUrl();
  topnavBlogLink.addEventListener('click', () => {
    let target = getReaderLiveUrl();
    if (!['localhost', '127.0.0.1'].includes(window.location.hostname) && !localStorage.getItem('kushal_reader_live_url')) {
      const entered = prompt('Enter your public reader blog website URL (e.g. https://your-reader.vercel.app or http://localhost:5173):', 'http://localhost:5173');
      if (entered && entered.trim()) {
        localStorage.setItem('kushal_reader_live_url', entered.trim());
        target = getReaderLiveUrl();
      }
    }
    topnavBlogLink.href = target;
  });
}
initAuth();
initViewSwitcher();
initCloudinaryUI();
initEditorMatchCoverBgToggle();
showStoriesView();
