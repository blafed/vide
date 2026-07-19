type int = number
type float = number

type Point = [float, float]
type Rect = [float, float, float, float]
type Color = [float, float, float, float]
type Rangef = Point

const { PI, ceil, floor, cos, sin, acos, asin, atan2, sqrt, abs, min, max, round, trunc, pow, exp, log, hypot, random } = Math
const TAU = PI * 2

function approx(a: float, b: float) { return abs(a - b) < 0.000001 }
function lerp(a: float, b: float, t: float) { return a + (b - a) * t }
function unlerp(a: float, b: float, x: float) { let len = b - a; return len ? (x - a) / len : 0 }
function clamp(v: float, a: float, b: float) { return min(max(v, a), b) }
function clamp01(v: float) { return clamp(v, 0, 1) }
function hypot2(x: float, y: float) { return sqrt(x * x + y * y) }
function sqmag(x: float, y: float) { return x * x + y * y }
function wrap01(t: float) { return t == 1 ? 1 : t - floor(t) }
function within(a: float, b: float, t: float) { return a <= t && t <= b }

function range_contains(a: Rangef, b: Rangef) { return a[0] <= b[0] && b[1] <= a[1] }
function xrange_contains(a: Rangef, b: Rangef) { return a[0] <= b[0] && b[1] < a[1] }
function range_within(r: Rangef, x: float) { return r[0] <= x && x <= r[1] }
function xrange_within(r: Rangef, x: float) { return r[0] <= x && x < r[1] }
function range_overlaps(a: Rangef, b: Rangef) { return a[0] <= b[1] && b[0] <= a[1] }
function xrange_overlaps(a: Rangef, b: Rangef) { return a[0] < b[1] && b[0] < a[1] }
function range_center(r: Rangef) { return (r[0] + r[1]) / 2 }
function range_len(r: Rangef) { return r[1] - r[0] }
function range_sane(r: Rangef) { return r[0] <= r[1] }
function xrange_sane(r: Rangef) { return r[0] < r[1] }
function range_sany_min(r: Rangef) { return r[0] <= r[1] ? r : range(r[1], r[1]) }
function range_sany_max(r: Rangef) { return r[0] <= r[1] ? r : range(r[0], r[0]) }
function range_sany_flip(r: Rangef) { return r[0] <= r[1] ? r : range(r[1], r[0]) }
function range_lerp(r: Rangef, t: float) { return lerp(r[0], r[1], t) }
function range_unlerp(r: Rangef, t: float) { return unlerp(r[0], r[1], t) }
function range_clamp(r: Rangef, t: float) { return clamp(t, r[0], r[1]) }
function range_map(a: Rangef, b: Rangef, tb: float) { return range_lerp(a, range_unlerp(b, tb)) }
function range_and(a: Rangef, b: Rangef): Rangef { return range(max(a[0], b[0]), min(a[1], b[1])) }
function range_or(a: Rangef, b: Rangef): Rangef { return range(min(a[0], b[0]), max(a[1], b[1])) }
function range_intersect(a: Rangef, b: Rangef, tb: float) { return range_map(range_and(a, b), b, tb) }

function xrangeof(obj: { timestamp: float, duration: float }) { return xrange(obj.timestamp, obj.duration) }
function xrange(start: float, len: float): Rangef { return range(start, start + len) }
function range<T extends { from: float, to: float }>(a: T): Point
function range(a: float, b: float): Point
function range(a: any, b?: any): Point {
    if (typeof a == 'number') return [a, b]
    return [a.from, a.to]
}

enum FitMethod {
    Stretch,      // Ignore aspect ratio
    Contain,      // Fit entirely inside, letterbox
    Cover,        // Fill entirely, crop excess
    FitWidth,     // Match width, may overflow height (letterbox top/bottom)
    FitHeight,    // Match height, may overflow width (letterbox left/right)
    CropWidth,    // Match width, crop height if needed
    CropHeight,   // Match height, crop width if needed
}


