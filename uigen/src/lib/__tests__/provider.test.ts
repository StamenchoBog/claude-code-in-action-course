import { describe, it, expect, vi, beforeEach } from "vitest";
import { MockLanguageModel, getLanguageModel } from "../provider";

// Mock the anthropic module
vi.mock("@ai-sdk/anthropic", () => ({
  anthropic: vi.fn(() => "mock-anthropic-model"),
}));

describe("provider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.ANTHROPIC_API_KEY;
  });

  describe("getLanguageModel", () => {
    it("should return MockLanguageModel when no API key is present", () => {
      const model = getLanguageModel();
      expect(model).toBeInstanceOf(MockLanguageModel);
      expect(model.modelId).toBe("mock-claude-sonnet-4-0");
    });

    it("should return MockLanguageModel when API key is empty string", () => {
      process.env.ANTHROPIC_API_KEY = "";
      const model = getLanguageModel();
      expect(model).toBeInstanceOf(MockLanguageModel);
    });

    it("should return MockLanguageModel when API key is only whitespace", () => {
      process.env.ANTHROPIC_API_KEY = "   ";
      const model = getLanguageModel();
      expect(model).toBeInstanceOf(MockLanguageModel);
    });

    it("should return anthropic model when valid API key is present", async () => {
      process.env.ANTHROPIC_API_KEY = "valid-api-key";
      const { anthropic } = await import("@ai-sdk/anthropic");
      
      const model = getLanguageModel();
      
      expect(anthropic).toHaveBeenCalledWith("claude-haiku-4-5");
      expect(model).toBe("mock-anthropic-model");
    });
  });

  describe("MockLanguageModel", () => {
    let mockModel: MockLanguageModel;

    beforeEach(() => {
      mockModel = new MockLanguageModel("test-model");
    });

    it("should have correct specification properties", () => {
      expect(mockModel.specificationVersion).toBe("v1");
      expect(mockModel.provider).toBe("mock");
      expect(mockModel.modelId).toBe("test-model");
      expect(mockModel.defaultObjectGenerationMode).toBe("tool");
    });

    describe("extractUserPrompt", () => {
      it("should extract text from last user message", () => {
        const messages = [
          { role: "system", content: "System prompt" },
          { role: "user", content: "First user message" },
          { role: "assistant", content: "Assistant response" },
          { role: "user", content: "Latest user message" },
        ];

        const result = (mockModel as any).extractUserPrompt(messages);
        expect(result).toBe("Latest user message");
      });

      it("should handle array content", () => {
        const messages = [
          {
            role: "user",
            content: [
              { type: "text", text: "Hello " },
              { type: "text", text: "world!" },
              { type: "image", data: "base64data" },
            ],
          },
        ];

        const result = (mockModel as any).extractUserPrompt(messages);
        expect(result).toBe("Hello  world!");
      });

      it("should return empty string when no user messages", () => {
        const messages = [
          { role: "system", content: "System prompt" },
          { role: "assistant", content: "Assistant response" },
        ];

        const result = (mockModel as any).extractUserPrompt(messages);
        expect(result).toBe("");
      });
    });

    describe("component type detection", () => {
      const testCases = [
        { prompt: "create a form", expected: "form" },
        { prompt: "Create a FORM component", expected: "form" },
        { prompt: "build a card", expected: "card" },
        { prompt: "make a Card widget", expected: "card" },
        { prompt: "create a button", expected: "counter" }, // default
        { prompt: "build something", expected: "counter" }, // default
      ];

      testCases.forEach(({ prompt, expected }) => {
        it(`should detect "${expected}" component type from prompt "${prompt}"`, async () => {
          // Add tool message to trigger step 1 (component creation)
          const messages = [
            { role: "user" as const, content: prompt },
            { role: "tool" as const, content: [{ type: "text" as const, text: "App.jsx created" }] },
          ];
          
          const result = await mockModel.doGenerate({ 
            prompt: messages as any,
            maxTokens: 100,
          });

          if (expected === "form") {
            expect(result.text).toContain("ContactForm");
          } else if (expected === "card") {
            expect(result.text).toContain("Card");
          } else {
            expect(result.text).toContain("Counter");
          }
        });
      });
    });

    describe("doGenerate", () => {
      it("should generate response for initial request", async () => {
        const messages = [{ role: "user" as const, content: "create a counter" }];

        const result = await mockModel.doGenerate({
          prompt: messages as any,
          maxTokens: 100,
        });

        expect(result.text).toContain("static response");
        expect(result.toolCalls).toHaveLength(1);
        expect(result.toolCalls![0].toolName).toBe("str_replace_editor");
        expect(result.finishReason).toBe("tool-calls");
      });

      it("should handle step progression correctly", async () => {
        const messages = [
          { role: "user" as const, content: "create a counter" },
          { role: "tool" as const, content: [{ type: "text" as const, text: "File created" }] },
        ];

        const result = await mockModel.doGenerate({
          prompt: messages as any,
          maxTokens: 100,
        });

        expect(result.text).toContain("I'll create a Counter component");
        expect(result.toolCalls).toHaveLength(1);
        expect(result.toolCalls![0].toolName).toBe("str_replace_editor");
      });
    });

    describe("doStream", () => {
      it("should return readable stream", async () => {
        const messages = [{ role: "user" as const, content: "create a form" }];

        const result = await mockModel.doStream({
          prompt: messages as any,
          maxTokens: 100,
        });

        expect(result.stream).toBeInstanceOf(ReadableStream);
        expect(result.warnings).toEqual([]);
        expect(result.rawCall.rawPrompt).toEqual(messages);
      });

      it("should stream text deltas and tool calls", async () => {
        const messages = [{ role: "user" as const, content: "create a button" }];

        const result = await mockModel.doStream({
          prompt: messages as any,
          maxTokens: 100,
        });

        const reader = result.stream.getReader();
        const chunks = [];
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
          }
        } finally {
          reader.releaseLock();
        }

        expect(chunks.length).toBeGreaterThan(0);
        expect(chunks.some(chunk => chunk.type === "text-delta")).toBe(true);
        expect(chunks.some(chunk => chunk.type === "tool-call")).toBe(true);
        expect(chunks.some(chunk => chunk.type === "finish")).toBe(true);
      });
    });

    describe("component code generation", () => {
      it("should generate form component code", () => {
        const code = (mockModel as any).getComponentCode("form");
        
        expect(code).toContain("const ContactForm = () => {");
        expect(code).toContain("useState");
        expect(code).toContain("handleSubmit");
        expect(code).toContain("export default ContactForm");
      });

      it("should generate card component code", () => {
        const code = (mockModel as any).getComponentCode("card");
        
        expect(code).toContain("const Card = ({");
        expect(code).toContain("title");
        expect(code).toContain("description");
        expect(code).toContain("export default Card");
      });

      it("should generate counter component code as default", () => {
        const code = (mockModel as any).getComponentCode("unknown");
        
        expect(code).toContain("const Counter = () => {");
        expect(code).toContain("useState(0)");
        expect(code).toContain("increment");
        expect(code).toContain("decrement");
        expect(code).toContain("export default Counter");
      });
    });

    describe("getLastToolResult", () => {
      it("should return last tool result", () => {
        const messages = [
          { role: "user", content: "Hello" },
          { role: "tool", content: [{ type: "text", text: "First result" }] },
          { role: "assistant", content: "Response" },
          { role: "tool", content: [{ type: "text", text: "Last result" }] },
        ];

        const result = (mockModel as any).getLastToolResult(messages);
        expect(result).toEqual({ type: "text", text: "Last result" });
      });

      it("should return null when no tool messages", () => {
        const messages = [
          { role: "user", content: "Hello" },
          { role: "assistant", content: "Response" },
        ];

        const result = (mockModel as any).getLastToolResult(messages);
        expect(result).toBeNull();
      });
    });

    describe("app code generation", () => {
      it("should generate app code for Card component", () => {
        const code = (mockModel as any).getAppCode("Card");
        
        expect(code).toContain("import Card from '@/components/Card'");
        expect(code).toContain("<Card");
        expect(code).toContain("title=\"Amazing Product\"");
        expect(code).toContain("Learn More");
      });

      it("should generate generic app code for other components", () => {
        const code = (mockModel as any).getAppCode("Counter");
        
        expect(code).toContain("import Counter from '@/components/Counter'");
        expect(code).toContain("<Counter />");
      });
    });
  });
});