import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock all server modules first
vi.mock("@/lib/file-system", () => ({
  VirtualFileSystem: vi.fn(),
}));

vi.mock("ai", () => ({
  streamText: vi.fn(),
  appendResponseMessages: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/provider", () => ({
  getLanguageModel: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    project: {
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/tools/str-replace", () => ({
  buildStrReplaceTool: vi.fn(),
}));

vi.mock("@/lib/tools/file-manager", () => ({
  buildFileManagerTool: vi.fn(),
}));

vi.mock("@/lib/prompts/generation", () => ({
  generationPrompt: "Mock system prompt",
}));

import { POST } from "../route";
import { VirtualFileSystem } from "@/lib/file-system";
import { streamText } from "ai";
import { getSession } from "@/lib/auth";
import { getLanguageModel } from "@/lib/provider";
import { prisma } from "@/lib/prisma";

const mockStreamText = vi.mocked(streamText);
const mockGetSession = vi.mocked(getSession);
const mockGetLanguageModel = vi.mocked(getLanguageModel);
const mockPrismaProjectUpdate = vi.mocked(prisma.project.update);
const mockVirtualFileSystem = vi.mocked(VirtualFileSystem);

describe("Chat API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock VirtualFileSystem
    const mockFileSystemInstance = {
      deserializeFromNodes: vi.fn(),
      serialize: vi.fn(() => ({})),
    };
    mockVirtualFileSystem.mockImplementation(() => mockFileSystemInstance as any);
    
    // Mock model
    mockGetLanguageModel.mockReturnValue("mock-model" as any);
    
    // Mock streamText result
    const mockResult = {
      toDataStreamResponse: vi.fn(() => new Response()),
    };
    mockStreamText.mockReturnValue(mockResult as any);
  });

  it("should handle chat request without projectId", async () => {
    const requestData = {
      messages: [{ role: "user", content: "Hello" }],
      files: {},
    };
    
    const request = new Request("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify(requestData),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);

    expect(mockStreamText).toHaveBeenCalled();
    expect(response).toBeInstanceOf(Response);
  });

  it("should add system message to beginning of messages", async () => {
    const requestData = {
      messages: [{ role: "user", content: "Hello" }],
      files: {},
    };
    
    const request = new Request("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify(requestData),
      headers: { "Content-Type": "application/json" },
    });

    await POST(request);

    const streamTextCall = mockStreamText.mock.calls[0][0];
    expect(streamTextCall.messages[0]).toEqual(
      expect.objectContaining({
        role: "system",
        content: expect.any(String),
      })
    );
  });

  it("should configure tools correctly", async () => {
    const requestData = {
      messages: [{ role: "user", content: "Hello" }],
      files: {},
    };
    
    const request = new Request("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify(requestData),
      headers: { "Content-Type": "application/json" },
    });

    await POST(request);

    const streamTextCall = mockStreamText.mock.calls[0][0];
    expect(streamTextCall.tools).toHaveProperty("str_replace_editor");
    expect(streamTextCall.tools).toHaveProperty("file_manager");
  });

  it("should set maxSteps based on API key availability", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    
    const requestData = {
      messages: [{ role: "user", content: "Hello" }],
      files: {},
    };
    
    const request = new Request("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify(requestData),
      headers: { "Content-Type": "application/json" },
    });

    await POST(request);

    const streamTextCall = mockStreamText.mock.calls[0][0];
    expect(streamTextCall.maxSteps).toBe(4);
  });

  it("should save project data when projectId provided and user authenticated", async () => {
    const mockSession = { userId: "user123" };
    mockGetSession.mockResolvedValue(mockSession);
    
    const requestData = {
      messages: [{ role: "user", content: "Hello" }],
      files: {},
      projectId: "project123",
    };
    
    const request = new Request("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify(requestData),
      headers: { "Content-Type": "application/json" },
    });

    // Mock onFinish callback
    let onFinishCallback: Function;
    mockStreamText.mockImplementation((config: any) => {
      onFinishCallback = config.onFinish;
      return {
        toDataStreamResponse: vi.fn(() => new Response()),
      } as any;
    });

    await POST(request);

    // Simulate onFinish being called
    const mockResponse = {
      messages: [{ role: "assistant", content: "Response" }],
    };
    await onFinishCallback!({ response: mockResponse });

    expect(mockPrismaProjectUpdate).toHaveBeenCalledWith({
      where: {
        id: "project123",
        userId: "user123",
      },
      data: {
        messages: expect.any(String),
        data: expect.any(String),
      },
    });
  });

  it("should not save project data when user not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);
    
    const requestData = {
      messages: [{ role: "user", content: "Hello" }],
      files: {},
      projectId: "project123",
    };
    
    const request = new Request("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify(requestData),
      headers: { "Content-Type": "application/json" },
    });

    // Mock onFinish callback
    let onFinishCallback: Function;
    mockStreamText.mockImplementation((config: any) => {
      onFinishCallback = config.onFinish;
      return {
        toDataStreamResponse: vi.fn(() => new Response()),
      } as any;
    });

    await POST(request);

    // Simulate onFinish being called
    const mockResponse = {
      messages: [{ role: "assistant", content: "Response" }],
    };
    await onFinishCallback!({ response: mockResponse });

    expect(mockPrismaProjectUpdate).not.toHaveBeenCalled();
  });

  it("should handle database errors gracefully during project save", async () => {
    const mockSession = { userId: "user123" };
    mockGetSession.mockResolvedValue(mockSession);
    mockPrismaProjectUpdate.mockRejectedValue(new Error("Database error"));
    
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    
    const requestData = {
      messages: [{ role: "user", content: "Hello" }],
      files: {},
      projectId: "project123",
    };
    
    const request = new Request("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify(requestData),
      headers: { "Content-Type": "application/json" },
    });

    // Mock onFinish callback
    let onFinishCallback: Function;
    mockStreamText.mockImplementation((config: any) => {
      onFinishCallback = config.onFinish;
      return {
        toDataStreamResponse: vi.fn(() => new Response()),
      } as any;
    });

    await POST(request);

    // Simulate onFinish being called
    const mockResponse = {
      messages: [{ role: "assistant", content: "Response" }],
    };
    await onFinishCallback!({ response: mockResponse });

    expect(consoleSpy).toHaveBeenCalledWith("Failed to save project data:", expect.any(Error));
    consoleSpy.mockRestore();
  });

  it("should deserialize files correctly", async () => {
    const mockFileSystemInstance = {
      deserializeFromNodes: vi.fn(),
      serialize: vi.fn(() => ({})),
    };
    mockVirtualFileSystem.mockImplementation(() => mockFileSystemInstance as any);
    
    const files = {
      "test.js": { name: "test.js", content: "console.log('test');" },
    };
    
    const requestData = {
      messages: [{ role: "user", content: "Hello" }],
      files,
    };
    
    const request = new Request("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify(requestData),
      headers: { "Content-Type": "application/json" },
    });

    await POST(request);

    expect(mockFileSystemInstance.deserializeFromNodes).toHaveBeenCalledWith(files);
  });

  it("should handle stream errors", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    
    const requestData = {
      messages: [{ role: "user", content: "Hello" }],
      files: {},
    };
    
    const request = new Request("http://localhost/api/chat", {
      method: "POST",
      body: JSON.stringify(requestData),
      headers: { "Content-Type": "application/json" },
    });

    // Mock onError callback
    let onErrorCallback: Function;
    mockStreamText.mockImplementation((config: any) => {
      onErrorCallback = config.onError;
      return {
        toDataStreamResponse: vi.fn(() => new Response()),
      } as any;
    });

    await POST(request);

    // Simulate error
    const mockError = new Error("Stream error");
    onErrorCallback!(mockError);

    expect(consoleSpy).toHaveBeenCalledWith(mockError);
    consoleSpy.mockRestore();
  });
});