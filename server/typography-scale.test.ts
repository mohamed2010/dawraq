import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("mobile typography scale", () => {
  const css = readFileSync(new URL("../client/src/index.css", import.meta.url), "utf8");

  it("uses a readable Arabic baseline and explicit account scale levels", () => {
    expect(css).toContain("font-size: 18px");
    expect(css).toContain(':root[data-text-scale="large"] { font-size:20px; }');
    expect(css).toContain(':root[data-text-scale="extra"] { font-size:22px; }');
    expect(css).toContain("font-size:clamp(.84rem, 3.35vw, 1rem)");
    expect(css).toContain("font-size:clamp(.72rem, 3vw, .84rem)");
  });
});
