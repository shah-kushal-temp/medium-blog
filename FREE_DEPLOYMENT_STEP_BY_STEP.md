# 🌐 Complete Step-by-Step Free Deployment Guide (100% Free • No Credit Card)

This guide takes you through **every single step** to make your Medium Blog Clone live on the internet so anyone in the world can read your blog.

---

## 🧭 System Overview: Two Parts of Your Blog

Your project is structured into two clean parts:

```
┌───────────────────────────────────────────────────────────┐
│  1. READER / PUBLIC BLOG (What everyone in the world sees) │
│     • Frontend: blog-display/frontend                     │
│     • Backend API: blog-display/backend                   │
└───────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────┐
│  2. WRITER / ADMIN STUDIO (Where you create & edit posts) │
│     • Frontend: blog-editor/frontend                      │
│     • Backend API: blog-editor/backend                    │
└───────────────────────────────────────────────────────────┘
```

Both parts connect to your **Free Cloud Database (MongoDB Atlas)** and **Free Image CDN (Cloudinary)** with **$0 cost and ZERO credit card required**.

---

## 📋 Checklist of Free Accounts (No Credit Card)
| Service | Purpose | Free Tier | Credit Card? |
| :--- | :--- | :--- | :--- |
| **[GitHub](https://github.com)** | Hosts your source code repository | Unlimited free repos | **NO** |
| **[MongoDB Atlas](https://mongodb.com/cloud/atlas/register)** | Stores blog posts, tags, profile, projects | 512 MB cloud database | **NO** |
| **[Render](https://render.com)** | Runs backend API server | 24/7 Free Web Service | **NO** |
| **[Vercel](https://vercel.com)** | Hosts reader frontend with free HTTPS domain | 100 GB bandwidth / month | **NO** |
| **[Cloudinary](https://cloudinary.com)** | Stores and serves cover images via CDN | 25 GB free monthly CDN | **NO** |

---

## STEP 1: Push Code to GitHub

### 1.1 Create Repository on GitHub
1. Open [https://github.com](https://github.com) and log in.
2. In the top-right corner, click **`+`** → **New repository**.
3. **Repository name:** `medium-blog`
4. Choose **Public** (or **Private**).
5. Leave all checkboxes (README, .gitignore) **unchecked**.
6. Click **Create repository**.
7. Copy your repository URL (e.g. `https://github.com/YOUR_USERNAME/medium-blog.git`).

### 1.2 Push Your Local Project
Open PowerShell in your workspace root (`d:\Workspace\Medium-blog-clone`) and run:

```powershell
git remote add origin https://github.com/YOUR_USERNAME/medium-blog.git
git push -u origin main
```
*(Replace `YOUR_USERNAME` with your GitHub username).*

Once finished, refresh your GitHub page — all your code is now safely on GitHub!

---

## STEP 2: Set Up Free Cloud Database (MongoDB Atlas)

### 2.1 Sign Up
1. Go to [https://www.mongodb.com/cloud/atlas/register](https://www.mongodb.com/cloud/atlas/register).
2. Sign in with Google or enter your email (No credit card needed).

### 2.2 Create Free M0 Cluster
1. Choose **M0 (Free)** tier.
2. Provider: **AWS** or **Google Cloud**.
3. Name: `Cluster0`.
4. Click **Create Deployment**.

### 2.3 Create Database User
1. Username: `blogadmin`
2. Password: Set a strong password (e.g. `BlogSecure2026!`).
3. Click **Create Database User**.

### 2.4 Allow Network Access
1. In the left menu, click **Network Access**.
2. Click **Add IP Address**.
3. Select **Allow Access from Anywhere** (`0.0.0.0/0`).
4. Click **Confirm**.

### 2.5 Get Connection String
1. In the left menu, click **Database**.
2. Click **Connect** next to `Cluster0`.
3. Choose **Drivers** (Node.js).
4. Copy the connection string and add `/medium_clone` before the `?`:
   ```text
   mongodb+srv://blogadmin:BlogSecure2026!@cluster0.xxxxx.mongodb.net/medium_clone?retryWrites=true&w=majority
   ```
5. Save this string in a Notepad for Step 4.

---

## STEP 3: Configure Free Cloudinary (for Images)

Cloudinary hosts all uploaded covers and pictures on a global CDN for free without a credit card.

### 3.1 Sign Up on Cloudinary
1. Open [https://cloudinary.com](https://cloudinary.com) and click **Sign Up for Free**.
2. Sign up with Google or your email.

### 3.2 Get Your Cloud Name
1. On your Cloudinary Dashboard, look at the **Product Environment** or top banner:
2. Copy your **Cloud Name** (e.g., `da9xyz123`).

### 3.3 Create an Unsigned Upload Preset
1. In Cloudinary, click the **Settings (Gear icon ⚙️)** at the bottom-left.
2. Select the **Upload** tab.
3. Scroll down to **Upload presets** and click **Add upload preset**.
4. Set:
   - **Upload preset name:** `medium_blog_preset` (or any name you choose)
   - **Signing Mode:** Select **Unsigned** *(CRITICAL: Must be Unsigned so the browser can upload directly)*
5. Click **Save** in the top right.

### 3.4 Enable Cloudinary in Your Editor
1. Open your local editor at `http://localhost:5174/#/profile` (or your deployed editor URL).
2. Scroll to the **Cloudinary Image Hosting** card.
3. Check **"Enable Cloudinary Cloud Uploads for all Images"**.
4. Enter your **Cloud Name** and **Upload Preset** (`medium_blog_preset`).
5. Click **Save Cloudinary Settings**, then click **Test Connection** — you will see `Cloudinary connected successfully! 🎉`!
*(All images uploaded from now on are stored on Cloudinary's fast CDN forever!)*

---

## STEP 4: Deploy the Reader / Public Backend (Render.com)

This runs the public API that serves stories, projects, author profile, and tags to all readers.

1. Open [https://render.com](https://render.com) and log in with GitHub.
2. Click **New +** (top right) → **Web Service**.
3. Select your `medium-blog` GitHub repository.
4. Fill in:
   - **Name:** `kushal-blog-api`
   - **Root Directory:** `blog-display/backend`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Instance Type:** **Free**
5. Scroll down to **Environment Variables** and click **Add Environment Variable**:
   - Key: `MONGODB_URI`
   - Value: *(Paste your MongoDB Atlas connection string from Step 2.5)*
   - Key: `NODE_ENV`
   - Value: `production`
6. Click **Create Web Service**.
7. In ~2 minutes, your service will say **Live**!
8. Copy your live backend URL from the top of the page:
   - Example: `https://kushal-blog-api.onrender.com`

---

## STEP 5: Deploy the Reader / Public Frontend (Vercel)

This is your main public website where anyone can browse and read your blog posts.

1. Open [https://vercel.com](https://vercel.com) and log in with GitHub.
2. Click **Add New...** → **Project**.
3. Select `medium-blog` and click **Import**.
4. In the configuration window:
   - **Project Name:** `kushal-blog` (this gives you `https://kushal-blog.vercel.app`)
   - **Framework Preset:** `Vite` (auto-detected)
   - **Root Directory:** Click **Edit** → select `blog-display/frontend` → click **Continue**
5. Expand **Environment Variables**:
   - **Key:** `VITE_API_BASE`
   - **Value:** `https://kushal-blog-api.onrender.com/api` *(Your Render backend URL from Step 4 with `/api`)*
6. Click **Deploy**!
7. In ~45 seconds, your public blog is **100% LIVE**! 🚀
   - Visit: `https://kushal-blog.vercel.app`

---

## STEP 6: (Optional) Deploy Your Private Writer Studio (Editor)

If you also want to write and publish stories from your mobile phone or from any other laptop:

1. **Deploy Editor Backend on Render**:
   - In Render, click **New +** → **Web Service**.
   - Root Directory: `blog-editor/backend`
   - Build Command: `npm install`
   - Start Command: `node server.js`
   - Environment Variables:
     - `MONGODB_URI`: *(Same MongoDB string)*
     - `ADMIN_PASSWORD`: *(Set a secret password for logging in)*
   - Copy the deployed editor backend URL (e.g. `https://kushal-editor-api.onrender.com`).

2. **Deploy Editor Frontend on Vercel**:
   - In Vercel, click **Add New...** → **Project** → select `medium-blog`.
   - Root Directory: `blog-editor/frontend`
   - Environment Variables:
     - `VITE_API_BASE`: `https://kushal-editor-api.onrender.com/api`
   - Click **Deploy**!
   - You now have your own private studio at `https://kushal-editor.vercel.app`!

---

## ✅ Live Testing Checklist

When you open your live blog URL (`https://your-name.vercel.app`):
1. **Home Feed:** All published stories, tags, projects, and author profile render cleanly.
2. **Reading View:** Click any story — cover images, typography, syntax-highlighted code blocks, and author bio all work seamlessly.
3. **Table of Contents (TOC):**
   - Indicator notches appear on the right margin.
   - Hovering expands the floating card with the green active bullet and indented subheadings.
   - Scrolling updates the active heading in real-time.
4. **Match Background:** Click the "Match Cover BG" pill on stories with cover photos to see the background adapt.
5. **No Localhost Left:** Everything loads directly from your live cloud API and Cloudinary CDN.
