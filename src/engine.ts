interface Item {
    res: Res
    layer: int //track

    //source is normalized
    //destination is absolute

    from: float, to: float, //dst
    sfrom: float, sto: float //src
    rect: Rect, //dst rect
    srect: Rect //src rect
    clip?: Rect, //relative

    opacity: float
    props: ResProps
}

interface Scene {
    duration: float, width: int, height: int
    items: Item[], curves: ItemCurve[]
}

const enum Prop { DstX, DstY, DstW, DstH, SrcX, SrcY, SrcW, SrcH, Opacity, ClipX, ClipY, ClipW, ClipH }
interface Anim { item: Item, prop: Prop | string, curve: Curve }
type ItemCurve = Curve & { item: Item, prop: Prop | string }
type ResProps = Record<string, float>


function item_create(res: Res | null = null, from = 0, to = 1, rect: Rect = [0, 0, 100, 100]): Item {
    return {
        res: res!, layer: 0, from, to, sfrom: 0, sto: 1, rect, srect: [0, 0, 1, 1], opacity: 1,
        props: { ...((res?.constructor as any).PROPS ?? {}) }
    }
}
function items_sort(items: Item[]) { items.sort((a, b) => a.layer == b.layer ? a.from - b.from : a.layer - b.layer) }
function item_clone(item: Item): Item {
    let clone = { ...item }
    clone.srect = rect_clone(item.srect)
    clone.rect = rect_clone(item.rect)
    clone.props = { ...item.props }
    if (item.clip) clone.clip = { ...item.clip }
    return clone
}
function item_prop(it: Item, prop: Prop | string) {
    if (typeof prop == 'string') {
        if (!it.props) return 0
        return it.props[prop]
    }
    switch (prop) {
        case Prop.DstX: return it.rect[0];
        case Prop.DstY: return it.rect[1];
        case Prop.DstW: return it.rect[2];
        case Prop.DstH: return it.rect[3];
        case Prop.SrcX: return it.srect[0];
        case Prop.SrcY: return it.srect[1];
        case Prop.SrcW: return it.srect[2];
        case Prop.SrcH: return it.srect[3];
        case Prop.ClipX: return it.clip?.[0] ?? 0;
        case Prop.ClipY: return it.clip?.[1] ?? 0;
        case Prop.ClipW: return it.clip?.[2] ?? 1;
        case Prop.ClipH: return it.clip?.[3] ?? 1;
        case Prop.Opacity: return it.opacity;
    }
}

function item_propx(it: Item, prop: Prop | string, value: number) {
    if (typeof prop == 'string') {
        if (!it.props) it.props = {}
        it.props[prop] = value
        return
    }

    switch (prop) {
        case Prop.Opacity: it.opacity = value; break;
        case Prop.DstX: it.rect[0] = value; break;
        case Prop.DstY: it.rect[1] = value; break;
        case Prop.DstW: it.rect[2] = value; break;
        case Prop.DstH: it.rect[3] = value; break;
        case Prop.SrcX: it.srect[0] = value; break;
        case Prop.SrcY: it.srect[1] = value; break;
        case Prop.SrcW: it.srect[2] = value; break;
        case Prop.SrcH: it.srect[3] = value; break;
        case Prop.ClipX: case Prop.ClipY: case Prop.ClipW: case Prop.ClipH:
            if (!it.clip) it.clip = [0, 0, 1, 1]
            it.clip[prop - Prop.ClipX] = value
            break
    }
}

function item_curvify(it: Item, prop: Prop | string, curve: Curve, t: float) { let v = curve_eval(curve, t); item_propx(it, prop, v) }
function item_curvify2(curve: ItemCurve, t: float) { item_curvify(curve.item, curve.prop, curve, t - curve.item.from) }
function item_uncurvify(curve: ItemCurve) { item_propx(curve.item, curve.prop, curve[1]) }

function item_curve(it: Item, prop: Prop | string): ItemCurve {
    let c: ItemCurve = [0, item_prop(it, prop)] as ItemCurve
    c.item = it; c.prop = prop;
    return c;
}

function items_draw(items: Item[], ctx: Canvas, t: float) {
    //this function expects items are sorted
    for (let it of items) {
        if (t < it.from || t > it.to) continue
        let tr = lerp(it.sfrom, it.sto, unlerp(it.from, it.to, t))

        ctx.save();
        if (it.clip) canvas_clipz(ctx, it.clip);
        ctx.globalAlpha = it.opacity;

        it.res.draw(ctx, it.rect, tr, it.srect, it.props);

        ctx.restore();
    }
}

function items_draw2(items: Item[], curves: ItemCurve[], ctx: Canvas, t: float) {
    for (let x of curves) item_curvify2(x, t)
    items_draw(items, ctx, t)
}

function scene_draw(scene: Scene, ctx: Canvas, t: float) {
    items_draw2(scene.items, scene.curves, ctx, t);
}

async function items_render2(items: Item[], curves: ItemCurve[], ctx: Canvas, from: float, to: float, dt: float = 1 / 30, waiter = (t: float) => frame()) {
    if (to < from || dt <= 0) throw new Error(`wtf (${from},${to}, @${30 / dt})`)

    for (let t = from; t < to; t += dt) {
        canvas_clear_all(ctx)
        items_draw2(items, curves, ctx, t)
        if (waiter) await waiter(t)
    }

    canvas_clear_all(ctx)
    items_draw2(items, curves, ctx, to)
    if (waiter) await waiter(to)

    canvas_clear_all(ctx)
    items_draw2(items, curves, ctx, to)
}



async function items_render(items: Item[], ctx: Canvas, from: float, to: float, dt: float = 1 / 30, waiter = (t: float) => frame()) {
    if (to < from || dt <= 0) throw new Error(`wtf (${from},${to}, @${30 / dt})`)

    for (let t = from; t < to; t += dt) {
        canvas_clear_all(ctx)
        items_draw(items, ctx, t)
        if (waiter) await waiter(t)
    }

    canvas_clear_all(ctx)
    items_draw(items, ctx, to)
    if (waiter) await waiter(to)

    canvas_clear_all(ctx)
    items_draw(items, ctx, to)
}


type ResColorProps = { r: int, g: int, b: int, a: float }
type SquareResProps = ResColorProps | { ow: float, or: int, og: int, ob: int, oa: float }

interface Res {
    draw(ctx: Canvas, dst: Rect, t: float, src?: Rect, props?: ResProps): boolean //dst is pixels; t and src are normalized
    load?(chunk: int): Promise<void>
    unload?(chunk: int): Promise<void>
    chunks?(from: float, to: float): int[]
}


class TestRes implements Res {
    draw(ctx: Canvas, dst: Rect, t: float): boolean {
        let [x, y, w, h] = dst;

        ctx.fillStyle = `hsl(${360 * t}, 100%, 50%)`;
        ctx.fillRect(x, y, w, h);

        ctx.fillStyle = 'white';
        ctx.font = `${Math.max(12, h * 0.2)}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(t.toFixed(2), x + w / 2, y + h / 2);
        return true;
    }
}