import { redirect } from "next/navigation";

// The operator's starting point is the Match Center, not a generic dashboard.
export default function Home() {
  redirect("/matches");
}
