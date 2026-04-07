import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// Mock all server-side modules first
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

vi.mock("@/actions", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: vi.fn(),
  clearAnonWork: vi.fn(),
}));

vi.mock("@/actions/get-projects", () => ({
  getProjects: vi.fn(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: vi.fn(),
}));

import { useAuth } from "../use-auth";
import { useRouter } from "next/navigation";
import { signIn as signInAction, signUp as signUpAction } from "@/actions";
import { getAnonWorkData, clearAnonWork } from "@/lib/anon-work-tracker";
import { getProjects } from "@/actions/get-projects";
import { createProject } from "@/actions/create-project";

const mockPush = vi.fn();
const mockUseRouter = vi.mocked(useRouter);
const mockSignInAction = vi.mocked(signInAction);
const mockSignUpAction = vi.mocked(signUpAction);
const mockGetAnonWorkData = vi.mocked(getAnonWorkData);
const mockClearAnonWork = vi.mocked(clearAnonWork);
const mockGetProjects = vi.mocked(getProjects);
const mockCreateProject = vi.mocked(createProject);

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseRouter.mockReturnValue({
      push: mockPush,
    } as any);
  });

  it("should initialize with correct default state", () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.isLoading).toBe(false);
    expect(typeof result.current.signIn).toBe("function");
    expect(typeof result.current.signUp).toBe("function");
  });

  describe("signIn", () => {
    it("should handle successful sign in with anonymous work", async () => {
      const mockAnonWork = {
        messages: [{ role: "user", content: "Hello" }],
        fileSystemData: { files: {} },
      };
      const mockProject = { id: "project123", name: "Test Project" };

      mockSignInAction.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(mockAnonWork);
      mockCreateProject.mockResolvedValue(mockProject);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        const response = await result.current.signIn("test@example.com", "password");
        expect(response).toEqual({ success: true });
      });

      expect(mockSignInAction).toHaveBeenCalledWith("test@example.com", "password");
      expect(mockGetAnonWorkData).toHaveBeenCalled();
      expect(mockCreateProject).toHaveBeenCalledWith({
        name: expect.stringContaining("Design from"),
        messages: mockAnonWork.messages,
        data: mockAnonWork.fileSystemData,
      });
      expect(mockClearAnonWork).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/project123");
    });

    it("should handle successful sign in with existing projects", async () => {
      const mockProjects = [
        { id: "project1", name: "Project 1" },
        { id: "project2", name: "Project 2" },
      ];

      mockSignInAction.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue(mockProjects);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "password");
      });

      expect(mockGetProjects).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/project1");
    });

    it("should handle successful sign in with no existing projects", async () => {
      const mockNewProject = { id: "newproject", name: "New Project" };

      mockSignInAction.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([]);
      mockCreateProject.mockResolvedValue(mockNewProject);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "password");
      });

      expect(mockGetProjects).toHaveBeenCalled();
      expect(mockCreateProject).toHaveBeenCalledWith({
        name: expect.stringMatching(/^New Design #\d+$/),
        messages: [],
        data: {},
      });
      expect(mockPush).toHaveBeenCalledWith("/newproject");
    });

    it("should handle failed sign in", async () => {
      const errorResult = { success: false, error: "Invalid credentials" };
      mockSignInAction.mockResolvedValue(errorResult);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        const response = await result.current.signIn("test@example.com", "wrongpassword");
        expect(response).toEqual(errorResult);
      });

      expect(mockGetAnonWorkData).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });

    it("should set and clear loading state", async () => {
      mockSignInAction.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100))
      );
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([{ id: "project1", name: "Project 1" }]);

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(false);

      const signInPromise = act(async () => {
        const promise = result.current.signIn("test@example.com", "password");
        expect(result.current.isLoading).toBe(true);
        return promise;
      });

      await signInPromise;
      expect(result.current.isLoading).toBe(false);
    });

    it("should clear loading state on error", async () => {
      mockSignInAction.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        try {
          await result.current.signIn("test@example.com", "password");
        } catch (error) {
          // Expected to throw
        }
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("signUp", () => {
    it("should handle successful sign up", async () => {
      const successResult = { success: true };
      mockSignUpAction.mockResolvedValue(successResult);
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([{ id: "project1", name: "Project 1" }]);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        const response = await result.current.signUp("test@example.com", "password");
        expect(response).toEqual(successResult);
      });

      expect(mockSignUpAction).toHaveBeenCalledWith("test@example.com", "password");
      expect(mockPush).toHaveBeenCalledWith("/project1");
    });

    it("should handle failed sign up", async () => {
      const errorResult = { success: false, error: "Email already exists" };
      mockSignUpAction.mockResolvedValue(errorResult);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        const response = await result.current.signUp("test@example.com", "password");
        expect(response).toEqual(errorResult);
      });

      expect(mockGetAnonWorkData).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });

    it("should set and clear loading state", async () => {
      mockSignUpAction.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100))
      );
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([{ id: "project1", name: "Project 1" }]);

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(false);

      const signUpPromise = act(async () => {
        const promise = result.current.signUp("test@example.com", "password");
        expect(result.current.isLoading).toBe(true);
        return promise;
      });

      await signUpPromise;
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("anonymous work handling", () => {
    it("should skip anonymous work if messages are empty", async () => {
      const mockAnonWork = {
        messages: [],
        fileSystemData: { files: {} },
      };
      const mockProjects = [{ id: "project1", name: "Project 1" }];

      mockSignInAction.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(mockAnonWork);
      mockGetProjects.mockResolvedValue(mockProjects);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "password");
      });

      expect(mockCreateProject).not.toHaveBeenCalled();
      expect(mockClearAnonWork).not.toHaveBeenCalled();
      expect(mockGetProjects).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/project1");
    });

    it("should handle null anonymous work data", async () => {
      const mockProjects = [{ id: "project1", name: "Project 1" }];

      mockSignInAction.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue(mockProjects);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "password");
      });

      expect(mockCreateProject).not.toHaveBeenCalled();
      expect(mockClearAnonWork).not.toHaveBeenCalled();
      expect(mockGetProjects).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/project1");
    });
  });
});