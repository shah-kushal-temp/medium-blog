# 🌐 Complete Step-by-Step Free Deployment Guide (100% Free • No Credit Card)

This guide takes you through **every single click and command** needed to deploy your Medium Blog Clone live on the internet so anyone around the world can read your stories.

---

## 📋 Table of Contents
1. [Overview & Prerequisites](#1-overview--prerequisites)
2. [Step 1: Push Your Code to GitHub (Free)](#step-1-push-your-code-to-github-free)
3. [Step 2: Create Free Cloud Database (MongoDB Atlas)](#step-2-create-free-cloud-database-mongodb-atlas)
4. [Step 3: Deploy Backend API (Render.com)](#step-3-deploy-backend-api-rendercom)
5. [Step 4: Deploy Public Blog Website (Vercel)](#step-4-deploy-public-blog-website-vercel)
6. [Step 5: (Optional) Deploy Admin Story Editor (Vercel)](#step-5-optional-deploy-admin-story-editor-vercel)
7. [Step 6: Live Verification & Testing Checklist](#step-6-live-verification--testing-checklist)
8. [Troubleshooting & FAQ](#troubleshooting--faq)

---

## 1. Overview & Prerequisites

### 💰 Cost & Card Requirement:
- **Total Cost:** **$0.00 Forever**
- **Credit Card Required:** **None (Zero)**
- All tiers use lifetime free plans with no trial expiration.

### Accounts You Will Need (All Free):
1. **GitHub Account** (https://github.com) — to store your code.
2. **MongoDB Atlas Account** (https://mongodb.com/cloud/atlas/register) — free database.
3. **Render Account** (https://render.com) — to run the Node.js backend.
4. **Vercel Account** (https://vercel.com) — to host the frontend with free SSL.

---

## Step 1: Push Your Code to GitHub (Free)

### 1.1 Create a GitHub Account & New Repository
1. Open your browser and go to [https://github.com](https://github.com).
2. Log in or create a free account.
3. In the top-right corner, click the **`+`** icon and select **New repository**.
4. Set the settings:
   - **Repository name:** `medium-blog`
   - **Visibility:** Choose **Public** (or **Private**).
   - **Initialize this repository with:** Do **NOT** check README, .gitignore, or license (we already have our project files).
5. Click the green button: **Create repository**.
6. Keep this browser page open — it shows your repository URL (e.g. `https://github.com/YOUR_USERNAME/medium-blog.git`).

### 1.2 Push Your Local Code via PowerShell
1. In VS Code / Antigravity IDE, open a terminal in your workspace root (`d:\Workspace\Medium-blog-clone`).
2. Run the following commands one by one:

```powershell
# 1. Initialize git if not already initialized
git init

# 2. Add all files to staging
git add .

# 3. Commit files
git commit -m "Complete blog application ready for live deployment"

# 4. Rename default branch to main
git branch -M main

# 5. Link your local project to your GitHub repository (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/medium-blog.git

# 6. Push code to GitHub
git push -u origin main
```

*(If Git asks you to log in, follow the browser popup prompt to authorize your GitHub account).*

3. Refresh your GitHub repository page in the browser — you will now see all your folders (`blog-display`, `blog-editor`, `data`, etc.)!

---

## Step 2: Create Free Cloud Database (MongoDB Atlas)

### 2.1 Sign Up for MongoDB Atlas
1. Open [https://www.mongodb.com/cloud/atlas/register](https://www.mongodb.com/cloud/atlas/register).
2. Click **Sign up with Google** or enter your email.
3. Answer the onboarding survey or click **Skip**.

### 2.2 Create Free M0 Cluster
1. On the "Deploy a database" page, select the **M0 (Free)** tier:
   - Provider: **AWS** or **Google Cloud** (any region close to you).
   - Name: `Cluster0` (default is fine).
2. Click **Create Deployment** (Zero cost, no card required).

### 2.3 Create Database User Credentials
1. Under **Security Quickstart** (or left menu **Database Access**):
   - **Username:** `blogadmin`
   - **Password:** Create a password (e.g., `BlogPass2026!`) — **write this down!**
2. Click **Create Database User**.

### 2.4 Whitelist Network IP Access (Allow Cloud Access)
1. Under **Network Access** in the left sidebar:
2. Click the green button: **Add IP Address**.
3. Click the button: **Allow Access from Anywhere** (this sets `0.0.0.0/0`).
4. Click **Confirm**.

### 2.5 Get Your MongoDB Connection String
1. In the left sidebar, click **Database**.
2. Next to `Cluster0`, click **Connect**.
3. Under "Choose a connection method", select **Drivers**.
4. Driver: `Node.js` (latest version).
5. Copy the connection string. It looks like:
   ```text
   mongodb+srv://blogadmin:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority
   ```
6. Replace `<password>` with your actual password (e.g., `BlogPass2026!`), and add `/medium_clone` right before the `?`:
   ```text
   mongodb+srv://blogadmin:BlogPass2026!@cluster0.abcde.mongodb.net/medium_clone?retryWrites=true&w=majority
   ```
7. Save this entire string in a Notepad — you will paste it into Render in Step 3!

---

## Step 3: Deploy Backend API (Render.com)

Render hosts your Node.js Express server 24/7 for free without asking for a credit card.

### 3.1 Sign Up on Render
1. Open [https://render.com](https://render.com).
2. Click **Sign Up** → select **GitHub** to log in directly.

### 3.2 Create New Web Service
1. In the Render Dashboard, click the blue **New +** button at the top right.
2. Select **Web Service**.
3. Under "Connect a repository", select your `medium-blog` repo (click "Configure account" if your repo isn't listed yet).
4. Click **Connect**.

### 3.3 Configure Backend Settings
Fill in these exact values:
- **Name:** `my-blog-backend` (or any unique name you like)
- **Region:** Any region near you (e.g. Frankfurt, Oregon, Singapore)
- **Branch:** `main`
- **Root Directory:** `blog-display/backend`
- **Runtime:** `Node`
- **Build Command:** `npm install`
- **Start Command:** `node server.js`
- **Instance Type:** Select **Free ($0/month)**

### 3.4 Add Environment Variables
Scroll down to the **Environment Variables** section and click **Add Environment Variable**:
1. **Key:** `MONGODB_URI`
   - **Value:** *(Paste your MongoDB connection string from Step 2.5)*
2. **Key:** `NODE_ENV`
   - **Value:** `production`

### 3.5 Deploy
1. Click **Deploy Web Service**.
2. Render will start downloading dependencies and building your server.
3. In ~2 minutes, you will see a green badge saying **Live**!
4. At the top left under your service name, copy your live backend URL:
   - Example: `https://my-blog-backend.onrender.com`
5. Test it by opening `https://my-blog-backend.onrender.com/api/posts` in your browser. You will see a JSON response `{ "posts": [...] }`!

---

## Step 4: Deploy Public Blog Website (Vercel)

Vercel provides lightning-fast global hosting for your frontend with free HTTPS and a free domain.

### 4.1 Sign Up on Vercel
1. Open [https://vercel.com](https://vercel.com).
2. Click **Sign Up** → select **Continue with GitHub**.

### 4.2 Import Your Project
1. In the Vercel dashboard, click **Add New...** → **Project**.
2. Find `medium-blog` in the list and click **Import**.

### 4.3 Configure Build Settings
On the "Configure Project" screen:
1. **Project Name:** `my-kushal-blog` (or any name you want)
2. **Framework Preset:** `Vite` (automatically detected)
3. **Root Directory:**
   - Click the **Edit** button next to Root Directory.
   - Select the folder: `blog-display/frontend`.
   - Click **Continue**.
4. **Environment Variables:**
   - Click to expand **Environment Variables**.
   - Add:
     - **Key:** `VITE_API_BASE`
     - **Value:** `https://my-blog-backend.onrender.com/api` *(Your Render URL from Step 3.5)*
     *(Add without trailing slash, ending in `/api`)*

### 4.4 Deploy
1. Click the blue **Deploy** button.
2. Vercel will build the frontend in ~30 seconds.
3. You will see fireworks and **Congratulations!**
4. Click on the preview image or the domain link (e.g. `https://my-kushal-blog.vercel.app`).
5. **Your public blog is now LIVE on the internet! 🎉**

---

## Step 5: (Optional) Deploy Admin Story Editor (Vercel)

If you also want to write and publish stories from your mobile phone or any other computer:

1. In your **Render Dashboard**:
   - Create a second Web Service for the editor:
   - **Root Directory:** `blog-editor/backend`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Environment Variables:**
     - `MONGODB_URI`: *(Same MongoDB connection string)*
     - `ADMIN_PASSWORD`: *(Set a secret password for logging into the editor)*
   - Copy the deployed editor backend URL (e.g. `https://my-editor-backend.onrender.com`).

2. In your **Vercel Dashboard**:
   - Click **Add New...** → **Project**.
   - Select `medium-blog`.
   - Set **Root Directory:** `blog-editor/frontend`.
   - Add Environment Variable:
     - `VITE_API_BASE`: `https://my-editor-backend.onrender.com/api`
   - Click **Deploy**!
   - You now have a private live editor at `https://my-blog-editor.vercel.app`!

---

## Step 6: Live Verification & Testing Checklist

Once your site is live, open your new Vercel URL on your mobile phone or computer:
- [ ] **Home Page:** Stories feed loads cleanly with author profile, hero post, and tags.
- [ ] **Story Reading View:** Click any story — notice the cover image and smooth typography.
- [ ] **Table of Contents (TOC):**
  - Verify minimalist notch bars appear on the right side.
  - Hover over the notch bars — verify the floating card expands with the green active bullet and indented subheadings.
  - Scroll the page — verify the active indicator updates in real-time.
- [ ] **Match Cover Background:** Click the "Match Cover BG" pill — observe the ambient theme adaptation.
- [ ] **Theme Switcher:** Toggle Dark / Light mode — verify full pitch black in dark mode.

---

## Troubleshooting & FAQ

### Q: Why does Render take 30-50 seconds on the very first visit?
**A:** On Render's 100% free tier, if no one visits your site for 15 minutes, the backend "sleeps" to save cloud resources. The moment a visitor opens your blog, Render automatically wakes up within ~30-40 seconds. Once awake, everything runs at full speed.

### Q: Can I connect my own custom domain (e.g. `kushalshah.com`)?
**A:** Yes! Both Vercel and Render let you add custom domains for 100% free with automatic SSL certificates. Go to **Vercel Project Settings → Domains → Add Domain**.

### Q: Did I have to enter any credit card or billing info?
**A:** No. Every provider used in this guide (GitHub, MongoDB Atlas, Render, Vercel) offers a lifetime free tier with **zero credit card required**.
