export const TokenType = {
// Keywords
FUNCTION: "FUNCTION",
RETURN: "RETURN",
STRUCT: "STRUCT",
IF: "IF",
ELSE: "ELSE",
FOR: "FOR",
IN: "IN",
TO: "TO",
    WHILE: "WHILE",
TRY: "TRY",
CATCH: "CATCH",
REVIEW: "REVIEW",
THROW: "THROW",
TRUE: "TRUE",
FALSE: "FALSE",
BREAK: "BREAK",
SKIP: "SKIP",
LOGICAL_AND: "LOGICAL_AND",
LOGICAL_OR: "LOGICAL_OR",
    LOGICAL_XOR: "LOGICAL_XOR",
NOT: "NOT",
    IMPORT: "IMPORT",
    SHARE: "SHARE",
    SHARED: "SHARED",
    TRANSFER: "TRANSFER",

    // Casting & Checks
    AS: "AS",
    HAS: "HAS",
    IS: "IS",
                 
    CONTAINS: "CONTAINS",
    MATCHES: "MATCHES",
    DELETE: "DELETE",
    SEARCH: "SEARCH",

    // String/List Ops
    REPLACE: "REPLACE",
       
    WITH: "WITH",
             
    SPLIT: "SPLIT",
           
    JOINED: "JOINED",

    // Inspection & Bytes
    INSPECT: "INSPECT",
    SIZE: "SIZE",
    TYPE: "TYPE",
    OF: "OF",
    PACK: "PACK",
    UNPACK: "UNPACK",
         
    // Null Coalescing
    QUESTION_QUESTION: "QUESTION_QUESTION",

// Types
TYPE_STRING: "TYPE_STRING",
TYPE_NUMBER: "TYPE_NUMBER",
TYPE_BOOL: "TYPE_BOOL",
TYPE_LIST: "TYPE_LIST",
TYPE_MAP: "TYPE_MAP",
TYPE_NULL: "TYPE_NULL",
     
TYPE_NONE: "TYPE_NONE",
TYPE_ANY: "TYPE_ANY",
    TYPE_NULLABLE: "TYPE_NULLABLE",

// Symbols & Operators
BANG: "BANG",
BANG_EQUAL: "BANG_EQUAL",
    EQUAL_EQUAL: "EQUAL_EQUAL",
    LESS_EQUAL: "LESS_EQUAL",
GREATER_EQUAL: "GREATER_EQUAL",
LANGLE: "LANGLE",
RANGLE: "RANGLE",
             // < > 
LPAREN: "LPAREN",
RPAREN: "RPAREN",
             // ( )
LBRACE: "LBRACE",
RBRACE: "RBRACE",
             // { }
LBRACKET: "LBRACKET",
RBRACKET: "RBRACKET",
     // [ ]
COMMA: "COMMA",
COLON: "COLON",
SEMICOLON: "SEMICOLON",
PIPE: "PIPE",
ASSIGN: "ASSIGN",
PLUS: "PLUS",
MINUS: "MINUS",
SLASH: "SLASH",
STAR: "STAR",
PERCENT: "PERCENT",
                             // %
     
AMPERSAND: "AMPERSAND",
                         // &
     
CARET: "CARET",
                                 // ^
     
MAGIC_VAR: "MAGIC_VAR",
                         // $

// Literals
IDENTIFIER: "IDENTIFIER",
STRING: "STRING",
NUMBER: "NUMBER",

// Special identifiers
PIPE_VALUE: "PIPE_VALUE",

// Control
EOF: "EOF"
};

export const GENERICSARRAY = [TokenType.TYPE_STRING, TokenType.TYPE_NUMBER, TokenType.TYPE_BOOL, TokenType.TYPE_LIST, TokenType.TYPE_MAP, TokenType.TYPE_ANY];

export const KEYWORDS = {
"function": TokenType.FUNCTION,
"return": TokenType.RETURN,
"struct": TokenType.STRUCT,
"if": TokenType.IF,
"else": TokenType.ELSE,
"for": TokenType.FOR,
"in": TokenType.IN,
"to": TokenType.TO,
    "while": TokenType.WHILE,
"try": TokenType.TRY,
"catch": TokenType.CATCH,
"review": TokenType.REVIEW,
     
"throw": TokenType.THROW, 
"true": TokenType.TRUE,
"false": TokenType.FALSE,
"break": TokenType.BREAK,
"skip": TokenType.SKIP,
"and": TokenType.LOGICAL_AND,
"or": TokenType.LOGICAL_OR,
"xor": TokenType.LOGICAL_XOR,
"not": TokenType.NOT,
    "import": TokenType.IMPORT,
    "share": TokenType.SHARE,
    "shared": TokenType.SHARED,
    "transfer": TokenType.TRANSFER,

    "as": TokenType.AS,
    "has": TokenType.HAS,
    "is": TokenType.IS,
                 
    "contains": TokenType.CONTAINS,
     
    "matches": TokenType.MATCHES,
    "replace": TokenType.REPLACE,
       
    "with": TokenType.WITH,
             
    "split": TokenType.SPLIT,
           
    "joined": TokenType.JOINED,
    "delete": TokenType.DELETE,
    "search": TokenType.SEARCH,
    "inspect": TokenType.INSPECT,
    "size": TokenType.SIZE,
    "type": TokenType.TYPE,
    "of": TokenType.OF,
    "pack": TokenType.PACK,
    "unpack": TokenType.UNPACK,


"string": TokenType.TYPE_STRING,
"number": TokenType.TYPE_NUMBER,
"bool": TokenType.TYPE_BOOL,
"list": TokenType.TYPE_LIST,
"map": TokenType.TYPE_MAP,
"null": TokenType.TYPE_NULL,
     
"none": TokenType.TYPE_NONE,
"any": TokenType.TYPE_ANY,
    "nullable": TokenType.TYPE_NULLABLE
};