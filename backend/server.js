const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Cloudinary configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer configuration (memory storage for Cloudinary)
const storage = multer.memoryStorage();

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

// --- MongoDB Connection ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected successfully'))
    .catch(err => console.error('MongoDB connection error:', err));

// --- Mongoose Schemas and Models ---

// User Schema
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    avatar: { type: String, default: null },
    bio: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

// Post Schema
const postSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    type: { type: String, enum: ['text', 'image'], default: 'text' },
    image: { type: String, default: null },
    createdAt: { type: Date, default: Date.now }
});

postSchema.virtual('likesCount', {
    ref: 'Like',
    localField: '_id',
    foreignField: 'postId',
    count: true
});

postSchema.virtual('commentsCount', {
    ref: 'Comment',
    localField: '_id',
    foreignField: 'postId',
    count: true
});

postSchema.set('toObject', { virtuals: true });
postSchema.set('toJSON', { virtuals: true });

const Post = mongoose.model('Post', postSchema);

// Comment Schema
const commentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});
const Comment = mongoose.model('Comment', commentSchema);

// Like Schema
const likeSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
    createdAt: { type: Date, default: Date.now }
});
likeSchema.index({ userId: 1, postId: 1 }, { unique: true });
const Like = mongoose.model('Like', likeSchema);

// Follow Schema
const followSchema = new mongoose.Schema({
    followerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    followingId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now }
});
followSchema.index({ followerId: 1, followingId: 1 }, { unique: true });
const Follow = mongoose.model('Follow', followSchema);

// --- Auth Routes ---
app.post('/api/register', async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ error: 'User with this email or username already exists' });
        }

        const newUser = new User({ username, email, password });
        await newUser.save();

        const { password: _, ...userWithoutPassword } = newUser._doc;
        res.status(201).json({ user: userWithoutPassword });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Server error during registration' });
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user || user.password !== password) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const { password: _, ...userWithoutPassword } = user._doc;
        res.json({ user: userWithoutPassword });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error during login' });
    }
});

// --- User Routes ---
app.get('/api/users/search/:query', async (req, res) => {
    const { query } = req.params;

    try {
        const foundUsers = await User.find({ username: { $regex: query, $options: 'i' } }).select('-password');
        res.json(foundUsers);
    } catch (error) {
        console.error('Search users error:', error);
        res.status(500).json({ error: 'Server error during user search' });
    }
});

app.get('/api/users/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userPosts = await Post.find({ userId: user._id })
            .sort({ createdAt: -1 })
            .populate('likesCount')
            .populate('commentsCount');

        const formattedUserPosts = userPosts.map(post => ({
            ...post._doc,
            likes: post.likesCount,
            comments: post.commentsCount,
        }));

        const followerCount = await Follow.countDocuments({ followingId: user._id });
        const followingCount = await Follow.countDocuments({ followerId: user._id });

        res.json({
            ...user._doc,
            postsCount: formattedUserPosts.length,
            followersCount: followerCount,
            followingCount: followingCount,
            posts: formattedUserPosts
        });
    } catch (error) {
        console.error('Get user by ID error:', error);
        if (error.name === 'CastError') {
            return res.status(400).json({ error: 'Invalid user ID format' });
        }
        res.status(500).json({ error: 'Server error fetching user profile' });
    }
});

