import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About — Alaap",
  description:
    "What Alaap is, why it exists, and the curiosity that drives it.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-heading text-3xl font-bold tracking-tight text-maroon">
        About Alaap
      </h1>

      <div className="mt-6 space-y-4 text-sm leading-relaxed text-stone-600">
        <p>
          I&apos;m not a trained musician or a musicologist. I&apos;m a music
          lover — a serious hobbyist who keeps getting pulled deeper into
          golden era Indian film music and the classical traditions it draws
          from.
        </p>
        <p>
          It usually starts with a song I can&apos;t stop replaying. At some
          point I start wondering <em>why</em> — what is it about this
          particular recording that makes me come back to it? That curiosity
          sends me down paths I didn&apos;t plan: learning what a murki is
          because Lata does something extraordinary in the first fifteen
          seconds of a song, or discovering that a raga was composed in grief
          at a funeral because a film composer adapted it centuries later.
        </p>
        <p>
          Alaap is what happens when you collect enough of those rabbit holes
          in one place. It&apos;s a knowledge base that maps the connections
          between songs, ragas, composers, singers, and films from roughly the
          late 1940s through the 1970s — the period often called the golden
          era of Hindi film music.
        </p>
        <p>
          The name comes from the <em>alaap</em>, the opening movement of a
          raga performance — slow, exploratory, unhurried. No rhythm, no
          composition yet. Just a musician discovering the shape of the raga,
          note by note. That felt right for what this project is: an
          exploration, not an encyclopedia.
        </p>
        <p>
          What I hope makes Alaap different from a database is the personal
          layer on top. The{" "}
          <Link
            href="/favorites"
            className="text-maroon underline underline-offset-2 hover:text-maroon/80"
          >
            favorites
          </Link>{" "}
          aren&apos;t expert picks — they&apos;re songs that changed how I
          listen, with notes on what to pay attention to and the stories
          behind them. The goal is &ldquo;here&apos;s what I found&rdquo;
          rather than &ldquo;here&apos;s what you should know.&rdquo;
        </p>
      </div>

      {/* Ornamental divider */}
      <div className="mt-8 flex items-center justify-center gap-3">
        <span className="h-px w-16 bg-maroon/25" />
        <span className="text-sm text-maroon/40">&#10043;</span>
        <span className="h-px w-16 bg-maroon/25" />
      </div>

      <div className="mt-8 space-y-4 text-sm leading-relaxed text-stone-600">
        <p>
          Alaap is built and maintained by Praneet Mhatre. The data comes from
          multiple curated sources — song databases, classical music
          references, and chart archives — stitched together in a knowledge
          graph that makes the relationships between entities queryable and
          explorable.
        </p>
        <p>
          If you have questions, corrections, or just want to talk about this
          music, I&apos;d love to hear from you.
        </p>
      </div>
    </div>
  );
}
