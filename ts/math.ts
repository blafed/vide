type Point = [number, number]
type Rect = [number, number, number, number] | number[]


function lerp(a: number, b: number, t: number) { return a + (b - a) * t }
function clamp(v: number, min: number, max: number) { return Math.min(Math.max(v, min), max) }

function rect_one(): Rect { return [0, 0, 1, 1] }
function rect_zero(): Rect { return [0, 0, 0, 0] }

function rect_lerp(dst: Rect, a: Rect, b: Rect, t: number) {
    dst[0] = lerp(a[0], b[0], t)
    dst[1] = lerp(a[1], b[1], t)
    dst[2] = lerp(a[2], b[2], t)
    dst[3] = lerp(a[3], b[3], t)
}


function rect_fit(src_w: number, src_h: number, dst_w: number, dst_h: number): Rect {
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

function tween(from: number, to: number, t: number, type: Tween = Tween.Linear): number {
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