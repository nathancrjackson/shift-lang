package runtime

import (
	"fmt"
)

// Environment holds variable definitions and parent environments for lexical scoping.
type Environment struct {
	Parent *Environment
	Values map[string]any
}

// NewEnvironment initializes a new lexical scope environment with an optional parent.
func NewEnvironment(parent *Environment) *Environment {
	return &Environment{
		Parent: parent,
		Values: make(map[string]any),
	}
}

// Define binds a variable name to a value in the current scope.
func (e *Environment) Define(name string, value any) {
	e.Values[name] = value
}

// Get resolves a variable value from the current environment or its ancestors.
func (e *Environment) Get(name string) (any, error) {
	if val, ok := e.Values[name]; ok {
		return val, nil
	}
	if e.Parent != nil {
		return e.Parent.Get(name)
	}
	return nil, fmt.Errorf("Runtime Error: Undefined variable '%s'.", name)
}

// Assign updates the value of an existing variable in the closest scope where it is defined.
func (e *Environment) Assign(name string, value any) error {
	if _, ok := e.Values[name]; ok {
		e.Values[name] = value
		return nil
	}
	if e.Parent != nil {
		return e.Parent.Assign(name, value)
	}
	return fmt.Errorf("Runtime Error: Undefined variable '%s'.", name)
}

// Runtime Signals for loop control and function returns.
const (
	SignalNone = iota
	SignalBreak
	SignalSkip
	SignalReturn
	SignalTransfer
)

// ShiftError represents a standard user-thrown runtime error exception.
type ShiftError struct{ Message string }

// Error implements the error interface for ShiftError.
func (e ShiftError) Error() string { return e.Message }

// ShiftAlert represents a warning or non-fatal exceptional state.
type ShiftAlert struct{ Message string }

// Error implements the error interface for ShiftAlert.
func (e ShiftAlert) Error() string { return e.Message }

// ShiftCritical represents a fatal exceptional state that aborts execution.
type ShiftCritical struct{ Message string }

// Error implements the error interface for ShiftCritical.
func (e ShiftCritical) Error() string { return e.Message }

// ShiftMap represents a dynamic dictionary with insertion-ordered keys and support for strict type labeling.
type ShiftMap struct {
	Data       map[string]any
	StructName string // Equivalent to Map.__shift_type
	Keys       []string
}

// NewShiftMap instantiates a new empty ShiftMap.
func NewShiftMap() *ShiftMap {
	return &ShiftMap{
		Data:       make(map[string]any),
		StructName: "",
		Keys:       make([]string, 0),
	}
}

// Set adds or updates a key-value pair, preserving key insertion order.
func (m *ShiftMap) Set(k string, v any) {
	if _, exists := m.Data[k]; !exists {
		m.Keys = append(m.Keys, k)
	}
	m.Data[k] = v
}

// Delete removes a key-value pair and its key from the insertion order tracking.
func (m *ShiftMap) Delete(k string) {
	if _, exists := m.Data[k]; exists {
		delete(m.Data, k)
		for i, key := range m.Keys {
			if key == k {
				m.Keys = append(m.Keys[:i], m.Keys[i+1:]...)
				break
			}
		}
	}
}
