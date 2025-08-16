const API_BASE = "http://localhost:5000/api";
let currentUser = null;
let currentPostType = "text";

async function login(event) {
  event.preventDefault();
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  try {
    const response = await fetch(`${API_BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (response.ok) {
      currentUser = data.user;
      localStorage.setItem("currentUser", JSON.stringify(currentUser));
      showMainApp();
    } else {
      showError("login-error", data.error);
    }
  } catch (error) {
    showError("login-error", "Connection error. Please try again.");
  }
}

async function register(event) {
  event.preventDefault();
  const username = document.getElementById("register-username").value;
  const email = document.getElementById("register-email").value;
  const password = document.getElementById("register-password").value;

  try {
    const response = await fetch(`${API_BASE}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password }),
    });

    const data = await response.json();

    if (response.ok) {
      currentUser = data.user;
      localStorage.setItem("currentUser", JSON.stringify(currentUser));
      showMainApp();
    } else {
      showError("register-error", data.error);
    }
  } catch (error) {
    showError("register-error", "Connection error. Please try again.");
  }
}

function showLogin() {
  document.getElementById("login-form").classList.remove("hidden");
  document.getElementById("register-form").classList.add("hidden");
}

function showRegister() {
  document.getElementById("register-form").classList.remove("hidden");
  document.getElementById("login-form").classList.add("hidden");
}

function showMainApp() {
  document.getElementById("auth-section").style.display = "none";
  document.getElementById("main-app").style.display = "flex"; 
  updateUserInfo();
  showSection("feed", null); 
}

function logout() {
  currentUser = null;
  localStorage.removeItem("currentUser");
  document.getElementById("auth-section").style.display = "flex"; // Ensure auth-section shows up
  document.getElementById("main-app").style.display = "none";
  showLogin();
}

function updateUserInfo() {
  // This function is still using `app-title` which is no longer in the HTML.
  // It seems like its purpose was to display user info in the nav.
  // Given the new nav structure, you might not need this explicitly,
  // or you could add a dedicated spot for user info if desired.
  // For now, I'll comment it out or you can remove it if not used.
  // document.getElementById("user-info").innerHTML = `<i class="bi bi-person-circle"></i> Welcome, ${currentUser.username}!`;
}

function setPostType(type, event) {
  currentPostType = type;

  document.querySelectorAll(".post-type-btn").forEach((btn) => {
    btn.classList.remove("active");
  });
  if (event && event.currentTarget) {
    event.currentTarget.classList.add("active");
  } else {
    const btn = document.querySelector(
      `.post-type-btn[onclick*="setPostType('${type}')"]`
    );
    if (btn) {
      btn.classList.add("active");
    }
  }

  const imageUpload = document.getElementById("image-upload");
  if (type === "image") {
    imageUpload.classList.remove("hidden");
    document.getElementById("post-image").required = true;
  } else {
    imageUpload.classList.add("hidden");
    document.getElementById("post-image").required = false;
  }
}

async function createPost(event) {
  event.preventDefault();
  const content = document.getElementById("post-content").value;
  const imageFile = document.getElementById("post-image").files[0];

  const formData = new FormData();
  formData.append("userId", currentUser._id);
  formData.append("content", content);
  formData.append("type", currentPostType);

  if (imageFile) {
    formData.append("image", imageFile);
  }

  try {
    const response = await fetch(`${API_BASE}/posts`, {
      method: "POST",
      body: formData,
    });

    if (response.ok) {
      document.getElementById("post-form").reset();
      setPostType("text", null);
      loadFeed(); // Reload feed to show the new post
    } else {
      const errorData = await response.json();
      console.error("Error creating post:", errorData.error);
      showError("posts-container", errorData.error);
    }
  } catch (error) {
    console.error("Error creating post:", error);
    showError("posts-container", "Connection error. Please try again.");
  }
}

