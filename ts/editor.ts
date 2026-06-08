let project: Project
const editor = {
    assets_order: OrderBy.Name,
    assets_desc: false,
    assets: <Asset[]>[],
    tracks: <Track[]>[],
    sel_beh: SelBeh.Replace,
}

const enum SelBeh {
    Replace, Append
}


const enum SelMode {
    None, Track = 1, Asset = 2, All = -1
}

const sel = {
    tracks: <Track[]>[],
    assets: <Asset[]>[],
}

const enum OrderBy {
    Name, Type, Date,
}

function editor_init() { }
function editor_project_new() {
    project = { file: [], res: [], asset: [], track: [], item: [], fps: 30 }
    project_track_create(project, ItemType.Video)

    editor_assets_refresh()
    editor_tracks_refresh()
}

function editor_import_open() {
    ui.file.click()
}

async function editor_import(f: File) {
    if (project_file_exists(f)) {
        ui_warn("skipped file " + f.name + ". it already imported")
        return
    }
    let ass = await project_asset_create(project, f)
    if (!ass) {
        ui_error("Unsupported file type: " + f.name + " " + f.type)
        return
    }
    editor_assets_refresh()
    editor_sel_asset(ass, SelBeh.Append)
    ui_request()
}

function editor_is_sel_asset(a: Asset) {
    return sel.assets.includes(a)
}

function editor_sel_asset_range(a: Asset, b: Asset) {
    let ia = editor.assets.indexOf(a)
    let ib = editor.assets.indexOf(b)
}

function editor_sel_mode() {
    let m = 0
    if (sel.assets.length) m |= SelMode.Asset
    if (sel.tracks.length) m |= SelMode.Track
    return m
}


function editor_unsel_all() {
    sel.tracks.length = 0
    sel.assets.length = 0
    ui_request()
}


function editor_sel_asset(a: Asset, be = editor.sel_beh) {
    if (be == SelBeh.Replace)
        editor_unsel_all()
    sel.assets.push(a)
    ui_request()
}

function editor_assets_refresh() {

    let a = editor.assets
    a.length = 0
    a.push(...project.asset)

    let sign = editor.assets_desc ? - 1 : 1
    let order = editor.assets_order

    if (order == OrderBy.Name)
        a.sort((a, b) => sign * a.name.localeCompare(b.name))
    else if (order == OrderBy.Type)
        a.sort((a, b) => sign * (a.res.type - b.res.type))
    else if (order == OrderBy.Date)
        a.sort((a, b) => sign * (a.date - b.date))

    ui_request()
}


function editor_assets_order_by(o: OrderBy) {
    editor.assets_order = o
    editor_assets_refresh()
}

function editor_assets_order_desc(b: boolean) {
    editor.assets_desc = b
    editor_assets_refresh()
}

function editor_tracks_refresh() {
    editor.tracks.length = 0
    editor.tracks.push(...project.track)
}


enum Action {
    none, import, sel_append, sel_replace,
}

function editor_action(a: Action): any {
    switch (a) {
        case Action.import: return editor_import_open()
        case Action.sel_append: return editor.sel_beh = SelBeh.Append
        case Action.sel_replace: return editor.sel_beh = SelBeh.Replace
    }
}
