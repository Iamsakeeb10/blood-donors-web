import type { Metadata } from "next";
import { AdminView } from "@/components/AdminView";
import { M } from "@/lib/messages";

export const metadata: Metadata = {
  title: M.admin.title,
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminPage() {
  return <AdminView />;
}
