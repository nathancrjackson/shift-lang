package ast

import "fmt"

func ValidateAST(prog *Program) error {
	for _, s := range prog.Structs {
		if err := validateStructRecursion(s, prog, []string{s.Name}); err != nil {
			return err
		}
	}
	return nil
}

func validateStructRecursion(s StructDeclaration, prog *Program, path []string) error {
	for _, field := range s.Fields {
		// Only flat struct types can cause direct looping, omitting nullable or list which are refs
		if field.Type.Type == "StructType" && field.Type.Name != "nullable" && field.Type.Name != "list" && field.Type.Name != "map" {
			target := field.Type.Name

			for i, prev := range path {
				if prev == target {
					if i == len(path)-1 {
						return fmt.Errorf("Recursive struct definition detected for '%s'. Use 'nullable<%s>' or 'list<%s>' to break the cycle.", target, target, target)
					}

					cycle := ""
					for _, p := range path[i:] {
						cycle += p + " -> "
					}
					cycle += target
					return fmt.Errorf("Circular struct definition detected: %s. Use 'nullable' or 'list' generics to break the cycle.", cycle)
				}
			}

			// find struct and crawl deeper
			for _, childStruct := range prog.Structs {
				if childStruct.Name == target {
					newPath := append([]string{}, path...)
					newPath = append(newPath, target)
					if err := validateStructRecursion(childStruct, prog, newPath); err != nil {
						return err
					}
				}
			}
		}
	}
	return nil
}
