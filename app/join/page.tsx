import type { Metadata } from "next";
import { JoinView } from "@/components/JoinView";
import { M } from "@/lib/messages";

export const metadata: Metadata = {
  title: M.join.title,
};

export default function JoinPage() {
  return <JoinView />;
}