function point(x: float, y: float): Point { return [x, y] }
function rect(x: float, y: float, w: float, h: float): Rect { return [x, y, w, h] }
function rect_clone(r: Rect): Rect { return [...r] }
function rect_one(): Rect { return [0, 0, 1, 1] }
function rect_zero(): Rect { return [0, 0, 0, 0] }
function rect_canvas(c: Canvas): Rect { return rect(0, 0, c.canvas.width, c.canvas.height) }
function rect_img(c: ImageBitmap): Rect { return rect(0, 0, c.width, c.height) }
function rect_fit(src: Rect, dst: Rect, method = FitMethod.Contain) {
    const src_w = src[2], src_h = src[3], dst_w = dst[2], dst_h = dst[3]

    if (src_w === 0 || src_h === 0 || dst_w === 0 || dst_h === 0) {
        src[0] = src[1] = src[2] = src[3] = 0
        dst[0] = dst[1] = dst[2] = dst[3] = 0
        return
    }

    switch (method) {
        case FitMethod.Stretch:
            src[0] = 0, src[1] = 0, src[2] = src_w, src[3] = src_h
            dst[0] = 0, dst[1] = 0, dst[2] = dst_w, dst[3] = dst_h
            break
        case FitMethod.Contain: {
            const scale = min(dst_w / src_w, dst_h / src_h)
            const w = src_w * scale, h = src_h * scale

            src[0] = 0, src[1] = 0, src[2] = src_w, src[3] = src_h
            dst[0] = (dst_w - w) / 2, dst[1] = (dst_h - h) / 2, dst[2] = w, dst[3] = h
            break
        }
        case FitMethod.Cover: {
            const scale = max(dst_w / src_w, dst_h / src_h)
            const crop_w = dst_w / scale, crop_h = dst_h / scale

            src[0] = (src_w - crop_w) / 2, src[1] = (src_h - crop_h) / 2, src[2] = crop_w, src[3] = crop_h
            dst[0] = 0, dst[1] = 0, dst[2] = dst_w, dst[3] = dst_h
            break
        }
        case FitMethod.FitWidth: {
            const scale = dst_w / src_w, h = src_h * scale

            src[0] = 0, src[1] = 0, src[2] = src_w, src[3] = src_h
            dst[0] = 0, dst[1] = (dst_h - h) / 2, dst[2] = dst_w, dst[3] = h
            break
        }
        case FitMethod.FitHeight: {
            const scale = dst_h / src_h, w = src_w * scale

            src[0] = 0, src[1] = 0, src[2] = src_w, src[3] = src_h
            dst[0] = (dst_w - w) / 2, dst[1] = 0, dst[2] = w, dst[3] = dst_h
            break
        }
        case FitMethod.CropWidth: {
            const scale = dst_w / src_w
            const h = src_h * scale
            let src_y = 0, src_h2 = src_h, dst_y = (dst_h - h) / 2, dst_h2 = h

            if (h > dst_h) {
                src_h2 = dst_h / scale
                src_y = (src_h - src_h2) / 2
                dst_y = 0
                dst_h2 = dst_h
            }
            src[0] = 0, src[1] = src_y, src[2] = src_w, src[3] = src_h2
            dst[0] = 0, dst[1] = dst_y, dst[2] = dst_w, dst[3] = dst_h2
            break
        }
        case FitMethod.CropHeight: {
            const scale = dst_h / src_h
            const w = src_w * scale
            let src_x = 0, src_w2 = src_w, dst_x = (dst_w - w) / 2, dst_w2 = w

            if (w > dst_w) {
                src_w2 = dst_w / scale
                src_x = (src_w - src_w2) / 2
                dst_x = 0
                dst_w2 = dst_w
            }
            src[0] = src_x, src[1] = 0, src[2] = src_w2, src[3] = src_h
            dst[0] = dst_x, dst[1] = 0, dst[2] = dst_w2, dst[3] = dst_h
            break
        }
    }
}

