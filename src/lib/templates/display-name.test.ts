import { describe, expect, it } from "vitest";
import { templateDisplayName } from "./display-name";

describe("templateDisplayName", () => {
  it("maps the classic id to Clean Warm so gallery copy matches the Default badge", () => {
    expect(templateDisplayName(undefined)).toBe("Clean Warm");
    expect(templateDisplayName("classic")).toBe("Clean Warm");
  });

  it("uses other builtin display names", () => {
    expect(templateDisplayName("minimal")).toBe("Swiss White");
  });

  it("uses a saved design name when the default is a custom id", () => {
    expect(
      templateDisplayName("custom:design-1", [
        { id: "design-1", name: "My studio look" },
      ]),
    ).toBe("My studio look");
  });
});
