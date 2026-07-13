"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcrypt");
const { env } = require("../src/config/env");
const { prisma } = require("../src/config/prisma");
const logger = require("../src/utils/logger");

const publicBackendUrl = env.PUBLIC_BACKEND_URL.replace(/\/+$/, "");
const img = (name) => `${publicBackendUrl}/seed-assets/images/${name}`;
const minutesAgo = (m) => new Date(Date.now() - m * 60 * 1000);
const uuid = () => crypto.randomUUID();
const SEED_IMAGES_DIR = path.join(__dirname, "..", "seed-assets", "images");

// Keep avatars separate from user metadata so assignment is deterministic by
// user index and can be validated before the destructive reset begins. These
// are consistently sized portraits rather than post/content thumbnails.
const AVATAR_IMAGES = [
  "f1.png",
  "f2.png",
  "f3.png",
  "f4.png",
  "f5.png",
  "f6.png",
  "f7.png",
  "f8.png",
];

const USERS = [
  { key: "dylan", firstName: "Dylan", lastName: "Field", email: "dylan@demo.test" },
  { key: "karim", firstName: "Karim", lastName: "Saif", email: "karim@demo.test" },
  { key: "radovan", firstName: "Radovan", lastName: "Novak", email: "radovan@demo.test" },
  { key: "ayesha", firstName: "Ayesha", lastName: "Khan", email: "ayesha@demo.test" },
  { key: "marcus", firstName: "Marcus", lastName: "Lee", email: "marcus@demo.test" },
  { key: "priya", firstName: "Priya", lastName: "Sharma", email: "priya@demo.test" },
  { key: "taro", firstName: "Taro", lastName: "Yamamoto", email: "taro@demo.test" },
  { key: "elena", firstName: "Elena", lastName: "Petrova", email: "elena@demo.test" },
];

const POST_IMAGES = [
  "img1.png", "img2.png", "img3.png", "img4.png", "img5.png",
  "img6.png", "img7.png", "img8.png", "img9.png", "img10.png",
  "img11.png", "img12.png", "photos1.png", "photos2.png", "photos3.png",
  "photos5.png", "photos6.png", "photos7.png", "photos8.png",
  "photos9.png", "slider1.png", "slider2.png", "slider3.png", "slider4.png",
  "timeline_img.png", "feed_event1.png", "chat_img.png", "chat1_img.png", "chat2_img.png",
  "chat3_img.png", "chat4_img.png", "chat5_img.png", "chat6_img.png", "chat7_img.png",
  "post_img.png", "txt_img.png", "profile.png", "man.png", "people1.png",
];

function pick(ary) {
  return ary[Math.floor(Math.random() * ary.length)];
}

