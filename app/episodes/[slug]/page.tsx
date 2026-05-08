import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { EPISODES, episodeBySlug } from "@/lib/curriculum/episodes";
import { APRON_COLORS, APRON_LABELS } from "@/lib/curriculum/season-colors";

export function generateStaticParams() {
  return EPISODES.map((e) => ({ slug: e.slug }));
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const e = episodeBySlug(slug);
  if (!e) return {};
  return {
    title: `S${e.season}·E${e.ep} — ${e.title}`,
    description: e.subtitle ?? e.body,
  };
}

export default async function EpisodePage({ params }: PageProps) {
  const { slug } = await params;
  const e = episodeBySlug(slug);
  if (!e) notFound();
  const accent = APRON_COLORS[e.apronLevel];

  return (
    <>
      <SiteHeader />
      <article className="flex-1">
        <header className="border-b border-slate-800" style={{ background: `linear-gradient(180deg, ${accent}26, transparent)` }}>
          <div className="max-w-3xl mx-auto px-6 py-16">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              <Link href={`/seasons/${e.season}`} className="hover:text-amber-300">Season {e.season}</Link>
              <span className="mx-2">·</span>
              Episode {e.ep}
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-white mt-2">{e.title}</h1>
            {e.subtitle && <p className="text-lg mt-3" style={{ color: accent }}>{e.subtitle}</p>}
            <span
              className="inline-flex mt-6 items-center px-3 py-1 rounded-full text-xs font-medium border"
              style={{ color: accent, borderColor: accent }}
            >
              {APRON_LABELS[e.apronLevel]}
            </span>
          </div>
        </header>

        <div className="max-w-3xl mx-auto px-6 py-12">
          {/* Audio embed placeholder */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-5 flex items-center gap-4">
            <div className="size-12 rounded-full grid place-items-center bg-amber-300 text-slate-950 font-bold">▶</div>
            <div>
              <p className="font-semibold text-white">Listen to this episode</p>
              <p className="text-xs text-slate-400">Audio embed pending. Episode is in <span className="font-mono">{e.status}</span> status.</p>
            </div>
          </div>

          {/* Body */}
          <p className="mt-10 text-lg text-slate-300 leading-relaxed">{e.body}</p>

          {/* Four CTAs */}
          <h2 className="mt-12 text-xl font-semibold text-white">Take it further</h2>
          <ul className="mt-4 grid sm:grid-cols-2 gap-3">
            <CTA title="Take the class" body="Structured lesson in CentOS Academy with quizzes and completion." href={e.academyLessonId ? `https://centenarianos.com/academy/lessons/${e.academyLessonId}` : "https://centenarianos.com/academy"} placeholder={!e.academyLessonId} />
            <CTA title="Drill the vocab" body="One spaced-repetition flashcard set on FlashLearnAI." href={e.flashlearnSetId ? `https://flashlearnai.witus.online/sets/${e.flashlearnSetId}` : "https://flashlearnai.witus.online"} placeholder={!e.flashlearnSetId} />
            <CTA title="Ride the route" body="360° virtual tour of the route featured in this episode." href={e.wanderlearnTourId ? `https://wanderlearn.witus.online/tours/${e.wanderlearnTourId}` : "https://wanderlearn.witus.online"} placeholder={!e.wanderlearnTourId} />
            <CTA title="Listen elsewhere" body="Apple, Spotify, Overcast (links pending podcast directory submission)." href="#" placeholder />
          </ul>

          {/* Cut points placeholder */}
          <h2 className="mt-12 text-xl font-semibold text-white">Cut points for instructors</h2>
          <p className="text-sm text-slate-400 mt-2">When the episode is scripted, this section lists the [CUT POINT] markers — start/end timestamps for per-subject extracts.</p>

          {/* Transcript placeholder */}
          <h2 className="mt-12 text-xl font-semibold text-white">Transcript</h2>
          <p className="text-sm text-slate-400 mt-2">Full transcript ships with the published audio. Pending.</p>
        </div>
      </article>
      <SiteFooter />
    </>
  );
}

function CTA({ title, body, href, placeholder }: { title: string; body: string; href: string; placeholder?: boolean }) {
  return (
    <li>
      <a
        href={href}
        target={href.startsWith("http") ? "_blank" : undefined}
        rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
        className="block rounded-md border border-slate-800 bg-slate-900/40 p-4 hover:border-amber-300 transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <p className="font-semibold text-white flex items-center gap-2">
          {title}
          {placeholder && <span className="text-[10px] uppercase tracking-wide text-slate-500 border border-slate-700 px-1.5 py-0.5 rounded">pending</span>}
        </p>
        <p className="text-sm text-slate-400 mt-1">{body}</p>
      </a>
    </li>
  );
}