function rect_boundary_point(r: Rect, t: float): Point {
    let [x, y, w, h] = r
    t = wrap01(t)
    if (t < 0.25) return [x + w * (t * 4), y]
    if (t < 0.50) return [x + w, y + h * ((t - 0.25) * 4)]
    if (t < 0.75) return [x + w - w * ((t - 0.50) * 4), y + h]
    return [x, y + h - h * ((t - 0.75) * 4)]
}

function circle_boundary_point(r: Rect, t: float): Point {
    let [x, y, w, h] = r
    t = wrap01(t)
    const a = t * PI * 2
    const cx = x + w * 0.5
    const cy = y + h * 0.5
    return [cx + cos(a) * w * 0.5, cy + sin(a) * h * 0.5]
}

const enum Ease { Linear, InQuad, OutQuad, InOutQuad, InCubic, OutCubic, InOutCubic, InExpo, OutExpo, InOutExpo }
function tween01(t: float, type: Ease = Ease.Linear): float { return tween(0, 1, t, type) }
function tween(from: float, to: float, t: float, type: Ease = Ease.Linear): float {
    switch (type) {
        case Ease.InQuad: t = t * t; break
        case Ease.OutQuad: t = 1 - (1 - t) * (1 - t); break
        case Ease.InOutQuad: t = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; break
        case Ease.InCubic: t = t * t * t; break
        case Ease.OutCubic: t = 1 - Math.pow(1 - t, 3); break
        case Ease.InOutCubic: t = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; break
        case Ease.InExpo: t = t === 0 ? 0 : Math.pow(2, 10 * t - 10); break
        case Ease.OutExpo: t = t === 1 ? 1 : 1 - Math.pow(2, -10 * t); break
        case Ease.InOutExpo:
            if (t === 0) t = 0
            else if (t === 1) t = 1
            else if (t < 0.5) t = Math.pow(2, 20 * t - 10) / 2
            else t = (2 - Math.pow(2, -20 * t + 10)) / 2
            break
    }
    return from + (to - from) * t
}


enum WrapMode { Clamp, Repeat, PingPong, Continue }
function wrap_time(t: float, duration: float, mode: WrapMode): float {
    if (duration <= 0)
        return 0
    switch (mode) {
        case WrapMode.Clamp: return clamp(t, 0, duration)
        case WrapMode.Repeat: return ((t % duration) + duration) % duration
        case WrapMode.Continue: return t
        case WrapMode.PingPong: {
            let cycle = duration * 2
            t = ((t % cycle)) % cycle
            return t > duration ? cycle - t : t
        }
    }
}
function color(r: float, g: float, b: float, a: float = 1) {
    r = round(clamp(r, 0, 1) * 255), g = round(clamp(g, 0, 1) * 255), b = round(clamp(b, 0, 1) * 255), a = round(clamp(a, 0, 1) * 255)
    return "#" + r.toString(16).padStart(2, "0") + g.toString(16).padStart(2, "0") + b.toString(16).padStart(2, "0") + a.toString(16).padStart(2, "0")
}
function sleep(ms: number) { return new Promise<void>(resolve => setTimeout(resolve, ms)) }
function frame() { return new Promise<void>(resolve => requestAnimationFrame(() => resolve())) }


type Canvas = CanvasRenderingContext2D
type LazyFrame = ImageBitmap | null