const TOPICS = [
  "Just shipped a new feature — feeling great about how it came together!",
  "Coffee, code, and a quiet morning. The best combo.",
  "Reading 'The Pragmatic Programmer' again. Highlights different things every time.",
  "Anyone else obsessed with that new framework everyone's talking about?",
  "Weekend project: built a small CLI tool in Rust. Learning curve is real but rewarding.",
  "Design is not just how it looks, it's how it works. Every pixel matters.",
  "Hot take: TypeScript makes JavaScript actually enjoyable to write at scale.",
  "Spent the afternoon refactoring a 3-year-old codebase. Felt like archaeology.",
  "Mentorship is a two-way street. I learn as much from my mentees as they do from me.",
  "The best error message is the one the user never sees.",
  "Finally understanding monads. Only took me 5 years 😅",
  "Deployed to production on a Friday. Feeling brave (or foolish).",
  "Accessibility isn't a feature — it's a fundamental requirement.",
  "Pair programming all day. Exhausting but the code quality is unreal.",
  "Migrated our CI/CD pipeline today. Zero downtime. Celebrating with good coffee.",
  "Just gave my first tech talk. Hands were shaking but I got through it!",
  "The beauty of open source: standing on the shoulders of giants.",
  "Why do all my best ideas come in the shower?",
  "Code reviews are not about catching bugs — they're about sharing knowledge.",
  "TIL about CSS Container Queries. Game changer for responsive design.",
  "Nothing beats the feeling of deleting 500 lines of legacy code.",
  "Interviewing is a skill everyone should practice, even when not job hunting.",
  "Documentation is love letters to your future self.",
  "Sometimes the most productive thing you can do is take a walk.",
  "Docker Compose for local dev is such a game-changer. Reproducible environments FTW.",
  "Shaved 40% off our API response times by adding the right index. Check your query plans!",
  "The joy of a green build pipeline after a week of red. Pure dopamine.",
  "Learning GraphQL after years of REST. The flexibility is incredible.",
  "Why I love working in a small team: everyone owns their impact.",
  "Just discovered the Web Animations API. So much power without a library.",
  "Spent the weekend contributing to an open-source project. Felt great to give back.",
  "Database migrations done right: test them backward and forward.",
  "UI/UX tip: every extra click is a lost user. Reduce friction.",
  "A monorepo isn't right for every team, but when it works, it really works.",
  "Serverless is not 'no ops' — it's 'different ops'.",
  "The best APIs are the ones you don't have to think about using.",
  "Progressive enhancement > graceful degradation. Build for everyone.",
  "Feature flags have saved my team from so many bad deployments.",
  "Just hit 1000 days on GitHub! Consistency over intensity.",
  "Nothing makes you appreciate good documentation like maintaining legacy code.",
  "Finally convinced the team to adopt automated testing. Baby steps.",
  "The command line is still the most powerful tool in a developer's arsenal.",
  "Tech debt is like credit card debt — manageable in small amounts, devastating if ignored.",
  "A well-written README is a gift to your future self and your users.",
  "Dark mode isn't just aesthetic — it's an accessibility feature.",
  "The best code is the code you don't write. Delete more than you add.",
  "Performance debugging: always measure before you optimize.",
  "Startup life: building the plane while flying it, but I wouldn't have it any other way.",
  "Content negotiation in HTTP is underrated. Serve what the client needs.",
  "Clean architecture isn't about frameworks — it's about boundaries.",
  "Today I learned: sometimes the simplest solution is the best one.",
  "The developer experience matters as much as the user experience.",
  "Automate everything you've done twice. You'll thank yourself later.",
  "Pairing with a junior dev reminded me how much I love teaching.",
  "Happy to announce our latest product update! Lots of hard work went into this.",
];

// 55 posts spread across users with varied images and engagement
const POSTS = [];
const userKeys = USERS.map((u) => u.key);
let postImageIndex = 0;

for (let i = 0; i < 55; i++) {
  // Cycling authors guarantees that the newest feed page demonstrates the
  // distinct seeded avatars instead of relying on random author selection.
  const author = userKeys[i % userKeys.length];
  const age = 3 + i * 8; // spread across 3 min to ~440 min (~7 hours)
  const visibility = i % 7 === 3 ? "PRIVATE" : "PUBLIC"; // ~1 in 7 private
  const hasImage = i % 3 !== 1; // 2/3 have images
  const image = hasImage
    ? POST_IMAGES[postImageIndex++ % POST_IMAGES.length]
    : null;
  const post = {
    author,
    age,
    visibility,
    text: TOPICS[i % TOPICS.length],
    image,
    likes: [],
    comments: [],
  };
  // Each post gets 1-4 random likes
  const likers = userKeys.filter((k) => k !== author);
  const likeCount = 1 + Math.floor(Math.random() * 4);
  for (let l = 0; l < likeCount && l < likers.length; l++) {
    post.likes.push(likers[l]);
  }
  // ~60% of posts have comments
  if (Math.random() < 0.6) {
    const commentCount = 1 + Math.floor(Math.random() * 3);
    const commenters = userKeys.filter((k) => k !== author);
    for (let c = 0; c < commentCount && c < commenters.length; c++) {
      const commentAuthor = commenters[c];
      const replyAuthors = userKeys.filter((k) => k !== commentAuthor && k !== author);
      const hasReplies = Math.random() < 0.4;
      const replyCount = hasReplies ? 1 + Math.floor(Math.random() * 2) : 0;
      const replies = [];
      for (let r = 0; r < replyCount && r < replyAuthors.length; r++) {
        const replyLikes = userKeys.filter((k) => k !== replyAuthors[r] && k !== commentAuthor);
        const rLikeCount = Math.random() < 0.5 ? 1 + Math.floor(Math.random() * 2) : 0;
        replies.push({
          by: replyAuthors[r],
          text: [
            "Great point! Totally agree with this.",
            "Thanks for sharing your perspective!",
            "I had a similar experience. It's really eye-opening.",
            "Well said! This resonates with me.",
            "Interesting take — I hadn't thought of it that way.",
            "Couldn't agree more! 🙌",
            "This is exactly what I needed to hear today.",
            "Thanks! Learned something new.",
          ][Math.floor(Math.random() * 8)],
          likes: replyLikes.slice(0, rLikeCount),
        });
      }
      const cLikes = userKeys.filter((k) => k !== commentAuthor);
      const cLikeCount = Math.random() < 0.5 ? 1 + Math.floor(Math.random() * 2) : 0;
      post.comments.push({
        by: commentAuthor,
        text: [
          "This is such a great insight! Thanks for sharing.",
          "Love this perspective. Really makes you think.",
          "100% agree. I've been saying this for years.",
          "This was really helpful, thank you!",
          "I've been following your work and this is another great contribution.",
          "Can you share more about your approach? I'm curious.",
          "Brilliant! I'm going to try this out.",
          "Such a valuable reminder. We all need this sometimes.",
          "This changed how I think about this topic.",
          "Bookmarking this for later. So much wisdom here.",
        ][Math.floor(Math.random() * 10)],
        likes: cLikes.slice(0, cLikeCount),
        replies,
      });
    }
  }
  POSTS.push(post);
}

