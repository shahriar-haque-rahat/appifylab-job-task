import { redirect } from "next/navigation";

// Root path forwards into the app. Real auth-aware routing (redirect to /login
// when unauthenticated, /feed when authenticated) is handled by middleware.ts.
export default function Home() {
  redirect("/feed");
}
