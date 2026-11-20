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

export default async function OpeningPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!openingById(id)) notFound(); // any other address under /openings/ is a 404
  return <OpeningLesson id={id} />;
}
