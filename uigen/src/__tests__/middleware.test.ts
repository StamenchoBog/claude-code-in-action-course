import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock auth module before importing middleware
vi.mock("@/lib/auth", () => ({
  verifySession: vi.fn(),
}));

vi.mock("next/server", () => ({
  NextResponse: {
    json: vi.fn((body, options) => ({
      body: JSON.stringify(body),
      status: options?.status || 200,
      headers: new Headers(),
    })),
    next: vi.fn(() => ({
      body: null,
      status: 200,
      headers: new Headers(),
    })),
  },
}));

import { middleware } from "../middleware";
import { NextRequest } from "next/server";
import { verifySession } from "@/lib/auth";

const mockVerifySession = vi.mocked(verifySession);

function createMockRequest(url: string): NextRequest {
  return {
    nextUrl: new URL(url),
    headers: new Headers(),
  } as NextRequest;
}

describe("middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("protected routes", () => {
    const protectedPaths = [
      "/api/projects",
      "/api/projects/123",
      "/api/filesystem",
      "/api/filesystem/read",
    ];

    protectedPaths.forEach((path) => {
      describe(`${path}`, () => {
        it("should allow access when session exists", async () => {
          const mockSession = { userId: "user123" };
          mockVerifySession.mockResolvedValue(mockSession);

          const request = createMockRequest(`https://example.com${path}`);
          const response = await middleware(request);

          expect(mockVerifySession).toHaveBeenCalledWith(request);
          expect(response.status).toBe(200);
        });

        it("should deny access when no session exists", async () => {
          mockVerifySession.mockResolvedValue(null);

          const request = createMockRequest(`https://example.com${path}`);
          const response = await middleware(request);

          expect(mockVerifySession).toHaveBeenCalledWith(request);
          expect(response.status).toBe(401);
          expect(JSON.parse(response.body)).toEqual({
            error: "Authentication required",
          });
        });
      });
    });
  });

  describe("public routes", () => {
    const publicPaths = [
      "/",
      "/api/chat",
      "/api/auth",
      "/login",
      "/register",
      "/about",
      "/api/health",
    ];

    publicPaths.forEach((path) => {
      describe(`${path}`, () => {
        it("should allow access without session", async () => {
          mockVerifySession.mockResolvedValue(null);

          const request = createMockRequest(`https://example.com${path}`);
          const response = await middleware(request);

          expect(mockVerifySession).toHaveBeenCalledWith(request);
          expect(response.status).toBe(200);
        });

        it("should allow access with session", async () => {
          const mockSession = { userId: "user123" };
          mockVerifySession.mockResolvedValue(mockSession);

          const request = createMockRequest(`https://example.com${path}`);
          const response = await middleware(request);

          expect(mockVerifySession).toHaveBeenCalledWith(request);
          expect(response.status).toBe(200);
        });
      });
    });
  });

  describe("edge cases", () => {
    it("should handle subpaths of protected routes", async () => {
      mockVerifySession.mockResolvedValue(null);

      const request = createMockRequest("https://example.com/api/projects/123/files");
      const response = await middleware(request);

      expect(response.status).toBe(401);
    });

    it("should not protect similar but different paths", async () => {
      mockVerifySession.mockResolvedValue(null);

      const request = createMockRequest("https://example.com/api/project"); // Missing 's'
      const response = await middleware(request);

      expect(response.status).toBe(200);
    });

    it("should handle query parameters correctly", async () => {
      const mockSession = { userId: "user123" };
      mockVerifySession.mockResolvedValue(mockSession);

      const request = createMockRequest("https://example.com/api/projects?page=1&limit=10");
      const response = await middleware(request);

      expect(response.status).toBe(200);
    });

    it("should handle hash fragments correctly", async () => {
      const mockSession = { userId: "user123" };
      mockVerifySession.mockResolvedValue(mockSession);

      const request = createMockRequest("https://example.com/api/projects#section");
      const response = await middleware(request);

      expect(response.status).toBe(200);
    });

    it("should be case sensitive for paths", async () => {
      mockVerifySession.mockResolvedValue(null);

      const request = createMockRequest("https://example.com/api/PROJECTS");
      const response = await middleware(request);

      // Should be public since it doesn't match the lowercase protected path
      expect(response.status).toBe(200);
    });
  });

  describe("session verification errors", () => {
    it("should handle verifySession throwing an error", async () => {
      mockVerifySession.mockRejectedValue(new Error("Session verification failed"));

      const request = createMockRequest("https://example.com/api/projects");
      
      await expect(middleware(request)).rejects.toThrow("Session verification failed");
    });

    it("should handle verifySession returning undefined", async () => {
      mockVerifySession.mockResolvedValue(undefined as any);

      const request = createMockRequest("https://example.com/api/projects");
      const response = await middleware(request);

      expect(response.status).toBe(401);
    });
  });

  describe("protected path matching logic", () => {
    it("should correctly identify protected paths using startsWith", async () => {
      mockVerifySession.mockResolvedValue(null);

      const testCases = [
        { path: "/api/projects", shouldBeProtected: true },
        { path: "/api/projectsabc", shouldBeProtected: true }, // startsWith matches
        { path: "/api/project", shouldBeProtected: false },
        { path: "/api/filesystem", shouldBeProtected: true },
        { path: "/api/filesystems", shouldBeProtected: true }, // startsWith matches
        { path: "/api/files", shouldBeProtected: false },
      ];

      for (const { path, shouldBeProtected } of testCases) {
        const request = createMockRequest(`https://example.com${path}`);
        const response = await middleware(request);

        if (shouldBeProtected) {
          expect(response.status).toBe(401);
        } else {
          expect(response.status).toBe(200);
        }
      }
    });
  });

  describe("URL parsing edge cases", () => {
    it("should handle URLs with port numbers", async () => {
      const mockSession = { userId: "user123" };
      mockVerifySession.mockResolvedValue(mockSession);

      const request = createMockRequest("https://localhost:3000/api/projects");
      const response = await middleware(request);

      expect(response.status).toBe(200);
    });

    it("should handle URLs with different schemes", async () => {
      const mockSession = { userId: "user123" };
      mockVerifySession.mockResolvedValue(mockSession);

      const request = createMockRequest("http://example.com/api/projects");
      const response = await middleware(request);

      expect(response.status).toBe(200);
    });

    it("should handle URLs with encoded characters", async () => {
      const mockSession = { userId: "user123" };
      mockVerifySession.mockResolvedValue(mockSession);

      const request = createMockRequest("https://example.com/api/projects%2F123");
      const response = await middleware(request);

      expect(response.status).toBe(200);
    });
  });

  describe("response structure", () => {
    it("should return correct error response structure", async () => {
      mockVerifySession.mockResolvedValue(null);

      const request = createMockRequest("https://example.com/api/projects");
      const response = await middleware(request);

      expect(response.status).toBe(401);
      expect(response.headers).toBeInstanceOf(Headers);
      
      const body = JSON.parse(response.body);
      expect(body).toEqual({ error: "Authentication required" });
      expect(typeof body.error).toBe("string");
    });

    it("should return NextResponse.next() for allowed requests", async () => {
      const mockSession = { userId: "user123" };
      mockVerifySession.mockResolvedValue(mockSession);

      const request = createMockRequest("https://example.com/");
      const response = await middleware(request);

      expect(response.status).toBe(200);
      expect(response.body).toBe(null);
    });
  });
});