async function loadFeed() {
  if (!currentUser || !currentUser._id) {
    console.error("No current user found to load feed.");
    showError("posts-container", "Please log in to see the feed.");
    return;
  }
  try {
    const response = await fetch(`${API_BASE}/posts/feed/${currentUser._id}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const posts = await response.json();
    displayPosts(posts);
  } catch (error) {
    console.error("Error loading feed:", error);
    showError("posts-container", "Failed to load posts. Please try again.");
  }
}

async function displayPosts(posts) {
  const container = document.getElementById("posts-container");

  if (posts.length === 0) {
    container.innerHTML =
      '<div class="post-card"><p>No posts to show. Follow some users to see their posts!</p></div>'; // Changed to post-card
    return;
  }

  container.innerHTML = "";

  for (const post of posts) {
    const isLiked = await checkLikeStatus(post._id);
    const postElement = createPostElement(post, isLiked);
    container.appendChild(postElement);
  }
}


function createPostElement(post, isLiked) {
  const postDiv = document.createElement("div");
  postDiv.className = "post-card"; 

  const timeAgo = getTimeAgo(new Date(post.createdAt));

  postDiv.innerHTML = `
                <div class="post-header">
                    <div class="user-avatar">${
                      post.user.username[0].toUpperCase()
                    }</div>
                    <div>
                        <strong>${post.user.username}</strong>
                        <div style="color: #6c757d; font-size: 14px;">${timeAgo}</div>
                    </div>
                </div>
                <div class="post-content">
                    <p>${post.content}</p>
                    ${
                      post.image // No need to prepend 'http://localhost:5000' here
                        ? `<img src="${post.image}" alt="Post image" class="post-image">`
                        : ""
                    }
                </div>
                <div class="post-actions">
                    <button class="action-btn ${
                      isLiked ? "liked" : ""
                    }" onclick="toggleLike('${post._id}')">
                        <i class="bi bi-heart${
                          isLiked ? "-fill" : ""
                        }"></i> <span id="likes-count-${
    post._id
  }">${post.likes}</span>
                    </button>
                    <button class="action-btn" onclick="toggleComments('${
                      post._id
                    }')">
                        <i class="bi bi-chat-text"></i> <span id="comments-count-${
    post._id
  }">${post.comments}</span>
                    </button>
                </div>
                <div id="comments-${post._id}" class="comments-section hidden">
                    <div id="comments-list-${post._id}"></div>
                    <div class="comment-form">
                        <input type="text" id="comment-input-${
                          post._id
                        }" placeholder="Write a comment..." class="comment-input">
                        <button onclick="addComment('${
                          post._id
                        }')"><i class="bi bi-send"></i></button>
                    </div>
                </div>
            `;

  return postDiv;
}

async function toggleLike(postId) {
  try {
    const response = await fetch(`${API_BASE}/likes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: currentUser._id, postId }),
    });

    if (response.ok) {
      const data = await response.json();
      const likesCountElement = document.getElementById(
        `likes-count-${postId}`
      );
      if (likesCountElement) {
        likesCountElement.textContent =
          parseInt(likesCountElement.textContent) + (data.liked ? 1 : -1);
        const likeButton = likesCountElement.closest(".action-btn");
        if (likeButton) {
          const heartIcon = likeButton.querySelector("i");
          if (data.liked) {
            likeButton.classList.add("liked");
            heartIcon.classList.remove("bi-heart");
            heartIcon.classList.add("bi-heart-fill"); // Fill icon when liked
          } else {
            likeButton.classList.remove("liked");
            heartIcon.classList.remove("bi-heart-fill");
            heartIcon.classList.add("bi-heart"); // Outline icon when unliked
          }
        }
      }
    } else {
      const errorData = await response.json();
      console.error("Error toggling like:", errorData.error);
    }
  } catch (error) {
    console.error("Error toggling like:", error);
  }
}

async function checkLikeStatus(postId) {
  if (!currentUser || !currentUser._id) {
    return false;
  }
  try {
    const response = await fetch(
      `${API_BASE}/likes/status/${currentUser._id}/${postId}`
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.isLiked;
  } catch (error) {
    console.error("Error checking like status:", error);
    return false;
  }
}

async function toggleComments(postId) {
  const commentsSection = document.getElementById(`comments-${postId}`);

  if (commentsSection.classList.contains("hidden")) {
    commentsSection.classList.remove("hidden");
    await loadComments(postId);
  } else {
    commentsSection.classList.add("hidden");
  }
}

async function loadComments(postId) {
  const commentsList = document.getElementById(`comments-list-${postId}`);
  commentsList.innerHTML = ""; // Clear previous comments

  try {
    const response = await fetch(`${API_BASE}/comments/${postId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const comments = await response.json();

    // --- DEBUGGING: Log the received comments to the console (keep this for now, helpful for verification) ---
    console.log(`Received comments for Post ${postId}:`, comments);
    // --- END DEBUGGING ---

    if (comments.length === 0) {
      commentsList.innerHTML = '<div class="comment"><p>No comments yet.</p></div>';
      return;
    }

    commentsList.innerHTML = comments
      .map(
        (comment) => {
          // FIX: Access username from comment.userId, not comment.user
          const username =
            comment.userId && comment.userId.username
              ? comment.userId.username
              : "Unknown User";
          const displayContent = comment.content || "";
          const time = getTimeAgo(new Date(comment.createdAt));

          return `
                <div class="comment">
                    <strong>${username}</strong>: ${displayContent}
                    <div style="color: #6c757d; font-size: 12px; margin-top: 5px;">
                        ${time}
                    </div>
                </div>
            `;
        }
      )
      .join("");
  } catch (error) {
    console.error("Error loading comments:", error);
    commentsList.innerHTML =
      '<div class="comment error">Failed to load comments.</div>';
  }
}

async function addComment(postId) {
  const input = document.getElementById(`comment-input-${postId}`);
  const content = input.value.trim();

  if (!content) return;

  try {
    const response = await fetch(`${API_BASE}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: currentUser._id,
        postId,
        content,
      }),
    });

    if (response.ok) {
      input.value = "";
      await loadComments(postId); // Reload comments to show the new one
      const commentsCountElement = document.getElementById(
        `comments-count-${postId}`
      );
      if (commentsCountElement) {
        commentsCountElement.textContent =
          parseInt(commentsCountElement.textContent) + 1;
      }
    } else {
      const errorData = await response.json();
      console.error("Error adding comment:", errorData.error);
    }
  } catch (error) {
    console.error("Error adding comment:", error);
  }
}

