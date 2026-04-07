import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildStrReplaceTool } from "../str-replace";
import { VirtualFileSystem } from "../../file-system";

describe("buildStrReplaceTool", () => {
  let mockFileSystem: VirtualFileSystem;
  let strReplaceTool: ReturnType<typeof buildStrReplaceTool>;

  beforeEach(() => {
    mockFileSystem = {
      viewFile: vi.fn(),
      createFileWithParents: vi.fn(),
      replaceInFile: vi.fn(),
      insertInFile: vi.fn(),
    } as any;

    strReplaceTool = buildStrReplaceTool(mockFileSystem);
  });

  it("should create a tool with correct structure", () => {
    expect(strReplaceTool.id).toBe("str_replace_editor");
    expect(strReplaceTool.parameters).toBeDefined();
    expect(typeof strReplaceTool.execute).toBe("function");
  });

  describe("view command", () => {
    it("should view a file without range", async () => {
      const mockFileContent = "File content";
      vi.mocked(mockFileSystem.viewFile).mockReturnValue(mockFileContent);

      const result = await strReplaceTool.execute({
        command: "view",
        path: "test.txt",
      });

      expect(mockFileSystem.viewFile).toHaveBeenCalledWith("test.txt", undefined);
      expect(result).toBe(mockFileContent);
    });

    it("should view a file with range", async () => {
      const mockFileContent = "Partial file content";
      vi.mocked(mockFileSystem.viewFile).mockReturnValue(mockFileContent);

      const result = await strReplaceTool.execute({
        command: "view",
        path: "test.txt",
        view_range: [1, 10],
      });

      expect(mockFileSystem.viewFile).toHaveBeenCalledWith("test.txt", [1, 10]);
      expect(result).toBe(mockFileContent);
    });

    it("should handle viewing nonexistent files", async () => {
      const mockError = "File not found";
      vi.mocked(mockFileSystem.viewFile).mockReturnValue(mockError);

      const result = await strReplaceTool.execute({
        command: "view",
        path: "nonexistent.txt",
      });

      expect(result).toBe(mockError);
    });
  });

  describe("create command", () => {
    it("should create a file with content", async () => {
      const mockResult = "File created successfully";
      vi.mocked(mockFileSystem.createFileWithParents).mockReturnValue(mockResult);

      const result = await strReplaceTool.execute({
        command: "create",
        path: "new-file.txt",
        file_text: "Hello, world!",
      });

      expect(mockFileSystem.createFileWithParents).toHaveBeenCalledWith(
        "new-file.txt",
        "Hello, world!"
      );
      expect(result).toBe(mockResult);
    });

    it("should create a file with empty content when file_text not provided", async () => {
      const mockResult = "Empty file created";
      vi.mocked(mockFileSystem.createFileWithParents).mockReturnValue(mockResult);

      const result = await strReplaceTool.execute({
        command: "create",
        path: "empty-file.txt",
      });

      expect(mockFileSystem.createFileWithParents).toHaveBeenCalledWith("empty-file.txt", "");
      expect(result).toBe(mockResult);
    });

    it("should handle creating files in nested directories", async () => {
      const mockResult = "Nested file created";
      vi.mocked(mockFileSystem.createFileWithParents).mockReturnValue(mockResult);

      const result = await strReplaceTool.execute({
        command: "create",
        path: "deep/nested/path/file.txt",
        file_text: "Content",
      });

      expect(mockFileSystem.createFileWithParents).toHaveBeenCalledWith(
        "deep/nested/path/file.txt",
        "Content"
      );
      expect(result).toBe(mockResult);
    });
  });

  describe("str_replace command", () => {
    it("should replace text in a file", async () => {
      const mockResult = "Text replaced successfully";
      vi.mocked(mockFileSystem.replaceInFile).mockReturnValue(mockResult);

      const result = await strReplaceTool.execute({
        command: "str_replace",
        path: "test.txt",
        old_str: "old text",
        new_str: "new text",
      });

      expect(mockFileSystem.replaceInFile).toHaveBeenCalledWith("test.txt", "old text", "new text");
      expect(result).toBe(mockResult);
    });

    it("should handle empty strings for replace", async () => {
      const mockResult = "Empty string replaced";
      vi.mocked(mockFileSystem.replaceInFile).mockReturnValue(mockResult);

      const result = await strReplaceTool.execute({
        command: "str_replace",
        path: "test.txt",
        old_str: "",
        new_str: "",
      });

      expect(mockFileSystem.replaceInFile).toHaveBeenCalledWith("test.txt", "", "");
      expect(result).toBe(mockResult);
    });

    it("should use empty strings when old_str or new_str not provided", async () => {
      const mockResult = "Default replace";
      vi.mocked(mockFileSystem.replaceInFile).mockReturnValue(mockResult);

      const result = await strReplaceTool.execute({
        command: "str_replace",
        path: "test.txt",
      });

      expect(mockFileSystem.replaceInFile).toHaveBeenCalledWith("test.txt", "", "");
      expect(result).toBe(mockResult);
    });

    it("should handle multiline text replacement", async () => {
      const mockResult = "Multiline replaced";
      vi.mocked(mockFileSystem.replaceInFile).mockReturnValue(mockResult);

      const result = await strReplaceTool.execute({
        command: "str_replace",
        path: "test.txt",
        old_str: "line 1\nline 2",
        new_str: "new line 1\nnew line 2\nnew line 3",
      });

      expect(mockFileSystem.replaceInFile).toHaveBeenCalledWith(
        "test.txt",
        "line 1\nline 2",
        "new line 1\nnew line 2\nnew line 3"
      );
      expect(result).toBe(mockResult);
    });
  });

  describe("insert command", () => {
    it("should insert text at specified line", async () => {
      const mockResult = "Text inserted successfully";
      vi.mocked(mockFileSystem.insertInFile).mockReturnValue(mockResult);

      const result = await strReplaceTool.execute({
        command: "insert",
        path: "test.txt",
        insert_line: 5,
        new_str: "Inserted text",
      });

      expect(mockFileSystem.insertInFile).toHaveBeenCalledWith("test.txt", 5, "Inserted text");
      expect(result).toBe(mockResult);
    });

    it("should insert at line 0 when insert_line not provided", async () => {
      const mockResult = "Text inserted at beginning";
      vi.mocked(mockFileSystem.insertInFile).mockReturnValue(mockResult);

      const result = await strReplaceTool.execute({
        command: "insert",
        path: "test.txt",
        new_str: "Header text",
      });

      expect(mockFileSystem.insertInFile).toHaveBeenCalledWith("test.txt", 0, "Header text");
      expect(result).toBe(mockResult);
    });

    it("should insert empty string when new_str not provided", async () => {
      const mockResult = "Empty line inserted";
      vi.mocked(mockFileSystem.insertInFile).mockReturnValue(mockResult);

      const result = await strReplaceTool.execute({
        command: "insert",
        path: "test.txt",
        insert_line: 3,
      });

      expect(mockFileSystem.insertInFile).toHaveBeenCalledWith("test.txt", 3, "");
      expect(result).toBe(mockResult);
    });

    it("should handle inserting multiline text", async () => {
      const mockResult = "Multiline inserted";
      vi.mocked(mockFileSystem.insertInFile).mockReturnValue(mockResult);

      const result = await strReplaceTool.execute({
        command: "insert",
        path: "test.txt",
        insert_line: 2,
        new_str: "Line 1\nLine 2\nLine 3",
      });

      expect(mockFileSystem.insertInFile).toHaveBeenCalledWith("test.txt", 2, "Line 1\nLine 2\nLine 3");
      expect(result).toBe(mockResult);
    });
  });

  describe("undo_edit command", () => {
    it("should return error message for undo_edit", async () => {
      const result = await strReplaceTool.execute({
        command: "undo_edit",
        path: "test.txt",
      });

      expect(result).toBe("Error: undo_edit command is not supported in this version. Use str_replace to revert changes.");
      expect(mockFileSystem.viewFile).not.toHaveBeenCalled();
      expect(mockFileSystem.createFileWithParents).not.toHaveBeenCalled();
      expect(mockFileSystem.replaceInFile).not.toHaveBeenCalled();
      expect(mockFileSystem.insertInFile).not.toHaveBeenCalled();
    });
  });

  describe("parameter validation", () => {
    it("should handle all optional parameters", async () => {
      const mockResult = "Minimal execution";
      vi.mocked(mockFileSystem.viewFile).mockReturnValue(mockResult);

      const result = await strReplaceTool.execute({
        command: "view",
        path: "test.txt",
      });

      expect(result).toBe(mockResult);
    });

    it("should work with complex file paths", async () => {
      const mockResult = "Complex path handled";
      vi.mocked(mockFileSystem.viewFile).mockReturnValue(mockResult);

      const result = await strReplaceTool.execute({
        command: "view",
        path: "src/components/ui/complex-component.tsx",
      });

      expect(mockFileSystem.viewFile).toHaveBeenCalledWith("src/components/ui/complex-component.tsx", undefined);
      expect(result).toBe(mockResult);
    });
  });
});