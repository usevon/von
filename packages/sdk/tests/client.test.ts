import { describe, expect, test } from "bun:test";
import { Von } from "../src";

describe("Von Client", () => {
  test("initializes namespace methods", () => {
    const von = new Von();
    expect(von.webhooks).toBeDefined();
    expect(von.endpoints).toBeDefined();
    expect(von.inbound).toBeDefined();
    expect(von.versions).toBeDefined();
  });
});
