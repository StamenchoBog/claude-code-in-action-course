import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildFileManagerTool } from "../file-manager";
import { VirtualFileSystem } from "../../file-system";

describe("buildFileManagerTool", () => {
  let mockFileSystem: VirtualFileSystem;
  let fileManagerTool: ReturnType<typeof buildFileManagerTool>;

  beforeEach(() => {
    mockFileSystem = {
      rename: vi.fn(),
      deleteFile: vi.fn(),
    } as any;

    fileManagerTool = buildFileManagerTool(mockFileSystem);
  });

  it("should create a tool with correct description and parameters", () => {
    expect(fileManagerTool.description).toContain("Rename or delete files or folders");
    expect(fileManagerTool.parameters).toBeDefined();
  });

  describe("rename command", () => {
    it("should successfully rename a file", async () => {
      vi.mocked(mockFileSystem.rename).mockReturnValue(true);

      const result = await fileManagerTool.execute({
        command: "rename",
        path: "old-file.txt",
        new_path: "new-file.txt",
      });

      expect(mockFileSystem.rename).toHaveBeenCalledWith("old-file.txt", "new-file.txt");
      expect(result).toEqual({
        success: true,
        message: "Successfully renamed old-file.txt to new-file.txt",
      });
    });

    it("should fail to rename a file when filesystem returns false", async () => {
      vi.mocked(mockFileSystem.rename).mockReturnValue(false);

      const result = await fileManagerTool.execute({
        command: "rename",
        path: "old-file.txt",
        new_path: "new-file.txt",
      });

      expect(mockFileSystem.rename).toHaveBeenCalledWith("old-file.txt", "new-file.txt");
      expect(result).toEqual({
        success: false,
        error: "Failed to rename old-file.txt to new-file.txt",
      });
    });

    it("should return error when new_path is not provided for rename", async () => {
      const result = await fileManagerTool.execute({
        command: "rename",
        path: "old-file.txt",
      });

      expect(result).toEqual({
        success: false,
        error: "new_path is required for rename command",
      });
      expect(mockFileSystem.rename).not.toHaveBeenCalled();
    });

    it("should handle renaming directories", async () => {
      vi.mocked(mockFileSystem.rename).mockReturnValue(true);

      const result = await fileManagerTool.execute({
        command: "rename",
        path: "old-dir/",
        new_path: "new-dir/",
      });

      expect(mockFileSystem.rename).toHaveBeenCalledWith("old-dir/", "new-dir/");
      expect(result).toEqual({
        success: true,
        message: "Successfully renamed old-dir/ to new-dir/",
      });
    });

    it("should handle moving files to different directories", async () => {
      vi.mocked(mockFileSystem.rename).mockReturnValue(true);

      const result = await fileManagerTool.execute({
        command: "rename",
        path: "file.txt",
        new_path: "subfolder/file.txt",
      });

      expect(mockFileSystem.rename).toHaveBeenCalledWith("file.txt", "subfolder/file.txt");
      expect(result).toEqual({
        success: true,
        message: "Successfully renamed file.txt to subfolder/file.txt",
      });
    });
  });

  describe("delete command", () => {
    it("should successfully delete a file", async () => {
      vi.mocked(mockFileSystem.deleteFile).mockReturnValue(true);

      const result = await fileManagerTool.execute({
        command: "delete",
        path: "file-to-delete.txt",
      });

      expect(mockFileSystem.deleteFile).toHaveBeenCalledWith("file-to-delete.txt");
      expect(result).toEqual({
        success: true,
        message: "Successfully deleted file-to-delete.txt",
      });
    });

    it("should fail to delete a file when filesystem returns false", async () => {
      vi.mocked(mockFileSystem.deleteFile).mockReturnValue(false);

      const result = await fileManagerTool.execute({
        command: "delete",
        path: "nonexistent-file.txt",
      });

      expect(mockFileSystem.deleteFile).toHaveBeenCalledWith("nonexistent-file.txt");
      expect(result).toEqual({
        success: false,
        error: "Failed to delete nonexistent-file.txt",
      });
    });

    it("should handle deleting directories", async () => {
      vi.mocked(mockFileSystem.deleteFile).mockReturnValue(true);

      const result = await fileManagerTool.execute({
        command: "delete",
        path: "directory-to-delete/",
      });

      expect(mockFileSystem.deleteFile).toHaveBeenCalledWith("directory-to-delete/");
      expect(result).toEqual({
        success: true,
        message: "Successfully deleted directory-to-delete/",
      });
    });

    it("should not require new_path for delete command", async () => {
      vi.mocked(mockFileSystem.deleteFile).mockReturnValue(true);

      const result = await fileManagerTool.execute({
        command: "delete",
        path: "file.txt",
        new_path: "ignored.txt", // Should be ignored
      });

      expect(mockFileSystem.deleteFile).toHaveBeenCalledWith("file.txt");
      expect(result).toEqual({
        success: true,
        message: "Successfully deleted file.txt",
      });
    });
  });

  describe("invalid commands", () => {
    it("should return error for invalid command", async () => {
      const result = await fileManagerTool.execute({
        command: "invalid" as any,
        path: "file.txt",
      });

      expect(result).toEqual({
        success: false,
        error: "Invalid command",
      });
      expect(mockFileSystem.rename).not.toHaveBeenCalled();
      expect(mockFileSystem.deleteFile).not.toHaveBeenCalled();
    });
  });

  describe("edge cases", () => {
    it("should handle empty paths", async () => {
      vi.mocked(mockFileSystem.rename).mockReturnValue(false);

      const result = await fileManagerTool.execute({
        command: "rename",
        path: "",
        new_path: "new.txt",
      });

      expect(mockFileSystem.rename).toHaveBeenCalledWith("", "new.txt");
      expect(result).toEqual({
        success: false,
        error: "Failed to rename  to new.txt",
      });
    });

    it("should handle special characters in paths", async () => {
      vi.mocked(mockFileSystem.rename).mockReturnValue(true);

      const result = await fileManagerTool.execute({
        command: "rename",
        path: "file with spaces & symbols!.txt",
        new_path: "new-file_name.txt",
      });

      expect(mockFileSystem.rename).toHaveBeenCalledWith(
        "file with spaces & symbols!.txt",
        "new-file_name.txt"
      );
      expect(result).toEqual({
        success: true,
        message: "Successfully renamed file with spaces & symbols!.txt to new-file_name.txt",
      });
    });
  });
});