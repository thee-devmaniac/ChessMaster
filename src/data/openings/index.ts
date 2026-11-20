import type { OpeningSpec } from "@/lib/openings/types";
import { londonSystem } from "./londonSystem";
import { caroKann } from "./caroKann";
import { kingsGambit } from "./kingsGambit";

/** Every opening lesson, in the order they are listed. Add new lessons here. */
export const OPENINGS: OpeningSpec[] = [londonSystem, caroKann, kingsGambit];

export function openingById(id: string): OpeningSpec | undefined {
  return OPENINGS.find((o) => o.id === id);
}
