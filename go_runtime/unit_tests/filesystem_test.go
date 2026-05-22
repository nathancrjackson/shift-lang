//go:build !core

package runtime_test

import (
	"os"
	"path/filepath"
	"testing"
)

func TestFilesystemIntrinsics(t *testing.T) {
	tempFile := filepath.Join(t.TempDir(), "test_file.txt")
	tempFolder := filepath.Join(t.TempDir(), "test_folder")

	code := `
	function test_create(string path) none {
		create_file(path);
	}
	function test_write(string path, string content) none {
		write_file(path, content);
	}
	function test_read(string path) string {
		return read_file(path);
	}
	function test_exists(string path) bool {
		return file_exists(path);
	}
	function test_delete(string path) none {
		delete_file(path);
	}
	function test_create_folder(string path) none {
		create_folder(path);
	}
	function test_folder_exists(string path) bool {
		return folder_exists(path);
	}
	function test_delete_folder(string path) none {
		delete_folder(path);
	}
	`

	rt, err := setupTestRuntime(code)
	if err != nil {
		t.Fatalf("Failed to setup runtime: %v", err)
	}

	// 1. Create file
	_, err = rt.RunFunction("test_create", []any{tempFile})
	if err != nil {
		t.Fatalf("Unexpected create_file error: %v", err)
	}
	if _, err := os.Stat(tempFile); os.IsNotExist(err) {
		t.Fatal("Expected file to be created, but it does not exist")
	}

	// 2. Write file
	_, err = rt.RunFunction("test_write", []any{tempFile, "hello shift"})
	if err != nil {
		t.Fatalf("Unexpected write_file error: %v", err)
	}

	// 3. Read file
	val, err := rt.RunFunction("test_read", []any{tempFile})
	if err != nil {
		t.Fatalf("Unexpected read_file error: %v", err)
	}
	if val != "hello shift" {
		t.Errorf("Expected 'hello shift', got %v", val)
	}

	// 4. File exists
	existsVal, err := rt.RunFunction("test_exists", []any{tempFile})
	if err != nil {
		t.Fatalf("Unexpected file_exists error: %v", err)
	}
	if existsVal != true {
		t.Errorf("Expected file_exists to return true, got %v", existsVal)
	}

	// 5. Delete file
	_, err = rt.RunFunction("test_delete", []any{tempFile})
	if err != nil {
		t.Fatalf("Unexpected delete_file error: %v", err)
	}
	if _, err := os.Stat(tempFile); !os.IsNotExist(err) {
		t.Fatal("Expected file to be deleted, but it still exists")
	}

	// 6. Create folder
	_, err = rt.RunFunction("test_create_folder", []any{tempFolder})
	if err != nil {
		t.Fatalf("Unexpected create_folder error: %v", err)
	}
	if info, err := os.Stat(tempFolder); os.IsNotExist(err) || !info.IsDir() {
		t.Fatal("Expected folder to be created")
	}

	// 7. Folder exists
	fExists, err := rt.RunFunction("test_folder_exists", []any{tempFolder})
	if err != nil {
		t.Fatalf("Unexpected folder_exists error: %v", err)
	}
	if fExists != true {
		t.Errorf("Expected folder_exists to return true, got %v", fExists)
	}

	// 8. Delete folder
	_, err = rt.RunFunction("test_delete_folder", []any{tempFolder})
	if err != nil {
		t.Fatalf("Unexpected delete_folder error: %v", err)
	}
	if _, err := os.Stat(tempFolder); !os.IsNotExist(err) {
		t.Fatal("Expected folder to be deleted")
	}
}
