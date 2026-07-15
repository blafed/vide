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
function range_and(a: Rangef, b: Rangef): Rangef { return range_sany_min(range(max(a[0], b[0]), min(a[1], b[1]))) }
function range_or(a: Rangef, b: Rangef): Rangef { return range(min(a[0], b[0]), max(a[1], b[1])) }
function range_intersect(a: Rangef, b: Rangef, tb: float) { return range_map(range_and(a, b), b, tb) }

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

interface SceneCommand { res: Res, resTime: float, drect: Rect, srect: Rect, lineWidth: float, strokeStyle: string, fillStyle: string, opacity: float }
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


