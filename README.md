# Medium Blog Clone

A personal blog website inspired by Medium. Upload Markdown or HTML files, auto-generate previews, and publish them — all for free with no signup required to read.

## 📁 Project Structure

```
Medium-blog-clone/
├── data/                    # Shared data store
│   ├── posts.json           # Blog post metadata & content
│   ├── uploads/             # Uploaded MD/HTML source files
│   └── images/              # Uploaded cover images
├── blog-display/            # 📖 Public reader-facing blog
│   ├── frontend/            # Vite + Vanilla JS (port 5173)
│   └── backend/             # Express API (port 3001)
├── blog-editor/             # ✏️ Admin editor panel
│   ├── frontend/            # Vite + Vanilla JS (port 5174)
│   └── backend/             # Express API (port 3002)
├── sample-posts/            # Sample .md files to test with
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm

### 1. Install Dependencies

```bash
# Editor backend
cd blog-editor/backend
npm install

# Editor frontend
cd ../frontend
npm install

# Display backend
cd ../../blog-display/backend
npm install

# Display frontend
cd ../frontend
npm install
```

### 2. Start All Servers

Open **4 terminals** and run:

```bash
# Terminal 1 — Editor Backend (port 3002)
cd blog-editor/backend
npm run dev

# Terminal 2 — Editor Frontend (port 5174)
cd blog-editor/frontend
npm run dev

# Terminal 3 — Display Backend (port 3001)
cd blog-display/backend
npm run dev

# Terminal 4 — Display Frontend (port 5173)
cd blog-display/frontend
npm run dev
```

### 3. Start Blogging!

1. Open the **Editor** at `http://localhost:5174`
2. Upload a `.md` or `.html` file
3. Edit title, subtitle, tags, and cover image
4. Click **Publish**
5. View your blog at `http://localhost:5173`

## ✨ Features

### Blog Display (Reader)
- Medium-style blog listing with hero section
- Beautiful typography for post reading
- Tag filtering and search (`/` to quick-search)
- Estimated read time
- Responsive design
- No login required

### Blog Editor (Admin)
- Upload `.md` or `.html` files
- Auto-parse content and generate preview
- Edit metadata (title, subtitle, tags, cover image)
- Publish/unpublish toggle
- Delete posts
- Rich preview before publishing
- Drag-and-drop file upload
- Dark themed admin panel

## 📄 Sample Posts

Two sample Markdown files are included in `sample-posts/`:
- `getting-started-with-javascript.md`
- `the-art-of-clean-code.md`

Upload them through the editor to see the blog in action!

## 🛠 Tech Stack

- **Backend**: Node.js + Express
- **Frontend**: Vite + Vanilla JavaScript + CSS
- **Markdown**: marked.js + highlight.js
- **File Upload**: multer
- **Storage**: JSON file-based (no database)
