import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    project: {
      findUnique: vi.fn(),
    },
  },
}));

import { getProject } from "../get-project";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const mockGetSession = vi.mocked(getSession);
const mockPrismaProjectFindUnique = vi.mocked(prisma.project.findUnique);

describe("getProject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return project successfully when authenticated and authorized", async () => {
    const mockSession = { userId: "user123" };
    const mockProject = {
      id: "project123",
      name: "Test Project",
      userId: "user123",
      messages: '[{"role":"user","content":"Hello"}]',
      data: '{"files":{"test.js":"console.log();"}}',
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-02"),
    };

    mockGetSession.mockResolvedValue(mockSession);
    mockPrismaProjectFindUnique.mockResolvedValue(mockProject);

    const result = await getProject("project123");

    expect(mockGetSession).toHaveBeenCalledOnce();
    expect(mockPrismaProjectFindUnique).toHaveBeenCalledWith({
      where: {
        id: "project123",
        userId: "user123",
      },
    });
    expect(result).toEqual({
      id: "project123",
      name: "Test Project",
      messages: [{ role: "user", content: "Hello" }],
      data: { files: { "test.js": "console.log();" } },
      createdAt: mockProject.createdAt,
      updatedAt: mockProject.updatedAt,
    });
  });

  it("should throw error when user is not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);

    await expect(getProject("project123")).rejects.toThrow("Unauthorized");
    expect(mockPrismaProjectFindUnique).not.toHaveBeenCalled();
  });

  it("should throw error when project is not found", async () => {
    const mockSession = { userId: "user123" };
    mockGetSession.mockResolvedValue(mockSession);
    mockPrismaProjectFindUnique.mockResolvedValue(null);

    await expect(getProject("nonexistent")).rejects.toThrow("Project not found");
    expect(mockPrismaProjectFindUnique).toHaveBeenCalledWith({
      where: {
        id: "nonexistent",
        userId: "user123",
      },
    });
  });

  it("should parse empty messages and data correctly", async () => {
    const mockSession = { userId: "user123" };
    const mockProject = {
      id: "project123",
      name: "Test Project",
      userId: "user123",
      messages: "[]",
      data: "{}",
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-02"),
    };

    mockGetSession.mockResolvedValue(mockSession);
    mockPrismaProjectFindUnique.mockResolvedValue(mockProject);

    const result = await getProject("project123");

    expect(result.messages).toEqual([]);
    expect(result.data).toEqual({});
  });

  it("should handle JSON parsing errors gracefully", async () => {
    const mockSession = { userId: "user123" };
    const mockProject = {
      id: "project123",
      name: "Test Project",
      userId: "user123",
      messages: "invalid json",
      data: "{}",
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-02"),
    };

    mockGetSession.mockResolvedValue(mockSession);
    mockPrismaProjectFindUnique.mockResolvedValue(mockProject);

    await expect(getProject("project123")).rejects.toThrow();
  });

  it("should handle database errors", async () => {
    const mockSession = { userId: "user123" };
    mockGetSession.mockResolvedValue(mockSession);
    mockPrismaProjectFindUnique.mockRejectedValue(new Error("Database error"));

    await expect(getProject("project123")).rejects.toThrow("Database error");
  });
});