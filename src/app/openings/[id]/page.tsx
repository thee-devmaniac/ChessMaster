import { Suspense } from "react";
import { notFound } from "next/navigation";
import { OPENINGS, openingById } from "@/data/openings";
import { OpeningLesson } from "@/components/openings/OpeningLesson";

// One page per opening, generated at build time (/openings/london-system, ...).
export function generateStaticParams() {
  return OPENINGS.map((o) => ({ id: o.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: `${openingById(id)?.name ?? "Opening"} · Chess Trainer` };
}

type Params = { params: Promise<{ id: string }> };

/**
 * The page itself doesn't read the address: that keeps one shared "shell"
 * that Next.js can prefetch for every lesson link, so switching lessons is
 * instant. Only <Lesson> reads the id, inside <Suspense>; the placeholder
 * has the lesson's shape, so nothing jumps when it arrives.
 */
export default function OpeningPage({ params }: Params) {
  return (
    <Suspense fallback={<LessonPlaceholder />}>
      <Lesson params={params} />
    </Suspense>
  );
}

async function Lesson({ params }: Params) {
  const { id } = await params;
  if (!openingById(id)) notFound(); // any other address under /openings/ is a 404
  return <OpeningLesson id={id} />;
}

function LessonPlaceholder() {
  return (
    <div className="opening-page" aria-busy="true">
      <header className="opening-header">
        <div>
          <p className="section-tag">Opening lesson</p>
          <div className="placeholder placeholder-title" />
          <div className="placeholder placeholder-line" />
        </div>
      </header>
      <div className="placeholder placeholder-board" />
    </div>
  );
}
