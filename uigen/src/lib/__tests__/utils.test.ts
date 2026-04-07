import { describe, it, expect } from "vitest";
import { cn } from "../utils";

describe("utils", () => {
  describe("cn function", () => {
    it("should merge class names correctly", () => {
      const result = cn("flex", "items-center", "justify-center");
      expect(result).toBe("flex items-center justify-center");
    });

    it("should handle conditional classes", () => {
      const isActive = true;
      const result = cn("base-class", isActive && "active-class", !isActive && "inactive-class");
      expect(result).toBe("base-class active-class");
    });

    it("should handle undefined and null values", () => {
      const result = cn("flex", undefined, null, "items-center");
      expect(result).toBe("flex items-center");
    });

    it("should handle empty inputs", () => {
      const result = cn();
      expect(result).toBe("");
    });

    it("should handle array of classes", () => {
      const result = cn(["flex", "items-center"], "justify-center");
      expect(result).toBe("flex items-center justify-center");
    });

    it("should handle object with boolean values", () => {
      const result = cn({
        "flex": true,
        "hidden": false,
        "items-center": true,
      });
      expect(result).toBe("flex items-center");
    });

    it("should resolve Tailwind conflicts using twMerge", () => {
      const result = cn("px-2 py-1", "px-4");
      expect(result).toBe("py-1 px-4");
    });

    it("should handle complex combinations", () => {
      const isLoading = false;
      const variant = "primary";
      const result = cn(
        "btn",
        {
          "btn-loading": isLoading,
          "btn-primary": variant === "primary",
          "btn-secondary": variant === "secondary",
        },
        "hover:opacity-80",
        isLoading && "cursor-not-allowed"
      );
      expect(result).toBe("btn btn-primary hover:opacity-80");
    });

    it("should handle whitespace and empty strings", () => {
      const result = cn("  ", "flex", "", "  items-center  ", null);
      expect(result).toBe("flex items-center");
    });

    it("should work with responsive classes", () => {
      const result = cn("block", "md:flex", "lg:grid");
      expect(result).toBe("block md:flex lg:grid");
    });

    it("should merge conflicting responsive classes correctly", () => {
      const result = cn("text-sm", "md:text-base", "text-lg");
      expect(result).toBe("md:text-base text-lg");
    });
  });
});