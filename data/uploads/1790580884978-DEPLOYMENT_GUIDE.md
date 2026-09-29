# 🚀 100% Free Hosting & Deployment Guide

This guide shows you how to host the entire Medium Blog Clone **100% Free forever with $0 cost** across all tiers: **Database**, **Backend API**, and **Frontend**.

---

## 🏗️ Architecture Overview

| Component | Recommended Free Provider | Free Tier Details | Cost |
| :--- | :--- | :--- | :--- |
| **Database** | **MongoDB Atlas (M0 Shared)** | 512 MB storage, shared RAM, auto-backups, no credit card needed | **$0 / month** |
| **Images** | **Stored inside MongoDB** | Handled natively by our `/api/upload-image` and `/images/:id` endpoints | **$0 / month** |
| **Backend** | **Render.com** (or Railway / Koyeb) | Free Web Service with custom domains, automatic HTTPS | **$0 / month** |
| **Frontend** | **Vercel** (or Netlify / Cloudflare) | 100 GB bandwidth, global CDN, instant Git continuous deployment | **$0 / month** |

---

## Step 1: Set Up Free MongoDB Database (MongoDB Atlas)

1. Go to [mongodb.com/cloud/atlas/register](https://www.mongodb.com/cloud/atlas/register) and create a free account.
2. Select **"Deploy a multi-cloud database"** and choose the **M0 Free tier** (AWS / GCP / Azure).
3. **Database Access**:
   - Create a database user with username and password (e.g. `blogadmin` and a strong password).
4. **Network Access**:
   - Click **Add IP Address** -> Select **"Allow Access from Anywhere"** (`0.0.0.0/0`).
5. **Get Connection String**:
   - Click **Connect** -> **Drivers** (Node.js).
   - Copy your connection string, which looks like:
     ```
     mongodb+srv://blogadmin:<password>@cluster0.xxxx.mongodb.net/medium_clone?retryWrites=true&w=majority
     ```
   - Replace `<password>` with your database user password.

> **Local Development**: Your local MongoDB is already running at `mongodb://127.0.0.1:27017/medium_clone`. When `MONGODB_URI` environment variable is not defined, it connects locally automatically.

---

## Step 2: Deploy Backend for Free (Render.com)

1. Push your project to a GitHub repository.
2. Go to [render.com](https://render.com) and create a free account.
3. Click **New +** -> **Web Service**.
4. Connect your GitHub repository.
5. Configure the two services:
   - **For Editor Backend**:
     - Root Directory: `blog-editor/backend`
     - Build Command: `npm install`
     - Start Command: `node server.js`
     - Environment Variables:
       - `MONGODB_URI`: `<Your MongoDB Atlas connection string>`
       - `PORT`: `10000`
   - **For Public Display Backend**:
     - Root Directory: `blog-display/backend`
     - Build Command: `npm install`
     - Start Command: `node server.js`
     - Environment Variables:
       - `MONGODB_URI`: `<Your MongoDB Atlas connection string>`
       - `PORT`: `10000`

---

## Step 3: Deploy Frontend for Free (Vercel / Netlify)

1. Go to [vercel.com](https://vercel.com) and connect your GitHub account.
2. Click **Add New...** -> **Project**.
3. Select your repository:
   - For public blog: set Root Directory to `blog-display/frontend`
   - Framework preset: `Vite`
   - Deploy!
4. Do the same for `blog-editor/frontend`.
5. In the frontend environment configuration or `app.js`/`editor.js`, update the API URL to point to your live Render backend URL.

---

## 🖼️ How Images Are Stored in MongoDB

- When uploading cover images or article photos, the server automatically reads the image buffer and stores it in the MongoDB `Image` collection.
- The server serves images from `/images/:filename` using high-speed HTTP caching headers.
- **Why this is critical for free hosting**: Free hosts (like Render) wipe their local disk when restarting or sleeping. Because our image data lives persistently in MongoDB Atlas, your uploaded images and articles will **never be lost**.