function assetHash(name) {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(path.join(SEED_IMAGES_DIR, name)))
    .digest("hex");
}

function validateSeedPlan() {
  if (AVATAR_IMAGES.length < USERS.length) {
    throw new Error(
      `Need at least ${USERS.length} avatar images; found ${AVATAR_IMAGES.length}`
    );
  }

  const assignedAvatars = AVATAR_IMAGES.slice(0, USERS.length);
  if (new Set(assignedAvatars).size !== USERS.length) {
    throw new Error("Each seeded user must be assigned a unique avatar filename");
  }

  const referencedImages = [...new Set([...assignedAvatars, ...POST_IMAGES])];
  const missingImages = referencedImages.filter(
    (name) => !fs.existsSync(path.join(SEED_IMAGES_DIR, name))
  );
  if (missingImages.length) {
    throw new Error(`Missing seed image assets: ${missingImages.join(", ")}`);
  }

  // Different filenames can still contain identical image bytes (for example,
  // Avatar.png and man.png in the supplied assets), so validate file contents.
  const avatarHashes = assignedAvatars.map(assetHash);
  if (new Set(avatarHashes).size !== USERS.length) {
    throw new Error("Each seeded user must be assigned a distinct avatar image");
  }

  const assignedPostImages = POSTS.map((post) => post.image).filter(Boolean);
  const expectedPostImageVariety = Math.min(
    assignedPostImages.length,
    POST_IMAGES.length
  );
  if (new Set(assignedPostImages).size !== expectedPostImageVariety) {
    throw new Error("Seeded post images are not cycling through the full image set");
  }
  if (new Set(assignedPostImages.map(assetHash)).size !== expectedPostImageVariety) {
    throw new Error("Seeded posts must use distinct image assets, not duplicate files");
  }

  logger.log(
    `[seed] validated ${USERS.length} distinct avatars and ` +
    `${expectedPostImageVariety} distinct post images`
  );
}

function isLoopbackHostname(hostname) {
  return ["localhost", "127.0.0.1", "::1"].includes(hostname);
}

function validateSeedTarget({ warnOnly = false } = {}) {
  let databaseUrl;
  let assetBaseUrl;

  try {
    databaseUrl = new URL(env.DATABASE_URL);
    assetBaseUrl = new URL(publicBackendUrl);
  } catch {
    throw new Error("DATABASE_URL and PUBLIC_BACKEND_URL must both be valid URLs");
  }

  const writesToRemoteDatabase = !isLoopbackHostname(databaseUrl.hostname);
  const writesLoopbackAssetUrls = isLoopbackHostname(assetBaseUrl.hostname);

  // Allow local development with a remote database (e.g. Neon).
  if (!env.isProd) {
    return;
  }

  if (!writesToRemoteDatabase || !writesLoopbackAssetUrls) {
    return;
  }

  const message =
    "Remote database is paired with a loopback PUBLIC_BACKEND_URL; seeded " +
    "images would fail outside this machine and every avatar would fall back " +
    "to the same default. Set PUBLIC_BACKEND_URL to the deployed API origin.";

  // Validation-only mode remains useful for checking the seed data locally,
  // but an actual destructive seed refuses this unsafe target combination.
  if (warnOnly) {
    logger.warn(`[seed] warning: ${message}`);
    return;
  }
  throw new Error(message);
}