function canvas_create(w: int, h: int) {
    let canvas = document.createElement("canvas")
    canvas.width = w; canvas.height = h
    return canvas.getContext('2d')!
}
function canvas_clear_all(ctx: Canvas) { ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height) }
function canvas_clear_color(ctx: Canvas, color: string) { ctx.fillStyle = color; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height) }
function canvas_clear(ctx: Canvas, dst: Rect) { ctx.clearRect(dst[0], dst[1], dst[2], dst[3]) }
function canvas_stroke_rect(ctx: Canvas, rect: Rect) { ctx.strokeRect(rect[0], rect[1], rect[2], rect[3]) }
function canvas_fill_rect(ctx: Canvas, rect: Rect) { ctx.fillRect(rect[0], rect[1], rect[2], rect[3]) }
function canvas_draw_img(ctx: Canvas, b: CanvasImageSource, dst: Rect) { ctx.drawImage(b, dst[0], dst[1], dst[2], dst[3]) }
function canvas_draw_img2(ctx: Canvas, b: CanvasImageSource, dst: Rect, src: Rect) { ctx.drawImage(b, src[0], src[1], src[2], src[3], dst[0], dst[1], dst[2], dst[3]) }
function canvas_draw_img3(ctx: Canvas, b: CanvasImageSource, dst: Rect, src?: Rect) {
    if (src) ctx.drawImage(b, src[0], src[1], src[2], src[3], dst[0], dst[1], dst[2], dst[3])
    else ctx.drawImage(b, dst[0], dst[1], dst[2], dst[3])
}
function canvas_prep(ctx: Canvas, neededWidth: int, neededHeight: int) {
    if (ctx.canvas.width < neededWidth) ctx.canvas.width = ceil(neededWidth)
    if (ctx.canvas.height < neededHeight) ctx.canvas.height = ceil(neededHeight)
}
function canvas_prep2(ctx: Canvas, r: Rect) {
    let w = Math.ceil(r[0] + r[2]), h = Math.ceil(r[1] + r[3])
    canvas_prep(ctx, w, h)
}
function canvas_resize_dpr(ctx: Canvas, quality = 1) {
    let canvas = ctx.canvas
    let dpr = window.devicePixelRatio || 1
    let w = round(canvas.clientWidth * dpr) * quality
    let h = round(canvas.clientHeight * dpr) * quality
    if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
    }
    ctx.scale(quality, quality)
}
function canvas(e: Element) {
    if (e instanceof HTMLCanvasElement) return e.getContext('2d')!
    let c = e.getElementsByTagName('canvas')[0]
    if (!c) return null
    return c.getContext('2d')
}


const enum ResType { Unknown, Scene, Video, Image, Script, Test }
type Res = VideoRes | ImageRes | Scene | ScriptRes | TestRes
interface Resource { readonly type: ResType, readonly file: File | null }
interface TestRes {
    readonly type: ResType.Test
    readonly file: null
    width: int
    height: int
    fps: float
    canvas: Canvas
}
interface VideoRes extends Resource {
    readonly type: ResType.Video
    readonly width: int
    readonly height: int
    readonly duration: float
    readonly info: Mp4Video
    readonly decoder: VideoDecoder
    readonly fps: float
    chunks: { timestamp: float, duration: float, frames: { bitmap: ImageBitmap, timestamp: float }[], sampleStart: int, sampleEnd: int, loaded: boolean }[]
    currentChunk: int,
    queueChunk: int[]
}
interface ImageRes extends Resource {
    readonly type: ResType.Image
    readonly bitmap: ImageBitmap
    readonly width: int
    readonly height: int
}

type ScriptFn = (ctx: Canvas, t: float, dst: Rect) => void
interface ScriptRes extends Resource {
    readonly type: ResType.Script
    readonly canvas: Canvas
    func: ScriptFn
}


interface Scene extends Resource {
    readonly type: ResType.Scene
    readonly file: null
    items: Item[]
    anims: Anim[]
    width: int
    height: int
    fps: int
    duration: float
    layers: int
    canvas: Canvas
    frames: (SceneFrame | undefined)[]
}

interface SceneCommand { item: Item, res: Res, resTime: float, drect: Rect, srect: Rect, lineWidth: float, strokeStyle: string, fillStyle: string, opacity: float }
interface SceneFrame { timestamp: float, duration: float, commands: SceneCommand[] }


interface Item {
    res: Res
    layer: int
    from: float, to: float, //absolute
    sfrom: float, sto: float //normalized
    rect: Rect //absolute
    srect: Rect //normalized

    fillStyle: Color
    strokeStyle: Color
    lineWidth: int
    opacity: float
}

