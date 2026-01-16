/* -----

Complex tests

----- */

export const complex_tests = {
    "Weather script":
    {
        "tests": [
            { call: "get_city_value(\"MELBOURNE\", \"display_name\")", type: "string", expect: "Melbourne, VIC" },
            { call: "get_city_value(\"SYDNEY\", \"temperature\")", type: "string", expect: "25" }
        ],
        "code":
`function build_city_report(string name, list<string> data, map<any> meta) map<any> {

    number temp_c = 0;
    try {
        temp_c = data[1] as number;
    } catch {
        print_line($throw_message);
        throw error "Could not convert temp to number";
    }

    map<any> info = meta[name];

    map<any> final_report;

    final_report["display_name"] = info["full_name"];
    final_report["location"]     = info["coordinates"];
    final_report["weather_icon"] = info["icon"];
    final_report["temperature"]  = temp_c;
    final_report["original_raw"] = data[0];

    return final_report;
}
    
function get_city_weather(string target_city) map<any> {

    string raw_csv = "City,Temp,Humidity\\nSydney,25,60\\n Melbourne ,18,55\\nBrisbane,30,70";

    map<any> city_metadata;
    
    map<any> mel_info;
    mel_info["full_name"] = "Melbourne, VIC";
    mel_info["coordinates"] = "37.8S, 144.9E";
    mel_info["icon"] = "🌧️";
    
    city_metadata["MELBOURNE"] = mel_info;

    map<any> syd_info;
    syd_info["full_name"] = "Sydney, NSW";
    syd_info["coordinates"] = "33.8S, 151.2E";
    syd_info["icon"] = "☀️";
    
    city_metadata["SYDNEY"] = syd_info;

    list<string> rows = split_stringtolist(raw_csv, "\\n");

    number index = -1;
    for (row_str in rows) {
        index = index + 1;

        if (index == 0) { skip; }
        if (size of row_str < 3) { skip; }

        list<string> cols = split_stringtolist(row_str, ",");
    
        string city_key = cols[0] 
            | trim_string($pipe_value) 
            | ansitransform_toupper($pipe_value);

        if (city_key == target_city) {
            return build_city_report(city_key, cols, city_metadata);
        }
    }

    throw error "Could not build report for requested city";
}

function get_city_value(string target_city, string data_key) string {
    map<any> city_data = get_city_weather(target_city);

    return city_data[data_key] as string;
}`
    },
    "User script":
    {
        "tests": [
            { call: "main()", type: "number", expect: 0 }
        ],
        "code":
`
struct User [
    string $name, // 1. The prefix $ indicates fields that are both required and immutable
    string role,
    number login_count
]

function main() number {
    
    // 2. Define data structures (Map Literal)
    User our_user = [
        "$name": "alice",
        "role": "  admin  ",
        "login_count": 42
    ];

    // 3. Logic using "Pipes" for clean transformation
    // "$pipe_value" explicitly shows where the data goes
    our_user["role"] = our_user["role"] 
        | trim_string($pipe_value) 
        | ansitransform_toupper($pipe_value);

    // 4. Output
    string msg = "User " & our_user["$name"] & " is ready.";
    print_textline(msg);

    // 5. Error Handling with Magic Variables
    try {
        if (our_user["login_count"] < 0) {
            throw error "Invalid login count";
        }
    } catch {
        print_textline("Audit failed: " + $thrown_message);
        return 1;
    }

    return 0;
}

// This is here so we don't actually output text during tests
function print_textline(string msg) none {
    msg = "We're doing nothing with: " & msg;
}
`
    }
};