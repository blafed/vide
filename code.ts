
type int = number
type float = number

let main_canvas: HTMLCanvasElement
let file_input: HTMLInputElement
let ctx: CanvasRenderingContext2D
let animateds: Animated[] = [];
let _last_frame = 0;


function init() {
    main_canvas = <HTMLCanvasElement>document.getElementById('main')
    file_input = <HTMLInputElement>document.getElementById('file')

    file_input.onchange = async (ev: Event) => {
        const file = (<HTMLInputElement>ev.target).files?.[0]
        if (!file) return
        let vid = await video_create(file)
        test.render_video(vid)
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
        rect_fill(cur, ctx)
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

type Point = [number, number]
type Rect = [number, number, number, number] | number[]

function lerp(a: number, b: number, t: number) { return a + (b - a) * t }
function clamp(v: number, min: number, max: number) { return Math.min(Math.max(v, min), max) }

function rect_lerp(dst: Rect, a: Rect, b: Rect, t: number) {
    dst[0] = lerp(a[0], b[0], t)
    dst[1] = lerp(a[1], b[1], t)
    dst[2] = lerp(a[2], b[2], t)
    dst[3] = lerp(a[3], b[3], t)
}
function rect_fill(rect: Rect, c: CanvasRenderingContext2D) {
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

interface Timeline {
    length: float
    items: Item[]
}