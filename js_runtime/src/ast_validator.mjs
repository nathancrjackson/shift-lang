import schema from './ast_schema.json' with { type: 'json' };
import { ShiftValidationError } from './errors.mjs';
import { logger } from './logger.mjs';

/**
 * Validates a Shift AST Node against the formal JSON schema.
 * @param {Object} node - The AST node to validate.
 * @throws {ShiftValidationError} If validation fails or schema version is unsupported.
 */
export function validateAST(node) {
    // 1. Guard clauses
    if (node === null || node === undefined) {
        throw new ShiftValidationError("AST root cannot be null or undefined.");
    }
    if (typeof node !== 'object') {
        throw new ShiftValidationError(`AST root must be an object, got: ${typeof node}`);
    }

    // 2. Defensive Schema Version check
    if (!schema.version) {
        throw new ShiftValidationError("Schema Error: AST schema is missing version metadata.");
    }
    if (node.version !== schema.version) {
        throw new ShiftValidationError(`Schema Error: Unsupported AST schema version: '${node.version}'. Expected '${schema.version}'.`);
    }

    // 3. Structured Logging Checkpoint
    logger.trace("VALIDATOR", "Starting AST validation", { schemaVersion: schema.version });

    // Start validation against the root definition (usually Program)
    // The schema itself uses a $ref to Program at the root level
    validate(node, schema, schema.definitions, 'root');
}

/**
 * Recursive validation function.
 * @param {*} data - The data to check.
 * @param {Object} schemaNode - The current part of the JSON schema.
 * @param {Object} definitions - The global definitions object for resolving $refs.
 * @param {string} currentPath - Debug path for error reporting.
 * @throws {ShiftValidationError} If validation fails.
 */
function validate(data, schemaNode, definitions, currentPath) {
    // 1. Handle $ref (Pointer to another definition)
    if (schemaNode.$ref) {
        const refName = schemaNode.$ref.replace('#/definitions/', '');
        const refSchema = definitions[refName];
        if (!refSchema) throw new ShiftValidationError(`Schema Error: Missing definition '${refName}'`);
        validate(data, refSchema, definitions, currentPath);
        return;
    }

    // 2. Handle allOf (Composition/Inheritance)
    // Used in our schema to combine "Node" (start/end) with specific node props.
    if (schemaNode.allOf) {
        for (const subSchema of schemaNode.allOf) {
            validate(data, subSchema, definitions, currentPath);
        }
        return;
    }

    // 3. Handle oneOf (Polymorphism)
    // Used for Statement, Expression, etc.
    if (schemaNode.oneOf) {
        // Optimization: In an AST, we can discriminate based on the 'type' field.
        if (data && typeof data === 'object' && typeof data.type === 'string') {
            const targetType = data.type;
            
            // Check if the target type is allowed in this oneOf list
            // We do this by resolving refs and checking if they enforce this 'type' const
            const match = schemaNode.oneOf.find(sub => {
                const subDef = resolveRef(sub, definitions);
                return schemaEnforcesType(subDef, targetType, definitions);
            });

            if (match) {
                // Found the specific schema for this node type, validate against it strictly
                validate(data, match, definitions, currentPath);
                return;
            }
        }
        
        // If we couldn't match by 'type', or data is null, fail.
        // (Shift ASTs are strict, we don't need fuzzy matching for Nodes)
        // However, oneOf might be used for nullable fields: [ { $ref: ... }, { type: "null" } ]
        const validNull = schemaNode.oneOf.some(sub => sub.type === 'null');
        if (data === null && validNull) return;

        throw new ShiftValidationError(`Invalid AST: Unknown or unexpected node type '${data?.type}' at ${currentPath}. Expected one of the allowed types in schema.`);
    }

    // 4. Validate Types
    
    // 4a. Const (Exact match, used for 'type' discriminators)
    if (schemaNode.const !== undefined) {
        if (data !== schemaNode.const) {
            throw new ShiftValidationError(`Invalid AST: Field at ${currentPath} expected constant '${schemaNode.const}', got '${data}'`);
        }
    }

    // 4b. Enum
    if (schemaNode.enum) {
        if (!schemaNode.enum.includes(data)) {
            throw new ShiftValidationError(`Invalid AST: Field at ${currentPath} has invalid value '${data}'. Expected one of: ${schemaNode.enum.join(', ')}`);
        }
    }

    // 4c. Primitive Types
    if (schemaNode.type) {
        const expectedTypes = Array.isArray(schemaNode.type) ? schemaNode.type : [schemaNode.type];
        
        // Handle explicit null
        if (data === null) {
            if (expectedTypes.includes('null')) return;
            throw new ShiftValidationError(`Invalid AST: Field at ${currentPath} cannot be null.`);
        }

        const dataType = typeof data;
        
        if (expectedTypes.includes('integer')) {
            if (dataType !== 'number' || !Number.isInteger(data)) {
                throw new ShiftValidationError(`Invalid AST: Field at ${currentPath} expected integer, got ${data}`);
            }
            return;
        }

        if (expectedTypes.includes('number') && dataType === 'number') return;
        if (expectedTypes.includes('string') && dataType === 'string') return;
        if (expectedTypes.includes('boolean') && dataType === 'boolean') return;
        
        if (expectedTypes.includes('object')) {
             if (dataType !== 'object' || Array.isArray(data)) {
                 throw new ShiftValidationError(`Invalid AST: Field at ${currentPath} expected object, got ${Array.isArray(data) ? 'array' : dataType}`);
             }
             validateObject(data, schemaNode, definitions, currentPath);
             return;
        }

        if (expectedTypes.includes('array')) {
            if (!Array.isArray(data)) {
                throw new ShiftValidationError(`Invalid AST: Field at ${currentPath} expected array, got ${dataType}`);
            }
            validateArray(data, schemaNode, definitions, currentPath);
            return;
        }
    }
}

