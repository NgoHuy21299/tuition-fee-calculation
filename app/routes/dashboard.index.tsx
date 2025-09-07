import { redirect } from "react-router";

export async function loader() {
  throw redirect("/dashboard/overview");
}

export default function DashboardIndexRedirect() {
  return null;
}

