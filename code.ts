
type int = number
type float = number

let main_canvas: HTMLCanvasElement
let file_input: HTMLInputElement
let file_label: HTMLLabelElement
let ctx: CanvasRenderingContext2D
let track_video: HTMLCanvasElement
let animateds: Animated[] = [];
let _last_frame = 0;


function init() {
    main_canvas = <HTMLCanvasElement>document.getElementById('main')
    file_input = <HTMLInputElement>document.getElementById('file')
    file_label = <HTMLLabelElement>document.getElementById('file_label')
    track_video = <HTMLCanvasElement>document.getElementById('track_video')

    file_input.onchange = async (ev: Event) => {
        const file = (<HTMLInputElement>ev.target).files?.[0]
        if (!file) return
        let vid = await video_create(file, 8)
        let aud = await audio_create(file)
        await video_decode(vid, 0, vid.duration, (f) => file_label.innerText = "decoding... " + Math.ceil(f * 100) + "%")
        test.render_video(vid, aud)
    }

    ctx = main_canvas.getContext('2d')!
}

function main() {
    init()

    ctx.fillStyle = 'black'
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)

    update()

    let from = [0, 0, 0, 0]
    let to = [0, 0, 1, 1]
    let cur = [0, 0, 0, 0]

    animate_for(1, t => {
        rect_lerp(cur, from, to, t)
        ctx.fillStyle = 'red'
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
        ctx_fill_rect(cur, ctx)
    }, Tween.InExpo)
}

function update() {

    const now = Date.now()
    let dt = (now - _last_frame) / 1000
    requestAnimationFrame(update)

    if (_last_frame == 0) {
        _last_frame = now
        return
    }
    _last_frame = now

    for (let i = animateds.length - 1; i >= 0; i--)
        if (animateds[i].elapsed > animateds[i].time) {
            animateds[i].fn(1)
            animateds.splice(i, 1)
        }
    for (let x of animateds) {
        let p = clamp(x.elapsed / x.time, 0, 1)
        p = tween(0, 1, p, x.tween)
        x.fn(p)
        x.elapsed += dt
    }

}


function ctx_fill_rect(rect: Rect, c: CanvasRenderingContext2D) {
    let w = c.canvas.width
    let h = c.canvas.height
    c.fillRect(rect[0] * w, rect[1] * w, rect[2] * w, rect[3] * h)
}

interface Animated {
    tween: Tween
    id: int
    elapsed: float
    time: float
    fn: (t: float) => void
}

function animate_for(time: float, f: (t: float) => void, tween = Tween.Linear): int {
    animateds.push({ elapsed: 0, fn: f, id: animateds.length, time: time, tween: tween })
    return animateds.length - 1
}

interface Item {
    start: float
    end: float
}

interface VisualItem extends Item {
    rect: Rect
}

interface ColorItem extends VisualItem {
    color: string
}

interface FrameItem extends VisualItem {
    video: int
    frame: int
}

interface VideoItem extends FrameItem {
    count: int
}

interface ImageItem extends VisualItem {
    image: int
}

interface Track {
    length: float
    items: VideoItem[]
}

function draw_video_on_track(vid: Video, ctx: CanvasRenderingContext2D, from: float = 0, to: float = vid.duration) {
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

        ctx.drawImage(vid.frames[i].bitmap!, x, 0, w, ctx.canvas.height)
    }
}

function draw_audio_on_track(aud: Audio, ctx: CanvasRenderingContext2D, from: float = 0, to: float = aud.duration) {
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