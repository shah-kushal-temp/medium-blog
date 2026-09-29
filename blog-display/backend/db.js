const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/medium_clone';

// Post Schema
const PostSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  title: { type: String, default: 'Untitled' },
  subtitle: { type: String, default: '' },
  slug: { type: String, required: true, unique: true, index: true },
  author: { type: String, default: 'Kushal Shah' },
  coverImage: { type: String, default: '' },
  tags: { type: [String], default: [] },
  content: { type: String, default: '' },
  rawContent: { type: String, default: '' },
  rawFile: { type: String, default: '' },
  originalFileName: { type: String, default: '' },
  fileType: { type: String, default: 'html' },
  readTime: { type: Number, default: 1 },
  published: { type: Boolean, default: false, index: true },
  isHero: { type: Boolean, default: false, index: true },
  isPinned: { type: Boolean, default: false, index: true },
  pinOrder: { type: Number, default: 0, index: true },
  coverColor: { type: String, default: '' },
  matchCoverBackground: { type: Boolean, default: true },
  createdAt: { type: String, default: () => new Date().toISOString() },
  updatedAt: { type: String, default: () => new Date().toISOString() }
}, { timestamps: true });

PostSchema.index({ published: 1, isPinned: -1, pinOrder: 1, createdAt: -1 });
PostSchema.index({ published: 1, createdAt: -1 });

// Profile Schema
const ProfileSchema = new mongoose.Schema({
  name: { type: String, default: 'Kushal Shah' },
  tagline: { type: String, default: 'Software Engineer, Writer & Open Source Enthusiast' },
  bio: { type: String, default: '' },
  about: { type: String, default: '' },
  avatar: { type: String, default: '' },
  links: { type: Array, default: [] }
}, { timestamps: true });

// Image Schema
const ImageSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  filename: { type: String, required: true },
  mimeType: { type: String, required: true },
  data: { type: String, required: true }, // Base64 data
  size: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const Post = mongoose.models.Post || mongoose.model('Post', PostSchema);
const Profile = mongoose.models.Profile || mongoose.model('Profile', ProfileSchema);
const Image = mongoose.models.Image || mongoose.model('Image', ImageSchema);

let isConnected = false;

async function connectDB() {
  if (isConnected && mongoose.connection.readyState === 1) return true;
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = true;
    console.log(`🍃 Connected to MongoDB: ${MONGODB_URI.includes('@') ? MONGODB_URI.split('@')[1] : MONGODB_URI}`);
    return true;
  } catch (err) {
    console.warn(`⚠️ MongoDB connection warning: ${err.message}. Running with JSON fallback.`);
    isConnected = false;
    return false;
  }
}

function getIsConnected() {
  return isConnected && mongoose.connection.readyState === 1;
}

module.exports = {
  connectDB,
  getIsConnected,
  Post,
  Profile,
  Image,
  MONGODB_URI
};
