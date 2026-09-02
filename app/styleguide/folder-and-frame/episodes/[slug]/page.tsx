import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader, HEADER_THEMES } from "@/components/site-header";
import { SiteFooter, FOOTER_THEMES } from "@/components/site-footer";
import { EPISODES, episodeBySlug } from "@/lib/curriculum/episodes";
import { APRON_COLORS, APRON_LABELS } from "@/lib/curriculum/season-colors";

const BASE = "/styleguide/folder-and-frame";

export function generateStaticParams() {
  return EPISODES.map((e) => ({ slug: e.slug }));
}

interface PageProps { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const e = episodeBySlug(slug);
  if (!e) return {};
  return { title: `${e.title} · Folder & Frame` };
}

export default async function FolderAndFrameEpisode({ params }: PageProps) {
  const { slug } = await params;
  const e = episodeBySlug(slug);
  if (!e) notFound();
  const accent = APRON_COLORS[e.apronLevel];
  return (
    <>
      <SiteHeader theme={HEADER_THEMES.frame} basePath={BASE} />
      <article className="flex-1">
        <div className="max-w-3xl mx-auto px-6 py-20">
          <p className="text-[11px] uppercase tracking-[0.3em] text-[#5A6571]">
            <Link href={`${BASE}/episodes`} className="hover:text-[#E25A1C]">Catalog</Link>
            <span className="mx-2">/</span>
            <span>S{String(e.season).padStart(2, "0")} · E{String(e.ep).padStart(2, "0")}</span>
          </p>
          <h1 className="font-display text-5xl text-[#0f0f10] mt-3 leading-[1.05]">{e.title}</h1>
          {e.subtitle && <p className="text-xl mt-3 accent">{e.subtitle}</p>}

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-6 font-mono text-[11px]">
            <span className="text-[#5A6571] uppercase tracking-[0.2em]">Apron</span>
            <span style={{ color: accent }}>{APRON_LABELS[e.apronLevel]}</span>
            <span className="text-[#5A6571] uppercase tracking-[0.2em]">Status</span>
            <span className="text-[#0f0f10]">{e.status}</span>
          </div>

          <div className="keyline bg-white mt-12 p-5 flex items-center gap-4">
            <div className="size-12 grid place-items-center bg-[#0f0f10] text-[#f5f0e6] font-bold">▶</div>
            <div>
              <p className="font-display text-lg text-[#0f0f10]">Listen</p>
              <p className="font-mono text-[10px] text-[#5A6571]">audio embed pending</p>
            </div>
          </div>

          <p className="mt-12 text-lg text-[#0f0f10] leading-relaxed">{e.body}</p>

          <h2 className="font-display text-2xl text-[#0f0f10] mt-16 mb-4">Cross-references</h2>
          <ul className="grid sm:grid-cols-2 gap-px bg-[#0f0f10]">
            <CTA index="01" title="Take the class" body="CentOS Academy lesson." href={e.academyLessonId ? `https://centenarianos.com/academy/lessons/${e.academyLessonId}` : "https://centenarianos.com/academy"} placeholder={!e.academyLessonId} />
            <CTA index="02" title="Drill the vocab" body="FlashLearnAI deck." href={e.flashlearnSetId ? `https://flashlearnai.witus.online/sets/${e.flashlearnSetId}` : "https://flashlearnai.witus.online"} placeholder={!e.flashlearnSetId} />
            <CTA index="03" title="Ride the route" body="Wanderlust 360° tour." href={e.wanderlearnTourId ? `https://wanderlust.witus.online/tours/${e.wanderlearnTourId}` : "https://wanderlust.witus.online"} placeholder={!e.wanderlearnTourId} />
            <CTA index="04" title="Listen elsewhere" body="Apple · Spotify · Overcast." href="#" placeholder />
          </ul>

          <h2 className="font-display text-2xl text-[#0f0f10] mt-16 mb-2">Cut points</h2>
          <p className="font-mono text-xs text-[#5A6571]">[CUT POINT] markers ship with the published audio. Pending.</p>

          <h2 className="font-display text-2xl text-[#0f0f10] mt-12 mb-2">Transcript</h2>
          <p className="font-mono text-xs text-[#5A6571]">Full transcript ships with the published audio. Pending.</p>
        </div>
      </article>
      <SiteFooter theme={FOOTER_THEMES.frame} basePath={BASE} />
    </>
  );
}

function CTA({ index, title, body, href, placeholder }: { index: string; title: string; body: string; href: string; placeholder?: boolean }) {
  return (
    <li>
      <a
        href={href}
        target={href.startsWith("http") ? "_blank" : undefined}
        rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
        className="block bg-white p-5 hover:bg-[#0f0f10] hover:text-[#f5f0e6] transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0f0f10] [&:hover_.muted-row]:text-[#f5f0e6]/70 [&:hover_.idx]:text-[#f5f0e6]/60"
      >
        <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#5A6571] idx">{index}</p>
        <p className="font-display text-lg text-[#0f0f10] mt-1 group-hover:text-current flex items-center gap-2">
          {title}
          {placeholder && <span className="text-[10px] font-mono uppercase tracking-wide text-[#5A6571] border border-[#5A6571] px-1.5 py-0.5 rounded">pending</span>}
        </p>
        <p className="text-sm text-[#5A6571] muted-row mt-1">{body}</p>
      </a>
    </li>
  );
}
