import type { CurrentUser, UserSummary } from "@/lib/types";

export function currentUser(getState: () => unknown): CurrentUser | null {
  return (
    (getState() as { auth?: { user?: CurrentUser | null } }).auth?.user ?? null
  );
}

export function toSummary(u: CurrentUser): UserSummary {
  return {
    id: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    avatarUrl: u.avatarUrl,
  };
}

export function makeTempId(prefix = "temp"): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `${prefix}_${rand}`;
}

export function isTempId(id: string): boolean {
  return id.startsWith("temp_");
}
