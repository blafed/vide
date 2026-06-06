

const _thumb_canvas = document.createElement('canvas').getContext('2d')!

async function asset_generate_thumb(res: Res, w: number, h: number) {

    _thumb_canvas.canvas.width = w
    _thumb_canvas.canvas.height = h
    switch (res.type) {
        case ResType.Video:
            let vres = res as VideoRes
            let len = 1 / vres.fps
            await video_decode(vres, 0, len, true)
            video_draw_frames(vres, _thumb_canvas, 0, len)
            break
    }

    return await createImageBitmap(_thumb_canvas.canvas)
}

async function asset_create(f: File) {
    let type = res_type(f)
    let res: Res
    switch (type) {
        case ResType.Audio: res = await res_create_audio(f); break
        case ResType.Image: res = await res_create_image(f); break
        case ResType.Video: res = await res_create_video(f, 8); break
        default: return null
    }

    project.file.push(f)
    project.res.push(res)
    project.asset.push({ name: f.name, res, thumb: await asset_generate_thumb(res, 64, 64) })
    return res
}


async function editor_import(f: File) {
    let res = await asset_create(f)
    if (!res)
        ui_error("Unsupported file type: " + f.name)
    else
        ui_update()
}

