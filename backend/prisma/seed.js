"use strict";

/**
 * Seed script — populates a demo dataset so the feed is alive on first run:
 * several users, a mix of PUBLIC/PRIVATE posts (with images), top-level comments,
 * one-level replies, and likes on posts/comments. Denormalized counts
 * (likesCount/commentsCount) are set to match the inserted rows.
 *
 * Seed IMAGES are served locally by the API from /seed-assets/images/* (option
 * (b) in the plan) — no Cloudinary account is required to get a populated feed.
 * Live uploads made through the app still use Cloudinary. See README.
 *
 * Running `npm run seed` RESETS the demo tables first (idempotent, predictable).
 * Demo login (all users): password `Password123!`
 */

const crypto = require("crypto");
const bcrypt = require("bcrypt");
const { env } = require("../src/config/env");
const { prisma } = require("../src/config/prisma");

const img = (name) => `${env.PUBLIC_BACKEND_URL}/seed-assets/images/${name}`;
const minutesAgo = (m) => new Date(Date.now() - m * 60 * 1000);
const uuid = () => crypto.randomUUID();

const USERS = [
  { key: "dylan", firstName: "Dylan", lastName: "Field", email: "dylan@demo.test", avatar: "profile.png" },
  { key: "karim", firstName: "Karim", lastName: "Saif", email: "karim@demo.test", avatar: "post_img.png" },
  { key: "radovan", firstName: "Radovan", lastName: "Novak", email: "radovan@demo.test", avatar: "txt_img.png" },
  { key: "ayesha", firstName: "Ayesha", lastName: "Khan", email: "ayesha@demo.test", avatar: "people1.png" },
  { key: "marcus", firstName: "Marcus", lastName: "Lee", email: "marcus@demo.test", avatar: "man.png" },
];

// Curated feed content. `age` = minutes ago (larger = older).
const POSTS = [
  {
    author: "karim",
    age: 3,
    visibility: "PUBLIC",
    text: "Shipped the first build of our Healthy Tracking app today. Months of work finally in users' hands 🎉",
    image: "timeline_img.png",
    likes: ["dylan", "radovan", "ayesha", "marcus"],
    comments: [
      { by: "ayesha", text: "Huge congrats! Been following this since the prototype.", likes: ["karim", "dylan"], replies: [{ by: "karim", text: "Thanks Ayesha — couldn't have done it without the early feedback 🙏", likes: ["ayesha"] }] },
      { by: "marcus", text: "The onboarding flow looks so clean. What did you build it with?", likes: [], replies: [{ by: "karim", text: "Next.js on the front, Node + Postgres behind it.", likes: ["marcus"] }] },
    ],
  },
  {
    author: "dylan",
    age: 12,
    visibility: "PUBLIC",
    text: "Design tip of the day: whitespace is not wasted space. Give your components room to breathe.",
    image: null,
    likes: ["karim", "ayesha"],
    comments: [{ by: "radovan", text: "Preach. My whole team needs to read this 😅", likes: ["dylan"], replies: [] }],
  },
  {
    author: "ayesha",
    age: 26,
    visibility: "PUBLIC",
    text: "Weekend hike was exactly the reset I needed. Nature > notifications.",
    image: "photos1.png",
    likes: ["dylan", "karim", "radovan", "marcus"],
    comments: [],
  },
  {
    author: "karim",
    age: 40,
    visibility: "PRIVATE",
    text: "Private note to self: draft the v2 roadmap — offline mode, sharing, and the analytics dashboard. Not public yet.",
    image: null,
    likes: [],
    comments: [],
  },
  {
    author: "radovan",
    age: 55,
    visibility: "PUBLIC",
    text: "Reading 'Designing Data-Intensive Applications' again. Every re-read it clicks a little more.",
    image: "img1.png",
    likes: ["dylan", "karim"],
    comments: [{ by: "marcus", text: "That book is a rite of passage for backend engineers.", likes: ["radovan"], replies: [] }],
  },
  {
    author: "marcus",
    age: 78,
    visibility: "PUBLIC",
    text: "Coffee, code, repeat. What's everyone building this week?",
    image: null,
    likes: ["ayesha"],
    comments: [
      { by: "dylan", text: "Redesigning our settings screens. Fun rabbit hole.", likes: [], replies: [] },
      { by: "karim", text: "Squashing bugs before launch. The eternal grind 🐛", likes: ["marcus"], replies: [] },
    ],
  },
  {
    author: "dylan",
    age: 95,
    visibility: "PRIVATE",
    text: "Personal draft — a talk proposal on design systems. Keeping this one to myself until it's ready.",
    image: null,
    likes: [],
    comments: [],
  },
  {
    author: "ayesha",
    age: 130,
    visibility: "PUBLIC",
    text: "Mentoring two junior devs this quarter. Teaching is the fastest way to find the gaps in your own knowledge.",
    image: null,
    likes: ["radovan", "marcus", "dylan"],
    comments: [],
  },
  {
    author: "radovan",
    age: 180,
    visibility: "PUBLIC",
    text: "Migrated our feed queries to keyset pagination. Bye-bye slow OFFSET scans 👋",
    image: "feed_event1.png",
    likes: ["karim", "marcus"],
    comments: [{ by: "karim", text: "The performance difference at scale is night and day.", likes: [], replies: [] }],
  },
  {
    author: "karim",
    age: 240,
    visibility: "PUBLIC",
    text: "First post here! Excited to be part of Buddy Script 🚀",
    image: null,
    likes: ["dylan", "ayesha", "radovan"],
    comments: [],
  },
];

async function reset() {
  // FK-safe order (likes -> comments -> refresh tokens/posts -> users).
  await prisma.like.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.post.deleteMany();
  await prisma.user.deleteMany();
}

async function main() {
  console.log("[seed] resetting demo data…");
  await reset();

  const passwordHash = await bcrypt.hash("Password123!", env.BCRYPT_COST);

  // --- Users ---
  const userByKey = {};
  for (const u of USERS) {
    const created = await prisma.user.create({
      data: {
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        passwordHash,
        avatarUrl: img(u.avatar),
      },
    });
    userByKey[u.key] = created;
  }
  console.log(`[seed] created ${USERS.length} users`);

  const likeRows = [];
  let postCount = 0;
  let commentCount = 0;

  // --- Posts + comments + replies + likes ---
  for (const p of POSTS) {
    const author = userByKey[p.author];
    const postId = uuid();
    const createdAt = minutesAgo(p.age);

    // count all comments + replies for commentsCount
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

  console.log(
    `[seed] created ${postCount} posts, ${commentCount} comments/replies, ${likeRows.length} likes`
  );
  console.log("[seed] demo login → any of:");
  USERS.forEach((u) => console.log(`         ${u.email}  /  Password123!`));
  console.log("[seed] done ✔");
}

main()
  .catch((err) => {
    console.error("[seed] failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
