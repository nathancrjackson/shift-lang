//go:build !core

package parser

import (
	"os"
	"path/filepath"
)

// DefaultImportResolver resolves files relative to the current file's directory on the physical filesystem.
func DefaultImportResolver(requestedPath string, currentFilePath string) (ImportResolution, error) {
	var fullPath string
	if currentFilePath != "" {
		parentDir := filepath.Dir(currentFilePath)
		fullPath = filepath.Join(parentDir, requestedPath)
	} else {
		cwd, err := os.Getwd()
		if err != nil {
			return ImportResolution{}, err
		}
		fullPath = filepath.Join(cwd, requestedPath)
	}

	absPath, err := filepath.Abs(fullPath)
	if err != nil {
		absPath = fullPath
	}

	bytes, err := os.ReadFile(absPath)
	if err != nil {
		return ImportResolution{}, err
	}

	return ImportResolution{
		Code:         string(bytes),
		ResolvedPath: absPath,
	}, nil
}
