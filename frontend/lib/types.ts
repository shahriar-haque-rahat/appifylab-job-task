// Shared API types, mirroring the backend response shapes.

export type Visibility = "PUBLIC" | "PRIVATE";

export interface UserSummary {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
}

export interface CurrentUser extends UserSummary {
  email: string;
  createdAt: string;
}

export interface Post {
  id: string;
  text: string;
  imageUrl: string | null;
  visibility: Visibility;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  author: UserSummary;
  likedByMe: boolean;
  isOwner: boolean;
}

export interface Comment {
  id: string;
  postId: string;
  parentId: string | null;
  text: string;
  likesCount: number;
  repliesCount: number;
  createdAt: string;
  author: UserSummary;
  likedByMe: boolean;
  isOwner: boolean;
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export type LikeTarget = "post" | "comment";

export interface LikeResult {
  targetType: LikeTarget;
  targetId: string;
  liked: boolean;
  likesCount: number;
}

export interface ApiErrorShape {
  error: { message: string; code?: string; details?: unknown };
}