const enum Prop {
    None,
    DstX, DstY, DstW, DstH,
    SrcX, SrcY, SrcW, SrcH,
    Opacity, Volume, LineWidth,
    FillR, FillG, FillB, FillA,
    StrokeR, StrokeG, StrokeB, StrokeA
}
interface Anim { target: Item, keys: AnimKey[] }
interface AnimKey { t: float, prop: Prop, value: float, ease?: Ease }

function res_create_script(f: Function | string): ScriptRes | null {
    if (f instanceof Function) return { type: ResType.Script, file: null, func: f as ScriptFn, canvas: canvas_create(256, 256) }
    else {
        f = eval(f)
        if (!(f instanceof Function)) return null
        else return { type: ResType.Script, file: null, func: f as ScriptFn, canvas: canvas_create(256, 256) }
    }
}
function res_create_test(): TestRes { return { canvas: canvas_create(256, 256), file: null, fps: 1, height: 1, type: ResType.Test, width: 1 } }
function res_create_video_mp4(info: Mp4Video) {
    let chunks: VideoRes['chunks'] = []
    const samples = info.samples
    let sampleStart = 0, sampleEnd = 1//exlusive end

    while (sampleStart < samples.length) {
        while (sampleStart < samples.length && !samples[sampleStart].is_sync)
            sampleStart++
        while (sampleEnd < samples.length && (!samples[sampleEnd].is_sync || (sampleEnd - sampleStart) < 30))
            sampleEnd++

        let first = samples[sampleStart]

        let chunk: VideoRes['chunks'][0] = {
            timestamp: mp4_sample_pts(first), duration: mp4_sample_dur(first),
            sampleStart, sampleEnd, frames: [],
            loaded: false
        }
        chunks.push(chunk)
        for (let i = sampleStart + 1; i < sampleEnd; i++)
            chunk.duration += mp4_sample_dur(samples[i])

        sampleStart = sampleEnd
        sampleEnd = sampleStart + 1
    }

    if (chunks.length) {
        chunks[0].timestamp = 0 //HACK
        for (let i = 0; i < chunks.length - 1; i++)
            chunks[i].duration = chunks[i + 1].timestamp - chunks[i].timestamp
        chunks[chunks.length - 1].duration = info.duration - chunks[chunks.length - 1].timestamp //HACK
    }

    let r: VideoRes = {
        type: ResType.Video, file: info.file, width: info.width, height: info.height, duration: info.duration, info,
        fps: mp4_samples_fps(info.samples),
        chunks, currentChunk: -1, queueChunk: [],
        decoder: new VideoDecoder({
            output: (v: VideoFrame) => {
                createImageBitmap(v).then((bitmap) => {
                    r.chunks[r.currentChunk].frames.push({ bitmap, timestamp: v.timestamp })
                    v.close()
                })
            },
            error: (e: DOMException) => { }
        })
    }
    r.decoder.configure({ codec: info.codec, description: info.description });
    return r
}
async function res_create(file: File, type: ResType = res_type(file.type)): Promise<Res | null> {
    switch (type) {
        case ResType.Video: return res_create_video_mp4(await mp4_info(file)) //TODO support others
        case ResType.Image:
            if (!file)
                return null
            let bitmap = await createImageBitmap(file)
            return { type, file, bitmap, width: bitmap.width, height: bitmap.height }
        case ResType.Script:
            let text = await file.text()
            return res_create_script(text)
        case ResType.Test: return res_create_test()
        case ResType.Scene: return null
        case ResType.Unknown: return null
    }
}
function res_type(t: string): ResType {
    if (t.startsWith("video/")) return ResType.Video
    if (t.startsWith("image/")) return ResType.Image
    if (t == "text/javascript") return ResType.Script
    // if (t === "image/svg+xml") return ResType.Svg
    // if (t.startsWith("audio/")) return ResType.Audio
    // if (t == 'text/plain') return ResType.Text
    return ResType.Unknown
}



