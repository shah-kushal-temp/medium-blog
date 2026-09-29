# 🚀 100% Free Hosting & Deployment Guide (Zero Credit Card Required)

This guide shows you how to host the entire Medium Blog Clone **100% Free forever with $0 cost and NO credit card** across all tiers: **Database**, **Backend API**, and **Frontend**.

A complete, granular step-by-step guide with every single click and command is also available in:
👉 **[FREE_DEPLOYMENT_STEP_BY_STEP.md](file:///d:/Workspace/Medium-blog-clone/FREE_DEPLOYMENT_STEP_BY_STEP.md)**

---

## 🏗️ Architecture Overview

| Component | Free Provider | Free Tier Details | Credit Card? |
| :--- | :--- | :--- | :--- |
| **Code Storage** | **GitHub** | Unlimited public/private repositories | **NO** |
| **Database** | **MongoDB Atlas (M0 Shared)** | 512 MB storage, auto-backups, global cloud | **NO** |
| **Backend API** | **Render.com** | 24/7 free Web Service, automatic HTTPS | **NO** |
| **Frontend** | **Vercel** | 100 GB bandwidth, global CDN, instant deployments | **NO** |
| **Images** | **Cloudinary** (Optional) | 25 GB free storage & global CDN | **NO** |

---

## ⚡ Instant 30-Second Live Link (No Setup / Test Right Now)
If you want to immediately show your blog to a friend or test it on your phone:
```powershell
npx localtunnel --port 5173
```
This gives you a public link (e.g. `https://cool-blog.loca.lt`) accessible from anywhere!

---

## Step 1: Push Code to GitHub

```powershell
git init
git add .
git commit -m "Live blog deployment"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/medium-blog.git
git push -u origin main
```

---

## Step 2: Set Up Free Cloud Database (MongoDB Atlas)

1. Register at [mongodb.com/cloud/atlas/register](https://www.mongodb.com/cloud/atlas/register) (Google/GitHub login).
2. Select **M0 (Free)** tier → Create deployment.
3. In **Database Access**: create username (e.g. `blogadmin`) and a password.
4. In **Network Access**: click **Add IP Address** → click **Allow Access from Anywhere** (`0.0.0.0/0`) → Confirm.
5. In **Database → Connect → Drivers**: copy connection string:
   ```text
   mongodb+srv://blogadmin:YOUR_PASSWORD@cluster0.xxxx.mongodb.net/medium_clone?retryWrites=true&w=majority
   ```

---

## Step 3: Deploy Backend on Render.com

1. Sign up on [render.com](https://render.com) using GitHub.
2. Click **New +** → **Web Service** → Select your `medium-blog` repo.
3. Set configuration:
   - **Root Directory:** `blog-display/backend`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Instance Type:** `Free ($0/month)`
4. Under **Environment Variables**, add:
   - `MONGODB_URI`: *(Your MongoDB connection string from Step 2)*
   - `NODE_ENV`: `production`
5. Click **Deploy Web Service** → copy your live backend URL (e.g. `https://my-blog-backend.onrender.com`).

---

## Step 4: Deploy Frontend on Vercel

1. Sign up on [vercel.com](https://vercel.com) using GitHub.
2. Click **Add New...** → **Project** → Import `medium-blog`.
3. Set configuration:
   - **Root Directory:** click Edit → choose `blog-display/frontend`.
   - **Framework Preset:** `Vite` (auto-detected).
4. Under **Environment Variables**, add:
   - `VITE_API_BASE`: `https://my-blog-backend.onrender.com/api` *(Your Render URL)*
5. Click **Deploy**!
   Your site is now live at `https://your-name.vercel.app`! 🎉
4. Do the same for `blog-editor/frontend`.
5. In the frontend environment configuration or `app.js`/`editor.js`, update the API URL to point to your live Render backend URL.

---

## Step 4: (Optional & Recommended) Set Up Free Cloudinary for Images

Cloudinary provides **25 GB of free monthly cloud image storage & CDN bandwidth**, which offloads image serving from your backend:

1. Sign up for free at [cloudinary.com](https://cloudinary.com).
2. Go to **Settings (Gear Icon)** -> **Upload**.
3. Scroll down to **Upload presets** -> Click **Add upload preset**.
4. Set **Signing Mode** to **Unsigned** (for example, preset name: `medium_clone`).
5. Click **Save**.
6. Open your **Stories Editor** (`http://localhost:5174/#/profile` or deployed URL):
   - Switch to the **Profile** tab.
   - Scroll to **Cloudinary Image Hosting**.
   - Check **"Enable Cloudinary Cloud Uploads for all Images"**.
   - Fill in your **Cloud Name** and **Unsigned Upload Preset**.
   - Click **Save Cloudinary Settings** and then click **Test Connection** to verify.

---

## 🖼️ How Images Are Stored
- **With Cloudinary Enabled**: Uploaded images (covers, inline photos, profile avatars) are delivered directly from Cloudinary's fast global CDN.
- **Fallback / Local Mode**: Images are uploaded and stored in the database / server directory, served with HTTP caching headers. Even without Cloudinary, your content is fully supported and persistent.

---

## 📊 Scaling Past 300+ to 100,000+ Blogs (Database Performance & Alternatives)

### 1. Why Was It Getting Slow Before?
When blogs grow past 300+:
- **Without Pagination**: The browser and database were loading 300+ full HTML articles (megabytes of text) on every single visit.
- **Without Indexes**: The database scanned every document one by one (collection scan).

### 2. How MongoDB Easily Handles 100,000+ Blogs (Now Active)
With the changes we've implemented:
1. **Server-Side Pagination**: Queries use `.skip((page - 1) * limit).limit(limit)`. It now transfers only 6-10 articles per request in milliseconds.
2. **Field Projection**: Story list feeds only query summary fields (`title`, `subtitle`, `coverImage`, `published`, `tags`, `createdAt`, `readTime`, `coverColor`) and exclude the full `content` body until a reader opens a specific article.
3. **Compound B-Tree Indexes**: Both display and editor databases now have compound indexes:
   ```javascript
   PostSchema.index({ published: 1, isPinned: -1, pinOrder: 1, createdAt: -1 });
   ```
4. **Storage Math on Free Tier**: MongoDB Atlas M0 gives **512 MB free**. Because images are hosted on Cloudinary or external URLs, an indexed blog summary record is only ~1 KB. **512 MB can comfortably hold 50,000 to 100,000+ blog posts for $0**.

---

### 3. Free Database Alternatives (If You Prefer SQL / Relational)

If you prefer migrating from MongoDB to a SQL database, here are the top 3 **100% free forever** alternatives:

| Database Provider | Engine | Free Tier Allowance | Why Choose It? |
| :--- | :--- | :--- | :--- |
| **[Supabase](https://supabase.com)** | PostgreSQL | 500 MB database, 2 projects, 50,000 active users | Industry standard Postgres, built-in REST API, SQL GUI dashboard |
| **[Neon](https://neon.tech)** | Serverless Postgres | 0.5 GiB storage, generous free compute, branching | True serverless Postgres, wakes up instantly, zero config |
| **[Turso](https://turso.tech)** | LibSQL / SQLite | **9 GB storage**, 1 billion row reads / month | Highest free storage tier, ultra-fast SQLite at the edge |

#### Equivalent SQL Schema (for Supabase / Neon):
```sql
CREATE TABLE posts (
  id VARCHAR(64) PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT DEFAULT '',
  content TEXT NOT NULL,
  cover_image TEXT DEFAULT '',
  cover_color TEXT DEFAULT '',
  published BOOLEAN DEFAULT FALSE,
  is_hero BOOLEAN DEFAULT FALSE,
  is_pinned BOOLEAN DEFAULT FALSE,
  pin_order INT DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  read_time VARCHAR(32) DEFAULT '3 min read',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Compound index for lightning-fast pagination
CREATE INDEX idx_posts_display ON posts (published, is_pinned DESC, pin_order ASC, created_at DESC);
```
