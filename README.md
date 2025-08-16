# 🌐 Connectly

A simple **Social Media Web App** built as part of the **CodeAlpha Full-Stack Internship (1 Month)**.
Connectly allows users to connect with each other, share posts, and interact through likes, comments, and a follow system.

---

## 🚀 Features

* 🔐 **Login/Signup Authentication** – Secure user authentication system
* 👤 **User Profiles** – Personalized profile pages with user info and posts
* ➕ **Follow System** – Follow/unfollow users to stay connected
* ❤️ **Likes & Comments** – Engage with posts via likes and comments
* 📝 **Post Upload** – Share text updates and upload images using Cloudinary

---

## 🛠️ Tech Stack

* **Frontend**: HTML, CSS, JavaScript
* **Backend**: Node.js, Express.js
* **Database**: MongoDB
* **Media Storage**: Cloudinary

---

## ⚙️ Setup Instructions

### 1. Clone the repository

```bash
git clone https://github.com/your-username/Connectly.git
cd Connectly
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file inside the `backend/` folder with the following variables:

```
MONGODB_URI=your_mongodb_connection_string_here

CLOUDINARY_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_secret_key

PORT=5000
JWT_SECRET=your_jwt_secret_key
```

### 4. Run the backend server

```bash
cd backend
npm start
```

or (for development with auto-reload):

```bash
npx nodemon server.js
```

### 5. Open in browser

Frontend (HTML/CSS/JS) will run via static files. Backend runs at:

```
http://localhost:5000
```