// --- Follow Routes ---
app.post('/api/follow', async (req, res) => {
    const { followerId, followingId } = req.body;

    if (followerId === followingId) {
        return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    try {
        const existingFollow = await Follow.findOne({ followerId, followingId });
        if (existingFollow) {
            return res.status(400).json({ error: 'Already following this user' });
        }

        const newFollow = new Follow({ followerId, followingId });
        await newFollow.save();

        res.status(201).json({ message: 'Followed successfully' });
    } catch (error) {
        console.error('Follow error:', error);
        res.status(500).json({ error: 'Server error during follow action' });
    }
});

app.delete('/api/follow', async (req, res) => {
    const { followerId, followingId } = req.body;

    try {
        await Follow.deleteOne({ followerId, followingId });
        res.json({ message: 'Unfollowed successfully' });
    } catch (error) {
        console.error('Unfollow error:', error);
        res.status(500).json({ error: 'Server error during unfollow action' });
    }
});

app.get('/api/follow/status/:followerId/:followingId', async (req, res) => {
    const { followerId, followingId } = req.params;

    try {
        const isFollowing = await Follow.exists({ followerId, followingId });
        res.json({ isFollowing: !!isFollowing });
    } catch (error) {
        console.error('Follow status error:', error);
        res.status(500).json({ error: 'Server error checking follow status' });
    }
});

// --- Post Routes ---
app.post('/api/posts', upload.single('image'), async (req, res) => {
    const { userId, content, type } = req.body;

    if (!userId || !content) {
        return res.status(400).json({ error: 'User ID and content are required' });
    }

    if (req.file) {
        try {
            const stream = cloudinary.uploader.upload_stream({
                folder: 'socialmedia_posts',
                resource_type: 'image',
            }, async (error, result) => {
                if (error) {
                    console.error('Cloudinary upload error:', error);
                    return res.status(500).json({ error: 'Image upload failed' });
                }

                const newPost = new Post({
                    userId,
                    content,
                    type: type || 'text',
                    image: result.secure_url
                });

                await newPost.save();

                const populatedPost = await Post.findById(newPost._id)
                    .populate('userId', 'username avatar')
                    .populate('likesCount')
                    .populate('commentsCount');

                res.status(201).json({
                    ...populatedPost._doc,
                    user: populatedPost.userId,
                    likes: populatedPost.likesCount,
                    comments: populatedPost.commentsCount
                });
            });

            stream.end(req.file.buffer);
        } catch (err) {
            console.error('Upload stream error:', err);
            return res.status(500).json({ error: 'Image upload error' });
        }
    } else {
        const newPost = new Post({
            userId,
            content,
            type: type || 'text',
            image: null
        });

        await newPost.save();

        const populatedPost = await Post.findById(newPost._id)
            .populate('userId', 'username avatar')
            .populate('likesCount')
            .populate('commentsCount');

        res.status(201).json({
            ...populatedPost._doc,
            user: populatedPost.userId,
            likes: populatedPost.likesCount,
            comments: populatedPost.commentsCount
        });
    }
});

app.get('/api/posts/feed/:userId', async (req, res) => {
    const userId = req.params.userId;

    try {
        const followingUsers = await Follow.find({ followerId: userId }).select('followingId');
        const followingIds = followingUsers.map(f => f.followingId);
        followingIds.push(userId);

        const feedPosts = await Post.find({ userId: { $in: followingIds } })
            .sort({ createdAt: -1 })
            .populate('userId', 'username avatar')
            .populate('likesCount')
            .populate('commentsCount');

        const formattedFeedPosts = feedPosts.map(post => ({
            ...post._doc,
            likes: post.likesCount,
            comments: post.commentsCount,
            user: post.userId
        }));

        res.json(formattedFeedPosts);
    } catch (error) {
        console.error('Load feed error:', error);
        res.status(500).json({ error: 'Server error loading feed' });
    }
});

// --- Like Routes ---
app.post('/api/likes', async (req, res) => {
    const { userId, postId } = req.body;

    try {
        const existingLike = await Like.findOne({ userId, postId });

        if (existingLike) {
            await Like.deleteOne({ userId, postId });
            res.json({ message: 'Post unliked', liked: false });
        } else {
            const newLike = new Like({ userId, postId });
            await newLike.save();
            res.status(201).json({ message: 'Post liked', liked: true });
        }
    } catch (error) {
        console.error('Toggle like error:', error);
        res.status(500).json({ error: 'Server error toggling like' });
    }
});

app.get('/api/likes/status/:userId/:postId', async (req, res) => {
    const { userId, postId } = req.params;

    try {
        const isLiked = await Like.exists({ userId, postId });
        res.json({ isLiked: !!isLiked });
    } catch (error) {
        console.error('Check like status error:', error);
        res.status(500).json({ error: 'Server error checking like status' });
    }
});

// --- Comment Routes ---
app.post('/api/comments', async (req, res) => {
    const { userId, postId, content } = req.body;

    if (!userId || !postId || !content) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        const newComment = new Comment({ userId, postId, content });
        await newComment.save();

        const populatedComment = await Comment.findById(newComment._id).populate('userId', 'username avatar');

        res.status(201).json({
            ...populatedComment._doc,
            user: populatedComment.userId
        });
    } catch (error) {
        console.error('Add comment error:', error);
        res.status(500).json({ error: 'Server error adding comment' });
    }
});

app.get('/api/comments/:postId', async (req, res) => {
    const postId = req.params.postId;

    try {
        const postComments = await Comment.find({ postId })
            .sort({ createdAt: 1 })
            .populate('userId', 'username avatar');

        res.json(postComments);
    } catch (error) {
        console.error('Load comments error:', error);
        res.status(500).json({ error: 'Server error loading comments' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