function res_len(res: Res): float {
    switch (res.type) {
        case ResType.Video: case ResType.Scene: return res.duration
        case ResType.Image: case ResType.Script: case ResType.Test: return 1
    }
}
function res_width(res: Res): float {
    switch (res.type) {
        case ResType.Video: case ResType.Scene: case ResType.Image: return res.width
        case ResType.Script: case ResType.Test: return 256
    }
}
function res_height(res: Res): float {
    switch (res.type) {
        case ResType.Video: case ResType.Scene: case ResType.Image: return res.height
        case ResType.Script: case ResType.Test: return 256
    }
}
function res_size(res: Res): Point { return [res_width(res), res_height(res)] }
function res_rect(res: Res): Rect { return rect(0, 0, res_width(res), res_height(res)) }
function res_fps(res: Res): float {
    switch (res.type) {
        case ResType.Video: case ResType.Scene: return res.fps
        case ResType.Script: case ResType.Image: case ResType.Test: return 1
    }
}
const SCENE_CHUNK_FRAMES = 45
function res_chunk(res: Res, t: float): int {
    t = clamp(t, 0, res_len(res))
    switch (res.type) {
        case ResType.Video:
            for (let i = 0; i < res.chunks.length; i++) if (xrange_within(xrangeof(res.chunks[i]), t)) return i
            return res.chunks.length - 1
        case ResType.Scene: return Math.floor(t / SCENE_CHUNK_FRAMES / res.fps)
        default: return 0
    }
}

function res_xrange(res: Res, chunk: int) {
    switch (res.type) {
        case ResType.Video: return xrange(res.chunks[chunk].timestamp, res.chunks[chunk].duration)
        case ResType.Scene: return xrange(chunk * SCENE_CHUNK_FRAMES / res.fps, SCENE_CHUNK_FRAMES / res.fps)
        default: return xrange(chunk, 1)
    }
}

function res_chunks(res: Res, from: float, to: float) {
    let chunkA = res_chunk(res, from)
    let chunkB = res_chunk(res, to)
    let arr = []
    for (let c = chunkA; c <= chunkB; c++) arr.push(c)
    return arr
}

function res_xchunks(res: Res, start: float, len: float) {
    let chunkA = res_chunk(res, start)
    let chunkB = res_chunk(res, start + len)
    //exlusive if to == chunkB.from
    if (chunkB != -1 && res_xrange(res, chunkB)[0] == start + len)
        chunkB--
    let arr = []
    for (let c = chunkA; c <= chunkB; c++) arr.push(c)
    return arr
}

function res_chunk_deps(res: Res, chunk: int) {
    let arr = [] as { res: Res, chunk: int }[]
    switch (res.type) {
        case ResType.Scene:
            let time = res_xrange(res, chunk)
            scene_iters(res, time[0], time[1], (i, itemFrom, itemTo) => {
                let resFrom = item2res(i, itemFrom)
                let resTo = item2res(i, itemTo)
                let chunks = res_xchunks(i.res, resFrom, resTo - resFrom)
                for (let c of chunks)
                    arr.push({ res: i.res, chunk: c })
            })
            break
    }
    return arr
}


function res_chunk_cost(res: Res, i: int) {
    switch (res.type) {
        case ResType.Video: return (res.chunks[i].sampleEnd - res.chunks[i].sampleStart + 1) * res.width * res.height
        case ResType.Scene: return res.items.length * res.anims.length * SCENE_CHUNK_FRAMES
        case ResType.Image: return res.width * res.height
        case ResType.Script: return 0
        case ResType.Test: return 0
    }
}

