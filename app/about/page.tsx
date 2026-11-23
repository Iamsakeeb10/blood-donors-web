import type { Metadata } from "next";
import Link from "next/link";
import { buttonStyles } from "@/components/ui/Button";
import { ContactTrigger } from "@/components/ContactTrigger";
import { M } from "@/lib/messages";

export const metadata: Metadata = {
  title: M.about.title,
};

const sections = [
  { title: M.about.dataTitle, body: M.about.dataBody },
  { title: M.about.publicTitle, body: M.about.publicBody },
  { title: M.about.deleteTitle, body: M.about.deleteBody },
  { title: M.about.medicalTitle, body: M.about.medicalBody },
];

export default function AboutPage() {
  return (
    <article className="pb-4">
      <h1 className="text-[28px] font-bold leading-snug text-ink">{M.about.title}</h1>
      <p className="mt-2 text-base leading-relaxed text-ink-2">{M.about.intro}</p>

      <div className="mt-5 space-y-3">
        {sections.map((section) => (
          <section
            key={section.title}
            className="rounded-card border border-line bg-surface p-4"
          >
            <h2 className="text-base font-semibold leading-snug text-ink">
              {section.title}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-ink-2">{section.body}</p>
          </section>
        ))}

        <section className="rounded-card border border-line bg-surface p-4">
          <h2 className="text-base font-semibold leading-snug text-ink">
            {M.about.contactTitle}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-ink-2">
            {M.about.contactBody}
          </p>
          <ContactTrigger className="mt-2 inline-flex min-h-12 items-center font-semibold text-blood-700 underline underline-offset-2" />
        </section>
      </div>

      <Link href="/" className={buttonStyles("secondary", "mt-6")}>
        {M.about.backHome}
      </Link>
    </article>
  );
}
