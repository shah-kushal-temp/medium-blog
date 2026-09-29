const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { marked } = require('marked');
const hljs = require('highlight.js');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3002;

// Database connection
const { connectDB, getIsConnected, Post, Profile, Image } = require('./db');
connectDB();

// ============ JWT Auth Config ============
const JWT_SECRET = process.env.JWT_SECRET || 'kushal_blog_secret_key_2024_super_secure';
const JWT_EXPIRES_IN = '7d';

// Admin credentials (hashed password for 'admin123' - change this!)
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'kushal@blog.com';
const ADMIN_PASSWORD_HASH = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'admin123', 10);

// Auth middleware - disabled / bypassed per user request so all operations work freely without login
function requireAuth(req, res, next) {
  next();
}

// Paths
const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const POSTS_FILE = path.join(DATA_DIR, 'posts.json');
const PROFILE_FILE = path.join(DATA_DIR, 'profile.json');
const HOMEPAGE_FILE = path.join(DATA_DIR, 'homepage.json');
const PROJECTS_FILE = path.join(DATA_DIR, 'projects.json');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const IMAGES_DIR = path.join(DATA_DIR, 'images');

// Ensure directories exist
[DATA_DIR, UPLOADS_DIR, IMAGES_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Ensure posts.json exists
if (!fs.existsSync(POSTS_FILE)) {
  fs.writeFileSync(POSTS_FILE, JSON.stringify({ posts: [] }, null, 2));
}

const DEFAULT_PROFILE = {
  name: "Kushal Shah",
  tagline: "Software Engineer, Writer & Open Source Enthusiast",
  bio: "Writing about modern web technologies, distributed systems, clean code, and engineering architecture.",
  about: "Hi! I am Kushal Shah, a software engineer passionate about building high-performance systems and writing clean code. I created this personal blog to share practical knowledge, deep-dive tutorials, and architecture breakdowns.",
  avatar: "",
  links: [
    { id: "1", label: "GitHub", url: "https://github.com", icon: "github" },
    { id: "2", label: "Twitter / X", url: "https://twitter.com", icon: "twitter" },
    { id: "3", label: "LinkedIn", url: "https://linkedin.com", icon: "linkedin" }
  ]
};

// Ensure profile.json exists
if (!fs.existsSync(PROFILE_FILE)) {
  fs.writeFileSync(PROFILE_FILE, JSON.stringify(DEFAULT_PROFILE, null, 2));
}

// Default Homepage Config
const DEFAULT_HOMEPAGE = {
  heroLabel: "Stories & Ideas",
  heroTitle: "Welcome to Stories",
  heroAccent: "Stories",
  heroSubtitle: "Thoughts on technology, development, and life — curated articles and deep engineering breakdowns.",
  ctaText: "Browse All Stories",
  ctaLink: "#/stories/1",
  showHero: true,
  showTags: true,
  showTrending: true,
  footerText: "Stories, technical writings & engineering ideas",
  footerSub: "Explore articles on modern software engineering"
};

if (!fs.existsSync(HOMEPAGE_FILE)) {
  fs.writeFileSync(HOMEPAGE_FILE, JSON.stringify(DEFAULT_HOMEPAGE, null, 2));
}

// Default Projects Config
const DEFAULT_PROJECTS = {
  githubUsername: "",
  showGithubLink: true,
  projects: []
};

if (!fs.existsSync(PROJECTS_FILE)) {
  fs.writeFileSync(PROJECTS_FILE, JSON.stringify(DEFAULT_PROJECTS, null, 2));
}

function readHomepage() {
  try { return JSON.parse(fs.readFileSync(HOMEPAGE_FILE, 'utf-8')); } catch { return DEFAULT_HOMEPAGE; }
}
function writeHomepage(data) {
  fs.writeFileSync(HOMEPAGE_FILE, JSON.stringify(data, null, 2));
}
function readProjects() {
  try { return JSON.parse(fs.readFileSync(PROJECTS_FILE, 'utf-8')); } catch { return DEFAULT_PROJECTS; }
}
function writeProjects(data) {
  fs.writeFileSync(PROJECTS_FILE, JSON.stringify(data, null, 2));
}

function readProfile() {
  if (!fs.existsSync(PROFILE_FILE)) {
    fs.writeFileSync(PROFILE_FILE, JSON.stringify(DEFAULT_PROFILE, null, 2));
    return DEFAULT_PROFILE;
  }
  try {
    return JSON.parse(fs.readFileSync(PROFILE_FILE, 'utf-8'));
  } catch {
    return DEFAULT_PROFILE;
  }
}

function writeProfile(profile) {
  fs.writeFileSync(PROFILE_FILE, JSON.stringify(profile, null, 2));
}

// Configure marked with syntax highlighting
marked.setOptions({
  highlight: function (code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value;
    }
    return hljs.highlightAuto(code).value;
  },
  breaks: true,
  gfm: true,
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(UPLOADS_DIR));

// Image route with MongoDB database fallback
app.get('/images/:filename', async (req, res, next) => {
  const localFilePath = path.join(IMAGES_DIR, req.params.filename);
  if (fs.existsSync(localFilePath)) {
    return res.sendFile(localFilePath);
  }
  if (getIsConnected()) {
    try {
      const imgDoc = await Image.findOne({ id: req.params.filename });
      if (imgDoc && imgDoc.data) {
        const buffer = Buffer.from(imgDoc.data, 'base64');
        res.setHeader('Content-Type', imgDoc.mimeType || 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=31536000');
        return res.send(buffer);
      }
    } catch (e) {
      console.warn('Error fetching image from DB:', e.message);
    }
  }
  res.status(404).send('Image not found');
});

app.use('/images', express.static(IMAGES_DIR));

// Multer config for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.md', '.markdown', '.html', '.htm'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only .md and .html files are allowed'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// Image upload config
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, IMAGES_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const imageUpload = multer({
  storage: imageStorage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// Helper: read posts
function readPosts() {
  const data = fs.readFileSync(POSTS_FILE, 'utf-8');
  return JSON.parse(data);
}

// Helper: write posts
function writePosts(data) {
  fs.writeFileSync(POSTS_FILE, JSON.stringify(data, null, 2));
}

// Helper: generate slug
function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 80);
}

// Helper: estimate read time
function estimateReadTime(text) {
  const wordsPerMinute = 200;
  const words = text.replace(/<[^>]*>/g, '').split(/\s+/).length;
  return Math.max(1, Math.ceil(words / wordsPerMinute));
}

// Helper: extract title from content
function extractTitle(content, fileType) {
  if (fileType === 'md') {
    const match = content.match(/^#\s+(.+)$/m);
    if (match) return match[1].trim();
  } else {
    const match = content.match(/<h1[^>]*>(.*?)<\/h1>/i);
    if (match) return match[1].replace(/<[^>]*>/g, '').trim();
  }
  return 'Untitled Post';
}

// Helper: extract subtitle/description from content
function extractSubtitle(content, fileType) {
  if (fileType === 'md') {
    // Find first paragraph after title
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('!') && !trimmed.startsWith('---')) {
        return trimmed.substring(0, 200);
      }
    }
  } else {
    const match = content.match(/<p[^>]*>(.*?)<\/p>/i);
    if (match) return match[1].replace(/<[^>]*>/g, '').trim().substring(0, 200);
  }
  return '';
}

// Helper: parse content to HTML
function parseContent(rawContent, fileType) {
  if (fileType === 'md') {
    return marked(rawContent);
  }
  return rawContent;
}

// Helper: Normalize tags case-insensitively so "java" and "Java" become one single unified tag
function normalizeTags(rawTags) {
  if (!Array.isArray(rawTags)) return [];
  const map = new Map();
  rawTags.forEach(t => {
    if (typeof t !== 'string') return;
    const clean = t.trim();
    if (!clean) return;
    const lower = clean.toLowerCase();
    if (!map.has(lower)) {
      map.set(lower, clean);
    }
  });
  return Array.from(map.values());
}

// ============ ROUTES ============

// Create a new post directly from the editor
app.post('/api/posts', requireAuth, async (req, res) => {
  try {
    const { title, subtitle, content, tags, coverImage, coverColor, matchCoverBackground, published } = req.body;

    const postTitle = (title && title.trim()) ? title.trim() : 'Untitled';
    const htmlContent = content || '<p><br></p>';
    const readTime = estimateReadTime(htmlContent);

    const post = {
      id: uuidv4(),
      title: postTitle,
      subtitle: subtitle || '',
      slug: generateSlug(postTitle),
      author: 'Kushal Shah',
      coverImage: coverImage || '',
      coverColor: coverColor || '',
      matchCoverBackground: matchCoverBackground !== undefined ? Boolean(matchCoverBackground) : true,
      tags: normalizeTags(tags),
      content: htmlContent,
      rawContent: htmlContent,
      rawFile: '',
      originalFileName: '',
      fileType: 'html',
      readTime,
      published: Boolean(published),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const data = readPosts();

    // Ensure unique slug
    let slugCount = 1;
    let originalSlug = post.slug;
    while (data.posts.some(p => p.slug === post.slug)) {
      post.slug = `${originalSlug}-${slugCount++}`;
    }

    if (getIsConnected()) {
      try {
        await Post.create(post);
      } catch (dbErr) {
        console.warn('MongoDB post create error:', dbErr.message);
      }
    }

    data.posts.unshift(post);
    writePosts(data);

    res.json({ success: true, post });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// Update post content from editor
app.put('/api/posts/:id/content', requireAuth, async (req, res) => {
  const data = readPosts();
  const index = data.posts.findIndex(p => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Post not found' });

  const { title, subtitle, content, tags, coverImage, coverColor, matchCoverBackground } = req.body;
  const post = data.posts[index];

  if (title !== undefined) post.title = title;
  if (subtitle !== undefined) post.subtitle = subtitle;
  if (content !== undefined) {
    post.content = content;
    post.rawContent = content;
    post.readTime = estimateReadTime(content);
  }
  if (tags !== undefined) post.tags = normalizeTags(tags);
  if (coverImage !== undefined) post.coverImage = coverImage;
  if (coverColor !== undefined) post.coverColor = coverColor;
  if (matchCoverBackground !== undefined) post.matchCoverBackground = Boolean(matchCoverBackground);
  post.updatedAt = new Date().toISOString();

  if (getIsConnected()) {
    try {
      await Post.findOneAndUpdate({ id: req.params.id }, post, { upsert: true });
    } catch (dbErr) {
      console.warn('MongoDB post update error:', dbErr.message);
    }
  }

  writePosts(data);
  res.json({ success: true, post });
});

// Upload a file and create a new post
app.post('/api/upload', requireAuth, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const rawContent = fs.readFileSync(req.file.path, 'utf-8');
    const ext = path.extname(req.file.originalname).toLowerCase();
    const fileType = ['.md', '.markdown'].includes(ext) ? 'md' : 'html';

    const title = extractTitle(rawContent, fileType);
    const subtitle = extractSubtitle(rawContent, fileType);
    const htmlContent = parseContent(rawContent, fileType);
    const readTime = estimateReadTime(htmlContent);

    const post = {
      id: uuidv4(),
      title,
      subtitle,
      slug: generateSlug(title),
      author: 'Kushal Shah',
      coverImage: '',
      tags: [],
      content: htmlContent,
      rawContent,
      rawFile: req.file.filename,
      originalFileName: req.file.originalname,
      fileType,
      readTime,
      published: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const data = readPosts();

    // Ensure unique slug
    let slugCount = 1;
    let originalSlug = post.slug;
    while (data.posts.some(p => p.slug === post.slug)) {
      post.slug = `${originalSlug}-${slugCount++}`;
    }

    data.posts.unshift(post);
    writePosts(data);

    res.json({ success: true, post });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to process upload' });
  }
});

// Upload cover image (stored to filesystem and MongoDB)
app.post('/api/upload-image', requireAuth, imageUpload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }
    const imageUrl = `/images/${req.file.filename}`;

    // Store in MongoDB as well for cloud persistence
    if (getIsConnected()) {
      try {
        const fileBuffer = fs.readFileSync(req.file.path);
        await Image.create({
          id: req.file.filename,
          filename: req.file.originalname,
          mimeType: req.file.mimetype || 'image/jpeg',
          data: fileBuffer.toString('base64'),
          size: req.file.size
        });
      } catch (dbImgErr) {
        console.warn('Could not save image to MongoDB:', dbImgErr.message);
      }
    }

    res.json({ success: true, imageUrl, imageId: req.file.filename });
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// Directly fetch image from URL, download, store in DB & disk, and return image URL
app.post('/api/fetch-image-url', requireAuth, async (req, res) => {
  try {
    const { url } = req.body || {};
    if (!url || !url.trim().startsWith('http')) {
      return res.status(400).json({ error: 'Please provide a valid HTTP/HTTPS image URL' });
    }

    const trimmedUrl = url.trim();

    try {
      const response = await fetch(trimmedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!response.ok) {
        // Fallback: Return original URL if remote download was disallowed
        return res.json({ success: true, imageUrl: trimmedUrl, direct: true });
      }

      const contentType = response.headers.get('content-type') || 'image/jpeg';
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      let ext = '.jpg';
      if (contentType.includes('png')) ext = '.png';
      else if (contentType.includes('webp')) ext = '.webp';
      else if (contentType.includes('gif')) ext = '.gif';
      else if (contentType.includes('svg')) ext = '.svg';

      const filename = `${Date.now()}-fetched${ext}`;
      const filePath = path.join(IMAGES_DIR, filename);

      fs.writeFileSync(filePath, buffer);

      if (getIsConnected()) {
        try {
          await Image.create({
            id: filename,
            filename: filename,
            mimeType: contentType,
            data: buffer.toString('base64'),
            size: buffer.length
          });
        } catch (dbErr) {
          console.warn('MongoDB image save error:', dbErr.message);
        }
      }

      res.json({ success: true, imageUrl: `/images/${filename}`, direct: false });
    } catch (fetchErr) {
      console.warn('Direct image fetch error, using raw URL:', fetchErr.message);
      res.json({ success: true, imageUrl: trimmedUrl, direct: true });
    }
  } catch (error) {
    console.error('Fetch image URL error:', error);
    res.status(500).json({ error: 'Failed to process image URL' });
  }
});

// Get posts (supports pagination, search, status filtering, and curation ordering)
app.get('/api/posts', async (req, res) => {
  try {
    const pageParam = req.query.page;
    const limit = parseInt(req.query.limit, 10) || 10;
    const statusFilter = req.query.status; // 'published', 'drafts', 'all'
    const searchQuery = req.query.search ? req.query.search.trim().toLowerCase() : '';

    if (getIsConnected()) {
      const query = {};
      if (statusFilter === 'published') query.published = true;
      if (statusFilter === 'drafts') query.published = false;
      if (searchQuery) {
        query.$or = [
          { title: { $regex: searchQuery, $options: 'i' } },
          { subtitle: { $regex: searchQuery, $options: 'i' } },
          { tags: { $regex: searchQuery, $options: 'i' } }
        ];
      }

      if (pageParam && pageParam !== 'all') {
        const page = Math.max(1, parseInt(pageParam, 10) || 1);
        const totalPosts = await Post.countDocuments(query);
        const totalPages = Math.ceil(totalPosts / limit) || 1;

        const dbPosts = await Post.find(query)
          .sort({ isHero: -1, isPinned: -1, pinOrder: 1, createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean();

        const sanitized = dbPosts.map(({ rawContent, content, ...rest }) => ({
          ...rest,
          contentPreview: content ? content.replace(/<[^>]*>/g, '').substring(0, 300) : '',
        }));

        return res.json({
          posts: sanitized,
          pagination: {
            page,
            limit,
            totalPosts,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1
          }
        });
      }

      const dbPosts = await Post.find(query)
        .sort({ isHero: -1, isPinned: -1, pinOrder: 1, createdAt: -1 })
        .lean();

      const sanitized = dbPosts.map(({ rawContent, content, ...rest }) => ({
        ...rest,
        contentPreview: content ? content.replace(/<[^>]*>/g, '').substring(0, 300) : '',
      }));
      return res.json({ posts: sanitized });
    }

    // JSON file fallback
    const data = readPosts();
    let posts = data.posts;

    if (statusFilter === 'published') posts = posts.filter(p => p.published);
    if (statusFilter === 'drafts') posts = posts.filter(p => !p.published);
    if (searchQuery) {
      posts = posts.filter(p =>
        (p.title && p.title.toLowerCase().includes(searchQuery)) ||
        (p.subtitle && p.subtitle.toLowerCase().includes(searchQuery)) ||
        (p.tags && p.tags.some(t => t.toLowerCase().includes(searchQuery)))
      );
    }

    posts.sort((a, b) => {
      if (a.isHero && !b.isHero) return -1;
      if (!a.isHero && b.isHero) return 1;
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      if (a.isPinned && b.isPinned) return (a.pinOrder || 0) - (b.pinOrder || 0);
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    if (pageParam && pageParam !== 'all') {
      const page = Math.max(1, parseInt(pageParam, 10) || 1);
      const totalPosts = posts.length;
      const totalPages = Math.ceil(totalPosts / limit) || 1;
      const slice = posts.slice((page - 1) * limit, page * limit);

      const sanitized = slice.map(({ rawContent, content, ...rest }) => ({
        ...rest,
        contentPreview: content ? content.replace(/<[^>]*>/g, '').substring(0, 300) : '',
      }));

      return res.json({
        posts: sanitized,
        pagination: {
          page,
          limit,
          totalPosts,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      });
    }

    const sanitized = posts.map(({ rawContent, content, ...rest }) => ({
      ...rest,
      contentPreview: content ? content.replace(/<[^>]*>/g, '').substring(0, 300) : '',
    }));
    res.json({ posts: sanitized });
  } catch (err) {
    const data = readPosts();
    res.json({ posts: data.posts });
  }
});

// Curated Homepage Stories for Reader (Hero + Pinned + Top Recent)
app.get('/api/curated', async (req, res) => {
  try {
    let posts = [];
    if (getIsConnected()) {
      posts = await Post.find({ published: true })
        .sort({ isHero: -1, isPinned: -1, pinOrder: 1, createdAt: -1 })
        .limit(20)
        .lean();
    } else {
      const data = readPosts();
      posts = data.posts.filter(p => p.published).sort((a, b) => {
        if (a.isHero && !b.isHero) return -1;
        if (!a.isHero && b.isHero) return 1;
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        if (a.isPinned && b.isPinned) return (a.pinOrder || 0) - (b.pinOrder || 0);
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
    }

    const cleaned = posts.map(({ rawContent, content, ...rest }) => ({
      ...rest,
      contentPreview: content ? content.replace(/<[^>]*>/g, '').substring(0, 280) : '',
    }));

    const hero = cleaned.find(p => p.isHero) || cleaned[0] || null;
    const pinned = cleaned.filter(p => p.isPinned && (!hero || p.id !== hero.id));
    const recent = cleaned.filter(p => (!hero || p.id !== hero.id) && !p.isPinned);

    res.json({ hero, pinned, recent, all: cleaned });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve curated posts' });
  }
});

// Get all unique tags for Reader
app.get('/api/tags', async (req, res) => {
  try {
    let sourcePosts = [];
    if (getIsConnected()) {
      sourcePosts = await Post.find({ published: true }).lean();
    } else {
      sourcePosts = readPosts().posts.filter(p => p.published);
    }

    const map = new Map();
    sourcePosts.forEach(p => {
      if (Array.isArray(p.tags)) {
        p.tags.forEach(t => {
          const clean = (t || '').trim();
          if (!clean) return;
          const lower = clean.toLowerCase();
          if (!map.has(lower)) {
            map.set(lower, clean);
          }
        });
      }
    });
    res.json({ tags: Array.from(map.values()) });
  } catch (err) {
    res.json({ tags: [] });
  }
});

// Search posts
app.get('/api/search', async (req, res) => {
  const query = (req.query.q || '').toLowerCase().trim();
  if (!query) return res.json({ posts: [] });

  try {
    let sourcePosts = [];
    if (getIsConnected()) {
      sourcePosts = await Post.find({ published: true }).lean();
    } else {
      sourcePosts = readPosts().posts.filter(p => p.published);
    }

    const results = sourcePosts
      .filter(p => {
        return (
          (p.title && p.title.toLowerCase().includes(query)) ||
          (p.subtitle && p.subtitle.toLowerCase().includes(query)) ||
          (p.tags && p.tags.some(t => t.toLowerCase().includes(query))) ||
          (p.content && p.content.replace(/<[^>]*>/g, '').toLowerCase().includes(query))
        );
      })
      .map(({ rawContent, content, ...rest }) => ({
        ...rest,
        contentPreview: content
          ? content.replace(/<[^>]*>/g, '').substring(0, 280)
          : '',
      }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ posts: results });
  } catch (err) {
    res.json({ posts: [] });
  }
});

// Get homepage config
app.get('/api/homepage', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(HOMEPAGE_FILE, 'utf-8'));
    res.json({ success: true, homepage: data });
  } catch {
    res.json({ success: true, homepage: DEFAULT_HOMEPAGE });
  }
});

// Curation Endpoints: Get & Update Homepage Hero & Pinned Order
app.get('/api/curation', async (req, res) => {
  try {
    let posts = [];
    if (getIsConnected()) {
      posts = await Post.find().sort({ isHero: -1, isPinned: -1, pinOrder: 1, createdAt: -1 }).lean();
    } else {
      posts = readPosts().posts;
    }

    const heroPost = posts.find(p => p.isHero) || null;
    const pinnedPosts = posts.filter(p => p.isPinned && (!heroPost || p.id !== heroPost.id))
      .sort((a, b) => (a.pinOrder || 0) - (b.pinOrder || 0));

    res.json({
      success: true,
      heroPostId: heroPost ? heroPost.id : null,
      pinnedPostIds: pinnedPosts.map(p => p.id),
      allPosts: posts.map(({ id, title, subtitle, coverImage, published, isHero, isPinned, pinOrder, createdAt }) => ({
        id, title, subtitle, coverImage, published, isHero, isPinned, pinOrder, createdAt
      }))
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve curation settings' });
  }
});

app.put('/api/curation', requireAuth, async (req, res) => {
  try {
    const { heroPostId, pinnedPostIds = [] } = req.body;
    const data = readPosts();

    data.posts.forEach(post => {
      // Hero assignment
      post.isHero = (post.id === heroPostId);

      // Pinned assignment & ordering
      const pinIndex = pinnedPostIds.indexOf(post.id);
      if (pinIndex !== -1) {
        post.isPinned = true;
        post.pinOrder = pinIndex + 1;
      } else {
        post.isPinned = false;
        post.pinOrder = 0;
      }
    });

    if (getIsConnected()) {
      try {
        const bulkOps = data.posts.map(post => ({
          updateOne: {
            filter: { id: post.id },
            update: {
              $set: {
                isHero: post.isHero,
                isPinned: post.isPinned,
                pinOrder: post.pinOrder
              }
            }
          }
        }));
        if (bulkOps.length > 0) {
          await Post.bulkWrite(bulkOps);
        }
      } catch (dbErr) {
        console.warn('MongoDB curation bulk write error:', dbErr.message);
      }
    }

    writePosts(data);
    res.json({ success: true, message: 'Curation updated successfully' });
  } catch (err) {
    console.error('Update curation error:', err);
    res.status(500).json({ error: 'Failed to update curation' });
  }
});

// Get single post
app.get('/api/posts/:id', async (req, res) => {
  try {
    let post = null;
    if (getIsConnected()) {
      post = await Post.findOne({ id: req.params.id }).lean();
    }
    if (!post) {
      const data = readPosts();
      post = data.posts.find(p => p.id === req.params.id);
    }
    if (!post) return res.status(404).json({ error: 'Post not found' });
    res.json({ post });
  } catch (err) {
    const data = readPosts();
    const post = data.posts.find(p => p.id === req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    res.json({ post });
  }
});

// Update post metadata and content
app.put('/api/posts/:id', requireAuth, async (req, res) => {
  const data = readPosts();
  const index = data.posts.findIndex(p => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Post not found' });

  const { title, subtitle, content, tags, coverImage, coverColor, matchCoverBackground, slug, published, isHero, isPinned, pinOrder } = req.body;
  const post = data.posts[index];

  if (title !== undefined) post.title = title;
  if (subtitle !== undefined) post.subtitle = subtitle;
  if (content !== undefined) {
    post.content = content;
    post.rawContent = content;
    post.readTime = estimateReadTime(content);
  }
  if (tags !== undefined) post.tags = normalizeTags(tags);
  if (coverImage !== undefined) post.coverImage = coverImage;
  if (coverColor !== undefined) post.coverColor = coverColor;
  if (matchCoverBackground !== undefined) post.matchCoverBackground = Boolean(matchCoverBackground);
  if (published !== undefined) post.published = Boolean(published);
  if (isHero !== undefined) post.isHero = Boolean(isHero);
  if (isPinned !== undefined) post.isPinned = Boolean(isPinned);
  if (pinOrder !== undefined) post.pinOrder = Number(pinOrder);

  if (slug !== undefined) {
    // Ensure unique slug
    const newSlug = generateSlug(slug);
    if (!data.posts.some(p => p.slug === newSlug && p.id !== post.id)) {
      post.slug = newSlug;
    }
  }
  post.updatedAt = new Date().toISOString();

  if (getIsConnected()) {
    try {
      await Post.findOneAndUpdate({ id: req.params.id }, post, { upsert: true });
    } catch (dbErr) {
      console.warn('MongoDB post update error:', dbErr.message);
    }
  }

  writePosts(data);
  res.json({ success: true, post });
});

// Re-upload / replace file for existing post
app.put('/api/posts/:id/reupload', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const data = readPosts();
    const index = data.posts.findIndex(p => p.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Post not found' });

    const post = data.posts[index];
    const rawContent = fs.readFileSync(req.file.path, 'utf-8');
    const ext = path.extname(req.file.originalname).toLowerCase();
    const fileType = ['.md', '.markdown'].includes(ext) ? 'md' : 'html';

    // Remove old file
    const oldFilePath = path.join(UPLOADS_DIR, post.rawFile);
    if (fs.existsSync(oldFilePath)) fs.unlinkSync(oldFilePath);

    post.rawContent = rawContent;
    post.content = parseContent(rawContent, fileType);
    post.rawFile = req.file.filename;
    post.originalFileName = req.file.originalname;
    post.fileType = fileType;
    post.readTime = estimateReadTime(post.content);
    post.updatedAt = new Date().toISOString();

    if (getIsConnected()) {
      try {
        await Post.findOneAndUpdate({ id: req.params.id }, post, { upsert: true });
      } catch (dbErr) {
        console.warn('MongoDB post update error:', dbErr.message);
      }
    }

    writePosts(data);
    res.json({ success: true, post });
  } catch (error) {
    console.error('Reupload error:', error);
    res.status(500).json({ error: 'Failed to reupload file' });
  }
});

// Toggle publish status
app.put('/api/posts/:id/publish', requireAuth, async (req, res) => {
  const data = readPosts();
  const index = data.posts.findIndex(p => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Post not found' });

  data.posts[index].published = !data.posts[index].published;
  data.posts[index].updatedAt = new Date().toISOString();

  if (getIsConnected()) {
    try {
      await Post.findOneAndUpdate({ id: req.params.id }, { published: data.posts[index].published, updatedAt: data.posts[index].updatedAt });
    } catch (dbErr) {
      console.warn('MongoDB publish error:', dbErr.message);
    }
  }

  writePosts(data);
  res.json({ success: true, post: data.posts[index] });
});

// Delete post
app.delete('/api/posts/:id', requireAuth, async (req, res) => {
  const data = readPosts();
  const index = data.posts.findIndex(p => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Post not found' });

  const post = data.posts[index];

  // Remove uploaded file if it exists
  if (post.rawFile) {
    const filePath = path.join(UPLOADS_DIR, post.rawFile);
    if (fs.existsSync(filePath) && fs.lstatSync(filePath).isFile()) {
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        console.warn('Could not delete file:', e.message);
      }
    }
  }

  if (getIsConnected()) {
    try {
      await Post.findOneAndDelete({ id: req.params.id });
    } catch (dbErr) {
      console.warn('MongoDB delete error:', dbErr.message);
    }
  }

  data.posts.splice(index, 1);
  writePosts(data);
  res.json({ success: true });
});

// Bulk delete posts
app.post('/api/posts/bulk-delete', requireAuth, async (req, res) => {
  try {
    const { ids } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No post IDs provided' });
    }

    if (getIsConnected()) {
      try {
        await Post.deleteMany({ id: { $in: ids } });
      } catch (dbErr) {
        console.warn('MongoDB bulk delete error:', dbErr.message);
      }
    }

    const data = readPosts();
    data.posts = data.posts.filter(p => !ids.includes(p.id));
    writePosts(data);

    res.json({ success: true, count: ids.length });
  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({ error: 'Failed to delete stories' });
  }
});

// Bulk publish or revert to draft
app.post('/api/posts/bulk-publish', requireAuth, async (req, res) => {
  try {
    const { ids, published } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No post IDs provided' });
    }

    const isPub = Boolean(published);
    const now = new Date().toISOString();

    if (getIsConnected()) {
      try {
        await Post.updateMany(
          { id: { $in: ids } },
          { $set: { published: isPub, updatedAt: now } }
        );
      } catch (dbErr) {
        console.warn('MongoDB bulk publish error:', dbErr.message);
      }
    }

    const data = readPosts();
    data.posts.forEach(p => {
      if (ids.includes(p.id)) {
        p.published = isPub;
        p.updatedAt = now;
      }
    });
    writePosts(data);

    res.json({ success: true, count: ids.length, published: isPub });
  } catch (error) {
    console.error('Bulk publish error:', error);
    res.status(500).json({ error: 'Failed to update stories status' });
  }
});

// Preview a post (returns full HTML content)
app.get('/api/preview/:id', (req, res) => {
  const data = readPosts();
  const post = data.posts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  res.json({ post });
});

// Profile endpoints
app.get('/api/profile', async (req, res) => {
  if (getIsConnected()) {
    try {
      const p = await Profile.findOne().lean();
      if (p) return res.json({ success: true, profile: p });
    } catch (e) {
      console.warn('DB profile fetch error:', e.message);
    }
  }
  res.json({ success: true, profile: readProfile() });
});

app.put('/api/profile', requireAuth, async (req, res) => {
  try {
    const current = readProfile();
    const { name, tagline, bio, about, avatar, links } = req.body;
    const updated = {
      name: name !== undefined ? name.trim() : current.name,
      tagline: tagline !== undefined ? tagline.trim() : current.tagline,
      bio: bio !== undefined ? bio.trim() : current.bio,
      about: about !== undefined ? about.trim() : current.about,
      avatar: avatar !== undefined ? avatar : current.avatar,
      links: Array.isArray(links) ? links : current.links
    };

    if (getIsConnected()) {
      try {
        await Profile.findOneAndUpdate({}, updated, { upsert: true });
      } catch (dbErr) {
        console.warn('MongoDB profile update error:', dbErr.message);
      }
    }

    writeProfile(updated);
    res.json({ success: true, profile: updated });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Tags endpoint: Get all unique tags across all posts (case-insensitively combined)
app.get('/api/tags', (req, res) => {
  const data = readPosts();
  const map = new Map();
  // Include standard popular tags initially if empty
  const defaultTags = ['JavaScript', 'TypeScript', 'Python', 'Web Development', 'React', 'Node.js', 'System Architecture', 'Distributed Systems', 'CSS', 'HTML', 'Database'];
  defaultTags.forEach(t => map.set(t.toLowerCase(), t));

  data.posts.forEach(p => {
    if (Array.isArray(p.tags)) {
      p.tags.forEach(t => {
        const clean = (t || '').trim();
        if (!clean) return;
        const lower = clean.toLowerCase();
        if (!map.has(lower)) {
          map.set(lower, clean);
        }
      });
    }
  });
  res.json({ tags: Array.from(map.values()) });
});

// Auth endpoints
app.post('/api/auth/login', (req, res) => {
  const { username, password, email } = req.body || {};
  const userEmail = (email || username || '').trim();
  if (!userEmail) {
    return res.status(400).json({ success: false, message: 'Please enter your email address' });
  }
  if (!password) {
    return res.status(400).json({ success: false, message: 'Please enter your password' });
  }

  // Verify admin credentials
  if (userEmail.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  }
  if (!bcrypt.compareSync(password, ADMIN_PASSWORD_HASH)) {
    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  }

  // Generate JWT token
  const token = jwt.sign(
    { email: userEmail, role: 'author', name: 'Kushal Shah' },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  res.json({
    success: true,
    token,
    user: {
      name: 'Kushal Shah',
      username: userEmail.split('@')[0] || 'kushal',
      email: userEmail,
      role: 'author',
      avatar: readProfile().avatar || ''
    }
  });
});

app.get('/api/auth/status', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.json({ authenticated: false });
  }
  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    res.json({
      authenticated: true,
      user: {
        name: decoded.name || 'Kushal Shah',
        username: 'kushal',
        role: 'author',
        avatar: readProfile().avatar || ''
      }
    });
  } catch {
    res.json({ authenticated: false });
  }
});

// ============ Homepage Config Endpoints ============
app.get('/api/homepage', (req, res) => {
  res.json({ success: true, homepage: readHomepage() });
});

app.put('/api/homepage', requireAuth, (req, res) => {
  try {
    const current = readHomepage();
    const updated = { ...current, ...req.body };
    writeHomepage(updated);
    res.json({ success: true, homepage: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update homepage config' });
  }
});

// ============ GitHub Integration Endpoints ============
app.get('/api/github/repo-info', async (req, res) => {
  try {
    const rawUrl = (req.query.url || req.query.repo || '').trim();
    if (!rawUrl) return res.status(400).json({ error: 'GitHub URL or repo path is required' });

    let clean = rawUrl.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/^github\.com\//i, '').replace(/\/$/, '');
    const parts = clean.split('/').filter(Boolean);
    if (parts.length < 2) {
      return res.status(400).json({ error: 'Please provide a valid GitHub repo format (e.g. https://github.com/owner/repo or owner/repo)' });
    }
    const [owner, repo] = parts;

    const ghRes = await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, {
      headers: {
        'User-Agent': 'Medium-Clone-CMS-App',
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!ghRes.ok) {
      if (ghRes.status === 404) return res.status(404).json({ error: `GitHub repository "${owner}/${repo}" not found` });
      return res.status(ghRes.status).json({ error: `GitHub API error (${ghRes.status})` });
    }

    const data = await ghRes.json();
    const project = {
      title: data.name,
      description: data.description || '',
      techStack: [data.language, ...(data.topics || [])].filter(Boolean),
      githubUrl: data.html_url,
      liveUrl: data.homepage || '',
      stars: data.stargazers_count || 0,
      forks: data.forks_count || 0,
      featured: false
    };

    res.json({ success: true, project });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch GitHub repo: ' + err.message });
  }
});

app.get('/api/github/repos/:username', async (req, res) => {
  try {
    const username = (req.params.username || '').trim();
    if (!username) return res.status(400).json({ error: 'Username is required' });
    const ghRes = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=100`, {
      headers: {
        'User-Agent': 'Medium-Clone-CMS-App',
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    if (!ghRes.ok) {
      if (ghRes.status === 404) return res.status(404).json({ error: `GitHub user "${username}" not found` });
      return res.status(ghRes.status).json({ error: `GitHub API error (${ghRes.status})` });
    }
    const repos = await ghRes.json();
    const formatted = (Array.isArray(repos) ? repos : []).map(r => ({
      githubId: String(r.id),
      title: r.name,
      description: r.description || '',
      stars: r.stargazers_count || 0,
      forks: r.forks_count || 0,
      language: r.language || '',
      techStack: [r.language, ...(r.topics || [])].filter(Boolean),
      githubUrl: r.html_url,
      liveUrl: r.homepage || '',
      isFork: r.fork,
      updatedAt: r.updated_at
    }));
    res.json({ success: true, username, repos: formatted });
  } catch (err) {
    res.status(500).json({ error: 'GitHub fetch failed: ' + err.message });
  }
});

// ============ Projects Endpoints ============
app.get('/api/projects', (req, res) => {
  res.json({ success: true, ...readProjects() });
});

app.put('/api/projects', requireAuth, (req, res) => {
  try {
    const current = readProjects();
    const { githubUsername, showGithubLink, projects } = req.body;
    if (githubUsername !== undefined) current.githubUsername = githubUsername;
    if (showGithubLink !== undefined) current.showGithubLink = Boolean(showGithubLink);
    if (Array.isArray(projects)) current.projects = projects;
    writeProjects(current);
    res.json({ success: true, ...current });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update projects' });
  }
});

app.post('/api/projects', requireAuth, (req, res) => {
  try {
    const current = readProjects();
    const { title, description, techStack, githubUrl, liveUrl, image } = req.body;
    const project = {
      id: uuidv4(),
      title: title || 'Untitled Project',
      description: description || '',
      techStack: Array.isArray(techStack) ? techStack : (techStack || '').split(',').map(s => s.trim()).filter(Boolean),
      githubUrl: githubUrl || '',
      liveUrl: liveUrl || '',
      image: image || '',
      createdAt: new Date().toISOString()
    };
    current.projects.unshift(project);
    writeProjects(current);
    res.json({ success: true, project });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create project' });
  }
});

app.put('/api/projects/:id', requireAuth, (req, res) => {
  try {
    const current = readProjects();
    const index = current.projects.findIndex(p => p.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Project not found' });
    const { title, description, techStack, githubUrl, liveUrl, image } = req.body;
    if (title !== undefined) current.projects[index].title = title;
    if (description !== undefined) current.projects[index].description = description;
    if (techStack !== undefined) current.projects[index].techStack = Array.isArray(techStack) ? techStack : (techStack || '').split(',').map(s => s.trim()).filter(Boolean);
    if (githubUrl !== undefined) current.projects[index].githubUrl = githubUrl;
    if (liveUrl !== undefined) current.projects[index].liveUrl = liveUrl;
    if (image !== undefined) current.projects[index].image = image;
    writeProjects(current);
    res.json({ success: true, project: current.projects[index] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update project' });
  }
});

app.delete('/api/projects/:id', requireAuth, (req, res) => {
  try {
    const current = readProjects();
    current.projects = current.projects.filter(p => p.id !== req.params.id);
    writeProjects(current);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// Error handler
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message });
  }
  if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
});

app.listen(PORT, () => {
  console.log(`📝 Blog Editor API running at http://localhost:${PORT}`);
});