// Search Functions
async function searchUsers() {
  const query = document.getElementById("search-input").value.trim();

  if (query.length < 2) {
    document.getElementById("search-results").innerHTML = "";
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/users/search/${query}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const users = await response.json();

    const resultsContainer = document.getElementById("search-results");
    resultsContainer.innerHTML = users
      .map(
        (user) => `
                        <div class="user-result">
                            <div style="display: flex; align-items: center;">
                                <div class="user-avatar" style="width: 40px; height: 40px; margin-right: 15px;">
                                    ${user.username[0].toUpperCase()}
                                </div>
                                <div>
                                    <strong>${user.username}</strong>
                                    
                                </div>
                            </div>
                            <div>
                                <button onclick="viewProfile('${
                                  user._id
                                }', event)" class="btn-secondary"><i class="bi bi-eye"></i></button>
                                ${
                                  user._id !== currentUser._id
                                    ? `
                                <button id="follow-btn-${user._id}" onclick="toggleFollow('${user._id}')" class="btn-success">
                                    <i class="bi bi-person-plus"></i>
                                </button>
                                `
                                    : ""
                                }
                            </div>
                        </div>
                `
      )
      .join("");

    users.forEach((user) => {
      if (user._id !== currentUser._id) {
        checkFollowStatus(user._id);
      }
    });
  } catch (error) {
    console.error("Error searching users:", error);
  }
}

async function checkFollowStatus(userId) {
  if (!currentUser || !currentUser._id) {
    return;
  }
  try {
    const response = await fetch(
      `${API_BASE}/follow/status/${currentUser._id}/${userId}`
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();

    const followBtn = document.getElementById(`follow-btn-${userId}`);
    if (followBtn) {
      if (data.isFollowing) {
        followBtn.innerHTML = '<i class="bi bi-person-dash"></i>';
        followBtn.className = "btn-danger";
      } else {
        followBtn.innerHTML = '<i class="bi bi-person-plus"></i>';
        followBtn.className = "btn-success";
      }
    }
  } catch (error) {
    console.error("Error checking follow status:", error);
  }
}

async function toggleFollow(userId) {
  const followBtn = document.getElementById(`follow-btn-${userId}`);
  const isFollowing = followBtn.innerHTML.includes("person-dash"); // Check icon to determine follow status

  try {
    const method = isFollowing ? "DELETE" : "POST";
    const response = await fetch(`${API_BASE}/follow`, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        followerId: currentUser._id,
        followingId: userId,
      }),
    });

    if (response.ok) {
      if (isFollowing) {
        followBtn.innerHTML = '<i class="bi bi-person-plus"></i>';
        followBtn.className = "btn-success";
      } else {
        followBtn.innerHTML = '<i class="bi bi-person-dash"></i>';
        followBtn.className = "btn-danger";
      }
    } else {
      const errorData = await response.json();
      console.error("Error toggling follow:", errorData.error);
    }
  } catch (error) {
    console.error("Error toggling follow:", error);
  }
}

// Profile Functions
async function viewProfile(userId, event = null) {
  showSection("profile", event);
  await loadProfile(userId);
}

