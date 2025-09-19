import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js";
import * as kv from "./kv_store.tsx";

const app = new Hono();

// Initialize Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Initialize storage bucket and admin account on startup
const bucketName = 'make-3a80e39f-manion-uploads';
(async () => {
  try {
    // Create storage bucket
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
    if (!bucketExists) {
      await supabase.storage.createBucket(bucketName, { 
        public: false,
        fileSizeLimit: 52428800 // 50MB
      });
      console.log(`Created bucket: ${bucketName}`);
    }

    // Create admin account - force creation every startup
    try {
      console.log('Setting up admin account...');
      
      // First, try to delete existing admin account if it exists
      try {
        const { data: existingAdmin } = await supabase.auth.admin.getUserByEmail('manionadmin@manion.com');
        if (existingAdmin) {
          console.log('Deleting existing admin account...');
          await supabase.auth.admin.deleteUser(existingAdmin.id);
        }
      } catch (deleteError) {
        console.log('No existing admin account to delete');
      }
      
      // Create new admin account
      console.log('Creating fresh admin account...');
      const { data: newAdmin, error: createError } = await supabase.auth.admin.createUser({
        email: 'manionadmin@manion.com',
        password: 'Qwerty123456**',
        user_metadata: { name: 'Manion Admin' },
        email_confirm: true
      });
      
      if (createError) {
        console.log(`Error creating admin account: ${createError.message}`);
        
        // If user already exists, try to update password
        if (createError.message.includes('already been registered')) {
          console.log('Admin account exists, updating password...');
          const { data: existingUser } = await supabase.auth.admin.getUserByEmail('manionadmin@manion.com');
          if (existingUser) {
            const { error: updateError } = await supabase.auth.admin.updateUserById(existingUser.id, {
              password: 'Qwerty123456**',
              user_metadata: { name: 'Manion Admin' },
              email_confirm: true
            });
            if (updateError) {
              console.log(`Error updating admin account: ${updateError.message}`);
            } else {
              console.log('Admin account password updated successfully');
            }
          }
        }
      } else {
        console.log('Fresh admin account created successfully');
      }
    } catch (adminError) {
      console.log(`Admin account setup error: ${adminError}`);
    }
  } catch (error) {
    console.log(`Startup initialization error: ${error}`);
  }
})();

// Health check endpoint
app.get("/make-server-3a80e39f/health", (c) => {
  return c.json({ status: "ok" });
});

// Helper function to authenticate user
const authenticateUser = async (authHeader: string | undefined) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const accessToken = authHeader.split(' ')[1];
  if (accessToken === Deno.env.get('SUPABASE_ANON_KEY')) {
    return null; // Anonymous user
  }
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    if (error || !user) {
      console.log(`Auth error: ${error?.message}`);
      return null;
    }
    return user;
  } catch (error) {
    console.log(`Auth exception: ${error}`);
    return null;
  }
};

// Helper function to authenticate admin user
const authenticateAdmin = async (authHeader: string | undefined) => {
  const user = await authenticateUser(authHeader);
  if (!user || user.email !== 'manionadmin@manion.com') {
    return null;
  }
  return user;
};

