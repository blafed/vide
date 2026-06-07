
const sel: Sel = {
    res: [],
    asset: [],
}

const editor: Editor = {
    assets: {
        desc: false,
        order: EditorAssetsOrderBy.Name,
        items: []
    }
}

interface Sel {
    res: Res[]
    asset: Asset[]
}


interface Editor {
    assets: EditorAssets
}

const enum EditorAssetsOrderBy { Name, Type, Date }

interface EditorAssets {
    order: EditorAssetsOrderBy
    desc: boolean
    items: Readonly<Asset>[]
}

const _thumb_canvas = document.createElement('canvas').getContext('2d')!

async function res_generate_thumb(res: Res, w: number, h: number) {
    _thumb_canvas.clearRect(0, 0, _thumb_canvas.canvas.width, _thumb_canvas.canvas.height)
    _thumb_canvas.canvas.width = w
    _thumb_canvas.canvas.height = h
    switch (res.type) {
        case ResType.Video:
            let vres = res as VideoRes
            let len = 1 / vres.fps
            await video_decode(vres, 0, len, true)
            video_draw_frames(vres, _thumb_canvas, 0, len)
            break
        case ResType.Image:
        case ResType.Svg:
            let rect = rect_fit(res.width, res.height, w, h)
            _thumb_canvas.drawImage(res.bitmap, rect[0], rect[1], rect[2], rect[3])
            break
    }

    return await createImageBitmap(_thumb_canvas.canvas)
}

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
    ui.file_input.click()
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

function editor_assets_order_by(order: EditorAssetsOrderBy) {
    editor.assets.order = order
    editor_assets_reorder()
}
function editor_assets_order_desc(b: boolean) {
    editor.assets.desc = b
    editor_assets_reorder()
}

function editor_assets_order(order: EditorAssetsOrderBy, desc: boolean) {
    editor.assets.order = order
    editor.assets.desc = desc
    editor_assets_reorder()
}

function editor_assets_reorder() {
    let a = editor.assets

    a.items.length = 0
    a.items.push(...project.asset)

    let sign = a.desc ? - 1 : 1

    if (a.order == EditorAssetsOrderBy.Name)
        a.items.sort((a, b) => sign * a.name.localeCompare(b.name))
    else if (a.order == EditorAssetsOrderBy.Type)
        a.items.sort((a, b) => sign * (a.res.type - b.res.type))
    else if (a.order == EditorAssetsOrderBy.Date)
        a.items.sort((a, b) => sign * (a.date - b.date))

    ui_request()
}
