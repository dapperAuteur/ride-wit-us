import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader, HEADER_THEMES } from "@/components/site-header";
import { SiteFooter, FOOTER_THEMES } from "@/components/site-footer";
import { EPISODES, episodeBySlug } from "@/lib/curriculum/episodes";
import { APRON_COLORS, APRON_LABELS } from "@/lib/curriculum/season-colors";

const BASE = "/design/monon-chalk";

const STICKER_COLORS = ["#F4B44A", "#D33E2D", "#5C8AA5", "#3E7C3A"];

export function generateStaticParams() {
  return EPISODES.map((e) => ({ slug: e.slug }));
}

interface PageProps { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const e = episodeBySlug(slug);
  if (!e) return {};
  return { title: `${e.title} · Monon Chalk` };
}

export default async function MononChalkEpisode({ params }: PageProps) {
  const { slug } = await params;
  const e = episodeBySlug(slug);
  if (!e) notFound();
  const accent = APRON_COLORS[e.apronLevel];
  return (
    <>
      <SiteHeader theme={HEADER_THEMES.chalk} basePath={BASE} />
      <article className="flex-1">
        <div className="max-w-3xl mx-auto px-6 py-16">
          <Link href={`${BASE}/episodes`} className="sticker px-3 py-1 text-xs uppercase tracking-wider rotate-[-1deg] inline-block mb-6">← Catalog</Link>
          <p className="font-mono text-[11px] uppercase tracking-wider text-[#221E1B]/60">S{e.season}·E{String(e.ep).padStart(2, "0")}</p>
          <h1 className="font-display text-6xl text-[#221E1B] leading-[0.95] mt-2">{e.title}</h1>
          {e.subtitle && <p className="font-display text-2xl mt-4" style={{ color: accent }}>{e.subtitle}</p>}

          <div className="mt-6 flex flex-wrap gap-2">
            <span className="sticker px-3 py-1 text-xs uppercase tracking-wider" style={{ background: accent, color: "#f4ecd8" }}>{APRON_LABELS[e.apronLevel]}</span>
            <span className="sticker px-3 py-1 text-xs uppercase tracking-wider" style={{ background: "#fff8e8" }}>{e.status}</span>
          </div>

          <div className="border-2 border-[#221E1B] bg-[#fff8e8] mt-12 p-5 flex items-center gap-4" style={{ boxShadow: "6px 6px 0 #D33E2D" }}>
            <div className="size-14 grid place-items-center bg-[#221E1B] text-[#f4ecd8] text-2xl font-bold border-2 border-[#221E1B]">▶</div>
            <div>
              <p className="font-display text-xl font-bold text-[#221E1B]">Listen on the porch</p>
              <p className="font-mono text-[10px] text-[#221E1B]/70">audio embed pending · published when status flips</p>
            </div>
          </div>

          <p className="mt-12 text-lg text-[#221E1B] leading-relaxed">{e.body}</p>

          <h2 className="font-display text-3xl text-[#221E1B] mt-16 mb-4">Take it further</h2>
          <ul className="grid sm:grid-cols-2 gap-4">
            <CTA color={STICKER_COLORS[0]} title="Take the class" body="CentOS Academy lesson with quizzes." href={e.academyLessonId ? `https://centenarianos.com/academy/lessons/${e.academyLessonId}` : "https://centenarianos.com/academy"} placeholder={!e.academyLessonId} />
            <CTA color={STICKER_COLORS[2]} title="Drill the vocab" body="One spaced-rep deck on FlashLearnAI." href={e.flashlearnSetId ? `https://flashlearnai.witus.online/sets/${e.flashlearnSetId}` : "https://flashlearnai.witus.online"} placeholder={!e.flashlearnSetId} />
            <CTA color={STICKER_COLORS[3]} title="Ride the route" body="360° ride on Wanderlearn." href={e.wanderlearnTourId ? `https://wanderlearn.witus.online/tours/${e.wanderlearnTourId}` : "https://wanderlearn.witus.online"} placeholder={!e.wanderlearnTourId} />
            <CTA color={STICKER_COLORS[1]} title="Listen elsewhere" body="Apple · Spotify · Overcast (pending)." href="#" placeholder />
          </ul>

          <h2 className="font-display text-3xl text-[#221E1B] mt-16 mb-2">Cut points</h2>
          <p className="font-mono text-xs text-[#221E1B]/70">[CUT POINT] markers ship with the published audio. Pending.</p>

          <h2 className="font-display text-3xl text-[#221E1B] mt-12 mb-2">Transcript</h2>
          <p className="font-mono text-xs text-[#221E1B]/70">Full transcript ships with the published audio. Pending.</p>
        </div>
      </article>
      <SiteFooter theme={FOOTER_THEMES.chalk} basePath={BASE} />
    </>
  );
}

function CTA({ color, title, body, href, placeholder }: { color: string; title: string; body: string; href: string; placeholder?: boolean }) {
  return (
    <li>
      <a
        href={href}
        target={href.startsWith("http") ? "_blank" : undefined}
        rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
        className="block border-2 border-[#221E1B] bg-[#fff8e8] p-4 hover:translate-y-[-3px] transition-transform focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#221E1B]"
        style={{ boxShadow: `4px 4px 0 ${color}` }}
      >
        <p className="font-display text-xl font-bold text-[#221E1B] flex items-center gap-2">
          {title}
          {placeholder && <span className="text-[10px] font-mono uppercase tracking-wide text-[#221E1B]/60 border border-[#221E1B]/60 px-1.5 py-0.5">pending</span>}
        </p>
        <p className="text-sm text-[#221E1B]/80 mt-2">{body}</p>
      </a>
    </li>
  );
}
