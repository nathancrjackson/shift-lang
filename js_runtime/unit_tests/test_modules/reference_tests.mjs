/* -----

Reference tests (share/transfer)

----- */

export const reference_tests = {
    "Valid Sharing":
    {
        "tests": [{ call: "main()", type: "number", expect: 1001 }],
        "code":
            `function increase_num(shared map<number> counters) none {
    counters["beans"] = counters["beans"] + 1;
}

function main() number {
    map<number> some_counters;
    some_counters["beans"] = 1000;
    increase_num(share some_counters);
    return some_counters["beans"];
}`

    },
    "Valid Sharing With Return":
    {
        "tests": [{ call: "main()", type: "number", expect: 1001 }],
        "code":
            `function increase_num(shared map<number> counters) map<number> {
    counters["beans"] = counters["beans"] + 1;
    return counters;
}

function main() number {
    map<number> some_counters;
    some_counters["beans"] = 1000;
    map<number> more_counters = increase_num(share some_counters);
    some_counters["beans"] = 0;
    return more_counters["beans"];
}`

    },
    "Shared variables are immutable":
    {
        "tests": [{ type: "parser_error", expect: "Shared variable names cannot be reassigned." }],
        "code":
            `function increase_num(shared map<number> counters) none {
    counters["beans"] = counters["beans"] + 1;
    counters = ["peppers": 100];
}

function main() number {
    map<number> some_counters;
    some_counters["beans"] = 1000;
    increase_num(share some_counters);
    return some_counters["beans"];
}`

    },
    "Cannot Share Magic Variable Error":
    {
        "tests": [{ type: "parser_error", expect: "Magic variables cannot be used for shared arguments." }, { type: "parser_error_cascading" }],
        "code":
            `struct User [
	number id,
	string name
]

function create_user(number id, string name) User {
    User result;

    result = [
        "id": id,
        "name": name
    ];

    return result;
}

function update_user(shared User our_user, string name) none {
    our_user["name"] = name;
}

function main() number {
    User some_user = create_user(386, "Tim") | update_user(share $pipe_value, "Timothy");
    return some_user["id"];
}`

    },
    "Sharing Missing Share Error":
    {
        "tests": [{ type: "parser_error", expect: "Function expects shared argument." }],
        "code":
            `function increase_num(shared map<number> counters) none {
    counters["beans"] = counters["beans"] + 1;
}

function main() number {
    map<number> some_counters;
    some_counters["beans"] = 1000;
    increase_num(some_counters);
    return some_counters["beans"];
}`

    },
    "Sharing Missing Shared Error":
    {
        "tests": [{ type: "parser_error", expect: "Function does not expect shared argument." }],
        "code":
            `function increase_num(map<number> counters) none {
    counters["beans"] = counters["beans"] + 1;
}

function main() number {
    map<number> some_counters;
    some_counters["beans"] = 1000;
    increase_num(share some_counters);
    return some_counters["beans"];
}`

    },
    "Sharing Primitive Type Error":
    {
        "tests": [{ type: "parser_error", expect: "Primitive variables cannot be shared arguments." }, { type: "parser_error_cascading" }],
        "code":
            `function increase_num(shared number counter) none {
    counter = counter + 1;
}

function main() number {
    number some_counter = 1000;
    increase_num(share some_counter);
    return some_counter;
}`

    },
    "Valid Transfer":
    {
        "tests": [{ call: "main()", type: "number", expect: 386 }],
        "code":
            `struct User [
	number id,
	string name
]

function create_user(number id, string name) User {
    User result;

    result = [
        "id": id,
        "name": name
    ];

    transfer result;
}

function main() number {
    User some_user = create_user(386, "Tim");
    return some_user["id"];
}`

    },
    "Transfer type mismatch parser error":
    {
        "tests": [{ type: "parser_error", expect: "Transfer type mismatch." }],
        "code":
            `struct User [
	number id,
	string name
]
struct Guest [
	number id,
	string name
]

function create_user(number id, string name) User {
    Guest result;

    result = [
        "id": id,
        "name": name
    ];

    transfer result;
}

function main() number {
    User some_user = create_user(386, "Tim");
    return some_user["id"];
}`

    },
    "Transfer type mismatch runtime error":
    {
        "tests": [{ call: "main()", type: "runtime_error", expect: "Runtime Error: Transfer type mismatch." }],
        "code":
            `struct User [
	number id,
	string name
]
struct Guest [
	number id,
	string name
]

function create_user(number id, string name) User {
    list<any> tricky_list;
    Guest result;

    result = [
        "id": id,
        "name": name
    ];

    tricky_list[] = result;
    transfer tricky_list[0];
}

function main() number {
    User some_user = create_user(386, "Tim");
    return some_user["id"];
}`

    },
    "Tranferring Primitive Type Error":
    {
        "tests": [{ type: "parser_error", expect: "Primitive variables cannot be transferred." }],
        "code":
            `function pass_number(number num) number {
    number next_num = num + 1;
    transfer next_num;
}

function main() number {
    number some_number = 386;
    return pass_number(some_number);
}`

    },
    "Function Transfer Any Error":
    {
        "tests": [{ type: "parser_error", expect: "Functions using transfer cannot declare any as return." }],
        "code":
            `struct User [
	number id,
	string name
]

function main() any {
    User result;
    transfer result;
}`
    },
    "Transfer Shared Error":
    {
        "tests": [{ type: "parser_error", expect: "Shared variables and their nested collections cannot be transferred." }],
        "code":
            `function increase_num(shared map<number> counters) none {
    counters["beans"] = counters["beans"] + 1;
    transfer counters;
}

function main() number {
    map<number> some_counters;
    some_counters["beans"] = 1000;
    increase_num(share some_counters);
    return some_counters["beans"];
}`

    },
    "Transfer Shared Nested Error":
    {
        "tests": [{ type: "parser_error", expect: "Shared variables and their nested collections cannot be transferred." }],
        "code":
            `struct User [
	number id,
	string name
]

function get_first(shared list<User> user_list) User {
    transfer user_list[0];
}

function main() number {
    list<User> some_users;
    some_users[] = ["id": 286, "name": "Kim"];
    some_users[] = ["id": 386, "name": "Tim"];
    some_users[] = ["id": 486, "name": "Jim"];
    User result = get_first(share some_users);
    return result["id"];
}`

    },
    "Transfer and Return Mixed Error":
    {
        "tests": [{ type: "parser_error", expect: "Cannot Mix Return and Transfer in the same function." }],
        "code":
            `struct User [
	number id,
	string name
]

function create_user(number id, string name, bool transfer) User {
    User result;

    result = [
        "id": id,
        "name": name
    ];

    if (transfer)
    {
        transfer result;
    }

    return result;
}

function main() number {
    User some_user = create_user(386, "Tim", true);
    return some_user["id"];
}`

    },
    "Valid Transfer With Dead/Unreachable Code":
    {
        "tests": [{ call: "main()", type: "number", expect: 386 }],
        "code":
            `struct User [
	number id,
	string name
]

function create_user(number id, string name) User {
    User result;

    result = [
        "id": id,
        "name": name
    ];

    transfer result;

    result["id"] = 486;
}

function main() number {
    User some_user = create_user(386, "Tim");
    return some_user["id"];
}`
    }
};
