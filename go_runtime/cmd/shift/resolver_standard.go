//go:build !core

package main

import (
	"os"
	"path/filepath"

	"github.com/nathancrjackson/shift-lang/go_runtime/pkg/parser"
)

func getImportResolver() parser.ImportResolver {
	return func(requestedPath string, currentFilePath string) (parser.ImportResolution, error) {
		var fullPath string
		if currentFilePath != "" {
			parentDir := filepath.Dir(currentFilePath)
			fullPath = filepath.Join(parentDir, requestedPath)
		} else {
			cwd, err := os.Getwd()
			if err != nil {
				return parser.ImportResolution{}, err
			}
			fullPath = filepath.Join(cwd, requestedPath)
		}

		absPath, err := filepath.Abs(fullPath)
		if err != nil {
			absPath = fullPath
		}

		bytes, err := os.ReadFile(absPath)
		if err != nil {
			return parser.ImportResolution{}, err
		}

		return parser.ImportResolution{
			Code:         string(bytes),
			ResolvedPath: absPath,
		}, nil
	}
}
