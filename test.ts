namespace test {
    export async function render_video(vid: Video, aud: Audio) {
        console.log(vid)
        let rect = fit_rect(vid.width, vid.height, ctx.canvas.width, ctx.canvas.height)
        draw_audio_on_track(aud, track_video.getContext('2d'), 0, aud.duration)

        while (1)
            for (let frame of vid.frames) {
                await new Promise<void>(ok => setTimeout(() => ok(), 1 / vid.fps * 1000))
                ctx.drawImage(frame.bitmap!, rect[0], rect[1], rect[2], rect[3])
                console.log(frame)
            }
    }
}


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