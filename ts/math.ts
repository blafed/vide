type int = number
type float = number
type ID = number

type Point = [float, float]
type Rect = [float, float, float, float] | float[]


function lerp(a: float, b: float, t: float) { return a + (b - a) * t }
function clamp(v: float, min: float, max: float) { return Math.min(Math.max(v, min), max) }

function rect_one(): Rect { return [0, 0, 1, 1] }
function rect_zero(): Rect { return [0, 0, 0, 0] }

function rect_lerp(dst: Rect, a: Rect, b: Rect, t: float) {
    dst[0] = lerp(a[0], b[0], t)
    dst[1] = lerp(a[1], b[1], t)
    dst[2] = lerp(a[2], b[2], t)
    dst[3] = lerp(a[3], b[3], t)
}


function rect_fit(src_w: float, src_h: float, dst_w: float, dst_h: float): Rect {
    let scale = Math.min(dst_w / src_w, dst_h / src_h)

    let w = src_w * scale
    let h = src_h * scale

    let x = (dst_w - w) / 2
    let y = (dst_h - h) / 2

    return [x, y, w, h]
}

const enum Tween {
    Linear,

    InQuad,
    OutQuad,
    InOutQuad,

    InCubic,
    OutCubic,
    InOutCubic,

    InExpo,
    OutExpo,
    InOutExpo,
}

function tween(from: float, to: float, t: float, type: Tween = Tween.Linear): float {
    switch (type) {
        case Tween.InQuad: t = t * t; break
        case Tween.OutQuad: t = 1 - (1 - t) * (1 - t); break

        case Tween.InOutQuad:
            t = t < 0.5
                ? 2 * t * t
                : 1 - Math.pow(-2 * t + 2, 2) / 2
            break

        case Tween.InCubic: t = t * t * t; break
        case Tween.OutCubic: t = 1 - Math.pow(1 - t, 3); break

        case Tween.InOutCubic:
            t = t < 0.5
                ? 4 * t * t * t
                : 1 - Math.pow(-2 * t + 2, 3) / 2
            break

        case Tween.InExpo: t = t === 0 ? 0 : Math.pow(2, 10 * t - 10); break
        case Tween.OutExpo: t = t === 1 ? 1 : 1 - Math.pow(2, -10 * t); break

        case Tween.InOutExpo:
            if (t === 0) t = 0
            else if (t === 1) t = 1
            else if (t < 0.5)
                t = Math.pow(2, 20 * t - 10) / 2
            else
                t = (2 - Math.pow(2, -20 * t + 10)) / 2
            break
    }

    return from + (to - from) * t
}

interface Sight {
    from: float,
    to: float,
}
function sight_len(s: Sight) {
    return s.to - s.from
}

function sight_speed(dst: Sight, src: Sight) {
    return sight_len(src) / sight_len(dst)
}

function sight_set_speed(dst: Sight, src: Sight, speed: float) {
    dst.to = dst.from + sight_len(src) / speed
}

function sight_map(x: float, from: Sight, to: Sight) {
    return to.from + (x - from.from) * sight_len(to) / sight_len(from)
}

function hypot(x: float, y: float) { return Math.sqrt(x * x + y * y) }
function sqmag(x: float, y: float) { return x * x + y * y }