function scene_create(items: Item[] = [], fps: float = 30, width: int = 600, height: int = 800) {
    let s = { type: ResType.Scene, file: null, items, anims: [], fps, width, height, duration: 0, layers: 0, frames: [], aspect: 0, canvas: canvas_create(256, 256) } as Scene
    scene_validate(s)
    return s
}
function scene_create_wrap(res: Res, fps?: float, width?: int, height?: int) {
    switch (res.type) {
        case ResType.Scene: if (fps == undefined) fps = res.fps
        case ResType.Video: case ResType.Image:
            if (width == undefined) width = res.width
            if (height == undefined) height = res.height
            break
        case ResType.Script:
        case ResType.Test:
            if (width == undefined) width = 256
            if (height == undefined) height = 256
            break
    }
    return scene_create([item_create(res)], fps, width, height)
}
function scene_validate(s: Scene, reset = false) {
    s.duration = reset ? 0 : s.duration
    s.layers = 0
    for (let i = 0; i < s.items.length; i++) {
        let item = s.items[i]
        s.duration = Math.max(s.duration, item.to)
        s.layers = Math.max(s.layers, item.layer)
    }
    s.layers++
    items_sort(s.items)
    for (let a of s.anims)
        a.keys.sort((a, b) => a.t - b.t)
}
function scene_iters(scene: Scene, from: float, to: float, callback: (item: Item, itemFrom: float, itemTo: float) => void) { return items_iters(scene.items, from, to, callback) }
function scene_iter(scene: Scene, t: float, callback: (item: Item, itemTime: float) => void) { return items_iter(scene.items, t, callback) }
function scene_is_ancestor(me: Scene, ancestor: Scene) {
    if (me == ancestor) return true
    for (let x of ancestor.items)
        if (x.res.type == ResType.Scene) {
            if (x.res == me) return true
            if (scene_is_ancestor(me, x.res)) return true
        }
    return false
}

function item_create(res: Res, from?: float, to?: float, rect?: Rect, sfrom = 0, sto = 1, srect: Rect = rect_one()): Item {
    if (from == undefined) from = 0
    if (to == undefined) to = from + res_len(res)
    if (rect == undefined) rect = [0, 0, ...res_size(res)]
    return { res, from, to, sfrom, sto, srect, rect, layer: 0, fillStyle: [0.4, 0.4, 0.4, 1], strokeStyle: [0, 0, 0, 1], opacity: 1, lineWidth: 2 }
}
function items_sort(items: Item[]) { items.sort((a, b) => a.layer == b.layer ? a.from - b.from : a.layer - b.layer) }
function item_clone(item: Item): Item {
    let clone = { ...item }
    clone.srect = rect_clone(item.srect)
    clone.rect = rect_clone(item.rect)
    return clone
}
function item2res(item: Item, itemTime: float) { return range_map(range(item.sfrom, item.sto), range(item), itemTime) * res_len(item.res) }
function res2item(item: Item, resTime: float) { return range_map(range(item), range(item.sfrom, item.sto), resTime / res_len(item.res)) }



const enum JobState { None, Queue, WaitingDeps, Running, Done }
interface Job {
    res: Res
    chunk: int
    deps: Job[]

    resolve: Function
    promise: Promise<any>
    state: JobState
    refcount: int
    pinned?: boolean

    loadite: float
    cost: float
    score: float
}


function item_prop(item: Item, prop: Prop) {
    switch (prop) {
        case Prop.DstX: return item.rect[0]
        case Prop.DstY: return item.rect[1]
        case Prop.DstW: return item.rect[2]
        case Prop.DstH: return item.rect[3]
        case Prop.SrcX: return item.srect[0]
        case Prop.SrcY: return item.srect[1]
        case Prop.SrcW: return item.srect[2]
        case Prop.SrcH: return item.srect[3]
        case Prop.Opacity: return item.opacity
        case Prop.LineWidth: return item.lineWidth
        case Prop.FillR: case Prop.FillG: case Prop.FillB: case Prop.FillA:
            return item.fillStyle[prop - Prop.FillR]
        case Prop.StrokeR: case Prop.StrokeG: case Prop.StrokeB: case Prop.StrokeA:
            return item.strokeStyle[prop - Prop.StrokeR]
    }
    return 0
}

