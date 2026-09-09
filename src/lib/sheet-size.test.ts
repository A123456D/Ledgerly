import { describe, expect, it } from "vitest";
import {
  A4_HEIGHT_MM,
  A4_HEIGHT_PX,
  captureSheetHeightPx,
  pdfRasterPageCount,
} from "./sheet-size";

describe("captureSheetHeightPx", () => {
  it("keeps a short invoice on one A4 page", () => {
    expect(captureSheetHeightPx(800)).toBe(A4_HEIGHT_PX);
    expect(captureSheetHeightPx(A4_HEIGHT_PX)).toBe(A4_HEIGHT_PX);
    expect(captureSheetHeightPx(A4_HEIGHT_PX + 8)).toBe(A4_HEIGHT_PX);
  });

  it("uses two pages when content clearly overflows", () => {
    expect(captureSheetHeightPx(A4_HEIGHT_PX + 80)).toBe(A4_HEIGHT_PX * 2);
  });
});

describe("pdfRasterPageCount", () => {
  it("does not add a blank page for a 1-page raster", () => {
    expect(pdfRasterPageCount(A4_HEIGHT_MM)).toBe(1);
    expect(pdfRasterPageCount(A4_HEIGHT_MM + 2)).toBe(1);
  });

  it("counts a real second page of content", () => {
    expect(pdfRasterPageCount(A4_HEIGHT_MM * 1.9)).toBe(2);
  });
});
