const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// Database connection
const { connectDB, getIsConnected, Post, Profile, Image } = require('./db');
connectDB();

// Paths
const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const POSTS_FILE = path.join(DATA_DIR, 'posts.json');
const PROFILE_FILE = path.join(DATA_DIR, 'profile.json');
const HOMEPAGE_FILE = path.join(DATA_DIR, 'homepage.json');
const PROJECTS_FILE = path.join(DATA_DIR, 'projects.json');
const IMAGES_DIR = path.join(DATA_DIR, 'images');

// Middleware
app.use(cors());
app.use(express.json());

// Serve images from disk or MongoDB
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

// Helper: read posts from JSON fallback
function readPosts() {
  try {
    const data = fs.readFileSync(POSTS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return { posts: [] };
  }
}

const DEFAULT_PROFILE = {
  name: "Kushal Shah",
  tagline: "Software Engineer, Writer & Open Source Enthusiast",
  bio: "Writing about modern web technologies, distributed systems, clean code, and engineering architecture.",
  about: "Hi! I am Kushal Shah, a software engineer passionate about building high-performance systems and writing clean code. I created this personal blog to share practical knowledge, deep-dive tutorials, and architecture breakdowns.",
  avatar: "",
  links: [
    { id: "1", label: "GitHub", url: "https://github.com" },
    { id: "2", label: "Twitter / X", url: "https://twitter.com" },
    { id: "3", label: "LinkedIn", url: "https://linkedin.com" }
  ]
};

function readProfile() {
  if (!fs.existsSync(PROFILE_FILE)) return DEFAULT_PROFILE;
  try {
    return JSON.parse(fs.readFileSync(PROFILE_FILE, 'utf-8'));
  } catch {
    return DEFAULT_PROFILE;
  }
}

// ============ ROUTES ============

// Get published posts with optional pagination and tag filtering
app.get('/api/posts', async (req, res) => {
  try {
    const pageParam = req.query.page;
    const limit = parseInt(req.query.limit, 10) || 9;
    const tagFilter = req.query.tag ? req.query.tag.trim().toLowerCase() : null;

    let allPublished = [];

    if (getIsConnected()) {
      const query = { published: true };
      if (tagFilter) {
        query.tags = { $regex: new RegExp(`^${tagFilter}$`, 'i') };
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

        const posts = dbPosts.map(({ rawContent, content, ...rest }) => ({
          ...rest,
          contentPreview: content ? content.replace(/<[^>]*>/g, '').substring(0, 280) : '',
        }));

        return res.json({
          posts,
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

      // If page is not specified or 'all'
      const dbPosts = await Post.find(query)
        .sort({ isHero: -1, isPinned: -1, pinOrder: 1, createdAt: -1 })
        .lean();

      allPublished = dbPosts.map(({ rawContent, content, ...rest }) => ({
        ...rest,
        contentPreview: content ? content.replace(/<[^>]*>/g, '').substring(0, 280) : '',
      }));
    } else {
      // JSON file fallback
      const data = readPosts();
      let filtered = data.posts.filter(p => p.published);
      if (tagFilter) {
        filtered = filtered.filter(p => (p.tags || []).some(t => t.toLowerCase() === tagFilter));
      }

      filtered.sort((a, b) => {
        if (a.isHero && !b.isHero) return -1;
        if (!a.isHero && b.isHero) return 1;
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        if (a.isPinned && b.isPinned) return (a.pinOrder || 0) - (b.pinOrder || 0);
        return new Date(b.createdAt) - new Date(a.createdAt);
      });

      if (pageParam && pageParam !== 'all') {
        const page = Math.max(1, parseInt(pageParam, 10) || 1);
        const totalPosts = filtered.length;
        const totalPages = Math.ceil(totalPosts / limit) || 1;
        const slice = filtered.slice((page - 1) * limit, page * limit);

        const posts = slice.map(({ rawContent, content, ...rest }) => ({
          ...rest,
          contentPreview: content ? content.replace(/<[^>]*>/g, '').substring(0, 280) : '',
        }));

        return res.json({
          posts,
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

      allPublished = filtered.map(({ rawContent, content, ...rest }) => ({
        ...rest,
        contentPreview: content ? content.replace(/<[^>]*>/g, '').substring(0, 280) : '',
      }));
    }

    res.json({ posts: allPublished });
  } catch (err) {
    const data = readPosts();
    res.json({ posts: data.posts.filter(p => p.published) });
  }
});

// Get curated homepage stories (Hero + Pinned + Top Recent)
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

// Get single published post by slug or ID
app.get('/api/posts/:slug', async (req, res) => {
  try {
    const rawParam = req.params.slug || '';
    let decoded = rawParam;
    try {
      decoded = decodeURIComponent(rawParam);
    } catch {}

    const cleanParam = decoded.replace(/%/g, '').replace(/\s+/g, '-').toLowerCase();

    let post = null;
    if (getIsConnected()) {
      post = await Post.findOne({
        $or: [
          { slug: rawParam },
          { slug: decoded },
          { slug: cleanParam },
          { id: rawParam },
          { id: decoded },
          { slug: new RegExp(`^${rawParam.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
          { slug: new RegExp(`^${cleanParam.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
        ],
        published: true
      }).lean();
    }
    if (!post) {
      const data = readPosts();
      post = data.posts.find(p => {
        if (!p.published) return false;
        const s = (p.slug || '').toLowerCase();
        const id = p.id || '';
        return (
          s === rawParam.toLowerCase() ||
          s === decoded.toLowerCase() ||
          s === cleanParam ||
          id === rawParam ||
          id === decoded
        );
      });
    }
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const { rawContent, ...publicPost } = post;
    res.json({ post: publicPost });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve post' });
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

// Get all unique tags (case-insensitively combined)
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

// Get author profile
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

// Get homepage config
app.get('/api/homepage', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(HOMEPAGE_FILE, 'utf-8'));
    res.json({ success: true, homepage: data });
  } catch {
    res.json({ success: true, homepage: {
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
    }});
  }
});

// Get projects
app.get('/api/projects', (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(PROJECTS_FILE, 'utf-8'));
    res.json({ success: true, ...data });
  } catch {
    res.json({ success: true, githubUsername: '', showGithubLink: true, projects: [] });
  }
});

app.listen(PORT, () => {
  console.log(`📖 Blog Display API running at http://localhost:${PORT}`);
});