function item_propset(item: Item, prop: Prop, value: float) {
    switch (prop) {
        case Prop.DstX: item.rect[0] = value; break
        case Prop.DstY: item.rect[1] = value; break
        case Prop.DstW: item.rect[2] = value; break
        case Prop.DstH: item.rect[3] = value; break
        case Prop.SrcX: item.srect[0] = value; break
        case Prop.SrcY: item.srect[1] = value; break
        case Prop.SrcW: item.srect[2] = value; break
        case Prop.SrcH: item.srect[3] = value; break
        case Prop.Opacity: item.opacity = value; break
        case Prop.LineWidth: item.lineWidth = value; break
        case Prop.FillR: case Prop.FillG: case Prop.FillB: case Prop.FillA:
            item.fillStyle[prop - Prop.FillR] = value
            break
        case Prop.StrokeR: case Prop.StrokeG: case Prop.StrokeB: case Prop.StrokeA:
            item.strokeStyle[prop - Prop.StrokeR] = value
            break
    }
}


function anim_prop(anim: Anim, prop: Prop, itemTime: float, item: Item = anim.target) {
    let keys = anim.keys
    keys = keys.filter(x => x.prop == prop)

    let t = itemTime / item_len(item)
    let a, b

    for (let i = 0; i < keys.length; i++) {
        if (t >= keys[i].t) a = keys[i];
        else { b = keys[i]; break; }
    }

    let va, vb, ta, tb, ease
    if (a && b) {
        ta = a.t, tb = b.t
        va = a.value, vb = b.value
        ease = a.ease
    } else if (a) { //after last key
        ta = a.t, tb = 1, ease = a.ease
        va = a.value, vb = item_prop(item, prop)
    } else if (b) { //before first key
        ta = 0, tb = b.t, ease = b.ease
        va = item_prop(item, prop), vb = b.value
    }
    else return item_prop(item, prop)

    let at = clamp01(unlerp(ta, tb, t)) //TODO use wrap mode
    return tween(va, vb, at, ease)
}

function anim_prop_color(anim: Anim, itemTime: float, c: Prop) {
    let r = anim_prop(anim, c + 0, itemTime)
    let g = anim_prop(anim, c + 1, itemTime)
    let b = anim_prop(anim, c + 2, itemTime)
    let a = anim_prop(anim, c + 3, itemTime)
    return color(r, g, b, a)
}

function item_color(item: Item, c: Prop) {
    let r = item_prop(item, c + 0)
    let g = item_prop(item, c + 1)
    let b = item_prop(item, c + 2)
    let a = item_prop(item, c + 3)
    return color(r, g, b, a)
}

function item_len(item: Item) { return item.to - item.from }
function item_move(item: Item, newfrom: float) {
    let len = item_len(item)
    item.from = max(newfrom, 0)
    item.to = item.from + len
}
function item_speed(item: Item) { return range_len(range(item.sfrom, item.sto)) / item_len(item) * res_len(item.res) }
function item_clip_left(item: Item, newSfrom: float) {
    newSfrom = clamp01(newSfrom / res_len(item.res))
    let speed = item_speed(item)
    let delta = newSfrom - item.sfrom
    item.from += delta * speed
    item.sfrom = newSfrom
}
function item_clip_right(item: Item, newSto: float) {
    newSto = clamp01(newSto / res_len(item.res))
    let speed = item_speed(item)
    let delta = newSto - item.sto
    item.to += delta * speed
    item.sto = newSto
}
function items_iters(items: Item[], from: float, to: float, callback: (item: Item, itemFrom: float, itemTo: float) => void) {
    let ts = range(from, to)
    for (let item of items) {
        let is = range(item)
        let os = range_and(ts, is)
        if (!range_sane(os)) continue
        callback(item, os[0] - item.from, os[1] - item.from)
    }
}
function items_iter(items: Item[], t: float, callback: (item: Item, itemTime: float) => void) {
    for (let item of items)
        if (within(item.from, item.to, t)) callback(item, t - item.from)
}