async function loadProfile(userId = currentUser._id) {
  if (!currentUser || !currentUser._id) {
    console.error("No current user found to load profile.");
    showError("profile-container", "Please log in to view profiles.");
    return;
  }
  try {
    const response = await fetch(`${API_BASE}/users/${userId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const user = await response.json();

    const container = document.getElementById("profile-container");

    let followButton = "";
    if (userId !== currentUser._id) {
      const followStatusResponse = await fetch(
        `${API_BASE}/follow/status/${currentUser._id}/${userId}`
      );
      if (!followStatusResponse.ok) {
        throw new Error(`HTTP error! status: ${followStatusResponse.status}`);
      }
      const followData = await followStatusResponse.json();

      followButton = `
                        <button id="profile-follow-btn" onclick="toggleProfileFollow('${userId}')"
                                class="${
                                  followData.isFollowing
                                    ? "btn-danger"
                                    : "btn-success"
                                }">
                            ${
                              followData.isFollowing
                                ? '<i class="bi bi-person-dash"></i>'
                                : '<i class="bi bi-person-plus"></i>'
                            }
                        </button>
                    `;
    }

    container.innerHTML = `
                    <div class="profile-header">
                        <div class="profile-avatar">${user.username[0].toUpperCase()}</div>
                        <div>
                            <h2>${user.username}</h2>
                            <p style="color: #6c757d; margin-top: 5px;">${
                              user.email
                            }</p>
                            ${followButton}
                        </div>
                    </div>

                    <div class="profile-stats">
                        <div class="stat">
                            <div class="stat-number">${user.postsCount}</div>
                            <div class="stat-label">Posts</div>
                        </div>
                        <div class="stat">
                            <div class="stat-number">${
                              user.followersCount
                            }</div>
                            <div class="stat-label">Followers</div>
                        </div>
                        <div class="stat">
                            <div class="stat-number">${
                              user.followingCount
                            }</div>
                            <div class="stat-label">Following</div>
                        </div>
                    </div>

                    <div style="margin-top: 30px;">
                        <h3>Posts</h3>
                        <div id="profile-posts">
                            ${
                              user.posts.length === 0
                                ? "<p>No posts yet.</p>"
                                : ""
                            }
                        </div>
                    </div>
                `;

    if (user.posts.length > 0) {
      const postsContainer = document.getElementById("profile-posts");

      for (const post of user.posts) {
        const isLiked = await checkLikeStatus(post._id);
        const postElement = createPostElement(
          {
            ...post,
            user: {
              _id: user._id,
              username: user.username,
              avatar: user.avatar,
            },
          },
          isLiked
        );
        postsContainer.appendChild(postElement);
      }
    }
  } catch (error) {
    console.error("Error loading profile:", error);
    showError("profile-container", "Failed to load profile. Please try again.");
  }
}

async function toggleProfileFollow(userId) {
  const followBtn = document.getElementById("profile-follow-btn");
  const isFollowing = followBtn.innerHTML.includes("person-dash");

  try {
    const method = isFollowing ? "DELETE" : "POST";
    const response = await fetch(`${API_BASE}/follow`, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        followerId: currentUser._id,
        followingId: userId,
      }),
    });

    if (response.ok) {
      await loadProfile(userId);
    } else {
      const errorData = await response.json();
      console.error("Error toggling profile follow:", errorData.error);
    }
  } catch (error) {
    console.error("Error toggling profile follow:", error);
  }
}

// Navigation Functions
function showSection(sectionName, event) {
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.classList.remove("active");
  });
  if (event && event.currentTarget) {
    event.currentTarget.classList.add("active");
  } else {
    const link = document.querySelector(
      `.nav-link[onclick*="showSection('${sectionName}')"]`
    );
    if (link) {
      link.classList.add("active");
    }
  }

  document.querySelectorAll(".section").forEach((section) => {
    section.classList.add("hidden");
  });

  // Removed explicit margin-left settings here as it's now handled by .main-app padding-left
  // and .main-app > .container margin: 0 auto;

  document.getElementById(`${sectionName}-section`).classList.remove("hidden");

  if (sectionName === "feed") {
    loadFeed();
  } else if (sectionName === "profile") {
    if (currentUser) {
      loadProfile(currentUser._id);
    }
  }
}

// Utility Functions
function getTimeAgo(date) {
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return `${Math.floor(diffInSeconds / 86400)}d ago`;
}

function showError(elementId, message) {
  const errorElement = document.getElementById(elementId);
  if (!errorElement) {
    console.error(`Error element with ID '${elementId}' not found.`);
    return;
  }
  errorElement.textContent = message;
  errorElement.classList.remove("hidden");

  setTimeout(() => {
    errorElement.classList.add("hidden");
  }, 5000);
}

// Initialize the app
document.addEventListener("DOMContentLoaded", () => {
  setPostType("text", null);

  const storedUser = localStorage.getItem("currentUser");
  if (storedUser) {
    currentUser = JSON.parse(storedUser);
    showMainApp();
  } else {
    document.getElementById("auth-section").style.display = "flex"; // Ensure auth-section shows up for login/register
    document.getElementById("main-app").style.display = "none";
    showLogin();
  }
});