//go:build !core

package stdlib

import (
	"io"
	"os"
	"path/filepath"

	"github.com/nathancrjackson/shift-lang/go_runtime/pkg/ast"
	"github.com/nathancrjackson/shift-lang/go_runtime/pkg/runtime"
)

func copyFile(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()

	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer out.Close()

	_, err = io.Copy(out, in)
	if err != nil {
		return err
	}
	return out.Sync()
}

func copyFolder(src, dst string) error {
	info, err := os.Stat(src)
	if err != nil {
		return err
	}

	err = os.MkdirAll(dst, info.Mode())
	if err != nil {
		return err
	}

	directory, err := os.ReadDir(src)
	if err != nil {
		return err
	}

	for _, entry := range directory {
		srcPath := filepath.Join(src, entry.Name())
		dstPath := filepath.Join(dst, entry.Name())

		if entry.IsDir() {
			err = copyFolder(srcPath, dstPath)
			if err != nil {
				return err
			}
		} else {
			err = copyFile(srcPath, dstPath)
			if err != nil {
				return err
			}
		}
	}
	return nil
}

func init() {
	Intrinsics["read_file"] = IntrinsicDef{
		ReturnType: "string",
		Params:     []ast.Parameter{{Name: "path", DataType: ast.TypeAnnotation{Name: "string"}}},
		Func: func(args []any, rt *runtime.Runtime) any {
			path, ok := args[0].(string)
			if !ok {
				panic(runtime.ShiftError{Message: "Runtime Error: read_file expects string path."})
			}
			bytes, err := os.ReadFile(path)
			if err != nil {
				panic(runtime.ShiftError{Message: "Runtime Error: read_file failed: " + err.Error()})
			}
			return string(bytes)
		},
	}
	Intrinsics["write_file"] = IntrinsicDef{
		ReturnType: "none",
		Params:     []ast.Parameter{{Name: "path", DataType: ast.TypeAnnotation{Name: "string"}}, {Name: "content", DataType: ast.TypeAnnotation{Name: "string"}}},
		Func: func(args []any, rt *runtime.Runtime) any {
			path, ok := args[0].(string)
			if !ok {
				panic(runtime.ShiftError{Message: "Runtime Error: write_file expects string path."})
			}
			content, ok := args[1].(string)
			if !ok {
				panic(runtime.ShiftError{Message: "Runtime Error: write_file expects string content."})
			}
			err := os.WriteFile(path, []byte(content), 0644)
			if err != nil {
				panic(runtime.ShiftError{Message: "Runtime Error: write_file failed: " + err.Error()})
			}
			return nil
		},
	}
	Intrinsics["create_file"] = IntrinsicDef{
		ReturnType: "none",
		Params:     []ast.Parameter{{Name: "path", DataType: ast.TypeAnnotation{Name: "string"}}},
		Func: func(args []any, rt *runtime.Runtime) any {
			path, ok := args[0].(string)
			if !ok {
				panic(runtime.ShiftError{Message: "Runtime Error: create_file expects string path."})
			}
			file, err := os.Create(path)
			if err != nil {
				panic(runtime.ShiftError{Message: "Runtime Error: create_file failed: " + err.Error()})
			}
			file.Close()
			return nil
		},
	}
	Intrinsics["delete_file"] = IntrinsicDef{
		ReturnType: "none",
		Params:     []ast.Parameter{{Name: "path", DataType: ast.TypeAnnotation{Name: "string"}}},
		Func: func(args []any, rt *runtime.Runtime) any {
			path, ok := args[0].(string)
			if !ok {
				panic(runtime.ShiftError{Message: "Runtime Error: delete_file expects string path."})
			}
			err := os.Remove(path)
			if err != nil {
				panic(runtime.ShiftError{Message: "Runtime Error: delete_file failed: " + err.Error()})
			}
			return nil
		},
	}
	Intrinsics["file_exists"] = IntrinsicDef{
		ReturnType: "bool",
		Params:     []ast.Parameter{{Name: "path", DataType: ast.TypeAnnotation{Name: "string"}}},
		Func: func(args []any, rt *runtime.Runtime) any {
			path, ok := args[0].(string)
			if !ok {
				panic(runtime.ShiftError{Message: "Runtime Error: file_exists expects string path."})
			}
			info, err := os.Stat(path)
			if err != nil {
				return false
			}
			return !info.IsDir()
		},
	}
	Intrinsics["copy_file"] = IntrinsicDef{
		ReturnType: "none",
		Params:     []ast.Parameter{{Name: "source", DataType: ast.TypeAnnotation{Name: "string"}}, {Name: "dest", DataType: ast.TypeAnnotation{Name: "string"}}},
		Func: func(args []any, rt *runtime.Runtime) any {
			src, ok := args[0].(string)
			if !ok {
				panic(runtime.ShiftError{Message: "Runtime Error: copy_file expects string source."})
			}
			dst, ok := args[1].(string)
			if !ok {
				panic(runtime.ShiftError{Message: "Runtime Error: copy_file expects string destination."})
			}
			err := copyFile(src, dst)
			if err != nil {
				panic(runtime.ShiftError{Message: "Runtime Error: copy_file failed: " + err.Error()})
			}
			return nil
		},
	}
	Intrinsics["move_file"] = IntrinsicDef{
		ReturnType: "none",
		Params:     []ast.Parameter{{Name: "source", DataType: ast.TypeAnnotation{Name: "string"}}, {Name: "dest", DataType: ast.TypeAnnotation{Name: "string"}}},
		Func: func(args []any, rt *runtime.Runtime) any {
			src, ok := args[0].(string)
			if !ok {
				panic(runtime.ShiftError{Message: "Runtime Error: move_file expects string source."})
			}
			dst, ok := args[1].(string)
			if !ok {
				panic(runtime.ShiftError{Message: "Runtime Error: move_file expects string destination."})
			}
			err := os.Rename(src, dst)
			if err != nil {
				panic(runtime.ShiftError{Message: "Runtime Error: move_file failed: " + err.Error()})
			}
			return nil
		},
	}
	Intrinsics["create_folder"] = IntrinsicDef{
		ReturnType: "none",
		Params:     []ast.Parameter{{Name: "path", DataType: ast.TypeAnnotation{Name: "string"}}},
		Func: func(args []any, rt *runtime.Runtime) any {
			path, ok := args[0].(string)
			if !ok {
				panic(runtime.ShiftError{Message: "Runtime Error: create_folder expects string path."})
			}
			err := os.MkdirAll(path, 0755)
			if err != nil {
				panic(runtime.ShiftError{Message: "Runtime Error: create_folder failed: " + err.Error()})
			}
			return nil
		},
	}
	Intrinsics["delete_folder"] = IntrinsicDef{
		ReturnType: "none",
		Params:     []ast.Parameter{{Name: "path", DataType: ast.TypeAnnotation{Name: "string"}}},
		Func: func(args []any, rt *runtime.Runtime) any {
			path, ok := args[0].(string)
			if !ok {
				panic(runtime.ShiftError{Message: "Runtime Error: delete_folder expects string path."})
			}
			err := os.RemoveAll(path)
			if err != nil {
				panic(runtime.ShiftError{Message: "Runtime Error: delete_folder failed: " + err.Error()})
			}
			return nil
		},
	}
	Intrinsics["folder_exists"] = IntrinsicDef{
		ReturnType: "bool",
		Params:     []ast.Parameter{{Name: "path", DataType: ast.TypeAnnotation{Name: "string"}}},
		Func: func(args []any, rt *runtime.Runtime) any {
			path, ok := args[0].(string)
			if !ok {
				panic(runtime.ShiftError{Message: "Runtime Error: folder_exists expects string path."})
			}
			info, err := os.Stat(path)
			if err != nil {
				return false
			}
			return info.IsDir()
		},
	}
	Intrinsics["copy_folder"] = IntrinsicDef{
		ReturnType: "none",
		Params:     []ast.Parameter{{Name: "source", DataType: ast.TypeAnnotation{Name: "string"}}, {Name: "dest", DataType: ast.TypeAnnotation{Name: "string"}}},
		Func: func(args []any, rt *runtime.Runtime) any {
			src, ok := args[0].(string)
			if !ok {
				panic(runtime.ShiftError{Message: "Runtime Error: copy_folder expects string source."})
			}
			dst, ok := args[1].(string)
			if !ok {
				panic(runtime.ShiftError{Message: "Runtime Error: copy_folder expects string destination."})
			}
			err := copyFolder(src, dst)
			if err != nil {
				panic(runtime.ShiftError{Message: "Runtime Error: copy_folder failed: " + err.Error()})
			}
			return nil
		},
	}
	Intrinsics["move_folder"] = IntrinsicDef{
		ReturnType: "none",
		Params:     []ast.Parameter{{Name: "source", DataType: ast.TypeAnnotation{Name: "string"}}, {Name: "dest", DataType: ast.TypeAnnotation{Name: "string"}}},
		Func: func(args []any, rt *runtime.Runtime) any {
			src, ok := args[0].(string)
			if !ok {
				panic(runtime.ShiftError{Message: "Runtime Error: move_folder expects string source."})
			}
			dst, ok := args[1].(string)
			if !ok {
				panic(runtime.ShiftError{Message: "Runtime Error: move_folder expects string destination."})
			}
			err := os.Rename(src, dst)
			if err != nil {
				panic(runtime.ShiftError{Message: "Runtime Error: move_folder failed: " + err.Error()})
			}
			return nil
		},
	}
}
