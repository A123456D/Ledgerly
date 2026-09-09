import { describe, expect, it } from "vitest";
import {
  TEMPLATE_PREVIEW_MODAL_MAX_SCALE,
  TEMPLATE_PREVIEW_MODAL_MIN_SCALE,
  previewFitScale,
} from "./preview-scale";
import { A4_WIDTH_PX } from "./sheet-size";

describe("previewFitScale", () => {
  it("fits A4 into a ~390px preview modal without overflowing", () => {
    // overlay p-3 + card p-3 + pane p-2 → 64px chrome
    const available = 390 - 64;
    const scale = previewFitScale(
      available,
      A4_WIDTH_PX,
      TEMPLATE_PREVIEW_MODAL_MIN_SCALE,
      TEMPLATE_PREVIEW_MODAL_MAX_SCALE,
    );
    expect(scale).toBeGreaterThanOrEqual(TEMPLATE_PREVIEW_MODAL_MIN_SCALE);
    expect(scale).toBeLessThanOrEqual(TEMPLATE_PREVIEW_MODAL_MAX_SCALE);
    expect(A4_WIDTH_PX * scale).toBeLessThanOrEqual(available);
  });

  it("documents why minScale 0.4 overflowed at 390px with the old padding", () => {
    const available = 390 - 88;
    const old = previewFitScale(available, A4_WIDTH_PX, 0.4, 0.85);
    expect(A4_WIDTH_PX * old).toBeGreaterThan(available);
  });

  it("keeps desktop preview at maxScale", () => {
    const available = 1024 - 112;
    const scale = previewFitScale(
      available,
      A4_WIDTH_PX,
      TEMPLATE_PREVIEW_MODAL_MIN_SCALE,
      TEMPLATE_PREVIEW_MODAL_MAX_SCALE,
    );
    expect(scale).toBe(TEMPLATE_PREVIEW_MODAL_MAX_SCALE);
  });
});
