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
function deg2rad(n: float) { return n * Math.PI / 180 }
function rad2deg(n: float) { return n * 180 / Math.PI }


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

function point(x: float, y: float): Point { return [x, y] }
function rect(x: float, y: float, w: float, h: float): Rect { return [x, y, w, h] }
function rect_clone(r: Rect): Rect { return [...r] }
function rect_one(): Rect { return [0, 0, 1, 1] }
function rect_zero(): Rect { return [0, 0, 0, 0] }
function rect_canvas(c: Canvas): Rect { return rect(0, 0, c.canvas.width, c.canvas.height) }
function rect_img(c: ImageBitmap): Rect { return rect(0, 0, c.width, c.height) }
function rect_scale(r: Readonly<Rect>, w: float, h: float) { return rect(r[0] * w, r[1] * h, r[2] * w, r[3] * h); }

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


type PointCurve = [x: float, y: float, fn?: Ease | ((t: float) => float)]
type Curve = float[]

function curve_eval(curve: Curve, x: float, fn?: Ease): float {
    if (!curve.length) return 0;
    if (curve.length % 2 != 0) throw 'odd curve: ' + curve.length

    if (x < curve[0]) return curve[1]

    for (let i = 2; i < curve.length; i += 2) {
        if (x <= curve[i]) {
            let a = curve[i - 2], b = curve[i]
            let va = curve[i - 1], vb = curve[i + 1]
            let t = unlerp(a, b, x)
            // if (typeof fn == 'function') t = fn(t, x)
            if (typeof fn == 'number') t = tween(0, 1, t, fn)
            let v = lerp(va, vb, t)
            return v
        }
    }

    return curve[curve.length - 1]
}

// function curve_eval(c: Curve, x: float): float {
//     if (!c.length) return 0;
//     if (c.length % 2 != 0) throw 'non odd curve: ' + c.length

//     if (x <= c[0][0]) return c[0][1] //min
//     for (let i = 1; i < c.length; i++) {
//         let a = c[i - 1], b = c[i]
//         if (x <= b[0]) {
//             let t = unlerp(a[0], b[0], x)
//             if (typeof (a[2]) == "number") return tween(a[1], b[1], t, a[2])
//             else if (typeof (a[2]) == "function") return a[1] + (b[1] - a[1]) * a[2](t)
//             return lerp(a[1], b[1], t) //map
//         }
//     }
//     return c[c.length - 1][1] //max
// }


function color(r: float, g: float, b: float, a: float = 1) {
    r = round(clamp(r, 0, 1) * 255), g = round(clamp(g, 0, 1) * 255), b = round(clamp(b, 0, 1) * 255), a = round(clamp(a, 0, 1) * 255)
    return "#" + r.toString(16).padStart(2, "0") + g.toString(16).padStart(2, "0") + b.toString(16).padStart(2, "0") + a.toString(16).padStart(2, "0")
}

function rgba(r: int, g: int, b: int, a: float = 1) {
    r = clamp(r, 0, 255), g = clamp(g, 0, 255), b = clamp(b, 0, 255), a = round(clamp(a, 0, 1) * 255)
    return "#" + r.toString(16).padStart(2, "0") + g.toString(16).padStart(2, "0") + b.toString(16).padStart(2, "0") + a.toString(16).padStart(2, "0")
}

// function coloro(obj: { r: int, g: int, b: int, a: float }) { return rgba(obj.r, obj.g, obj.b, obj.a) }

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

function canvas_rect(ctx: Canvas, dst: Rect) { ctx.beginPath(); ctx.rect(dst[0], dst[1], dst[2], dst[3]) }
function canvas_clear(ctx: Canvas, dst: Rect) { ctx.clearRect(dst[0], dst[1], dst[2], dst[3]) }
function canvas_stroke(ctx: Canvas, dst: Rect) { ctx.strokeRect(dst[0], dst[1], dst[2], dst[3]) }
function canvas_fill(ctx: Canvas, dst: Rect) { ctx.fillRect(dst[0], dst[1], dst[2], dst[3]) }
function canvas_clip(ctx: Canvas, rect: Rect) { ctx.beginPath(); ctx.rect(rect[0], rect[1], rect[2], rect[3]); ctx.clip(); }

