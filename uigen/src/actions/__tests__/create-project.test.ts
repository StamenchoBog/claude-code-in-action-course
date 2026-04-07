import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock server modules first
vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    project: {
      create: vi.fn(),
    },
  },
}));

import { createProject } from "../create-project";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const mockGetSession = vi.mocked(getSession);
const mockPrismaProjectCreate = vi.mocked(prisma.project.create);

describe("createProject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create a project successfully when authenticated", async () => {
    const mockSession = { userId: "user123" };
    const mockProject = {
      id: "project123",
      name: "Test Project",
      userId: "user123",
      messages: '[]',
      data: '{}',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockGetSession.mockResolvedValue(mockSession);
    mockPrismaProjectCreate.mockResolvedValue(mockProject);

    const input = {
      name: "Test Project",
      messages: [],
      data: {},
    };

    const result = await createProject(input);

    expect(mockGetSession).toHaveBeenCalledOnce();
    expect(mockPrismaProjectCreate).toHaveBeenCalledWith({
      data: {
        name: "Test Project",
        userId: "user123",
        messages: "[]",
        data: "{}",
      },
    });
    expect(result).toBe(mockProject);
  });

  it("should throw error when user is not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);

    const input = {
      name: "Test Project",
      messages: [],
      data: {},
    };

    await expect(createProject(input)).rejects.toThrow("Unauthorized");
    expect(mockPrismaProjectCreate).not.toHaveBeenCalled();
  });

  it("should serialize complex messages and data", async () => {
    const mockSession = { userId: "user123" };
    const mockProject = {
      id: "project123",
      name: "Test Project",
      userId: "user123",
      messages: '[{"role":"user","content":"Hello"}]',
      data: '{"files":{"test.js":"console.log();"}}',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockGetSession.mockResolvedValue(mockSession);
    mockPrismaProjectCreate.mockResolvedValue(mockProject);

    const input = {
      name: "Test Project",
      messages: [{ role: "user", content: "Hello" }],
      data: { files: { "test.js": "console.log();" } },
    };

    const result = await createProject(input);

    expect(mockPrismaProjectCreate).toHaveBeenCalledWith({
      data: {
        name: "Test Project",
        userId: "user123",
        messages: '[{"role":"user","content":"Hello"}]',
        data: '{"files":{"test.js":"console.log();"}}',
      },
    });
    expect(result).toBe(mockProject);
  });

  it("should handle database errors", async () => {
    const mockSession = { userId: "user123" };
    mockGetSession.mockResolvedValue(mockSession);
    mockPrismaProjectCreate.mockRejectedValue(new Error("Database error"));

    const input = {
      name: "Test Project",
      messages: [],
      data: {},
    };

    await expect(createProject(input)).rejects.toThrow("Database error");
  });
});