async function reset() {
  await prisma.like.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.post.deleteMany();
  await prisma.user.deleteMany();
}

async function main() {
  // This runs before reset() so a bad/missing image plan can never wipe data.
  validateSeedPlan();

  const validateOnly = process.argv.includes("--validate-only");
  const validateTargetOnly = process.argv.includes("--validate-target-only");

  if (validateOnly) {
    validateSeedTarget({ warnOnly: true });
    logger.log("[seed] validation-only mode; database was not modified");
    return;
  }

  validateSeedTarget();
  if (validateTargetOnly) {
    logger.log("[seed] target validation passed; database was not modified");
    return;
  }

  logger.log("[seed] resetting demo data\u2026");
  await reset();

  const passwordHash = await bcrypt.hash("Password123!", env.BCRYPT_COST);

  // --- Users ---
  const userByKey = {};
  for (const [userIndex, u] of USERS.entries()) {
    const created = await prisma.user.create({
      data: {
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        passwordHash,
        avatarUrl: img(AVATAR_IMAGES[userIndex]),
      },
    });
    userByKey[u.key] = created;
  }
  logger.log(`[seed] created ${USERS.length} users`);

  const likeRows = [];
  let postCount = 0;
  let commentCount = 0;

  // --- Posts + comments + replies + likes ---
  for (const p of POSTS) {
    const author = userByKey[p.author];
    const postId = uuid();
    const createdAt = minutesAgo(p.age);

    const totalComments = p.comments.reduce(
      (acc, c) => acc + 1 + (c.replies ? c.replies.length : 0),
      0
    );

    await prisma.post.create({
      data: {
        id: postId,
        authorId: author.id,
        text: p.text,
        imageUrl: p.image ? img(p.image) : null,
        visibility: p.visibility,
        likesCount: p.likes.length,
        commentsCount: totalComments,
        createdAt,
        updatedAt: createdAt,
      },
    });
    postCount += 1;

    // post likes
    p.likes.forEach((likerKey, i) => {
      likeRows.push({
        userId: userByKey[likerKey].id,
        targetType: "POST",
        targetId: postId,
        createdAt: new Date(createdAt.getTime() + (i + 1) * 1000),
      });
    });

    // comments + replies
    let cOffset = 0;
    for (const c of p.comments) {
      cOffset += 1;
      const commentId = uuid();
      const cCreatedAt = new Date(createdAt.getTime() + cOffset * 30 * 1000);
      await prisma.comment.create({
        data: {
          id: commentId,
          postId,
          authorId: userByKey[c.by].id,
          parentId: null,
          text: c.text,
          likesCount: c.likes ? c.likes.length : 0,
          createdAt: cCreatedAt,
          updatedAt: cCreatedAt,
        },
      });
      commentCount += 1;
      (c.likes || []).forEach((likerKey, i) => {
        likeRows.push({
          userId: userByKey[likerKey].id,
          targetType: "COMMENT",
          targetId: commentId,
          createdAt: new Date(cCreatedAt.getTime() + (i + 1) * 1000),
        });
      });

      let rOffset = 0;
      for (const r of c.replies || []) {
        rOffset += 1;
        const replyId = uuid();
        const rCreatedAt = new Date(cCreatedAt.getTime() + rOffset * 15 * 1000);
        await prisma.comment.create({
          data: {
            id: replyId,
            postId,
            authorId: userByKey[r.by].id,
            parentId: commentId,
            text: r.text,
            likesCount: r.likes ? r.likes.length : 0,
            createdAt: rCreatedAt,
            updatedAt: rCreatedAt,
          },
        });
        commentCount += 1;
        (r.likes || []).forEach((likerKey, i) => {
          likeRows.push({
            userId: userByKey[likerKey].id,
            targetType: "COMMENT",
            targetId: replyId,
            createdAt: new Date(rCreatedAt.getTime() + (i + 1) * 1000),
          });
        });
      }
    }
  }

  if (likeRows.length) {
    await prisma.like.createMany({ data: likeRows, skipDuplicates: true });
  }

  logger.log(
    `[seed] created ${postCount} posts, ${commentCount} comments/replies, ${likeRows.length} likes`
  );
  logger.log("[seed] demo login \u2192 any of:");
  USERS.forEach((u) => logger.log(`         ${u.email}  /  Password123!`));
  logger.log("[seed] done \u2714");
}

main()
  .catch((err) => {
    logger.error("[seed] failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
