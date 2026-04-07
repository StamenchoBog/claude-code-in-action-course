import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    project: {
      findMany: vi.fn(),
    },
  },
}));

import { getProjects } from "../get-projects";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const mockGetSession = vi.mocked(getSession);
const mockPrismaProjectFindMany = vi.mocked(prisma.project.findMany);

describe("getProjects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return projects successfully when authenticated", async () => {
    const mockSession = { userId: "user123" };
    const mockProjects = [
      {
        id: "project1",
        name: "Project 1",
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-02"),
      },
      {
        id: "project2",
        name: "Project 2",
        createdAt: new Date("2024-01-03"),
        updatedAt: new Date("2024-01-04"),
      },
    ];

    mockGetSession.mockResolvedValue(mockSession);
    mockPrismaProjectFindMany.mockResolvedValue(mockProjects);

    const result = await getProjects();

    expect(mockGetSession).toHaveBeenCalledOnce();
    expect(mockPrismaProjectFindMany).toHaveBeenCalledWith({
      where: {
        userId: "user123",
      },
      orderBy: {
        updatedAt: "desc",
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    expect(result).toEqual(mockProjects);
  });

  it("should throw error when user is not authenticated", async () => {
    mockGetSession.mockResolvedValue(null);

    await expect(getProjects()).rejects.toThrow("Unauthorized");
    expect(mockPrismaProjectFindMany).not.toHaveBeenCalled();
  });

  it("should return empty array when user has no projects", async () => {
    const mockSession = { userId: "user123" };
    mockGetSession.mockResolvedValue(mockSession);
    mockPrismaProjectFindMany.mockResolvedValue([]);

    const result = await getProjects();

    expect(result).toEqual([]);
    expect(mockPrismaProjectFindMany).toHaveBeenCalledWith({
      where: {
        userId: "user123",
      },
      orderBy: {
        updatedAt: "desc",
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  });

  it("should order projects by updatedAt desc", async () => {
    const mockSession = { userId: "user123" };
    const mockProjects = [
      {
        id: "project2",
        name: "Newer Project",
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-04"),
      },
      {
        id: "project1",
        name: "Older Project",
        createdAt: new Date("2024-01-02"),
        updatedAt: new Date("2024-01-02"),
      },
    ];

    mockGetSession.mockResolvedValue(mockSession);
    mockPrismaProjectFindMany.mockResolvedValue(mockProjects);

    const result = await getProjects();

    expect(result[0].updatedAt.getTime()).toBeGreaterThan(result[1].updatedAt.getTime());
    expect(mockPrismaProjectFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { updatedAt: "desc" },
      })
    );
  });

  it("should handle database errors", async () => {
    const mockSession = { userId: "user123" };
    mockGetSession.mockResolvedValue(mockSession);
    mockPrismaProjectFindMany.mockRejectedValue(new Error("Database error"));

    await expect(getProjects()).rejects.toThrow("Database error");
  });

  it("should only select specific fields", async () => {
    const mockSession = { userId: "user123" };
    mockGetSession.mockResolvedValue(mockSession);
    mockPrismaProjectFindMany.mockResolvedValue([]);

    await getProjects();

    expect(mockPrismaProjectFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: {
          id: true,
          name: true,
          createdAt: true,
          updatedAt: true,
        },
      })
    );
  });
});