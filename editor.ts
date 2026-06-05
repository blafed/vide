interface Editor {

}

interface Selection {

}

const editor = {}
const selection = {}

function editor_import_file(file: File) {
    let raw = raw_create(file)
    let res = res_create(raw)
    return res
}

function editor_destroy_res(id: int) {

}

function editor_select_res(id: int) { }