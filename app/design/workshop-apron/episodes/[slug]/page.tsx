import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader, HEADER_THEMES } from "@/components/site-header";
import { SiteFooter, FOOTER_THEMES } from "@/components/site-footer";
import { EPISODES, episodeBySlug } from "@/lib/curriculum/episodes";
import { APRON_COLORS, APRON_LABELS } from "@/lib/curriculum/season-colors";

const BASE = "/design/workshop-apron";

export function generateStaticParams() {
  return EPISODES.map((e) => ({ slug: e.slug }));
}

interface PageProps { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const e = episodeBySlug(slug);
  if (!e) return {};
  return { title: `${e.title} · Workshop Apron` };
}

export default async function WorkshopApronEpisode({ params }: PageProps) {
  const { slug } = await params;
  const e = episodeBySlug(slug);
  if (!e) notFound();
  const accent = APRON_COLORS[e.apronLevel];
  return (
    <>
      <SiteHeader theme={HEADER_THEMES.workshop} basePath={BASE} />
      <article className="flex-1">
        <div className="max-w-3xl mx-auto px-6 py-16">
          <p className="font-mono text-[11px] uppercase tracking-[0.25em]" style={{ color: accent }}>
            <Link href={`${BASE}/episodes`} className="hover:underline">CATALOG</Link>
            <span className="mx-2">/</span>
            S{e.season}·E{String(e.ep).padStart(2, "0")}
          </p>
          <h1 className="font-display text-5xl text-[#1a1a1a] mt-2 leading-tight">{e.title}</h1>
          {e.subtitle && <p className="font-display text-xl mt-3 italic" style={{ color: accent }}>{e.subtitle}</p>}
          <span
            className="inline-flex mt-6 items-center px-3 py-1 text-xs font-mono uppercase tracking-wider border-2"
            style={{ color: accent, borderColor: accent }}
          >
            {APRON_LABELS[e.apronLevel]}
          </span>

          <div className="paper mt-10 p-5 flex items-center gap-4">
            <div className="size-12 grid place-items-center bg-[#1a1a1a] text-[#f5ead0] font-bold border-2 border-[#1a1a1a]">▶</div>
            <div>
              <p className="font-display font-bold text-[#1a1a1a]">Listen on the bench</p>
              <p className="font-mono text-[10px] text-[#5b4d2c]">audio embed pending · status: {e.status}</p>
            </div>
          </div>

          <p className="mt-10 text-lg text-[#1a1a1a] leading-relaxed font-display">{e.body}</p>

          <h2 className="font-display text-2xl text-[#1a1a1a] mt-12 mb-3">Take it further</h2>
          <ul className="grid sm:grid-cols-2 gap-3">
            <CTA title="Take the class" body="CentOS Academy lesson with quizzes." href={e.academyLessonId ? `https://centenarianos.com/academy/lessons/${e.academyLessonId}` : "https://centenarianos.com/academy"} placeholder={!e.academyLessonId} />
            <CTA title="Drill the vocab" body="One spaced-rep set on FlashLearnAI." href={e.flashlearnSetId ? `https://flashlearnai.witus.online/sets/${e.flashlearnSetId}` : "https://flashlearnai.witus.online"} placeholder={!e.flashlearnSetId} />
            <CTA title="Ride the route" body="360° tour on Wanderlearn." href={e.wanderlearnTourId ? `https://wanderlearn.witus.online/tours/${e.wanderlearnTourId}` : "https://wanderlearn.witus.online"} placeholder={!e.wanderlearnTourId} />
            <CTA title="Listen elsewhere" body="Apple · Spotify · Overcast (pending)." href="#" placeholder />
          </ul>

          <h2 className="font-display text-2xl text-[#1a1a1a] mt-12 mb-2">Cut points</h2>
          <p className="font-mono text-xs text-[#5b4d2c]">[CUT POINT] markers ship with the published audio. Pending.</p>

          <h2 className="font-display text-2xl text-[#1a1a1a] mt-12 mb-2">Transcript</h2>
          <p className="font-mono text-xs text-[#5b4d2c]">Full transcript ships with the published audio. Pending.</p>
        </div>
      </article>
      <SiteFooter theme={FOOTER_THEMES.workshop} basePath={BASE} />
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
        className="paper block p-4 hover:translate-y-[-2px] transition-transform focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1a1a1a]"
      >
        <p className="font-display font-bold text-[#1a1a1a] flex items-center gap-2">
          {title}
          {placeholder && <span className="text-[10px] font-mono uppercase tracking-wide text-[#5b4d2c] border border-[#5b4d2c] px-1.5 py-0.5">pending</span>}
        </p>
        <p className="text-sm text-[#5b4d2c] mt-1">{body}</p>
      </a>
    </li>
  );
}
