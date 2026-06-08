const enum EditorContext {
    None,
    Assets,
}

const sel: Sel = {
    res: <Res[]>[],
    asset: <Asset[]>[],
}

const editor = {
    assets: {
        desc: false,
        order: OrderBy.Name,
        items: <Asset[]>[]
    },
    isPlaying: false,
    context: EditorContext.None
}

interface Sel {
    res: Res[]
    asset: Asset[]
}


const enum OrderBy { Name, Type, Date }


async function asset_create(f: File) {
    let type = res_type(f)
    let res: Res
    switch (type) {
        case ResType.Audio: res = (await res_create_audio(f))!; break
        case ResType.Image: res = await res_create_image(f); break
        case ResType.Video: res = await res_create_video(f, 8); break
        case ResType.Svg: res = await res_svg_create(f, 64, 64); break
        default: return null
    }

    project.file.push(f)
    project.res.push(res)
    project.asset.push({ name: f.name, res, thumb: await res_generate_thumb(res, 64, 64), date: Date.now() })
    return res
}


function editor_open_add_asset() {
    getbyid('file').click()
}

async function editor_import(f: File) {
    let res = await asset_create(f)
    if (!res) {
        ui_error("Unsupported file type: " + f.name)
        return
    }
    editor_assets_reorder()
    ui_request()
}

function editor_select_asset(a: Asset) {
    if (sel.asset.includes(a))
        return
    sel.asset.push(a)
    ui_request()
}

function editor_unselect_asset(a: Asset) {
    let i = sel.asset.indexOf(a)
    if (i >= 0)
        sel.asset.splice(i, 1)
    // ui_high_asset(a, false)
    ui_request()
}

function editor_unselect_assets() {
    // for (let x of sel.asset)
    // ui_high_asset(x, false)
    sel.asset = []
    ui_request()
}

function editor_single_select_asset(a: Asset, shift: boolean) {
    if (!shift) {
        editor_unselect_assets()
    }
    editor_select_asset(a)
}

function editor_assets_order_by(order: OrderBy) {
    editor.assets.order = order
    editor_assets_reorder()
}
function editor_assets_order_desc(b: boolean) {
    editor.assets.desc = b
    editor_assets_reorder()
}

function editor_assets_order(order: OrderBy, desc: boolean) {
    editor.assets.order = order
    editor.assets.desc = desc
    editor_assets_reorder()
}

function editor_assets_reorder() {
    let a = editor.assets

    a.items.length = 0
    a.items.push(...project.asset)

    let sign = a.desc ? - 1 : 1

    if (a.order == OrderBy.Name)
        a.items.sort((a, b) => sign * a.name.localeCompare(b.name))
    else if (a.order == OrderBy.Type)
        a.items.sort((a, b) => sign * (a.res.type - b.res.type))
    else if (a.order == OrderBy.Date)
        a.items.sort((a, b) => sign * (a.date - b.date))

    ui_request()
}

function editor_track_add_res(v: Res) {
    if (!project.track.length)
        track_add(track_create(ItemType.Video))
    let item = item_create(v)
    track_add(item)
    ui_request()
}

function editor_toggle_play() {

}

function editor_action(a: Action) {
    switch (a) {
        case Action.play: editor_toggle_play(); break
        case Action.import: editor_open_add_asset(); break
    }
}