/**
 * Validate object properties and required fields.
 * @param {Object} data - The object to validate.
 * @param {Object} schema - The schema describing the object.
 * @param {Object} definitions - Global definitions dictionary.
 * @param {string} path - The validation path.
 * @throws {ShiftValidationError} If validation fails.
 */
function validateObject(data, schema, definitions, path) {
    // Check Required Fields
    if (schema.required) {
        for (const field of schema.required) {
            if (!(field in data)) {
                const nodeType = data.type ? `Node type '${data.type}'` : 'Object';
                // Try to infer index from path for better error message
                throw new ShiftValidationError(`Invalid AST: ${nodeType} at ${path} is missing required field '${field}'.`);
            }
        }
    }

    // Check Properties
    if (schema.properties) {
        for (const [key, propSchema] of Object.entries(schema.properties)) {
            if (key in data) {
                validate(data[key], propSchema, definitions, `${path}.${key}`);
            }
        }
    }
}

/**
 * Validate array items.
 * @param {Array} data - The array to validate.
 * @param {Object} schema - The schema describing the array items.
 * @param {Object} definitions - Global definitions dictionary.
 * @param {string} path - The validation path.
 * @throws {ShiftValidationError} If validation fails.
 */
function validateArray(data, schema, definitions, path) {
    if (schema.items) {
        data.forEach((item, index) => {
            validate(item, schema.items, definitions, `${path}[${index}]`);
        });
    }
}

/**
 * Resolve a schema $ref pointer.
 * @param {Object} schemaNode - The current schema node.
 * @param {Object} definitions - Global definitions dictionary.
 * @returns {Object} The resolved schema node.
 */
function resolveRef(schemaNode, definitions) {
    if (schemaNode.$ref) {
        const refName = schemaNode.$ref.replace('#/definitions/', '');
        return definitions[refName];
    }
    return schemaNode;
}

/**
 * Checks if a schema definition enforces a specific 'type' const property.
 * This handles the hierarchy: Definition -> allOf -> properties -> type -> const
 * @param {Object} schemaDef - The schema definition.
 * @param {string} targetType - The target type const value.
 * @param {Object} definitions - Global definitions dictionary.
 * @returns {boolean} True if the schema enforces the target type, otherwise false.
 */
function schemaEnforcesType(schemaDef, targetType, definitions) {
    if (!schemaDef) return false;

    // Direct property check
    if (schemaDef.properties?.type?.const === targetType) return true;

    // Check inside allOf (commonly used in our schema to mix in "type")
    if (schemaDef.allOf) {
        return schemaDef.allOf.some(sub => {
            const resolved = resolveRef(sub, definitions);
            return schemaEnforcesType(resolved, targetType, definitions);
        });
    }

    return false;
}