package runtime

import (
	"fmt"
)

type Environment struct {
	Parent *Environment
	Values map[string]any
}

func NewEnvironment(parent *Environment) *Environment {
	return &Environment{
		Parent: parent,
		Values: make(map[string]any),
	}
}

func (e *Environment) Define(name string, value any) {
	e.Values[name] = value
}

func (e *Environment) Get(name string) (any, error) {
	if val, ok := e.Values[name]; ok {
		return val, nil
	}
	if e.Parent != nil {
		return e.Parent.Get(name)
	}
	return nil, fmt.Errorf("Runtime Error: Undefined variable '%s'.", name)
}

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

// Runtime Signals
const (
	SignalNone = iota
	SignalBreak
	SignalSkip
	SignalReturn
)

// Specific Error exceptions to mimic JS exceptions for try/catch/review
type ShiftError struct{ Message string }

func (e ShiftError) Error() string { return e.Message }

type ShiftAlert struct{ Message string }

func (e ShiftAlert) Error() string { return e.Message }

type ShiftCritical struct{ Message string }

func (e ShiftCritical) Error() string { return e.Message }

// Shift-specific map struct to hold the JS Map behavior + __shift_type property
type ShiftMap struct {
	Data       map[string]any
	StructName string // Equivalent to Map.__shift_type
	Keys       []string
}

func NewShiftMap() *ShiftMap {
	return &ShiftMap{
		Data:       make(map[string]any),
		StructName: "",
		Keys:       make([]string, 0),
	}
}

func (m *ShiftMap) Set(k string, v any) {
	if _, exists := m.Data[k]; !exists {
		m.Keys = append(m.Keys, k)
	}
	m.Data[k] = v
}

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
