
const enum ResType {
    Unknown, Video, Audio, Image, Svg
}

type Res = VideoRes | AudioRes | ImageRes | SvgRes;

interface Resource {
    type: ResType
    file: File | null
}

interface VideoRes extends Resource {
    type: ResType.Video
    width: int
    height: int
    frames: (ImageBitmap | null)[]
    preview: (ImageBitmap | null)[]
    fps: int
    duration: float
    el: HTMLVideoElement
    audio: AudioRes | null
}


interface AudioRes extends Resource {
    type: ResType.Audio
    srate: int
    channels: int
    length: int
    duration: float
    buffer: AudioBuffer
}

interface ImageRes extends Resource {
    type: ResType.Image
    bitmap: ImageBitmap
    width: int
    height: int
}

interface SvgRes extends Resource {
    type: ResType.Svg
    bitmap: ImageBitmap
    width: int
    height: int
    svg: string
    dataurl: string
    el: HTMLImageElement
}

function res_type(f: File): ResType {
    const t = f.type

    if (t.startsWith("video/")) return ResType.Video
    if (t.startsWith("audio/")) return ResType.Audio
    if (t === "image/svg+xml") return ResType.Svg
    if (t.startsWith("image/")) return ResType.Image

    return ResType.Unknown
}

async function res_create_video(f: File, fps: int) {
    const el = document.createElement('video')

    el.muted = true
    el.preload = 'auto'
    el.src = URL.createObjectURL(f)

    await new Promise<void>(ok => {
        el.onloadedmetadata = () => ok()
    })

    let length = Math.ceil(el.duration * fps)

    let v: VideoRes = {
        type: ResType.Video, file: f,
        frames: new Array(length), preview: new Array(length),
        width: el.videoWidth, height: el.videoHeight, fps: fps, duration: el.duration, el: el,
        audio: await res_create_audio(f)
    }
    return v
}

async function res_create_image(f: File) {
    const bitmap = await createImageBitmap(f)
    let res: ImageRes = {
        file: f, type: ResType.Image,
        bitmap, width: bitmap.width, height: bitmap.height
    }
    return res
}

async function res_create_audio(f: File) {
    let ctx = new AudioContext()
    let bytes = await f.arrayBuffer()
    try {
        let buffer = await ctx.decodeAudioData(bytes)

        let res: AudioRes = {
            type: ResType.Audio,
            file: f,
            buffer,
            srate: buffer.sampleRate, channels: buffer.numberOfChannels,
            duration: buffer.duration,
            length: buffer.length
        }
        return res
    } catch { return null }
}


async function video_decode_frames(v: VideoRes, from: float, to: float, out: (ImageBitmap | null)[], max_width = 0, skip_exist = false) {
    let start = Math.floor(from * v.fps)
    let end = Math.ceil(to * v.fps)


    let aspect = v.height / v.width
    for (let i = start; i < end; i++) {
        if (out[i]) {
            if (skip_exist) continue
            out[i]?.close()
        }

        await video_seek(v.el, i / v.fps)
        if (!max_width) {
            let bitmap = await createImageBitmap(v.el)
            out[i] = bitmap
        } else {
            let bitmap = await createImageBitmap(v.el, { resizeWidth: max_width, resizeHeight: Math.floor(max_width * aspect), resizeQuality: "low" })
            out[i] = bitmap
        }
    }
}

async function video_decode(v: VideoRes, from: float, to: float, skip_exist = false) {
    let start = Math.floor(from * v.fps)
    let end = Math.ceil(to * v.fps)

    for (let i = start; i < end; i++) {
        if (v.frames[i] && skip_exist)
            continue
        await video_seek(v.el, i / v.fps)
        let bitmap = await createImageBitmap(v.el)

        v.frames[i]?.close()
        v.frames[i] = bitmap
    }
}

async function video_seek(video: HTMLVideoElement, time: number) {
    return new Promise<void>(ok => {
        video.onseeked = () => ok()
        video.currentTime = time
    })
}


function video_draw_frames(vid: VideoRes, ctx: CanvasRenderingContext2D, from: float = 0, to: float = vid.duration) {
    let start = Math.floor(from * vid.fps)
    let end = Math.ceil(to * vid.fps)

    start = clamp(start, 0, vid.frames.length)
    end = clamp(end, 0, vid.frames.length)

    let count = end - start
    if (count <= 0)
        return

    let fw = ctx.canvas.width / count


    for (let i = start; i < end; i++) {
        let x = Math.floor((i - start) * fw)
        let w = Math.ceil(fw)
        let frame = vid.frames[i]
        if (!frame)
            continue

        ctx.drawImage(frame, x, 0, w, ctx.canvas.height)
    }
}

function audio_draw_frames(aud: AudioRes, ctx: CanvasRenderingContext2D, from: float = 0, to: float = aud.duration) {
    let start = Math.floor(from * aud.srate)
    let end = Math.ceil(to * aud.srate)

    start = clamp(start, 0, aud.length)
    end = clamp(end, 0, aud.length)

    let count = end - start
    if (count <= 0)
        return

    let samples = aud.buffer.getChannelData(0)
    let step = count / ctx.canvas.width

    const cy = ctx.canvas.height / 2

    ctx.strokeStyle = "black"
    ctx.beginPath()

    for (let x = 0; x < ctx.canvas.width; x++) {
        const a = Math.floor(start + x * step)
        const b = Math.floor(start + (x + 1) * step)

        let min = 1
        let max = -1

        for (let i = a; i < b; i++) {
            let s = samples[i]

            if (s < min) min = s
            if (s > max) max = s
        }

        let y0 = cy + min * cy
        let y1 = cy + max * cy

        if (Math.abs(y1 - y0) < 1) {
            y0 = cy - 0.5
            y1 = cy + 0.5
        }

        ctx.moveTo(x, y0)
        ctx.lineTo(x, y1)
    }

    ctx.stroke()
}

async function res_svg_create(f: File, width: int, height: int) {
    let svg = await f.text()
    let el = new Image()
    let blob = new Blob([svg], { type: "image/svg+xml" })
    let dataurl = URL.createObjectURL(blob)
    let s: SvgRes = { type: ResType.Svg, file: f, bitmap: null!, dataurl, el, svg, width, height }
    await svg_raster_over(s, width, height)
    return s
}

async function svg_raster(svg: SvgRes, width: int, height: int) {
    if (svg.bitmap && width == svg.width && height == svg.height)
        return svg.bitmap
    svg.el.width = width
    svg.el.height = height
    svg.el.src = svg.dataurl
    await svg.el.decode()
    return await createImageBitmap(svg.el)
}

async function svg_raster_over(svg: SvgRes, width: int, height: int) {
    if (svg.bitmap && svg.bitmap.width == width && svg.bitmap.height == height)
        return
    svg.bitmap?.close()
    svg.bitmap = await svg_raster(svg, width, height)
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

async function res_generate_preview(res: Res) {
    switch (res.type) {
        case ResType.Video:
            video_decode_frames(res, 0, res.duration, res.preview, 32, true)
            break
    }
}