// Upload math problem image with user tracking
app.post("/make-server-3a80e39f/upload", async (c) => {
  try {
    const body = await c.req.formData();
    const file = body.get('image') as File;
    const title = body.get('title') as string || 'Untitled Problem';
    
    if (!file) {
      return c.json({ error: "No image file provided" }, 400);
    }

    // Authenticate user
    const user = await authenticateUser(c.req.header('Authorization'));

    const fileBuffer = await file.arrayBuffer();
    const fileName = `math-problem-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${file.name.split('.').pop()}`;
    
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        upsert: false
      });

    if (error) {
      console.log(`Upload error: ${error.message}`);
      return c.json({ error: "Failed to upload image" }, 500);
    }

    // Store problem record in KV store with user info
    const problemId = `problem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const problemData = {
      id: problemId,
      title: title,
      fileName: fileName,
      status: 'processing',
      uploadTime: new Date().toISOString(),
      videoUrl: null,
      userId: user?.id || null,
      userEmail: user?.email || null,
      userName: user?.user_metadata?.name || null
    };
    
    await kv.set(problemId, problemData);

    // If user is logged in, add to their history
    if (user) {
      const userHistoryKey = `user_history_${user.id}`;
      let userHistory = await kv.get(userHistoryKey) || { problems: [], comments: [], evaluations: [] };
      
      userHistory.problems.push({
        problemId: problemId,
        title: title,
        status: 'processing',
        createdAt: new Date().toISOString()
      });

      await kv.set(userHistoryKey, userHistory);
    }

    // Simulate video generation (in real app, this would call external AI service)
    setTimeout(async () => {
      try {
        const updatedProblem = {
          ...problemData,
          status: 'completed',
          videoUrl: `https://example.com/generated-video-${problemId}.mp4` // Mock video URL
        };
        
        await kv.set(problemId, updatedProblem);

        // Update user history
        if (user) {
          const userHistoryKey = `user_history_${user.id}`;
          let userHistory = await kv.get(userHistoryKey) || { problems: [], comments: [], evaluations: [] };
          
          const problemIndex = userHistory.problems.findIndex(p => p.problemId === problemId);
          if (problemIndex !== -1) {
            userHistory.problems[problemIndex].status = 'completed';
            userHistory.problems[problemIndex].videoUrl = updatedProblem.videoUrl;
            await kv.set(userHistoryKey, userHistory);
          }
        }
      } catch (error) {
        console.log(`Error updating problem status: ${error}`);
      }
    }, 10000); // 10 seconds simulation

    return c.json({ 
      success: true, 
      problemId: problemId,
      message: "Image uploaded successfully, video generation started"
    });

  } catch (error) {
    console.log(`Upload endpoint error: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Get problem status
app.get("/make-server-3a80e39f/problem/:id", async (c) => {
  try {
    const problemId = c.req.param('id');
    const problem = await kv.get(problemId);
    
    if (!problem) {
      return c.json({ error: "Problem not found" }, 404);
    }

    // If image exists, get signed URL
    if (problem.fileName) {
      const { data: signedUrl } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(problem.fileName, 3600); // 1 hour expiry
      
      problem.imageUrl = signedUrl?.signedUrl;
    }

    return c.json(problem);
  } catch (error) {
    console.log(`Get problem error: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Auth endpoints
app.post("/make-server-3a80e39f/signup", async (c) => {
  try {
    const { email, password, name } = await c.req.json();
    
    if (!email || !password || !name) {
      return c.json({ error: "Email, password, and name are required" }, 400);
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      user_metadata: { name: name },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    });

    if (error) {
      console.log(`Signup error: ${error.message}`);
      return c.json({ error: error.message }, 400);
    }

    return c.json({ success: true, user: data.user });
  } catch (error) {
    console.log(`Signup endpoint error: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

app.post("/make-server-3a80e39f/signin", async (c) => {
  try {
    const { email, password } = await c.req.json();
    
    if (!email || !password) {
      return c.json({ error: "Email and password are required" }, 400);
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      console.log(`Signin error: ${error.message}`);
      return c.json({ error: error.message }, 400);
    }

    return c.json({ success: true, user: data.user, session: data.session });
  } catch (error) {
    console.log(`Signin endpoint error: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

app.post("/make-server-3a80e39f/auth/google", async (c) => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
    });

    if (error) {
      console.log(`Google auth error: ${error.message}`);
      return c.json({ error: error.message }, 400);
    }

    return c.json({ success: true, url: data.url });
  } catch (error) {
    console.log(`Google auth endpoint error: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

app.post("/make-server-3a80e39f/auth/kakao", async (c) => {
  try {
    // Note: This requires Kakao to be configured in Supabase
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
    });

    if (error) {
      console.log(`Kakao auth error: ${error.message}`);
      return c.json({ error: error.message }, 400);
    }

    return c.json({ success: true, url: data.url });
  } catch (error) {
    console.log(`Kakao auth endpoint error: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// User history endpoints
app.get("/make-server-3a80e39f/user/history", async (c) => {
  try {
    const user = await authenticateUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: "Authentication required" }, 401);
    }

    const userHistoryKey = `user_history_${user.id}`;
    const userHistory = await kv.get(userHistoryKey) || { problems: [], comments: [], evaluations: [] };

    // Get detailed problem data with signed URLs
    const detailedProblems = await Promise.all(
      userHistory.problems.map(async (historyProblem) => {
        const problemData = await kv.get(historyProblem.problemId);
        if (problemData && problemData.fileName) {
          const { data: signedUrl } = await supabase.storage
            .from(bucketName)
            .createSignedUrl(problemData.fileName, 3600);
          
          return {
            ...historyProblem,
            imageUrl: signedUrl?.signedUrl,
            ...problemData
          };
        }
        return historyProblem;
      })
    );

    return c.json({
      problems: detailedProblems.reverse(), // Latest first
      comments: userHistory.comments.reverse(),
      evaluations: userHistory.evaluations.reverse(),
      stats: {
        totalProblems: userHistory.problems.length,
        completedProblems: userHistory.problems.filter(p => p.status === 'completed').length,
        totalComments: userHistory.comments.length,
        totalEvaluations: userHistory.evaluations.length
      }
    });
  } catch (error) {
    console.log(`Get user history error: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

app.delete("/make-server-3a80e39f/user/history/problem/:problemId", async (c) => {
  try {
    const user = await authenticateUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: "Authentication required" }, 401);
    }

    const problemId = c.req.param('problemId');
    const userHistoryKey = `user_history_${user.id}`;
    const userHistory = await kv.get(userHistoryKey) || { problems: [], comments: [], evaluations: [] };

    // Remove from user history
    userHistory.problems = userHistory.problems.filter(p => p.problemId !== problemId);
    await kv.set(userHistoryKey, userHistory);

    return c.json({ success: true, message: "Problem removed from history" });
  } catch (error) {
    console.log(`Delete user history problem error: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Update problem title
app.put("/make-server-3a80e39f/user/history/problem/:problemId/title", async (c) => {
  try {
    const user = await authenticateUser(c.req.header('Authorization'));
    if (!user) {
      return c.json({ error: "Authentication required" }, 401);
    }

    const problemId = c.req.param('problemId');
    const { title } = await c.req.json();
    
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return c.json({ error: "Valid title is required" }, 400);
    }

    // Limit title length
    const trimmedTitle = title.trim().substring(0, 200);

    // Update the main problem record
    const problemData = await kv.get(problemId);
    if (problemData && problemData.userId === user.id) {
      problemData.title = trimmedTitle;
      await kv.set(problemId, problemData);
    }

    // Update user history
    const userHistoryKey = `user_history_${user.id}`;
    const userHistory = await kv.get(userHistoryKey) || { problems: [], comments: [], evaluations: [] };
    
    const problemIndex = userHistory.problems.findIndex(p => p.problemId === problemId);
    if (problemIndex !== -1) {
      userHistory.problems[problemIndex].title = trimmedTitle;
      await kv.set(userHistoryKey, userHistory);
    }

    return c.json({ success: true, message: "Problem title updated successfully" });
  } catch (error) {
    console.log(`Update problem title error: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Community endpoints with user tracking
app.post("/make-server-3a80e39f/community/posts", async (c) => {
  try {
    const { content, author, boardType, isNotice } = await c.req.json();
    
    if (!content || !author || !boardType) {
      return c.json({ error: "Content, author, and boardType are required" }, 400);
    }

    const user = await authenticateUser(c.req.header('Authorization'));

    // If this is a notice post, ensure user is admin
    if (boardType === 'notice' && (!user || user.email !== 'manionadmin@manion.com')) {
      return c.json({ error: "Only admin can create notice posts" }, 403);
    }

    const postId = `post_${boardType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const post = {
      id: postId,
      content: content,
      author: author,
      boardType: boardType,
      userId: user?.id || null,
      createdAt: new Date().toISOString(),
      likes: 0,
      dislikes: 0,
      replies: [],
      isNotice: isNotice || false
    };

    await kv.set(postId, post);

    // Add to user history if logged in
    if (user) {
      const userHistoryKey = `user_history_${user.id}`;
      let userHistory = await kv.get(userHistoryKey) || { problems: [], comments: [], evaluations: [] };
      
      userHistory.comments.push({
        type: 'post',
        postId: postId,
        content: content,
        boardType: boardType,
        createdAt: new Date().toISOString()
      });

      await kv.set(userHistoryKey, userHistory);
    }

    return c.json({ success: true, post });
  } catch (error) {
    console.log(`Create post error: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

app.get("/make-server-3a80e39f/community/posts/:boardType", async (c) => {
  try {
    const boardType = c.req.param('boardType');
    
    if (boardType !== 'general' && boardType !== 'anonymous' && boardType !== 'notice') {
      return c.json({ error: "Invalid board type" }, 400);
    }

    const posts = await kv.getByPrefix(`post_${boardType}_`);
    const sortedPosts = posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return c.json(sortedPosts);
  } catch (error) {
    console.log(`Get posts error: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

app.post("/make-server-3a80e39f/community/posts/:id/like", async (c) => {
  try {
    const postId = c.req.param('id');
    const { action } = await c.req.json(); // 'like' or 'dislike'
    
    const post = await kv.get(postId);
    if (!post) {
      return c.json({ error: "Post not found" }, 404);
    }

    if (action === 'like') {
      post.likes = (post.likes || 0) + 1;
    } else if (action === 'dislike') {
      post.dislikes = (post.dislikes || 0) + 1;
    }

    await kv.set(postId, post);
    return c.json({ success: true, post });
  } catch (error) {
    console.log(`Like post error: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

app.post("/make-server-3a80e39f/community/posts/:id/reply", async (c) => {
  try {
    const postId = c.req.param('id');
    const { content, author, isAdmin } = await c.req.json();
    
    if (!content || !author) {
      return c.json({ error: "Content and author are required" }, 400);
    }

    const user = await authenticateUser(c.req.header('Authorization'));

    const post = await kv.get(postId);
    if (!post) {
      return c.json({ error: "Post not found" }, 404);
    }

    const reply = {
      id: `reply_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content: content,
      author: author,
      userId: user?.id || null,
      createdAt: new Date().toISOString(),
      isAdmin: isAdmin || false
    };

    if (!post.replies) {
      post.replies = [];
    }
    post.replies.push(reply);

    await kv.set(postId, post);

    // Add to user history if logged in
    if (user) {
      const userHistoryKey = `user_history_${user.id}`;
      let userHistory = await kv.get(userHistoryKey) || { problems: [], comments: [], evaluations: [] };
      
      userHistory.comments.push({
        type: 'reply',
        postId: postId,
        replyId: reply.id,
        content: content,
        createdAt: new Date().toISOString()
      });

      await kv.set(userHistoryKey, userHistory);
    }

    return c.json({ success: true, reply });
  } catch (error) {
    console.log(`Reply to post error: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Evaluation endpoints with user tracking
app.post("/make-server-3a80e39f/evaluations", async (c) => {
  try {
    const { rating, feedback, videoUrl, timestamp } = await c.req.json();
    
    if (!rating || rating < 1 || rating > 5) {
      return c.json({ error: "Valid rating (1-5) is required" }, 400);
    }

    const user = await authenticateUser(c.req.header('Authorization'));

    const evaluationId = `evaluation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const evaluation = {
      id: evaluationId,
      rating: rating,
      feedback: feedback || '',
      videoUrl: videoUrl || '',
      userId: user?.id || null,
      userEmail: user?.email || null,
      createdAt: timestamp || new Date().toISOString()
    };

    await kv.set(evaluationId, evaluation);

    // Add to user history if logged in
    if (user) {
      const userHistoryKey = `user_history_${user.id}`;
      let userHistory = await kv.get(userHistoryKey) || { problems: [], comments: [], evaluations: [] };
      
      userHistory.evaluations.push({
        evaluationId: evaluationId,
        rating: rating,
        feedback: feedback || '',
        videoUrl: videoUrl || '',
        createdAt: evaluation.createdAt
      });

      await kv.set(userHistoryKey, userHistory);
    }

    return c.json({ success: true, evaluation });
  } catch (error) {
    console.log(`Create evaluation error: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

app.get("/make-server-3a80e39f/admin/evaluations", async (c) => {
  try {
    const admin = await authenticateAdmin(c.req.header('Authorization'));
    if (!admin) {
      return c.json({ error: "Admin authentication required" }, 401);
    }

    const evaluations = await kv.getByPrefix('evaluation_');
    const sortedEvaluations = evaluations.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return c.json(sortedEvaluations);
  } catch (error) {
    console.log(`Get admin evaluations error: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Admin endpoints
app.get("/make-server-3a80e39f/admin/problems", async (c) => {
  try {
    const admin = await authenticateAdmin(c.req.header('Authorization'));
    if (!admin) {
      return c.json({ error: "Admin authentication required" }, 401);
    }

    const problems = await kv.getByPrefix('problem_');
    const sortedProblems = problems.sort((a, b) => new Date(b.uploadTime).getTime() - new Date(a.uploadTime).getTime());
    
    // Add signed URLs for images
    for (const problem of sortedProblems) {
      if (problem.fileName) {
        const { data: signedUrl } = await supabase.storage
          .from(bucketName)
          .createSignedUrl(problem.fileName, 3600);
        problem.imageUrl = signedUrl?.signedUrl;
      }
    }
    
    return c.json(sortedProblems);
  } catch (error) {
    console.log(`Get admin problems error: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Delete problem
app.delete("/make-server-3a80e39f/admin/problems/:id", async (c) => {
  try {
    const admin = await authenticateAdmin(c.req.header('Authorization'));
    if (!admin) {
      return c.json({ error: "Admin authentication required" }, 401);
    }

    const problemId = c.req.param('id');
    const problem = await kv.get(problemId);
    
    if (!problem) {
      return c.json({ error: "Problem not found" }, 404);
    }

    // Delete image from storage if exists
    if (problem.fileName) {
      await supabase.storage
        .from(bucketName)
        .remove([problem.fileName]);
    }

    // Delete problem from KV store
    await kv.del(problemId);
    
    return c.json({ success: true, message: "Problem deleted successfully" });
  } catch (error) {
    console.log(`Delete problem error: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Delete post
app.delete("/make-server-3a80e39f/admin/posts/:id", async (c) => {
  try {
    const admin = await authenticateAdmin(c.req.header('Authorization'));
    if (!admin) {
      return c.json({ error: "Admin authentication required" }, 401);
    }

    const postId = c.req.param('id');
    const post = await kv.get(postId);
    
    if (!post) {
      return c.json({ error: "Post not found" }, 404);
    }

    await kv.del(postId);
    return c.json({ success: true, message: "Post deleted successfully" });
  } catch (error) {
    console.log(`Delete post error: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Delete reply
app.delete("/make-server-3a80e39f/admin/posts/:postId/replies/:replyId", async (c) => {
  try {
    const admin = await authenticateAdmin(c.req.header('Authorization'));
    if (!admin) {
      return c.json({ error: "Admin authentication required" }, 401);
    }

    const postId = c.req.param('postId');
    const replyId = c.req.param('replyId');
    
    const post = await kv.get(postId);
    if (!post) {
      return c.json({ error: "Post not found" }, 404);
    }

    if (!post.replies) {
      return c.json({ error: "Reply not found" }, 404);
    }

    const replyIndex = post.replies.findIndex(reply => reply.id === replyId);
    if (replyIndex === -1) {
      return c.json({ error: "Reply not found" }, 404);
    }

    post.replies.splice(replyIndex, 1);
    await kv.set(postId, post);
    
    return c.json({ success: true, message: "Reply deleted successfully" });
  } catch (error) {
    console.log(`Delete reply error: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Delete evaluation
app.delete("/make-server-3a80e39f/admin/evaluations/:id", async (c) => {
  try {
    const admin = await authenticateAdmin(c.req.header('Authorization'));
    if (!admin) {
      return c.json({ error: "Admin authentication required" }, 401);
    }

    const evaluationId = c.req.param('id');
    const evaluation = await kv.get(evaluationId);
    
    if (!evaluation) {
      return c.json({ error: "Evaluation not found" }, 404);
    }

    await kv.del(evaluationId);
    return c.json({ success: true, message: "Evaluation deleted successfully" });
  } catch (error) {
    console.log(`Delete evaluation error: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Get comprehensive statistics
app.get("/make-server-3a80e39f/admin/stats", async (c) => {
  try {
    const admin = await authenticateAdmin(c.req.header('Authorization'));
    if (!admin) {
      return c.json({ error: "Admin authentication required" }, 401);
    }

    // Get all data
    const problems = await kv.getByPrefix('problem_');
    const generalPosts = await kv.getByPrefix('post_general_');
    const anonymousPosts = await kv.getByPrefix('post_anonymous_');
    const noticePosts = await kv.getByPrefix('post_notice_');
    const evaluations = await kv.getByPrefix('evaluation_');

    const allPosts = [...generalPosts, ...anonymousPosts, ...noticePosts];
    const totalReplies = allPosts.reduce((sum, post) => sum + (post.replies?.length || 0), 0);

    // Problem statistics
    const problemStats = {
      total: problems.length,
      completed: problems.filter(p => p.status === 'completed').length,
      processing: problems.filter(p => p.status === 'processing').length,
      failed: problems.filter(p => p.status === 'failed').length,
      successRate: problems.length > 0 ? Math.round((problems.filter(p => p.status === 'completed').length / problems.length) * 100) : 0,
    };

    // Community statistics
    const communityStats = {
      totalPosts: allPosts.length,
      generalPosts: generalPosts.length,
      anonymousPosts: anonymousPosts.length,
      totalReplies: totalReplies,
      averageRepliesPerPost: allPosts.length > 0 ? Math.round((totalReplies / allPosts.length) * 10) / 10 : 0,
      totalLikes: allPosts.reduce((sum, post) => sum + (post.likes || 0), 0),
      totalDislikes: allPosts.reduce((sum, post) => sum + (post.dislikes || 0), 0),
    };

    // Evaluation statistics
    let totalRating = 0;
    const ratingDistribution = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
    
    evaluations.forEach((evaluation) => {
      totalRating += evaluation.rating;
      ratingDistribution[evaluation.rating as keyof typeof ratingDistribution]++;
    });

    const evaluationStats = {
      total: evaluations.length,
      averageRating: evaluations.length > 0 ? Math.round((totalRating / evaluations.length) * 10) / 10 : 0,
      ratingDistribution,
      withFeedback: evaluations.filter(e => e.feedback && e.feedback.trim().length > 0).length,
    };

    // Time-based statistics (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentProblems = problems.filter(p => new Date(p.uploadTime) >= thirtyDaysAgo);
    const recentPosts = allPosts.filter(p => new Date(p.createdAt) >= thirtyDaysAgo);
    const recentEvaluations = evaluations.filter(e => new Date(e.createdAt) >= thirtyDaysAgo);

    const recentStats = {
      problemsLast30Days: recentProblems.length,
      postsLast30Days: recentPosts.length,
      evaluationsLast30Days: recentEvaluations.length,
    };

    return c.json({
      problems: problemStats,
      community: communityStats,
      evaluations: evaluationStats,
      recent: recentStats,
      overview: {
        totalUsers: new Set([...allPosts.filter(p => p.userId).map(p => p.userId)]).size,
        totalActivity: problems.length + allPosts.length + totalReplies + evaluations.length,
      }
    });
  } catch (error) {
    console.log(`Get admin stats error: ${error}`);
    return c.json({ error: "Internal server error" }, 500);
  }
});

Deno.serve(app.fetch);