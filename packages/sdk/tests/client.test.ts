import { describe, expect, test } from "bun:test";
import { Von } from "../src";

describe("Von Client", () => {
  describe("constructor", () => {
    test("uses default base URL when not provided", () => {
      const von = new Von();
      expect(von).toBeDefined();
    });

    test("uses provided base URL", () => {
      const von = new Von({ baseUrl: "https://api.example.com" });
      expect(von).toBeDefined();
    });

    test("uses provided API key", () => {
      const von = new Von({ apiKey: "test-key" });
      expect(von).toBeDefined();
    });

    test("initializes namespace methods", () => {
      const von = new Von();
      expect(von.webhooks).toBeDefined();
      expect(von.endpoints).toBeDefined();
      expect(von.inbound).toBeDefined();
      expect(von.versions).toBeDefined();
    });
  });
});
