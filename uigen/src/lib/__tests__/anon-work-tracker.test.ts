import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  setHasAnonWork,
  getHasAnonWork,
  getAnonWorkData,
  clearAnonWork,
} from "../anon-work-tracker";

// Mock sessionStorage
const mockSessionStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

Object.defineProperty(window, "sessionStorage", {
  value: mockSessionStorage,
  writable: true,
});

describe("anon-work-tracker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the global window object for each test
    Object.defineProperty(global, "window", {
      value: { sessionStorage: mockSessionStorage },
      writable: true,
    });
  });

  describe("setHasAnonWork", () => {
    it("should set storage when messages exist", () => {
      const messages = [{ role: "user", content: "Hello" }];
      const fileSystemData = { "/": true };

      setHasAnonWork(messages, fileSystemData);

      expect(mockSessionStorage.setItem).toHaveBeenCalledWith("uigen_has_anon_work", "true");
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        "uigen_anon_data",
        JSON.stringify({ messages, fileSystemData })
      );
    });

    it("should set storage when fileSystemData has multiple keys", () => {
      const messages: any[] = [];
      const fileSystemData = { "/": true, "file1.txt": "content" };

      setHasAnonWork(messages, fileSystemData);

      expect(mockSessionStorage.setItem).toHaveBeenCalledWith("uigen_has_anon_work", "true");
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        "uigen_anon_data",
        JSON.stringify({ messages, fileSystemData })
      );
    });

    it("should not set storage when only root exists in fileSystemData and no messages", () => {
      const messages: any[] = [];
      const fileSystemData = { "/": true };

      setHasAnonWork(messages, fileSystemData);

      expect(mockSessionStorage.setItem).not.toHaveBeenCalled();
    });

    it("should not set storage when fileSystemData is empty and no messages", () => {
      const messages: any[] = [];
      const fileSystemData = {};

      setHasAnonWork(messages, fileSystemData);

      expect(mockSessionStorage.setItem).not.toHaveBeenCalled();
    });

    it("should handle server-side environment (window undefined)", () => {
      Object.defineProperty(global, "window", {
        value: undefined,
        writable: true,
      });

      const messages = [{ role: "user", content: "Hello" }];
      const fileSystemData = { "/": true, "file.txt": "content" };

      // Should not throw error
      expect(() => setHasAnonWork(messages, fileSystemData)).not.toThrow();
      expect(mockSessionStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe("getHasAnonWork", () => {
    it("should return true when storage contains 'true'", () => {
      mockSessionStorage.getItem.mockReturnValue("true");

      const result = getHasAnonWork();

      expect(result).toBe(true);
      expect(mockSessionStorage.getItem).toHaveBeenCalledWith("uigen_has_anon_work");
    });

    it("should return false when storage contains other values", () => {
      mockSessionStorage.getItem.mockReturnValue("false");

      const result = getHasAnonWork();

      expect(result).toBe(false);
    });

    it("should return false when storage is empty", () => {
      mockSessionStorage.getItem.mockReturnValue(null);

      const result = getHasAnonWork();

      expect(result).toBe(false);
    });

    it("should return false in server-side environment", () => {
      Object.defineProperty(global, "window", {
        value: undefined,
        writable: true,
      });

      const result = getHasAnonWork();

      expect(result).toBe(false);
      expect(mockSessionStorage.getItem).not.toHaveBeenCalled();
    });
  });

  describe("getAnonWorkData", () => {
    it("should return parsed data when valid JSON exists", () => {
      const mockData = {
        messages: [{ role: "user", content: "Hello" }],
        fileSystemData: { "/": true, "file.txt": "content" },
      };
      mockSessionStorage.getItem.mockReturnValue(JSON.stringify(mockData));

      const result = getAnonWorkData();

      expect(result).toEqual(mockData);
      expect(mockSessionStorage.getItem).toHaveBeenCalledWith("uigen_anon_data");
    });

    it("should return null when no data exists", () => {
      mockSessionStorage.getItem.mockReturnValue(null);

      const result = getAnonWorkData();

      expect(result).toBeNull();
    });

    it("should return null when JSON parsing fails", () => {
      mockSessionStorage.getItem.mockReturnValue("invalid json");

      const result = getAnonWorkData();

      expect(result).toBeNull();
    });

    it("should return null in server-side environment", () => {
      Object.defineProperty(global, "window", {
        value: undefined,
        writable: true,
      });

      const result = getAnonWorkData();

      expect(result).toBeNull();
      expect(mockSessionStorage.getItem).not.toHaveBeenCalled();
    });

    it("should handle empty string data", () => {
      mockSessionStorage.getItem.mockReturnValue("");

      const result = getAnonWorkData();

      expect(result).toBeNull();
    });

    it("should handle complex nested data structures", () => {
      const complexData = {
        messages: [
          { role: "user", content: "Hello" },
          { role: "assistant", content: "Hi there!" },
        ],
        fileSystemData: {
          "/": true,
          "components/": true,
          "components/Button.jsx": "export default function Button() { return <button>Click me</button>; }",
          "src/": true,
          "src/utils.js": "export const helper = () => {}",
        },
      };
      mockSessionStorage.getItem.mockReturnValue(JSON.stringify(complexData));

      const result = getAnonWorkData();

      expect(result).toEqual(complexData);
    });
  });

  describe("clearAnonWork", () => {
    it("should remove both storage keys", () => {
      clearAnonWork();

      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith("uigen_has_anon_work");
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith("uigen_anon_data");
    });

    it("should handle server-side environment gracefully", () => {
      Object.defineProperty(global, "window", {
        value: undefined,
        writable: true,
      });

      expect(() => clearAnonWork()).not.toThrow();
      expect(mockSessionStorage.removeItem).not.toHaveBeenCalled();
    });
  });

  describe("integration scenarios", () => {
    it("should handle complete workflow: set, get, clear", () => {
      const messages = [{ role: "user", content: "Create a button" }];
      const fileSystemData = { "/": true, "Button.jsx": "component code" };

      // Set work
      setHasAnonWork(messages, fileSystemData);
      expect(mockSessionStorage.setItem).toHaveBeenCalledTimes(2);

      // Mock the storage for getting
      mockSessionStorage.getItem
        .mockReturnValueOnce("true")
        .mockReturnValueOnce(JSON.stringify({ messages, fileSystemData }));

      // Get work status and data
      expect(getHasAnonWork()).toBe(true);
      expect(getAnonWorkData()).toEqual({ messages, fileSystemData });

      // Clear work
      clearAnonWork();
      expect(mockSessionStorage.removeItem).toHaveBeenCalledTimes(2);
    });

    it("should handle edge case with exactly one file system entry", () => {
      const messages: any[] = [];
      const fileSystemData = { "/": true }; // Only root exists

      setHasAnonWork(messages, fileSystemData);

      // Should not set storage since only root exists
      expect(mockSessionStorage.setItem).not.toHaveBeenCalled();
    });

    it("should handle edge case with exactly two file system entries", () => {
      const messages: any[] = [];
      const fileSystemData = { "/": true, "file.txt": "content" }; // Root + 1 file

      setHasAnonWork(messages, fileSystemData);

      // Should set storage since more than just root exists
      expect(mockSessionStorage.setItem).toHaveBeenCalledTimes(2);
    });
  });
});