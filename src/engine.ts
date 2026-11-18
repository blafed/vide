interface Item {
    res: Res
    layer: int //track
    from: float, to: float, //absolute
    sfrom: float, sto: float //normalized
    rect: Rect //absolute
    srect: Rect //normalized
    opacity: float
    props?: Record<string, float>
}

const enum AnimProp { DstX, DstY, DstW, DstH, SrcX, SrcY, SrcW, SrcH, }
interface Anim { item: Item, prop: AnimProp | string, curve: Curve }
type ItemCurve = Curve & { item: Item, prop: AnimProp | string }
type ResProps = Record<string, float>
type ResColorProps = { r: int, g: int, b: int, a: float }
type SquareResProps = ResColorProps | { ow: float, or: int, og: int, ob: int, oa: float }

interface Res {
    draw(ctx: Canvas, t: float, dst: Rect, src?: Rect, props?: ResProps): boolean //t and src are normalized; dst is absolute
    tc?(ctx: Canvas): void //temp canvas
    load?(chunk: int): Promise<void>
    unload?(chunk: int): Promise<void>
    chunks?(from: float, to: float): int[]
}

class TestRes implements Res {
    draw(ctx: Canvas, t: float, dst: Rect): boolean {
        ctx.fillStyle = `hsl(${255 * t}, 100%, 50%)`
        ctx.fillRect(dst[0], dst[1], dst[2], dst[3])
        return true;
    }
}

class ImageRes implements Res {
    blob: Blob
    bitmap: ImageBitmap | null = null;
    constructor(blob: Blob) { this.blob = blob; }
    draw(ctx: Canvas, t: float, dst: Rect, src: Rect): boolean {
        if (!this.bitmap) return false;
        rect_scale(src, this.bitmap.width, this.bitmap.height)
        canvas_draw_img3(ctx, this.bitmap, dst, src)
        return true;
    }
    async load(chunk: int): Promise<void> { if (!this.bitmap) this.bitmap = await createImageBitmap(this.blob); }
    async unload(chunk: int): Promise<void> { if (this.bitmap) { this.bitmap.close(); this.bitmap = null; } }
}

class SquareRes implements Res {
    static PROPS = { r: 0, g: 0, b: 1, a: 1, or: 0, og: 0, ob: 0, oa: 1, ow: 0 }

    draw(ctx: Canvas, t: float, dst: Rect, src?: Rect, props?: ResProps): boolean {
        let { r, g, b, a, or, ob, og, oa, ow } = { ...SquareRes.PROPS, ...props }

        let outline = ow / 2
        if (outline > 0) {
            ctx.strokeStyle = rgba(or, og, ob, oa)
            ctx.strokeRect(dst[0] + outline, dst[1] + outline, dst[2] - outline * 2, dst[3] - outline * 2)
        }
        ctx.fillStyle = color(r, g, b, a)
        ctx.fillRect(dst[0], dst[1], dst[2], dst[3])
        return true
    }
}

class TextRes implements Res {
    static PROPS = { size: 16, weight: 400, r: 1, g: 1, b: 1, a: 1 }
    text = ''; font = 'monospace';

    draw(ctx: Canvas, t: float, dst: Rect, src?: Rect, props?: ResProps): boolean {
        if (!this.text) return false;

        let { size, weight, r, g, b, a } = { ...TextRes.PROPS, ...props }

        ctx.font = `${weight} ${size}px ${this.font}`;
        ctx.fillStyle = color(r, g, b, a)
        ctx.textBaseline = 'top';
        ctx.beginPath()
        ctx.rect(dst[0], dst[1], dst[2], dst[3])

        ctx.save(); ctx.clip(); ctx.fillText(this.text, dst[0], dst[1], dst[2]); ctx.restore()

        return true;
    }
}


function item_create(): Item { return { res: null!, layer: 0, from: 0, to: 1, sfrom: 0, sto: 1, rect: [0, 0, 1, 1], srect: [0, 0, 1, 1], opacity: 1 } }
function items_sort(items: Item[]) { items.sort((a, b) => a.layer == b.layer ? a.from - b.from : a.layer - b.layer) }
function item_clone(item: Item): Item {
    let clone = { ...item }
    clone.srect = rect_clone(item.srect)
    clone.rect = rect_clone(item.rect)
    return clone
}
function item_prop(it: Item, prop: AnimProp | string) {
    if (typeof prop == 'string') {
        if (!it.props) return 0
        return it.props[prop]
    }
    switch (prop) {
        case AnimProp.DstX: return it.rect[0];
        case AnimProp.DstY: return it.rect[1];
        case AnimProp.DstW: return it.rect[2];
        case AnimProp.DstH: return it.rect[3];
        case AnimProp.SrcX: return it.srect[0];
        case AnimProp.SrcY: return it.srect[1];
        case AnimProp.SrcW: return it.srect[2];
        case AnimProp.SrcH: return it.srect[3];
    }
}

function item_propx(it: Item, prop: AnimProp | string, value: number) {
    if (typeof prop == 'string') {
        if (!it.props) it.props = {}
        it.props[prop] = value
    }
    switch (prop) {
        case AnimProp.DstX: it.rect[0] = value; break;
        case AnimProp.DstY: it.rect[1] = value; break;
        case AnimProp.DstW: it.rect[2] = value; break;
        case AnimProp.DstH: it.rect[3] = value; break;
        case AnimProp.SrcX: it.srect[0] = value; break;
        case AnimProp.SrcY: it.srect[1] = value; break;
        case AnimProp.SrcW: it.srect[2] = value; break;
        case AnimProp.SrcH: it.srect[3] = value; break;
    }
}

