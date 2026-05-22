/* -----

File and Folder Intrinsics tests

----- */

export const file_tests = {
    "Create and verify file":
    {
        "tests": [{ call: "run_test(\"test_file_create.txt\")", type: "bool", expect: true }],
        "code":
`function run_test(string path) bool {
    create_file(path);
    bool exists = file_exists(path);
    delete_file(path);
    return exists;
}`
    },

    "Write and read file":
    {
        "tests": [{ call: "run_test(\"test_file_write.txt\", \"hello from shift\")", type: "string", expect: "hello from shift" }],
        "code":
`function run_test(string path, string content) string {
    write_file(path, content);
    string res = read_file(path);
    delete_file(path);
    return res;
}`
    },

    "Copy and Move file":
    {
        "tests": [{ call: "run_test(\"test_src.txt\", \"test_dest.txt\")", type: "bool", expect: true }],
        "code":
`function run_test(string src, string dest) bool {
    write_file(src, "temp content");
    copy_file(src, dest);
    bool copy_exists = file_exists(dest);
    
    string dest_moved = dest + ".moved";
    move_file(dest, dest_moved);
    bool dest_exists = file_exists(dest);
    bool moved_exists = file_exists(dest_moved);
    
    delete_file(src);
    delete_file(dest_moved);
    
    return copy_exists and (dest_exists == false) and moved_exists;
}`
    },

    "Create and delete folder":
    {
        "tests": [{ call: "run_test(\"test_folder_create\")", type: "bool", expect: true }],
        "code":
`function run_test(string path) bool {
    create_folder(path);
    bool exists = folder_exists(path);
    delete_folder(path);
    return exists;
}`
    },

    "Copy and Move folder":
    {
        "tests": [{ call: "run_test(\"test_fsrc\", \"test_fdest\")", type: "bool", expect: true }],
        "code":
`function run_test(string src, string dest) bool {
    create_folder(src);
    string src_file = src + "/file.txt";
    write_file(src_file, "contents");
    
    copy_folder(src, dest);
    bool copy_exists = folder_exists(dest) and file_exists(dest + "/file.txt");
    
    string dest_moved = dest + "_moved";
    move_folder(dest, dest_moved);
    bool dest_exists = folder_exists(dest);
    bool moved_exists = folder_exists(dest_moved) and file_exists(dest_moved + "/file.txt");
    
    delete_folder(src);
    delete_folder(dest_moved);
    
    return copy_exists and (dest_exists == false) and moved_exists;
}`
    }
};
