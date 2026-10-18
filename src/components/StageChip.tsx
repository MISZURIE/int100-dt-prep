import type { StageSlug } from "../lib/types";

/** Sticky-note label for a stage. Colour always appears with the stage name. */
export function StageChip({ slug, name, week }: { slug: StageSlug; name: string; week?: number }) {
  return (
    <span className="stage-chip label" data-stage={slug}>
      {week !== undefined && <span>Week {week} ·</span>}
      <span>{name}</span>
    </span>
  );
}