function item_curvify(it: Item, prop: AnimProp | string, curve: Curve, t: float) { let v = curve_eval(curve, t); item_propx(it, prop, v) }
function item_curvify2(curve: ItemCurve, t: float) { item_curvify(curve.item, curve.prop, curve, t) }

function items_draw(items: Item[], ctx: Canvas, t: float) {
    //this function expects items are sorted
    for (let it of items) {
        if (t < it.from || t > it.to) continue
        let tr = lerp(it.sfrom, it.sto, unlerp(it.from, it.to, t))
        it.res.draw(ctx, tr, it.rect, it.srect, it.props)
    }
}

async function items_curvifier(items: Item[], curves: Curve[], t: float) {

}

async function items_render(items: Item[], ctx: Canvas, from: float, to: float, fps: float = 30, waiter = (t: float) => sleep(1 / fps)) {
    if (to < from || fps <= 0) throw new Error(`wtf (${from},${to}, @${fps})`)

    const dt = 1 / fps

    for (let t = from; t < to; t += dt) {
        canvas_clear_all(ctx)
        items_draw(items, ctx, t)
        if (waiter) await waiter(t)
    }

    canvas_clear_all(ctx)
    items_draw(items, ctx, to)
    if (waiter) await waiter(to)
}

class Proc {
    e: Ease
    t: float = 0; x: float = 0; y: float = 0
    fontFamily = 'monospace'; fontSize = 16; fontWeight = 400;

    items: Item[] = []
    curves: ItemCurve[] = []

    canvas = canvas_create(1, 1)

    seek(t: float) { this.t = t }
    wait(dt: float) { this.t += dt }
    move(x: float, y: float) { this.x = x; this.y = y }
    walk(dx: float, dy: float) { this.x += dx; this.y += dy }
    font(size: float, f?: string, weight?: int) {
        this.fontSize = size; if (f != undefined) this.fontFamily = f; if (weight != undefined) this.fontWeight = weight;
    }
    ease(ease: Ease) { this.e = ease }

    private add(after = 0) {
        let p = item_create()
        this.items.push(p)

        p.from = this.t + after
        return p
    }

    private place(w: float, h: float) {
        let p = this.items[this.items.length - 1]
        p.rect[0] = this.x; p.rect[1] = this.y; p.rect[2] = w; p.rect[3] = h
    }

    add_square(width = 200, height = 200) {
        let p = this.add()
        let res = new SquareRes()
        p.res = res
        this.place(width, height)
    }

    add_text(text: string) {
        let p = this.add()
        let res = new TextRes()
        res.text = text
        p.res = res
        this.canvas.font = `${this.fontWeight} ${this.fontSize}px ${this.fontFamily}`
        let w = this.canvas.measureText(text)
        console.log(this.canvas.font, w)
        this.place(w.width, w.fontBoundingBoxAscent + w.fontBoundingBoxDescent)
    }

    // private anim(prop: AnimProp, t: float, val: float, additive = false) {
    //     let item = this.items[this.items.length - 1]

    //     if (additive) val += item_prop(item, prop)

    //     let curves = this.curves.get(item) ?? new Map<AnimProp, Curve>()
    //     let c = curves.get(prop)
    //     if (!c) curves.set(prop, curve(t, item_prop(item, prop), val))
    //     else c.push([t, val])
    // }

    // private animt(prop : AnimProp, t : float, val : float, additive = false) {
    //     let item = this.items[this.items.length - 1]
    //     anim(prop, t / (item.to - item.from))
    // }

    private get_curve(item: Item, prop: AnimProp | string, o: float) {
        let c = this.curves.find(x => x.item == item && x.prop == prop)
        if (c == null) {
            this.curves.push(c = <ItemCurve>[0, o])
            c.item = item; c.prop = prop
        }
        return c
    }
    private add_anim(prop: AnimProp | string, v: float, ts: float) {
        let item = this.items[this.items.length - 1]
        let c = this.get_curve(item, prop, item_prop(item, prop));
        c.push(ts - item.from, v)
    }

    anim_walk(dx: float, dy: float, due: float) {
        this.add_anim(AnimProp.DstX, this.x + dx, this.t + due); this.add_anim(AnimProp.DstY, this.y + dy, this.t + due)
        this.walk(dx, dy)
    }

    anim_scale(due: float, w: float, h: float) {
        // this.add_anim(AnimProp.DstW, AnimProp.DstH)
    }

    anim_color(due: float, r?: int, g?: int, b?: int) {
        if (r != undefined) this.add_anim('r', r, this.t + due)
        if (g != undefined) this.add_anim('g', g, this.t + due)
        if (b != undefined) this.add_anim('b', b, this.t + due)
    }

    static rgba(r: int, g: int, b: int, a: int): { r: int, g: int, b: int, a: int } { return { r, g, b, a } }
    static rgb(r: int, g: int, b: int): { r: int, g: int, b: int, a: int } { return { r, g, b, a: 255 } }
}