function canvas_rect_in(ctx: Canvas, dst: Rect, lw: int) { ctx.beginPath(); ctx.rect(dst[0] + lw / 2, dst[1] + lw / 2, dst[2] - lw, dst[3] - lw); }

function canvas_rectz(ctx: Canvas, dst: Rect) { ctx.beginPath(); ctx.rect(dst[0] * ctx.canvas.width, dst[1] * ctx.canvas.height, dst[2] * ctx.canvas.width, dst[3] * ctx.canvas.height) }
function canvas_rectz_in(ctx: Canvas, dst: Rect, lw: int) { ctx.beginPath(); ctx.rect(dst[0] * ctx.canvas.width + lw / 2, dst[1] * ctx.canvas.height + lw / 2, dst[2] * ctx.canvas.width - lw, dst[3] * ctx.canvas.height - lw) }

function canvas_clearz(ctx: Canvas, dst: Rect) { ctx.clearRect(dst[0] * ctx.canvas.width, dst[1] * ctx.canvas.height, dst[2] * ctx.canvas.width, dst[3] * ctx.canvas.height) }
function canvas_fillz(ctx: Canvas, dst: Rect) { ctx.fillRect(dst[0] * ctx.canvas.width, dst[1] * ctx.canvas.height, dst[2] * ctx.canvas.width, dst[3] * ctx.canvas.height) }
function canvas_clipz(ctx: Canvas, rect: Rect) { ctx.beginPath(); ctx.rect(rect[0] * ctx.canvas.width, rect[1] * ctx.canvas.height, rect[2] * ctx.canvas.width, rect[3] * ctx.canvas.height); ctx.clip() }
function canvas_strokez(ctx: Canvas, dst: Rect) { ctx.strokeRect(dst[0] * ctx.canvas.width, dst[1] * ctx.canvas.height, dst[2] * ctx.canvas.width, dst[3] * ctx.canvas.height) }
function canvas_strokez_in(ctx: Canvas, dst: Rect, lw: float) { ctx.strokeRect(dst[0] * ctx.canvas.width + lw / 2, dst[1] * ctx.canvas.height + lw / 2, dst[2] * ctx.canvas.width - lw, dst[3] * ctx.canvas.height - lw) }

function canvas_textz(ctx: Canvas, text: string, dst: Rect) { ctx.fillText(text, dst[0] * ctx.canvas.width, dst[1] * ctx.canvas.height); }
function canvas_text(ctx: Canvas, text: string, dst: Rect) { ctx.fillText(text, dst[0], dst[1]); }

function canvas_draw(ctx: Canvas, b: CanvasImageSource, dst: Rect, src?: Rect) {
    if (src) ctx.drawImage(b, src[0], src[1], src[2], src[3], dst[0], dst[1], dst[2], dst[3])
    else ctx.drawImage(b, dst[0], dst[1], dst[2], dst[3])
}

function canvas_drawz(ctx: Canvas, b: CanvasImageSource, dst: Rect, src?: Rect) {
    let w = ctx.canvas.width, h = ctx.canvas.height;
    if (src) ctx.drawImage(b, src[0], src[1], src[2], src[3], dst[0] * w, dst[1] * h, dst[2] * w, dst[3] * h);
    else ctx.drawImage(b, dst[0] * w, dst[1] * h, dst[2] * w, dst[3] * h)
}

function canvas_prep(ctx: Canvas, neededWidth: int, neededHeight: int) {
    if (ctx.canvas.width < neededWidth) ctx.canvas.width = ceil(neededWidth)
    if (ctx.canvas.height < neededHeight) ctx.canvas.height = ceil(neededHeight)
}
function canvas_prep2(ctx: Canvas, r: Rect) {
    let w = Math.ceil(r[0] + r[2]), h = Math.ceil(r[1] + r[3])
    canvas_prep(ctx, w, h)
}
function canvas_set_size(ctx: Canvas, width: int, height: int) {
    if (ctx.canvas.width != width) ctx.canvas.width = width;
    if (ctx.canvas.height != height) ctx.canvas.height = height;
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