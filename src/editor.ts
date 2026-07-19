let entitys = new Map<EventTarget, any>()

function id<T extends HTMLElement>(id: string) { return document.getElementById(id)! as T }
function classes(c: string, within: HTMLElement | Document = document): Array<HTMLElement> {
    let arr = []
    let list = within.getElementsByClassName(c)
    for (let e = 0; e < list.length; ++e) arr.push(<HTMLElement>list[e])
    return arr
}
function class1(c: string, within: HTMLElement) { return classes(c, within)[0]! }
function prevent(e: Event) {
    e.stopPropagation()
    e.preventDefault()
}
function create_child<K extends keyof HTMLElementTagNameMap>(el: HTMLElement, tag: K, cls: string = ''): HTMLElementTagNameMap[K] {
    let child = document.createElement(tag)
    child.className = cls
    el.appendChild(child)
    return child
}

function update_over<T>(contianer: HTMLElement, arr: Readonly<T[]>, fn: (v: T, el: HTMLElement, first: boolean, i: int) => void) {
    const template = contianer.children[0] as HTMLElement
    template.style.display = 'none'

    let lastLength = contianer.children.length - 1
    while (contianer.children.length - 1 < arr.length) {
        let clone = template.cloneNode(true) as HTMLElement
        contianer.appendChild(clone)
    }

    for (let i = 0; i < arr.length; i++) {
        let el = contianer.children[i + 1] as HTMLElement
        el.style.display = ''
        fn(arr[i], el, i >= lastLength, i)
    }

    for (let i = arr.length + 1; i < contianer.children.length; i++)
        (contianer.children[i] as HTMLElement).style.display = 'none'
}

function class_toggle(el: HTMLElement, c: string, cond: boolean) {
    if (cond) el.classList.add(c)
    else el.classList.remove(c)
}
function set_highlight(el: HTMLElement, v: boolean) { class_toggle(el, 'high', v) }
function set_dragging(el: HTMLElement, v: boolean) { class_toggle(el, 'drag', v) }
function event_closest(ev: Event, selector: string) {
    let target = ev.target
    if (!(target instanceof Element))
        return null
    return target.closest(selector) as HTMLElement
}
function ent<T>(el: EventTarget, set?: T): T | null {
    if (set != undefined) {
        (el as any)._ent = set //useless; only for debug
        entitys.set(el, set)
        return set
    } else {
        return entitys.get(el)
    }
}
function ent1<T>(el: EventTarget): T {
    let e = ent<T>(el)
    if (e != undefined) return e
    else throw new Error('no entity ' + el)
}


//======================
//#region INPUT
//======================

function text(el: HTMLInputElement) {
    let value = el.value
    switch (el.id) {
        case 'path': editor.repath(trim_edges(value.trimStart(), '/')); break
    }
}
function btn(el: HTMLElement) {
    switch (el.id) {
        case 'import': id('file').click(); break
    }
}
function opt(el: HTMLSelectElement) { }
function file(el: HTMLInputElement) {
    if (el.files) editor.import_many(el.files, editor.path)
    el.value = ''
}

const enum PointerMode { None, Hover, Down, PendDrag, Up, Drag, DragStart, DragEnd, Drop, }

let pointers = <Pointer[]>[]
let hovers = <Pointer[]>[]
interface Pointer {
    id: int,
    ox: float, oy: float, //start
    dx: float, dy: float, //displacement
    x: float, y: float, //current
    ex: float, ey: float, //down starting position, relative
    cx: float, cy: float, //current starting position, relative
    down: HTMLElement | null, cur: HTMLElement | null
    datatransfer: DataTransfer | null
    isDrag: boolean
}

function pointer(p: Pointer, el: HTMLElement, mode: PointerMode) { }
function datadrop(p: Pointer, el: HTMLElement, mode: PointerMode.DragStart | PointerMode.DragEnd | PointerMode.Drop) { }



function event_pointer_drag(ev: DragEvent) {
    let p = pointers.find(x => x.datatransfer)
    if (!p) {
        p = { isDrag: false, datatransfer: ev.dataTransfer, x: ev.clientX, y: ev.clientY, ox: ev.clientX, oy: ev.clientY, dx: 0, dy: 0, ex: 0, ey: 0, cx: 0, cy: 0, cur: null, down: ev.target as HTMLElement, id: -1, }
        pointers.push(p)
    } else {
        p.x = ev.clientX, p.y = ev.clientY
        p.dx = p.x - p.ox, p.dy = p.y - p.oy
        p.datatransfer = ev.dataTransfer
    }
    return p
}


function pointer_hit(ev: Event): HTMLElement | null {
    let el = event_closest(ev, '.comp')
    while (el) {
        if (el.style.pointerEvents != 'none') break
        el = el.parentElement?.closest('.comp') as HTMLElement | null
    }
    return el
}

function on_keydown(e: KeyboardEvent) { }
function on_keyup(e: KeyboardEvent) { }

function on_dragenter(ev: DragEvent) { prevent(ev) }
function on_dragleave(ev: DragEvent) {
    prevent(ev)
    let p = event_pointer_drag(ev)
    if (p.cur) datadrop(p, p.cur, PointerMode.DragEnd)
}
function on_dragover(ev: DragEvent) {
    prevent(ev)
    let p = event_pointer_drag(ev)
    let hit = pointer_hit(ev)

    if (hit != p.cur) {
        if (p.cur) datadrop(p, p.cur, PointerMode.DragEnd)
        p.cur = hit
        if (p.cur) datadrop(p, p.cur, PointerMode.DragStart)
    }
}
function on_dragend(ev: DragEvent) {
    prevent(ev)
    let p = event_pointer_drag(ev)
    if (p.cur) datadrop(p, p.cur, PointerMode.DragEnd)
    let index = pointers.indexOf(p)
    pointers.splice(index, 1)
}
function on_dragdrop(ev: DragEvent) {
    prevent(ev)
    let p = event_pointer_drag(ev)
    let hit = pointer_hit(ev)
    if (hit) {
        datadrop(p, hit, PointerMode.Drop)
        datadrop(p, hit, PointerMode.DragEnd)
        on_dragend(ev)
    }
}


function on_down(e: PointerEvent) {
    if (event_native(e))
        return
    let p = event_pointer(e)
    p.down = pointer_hit(e)
    pointer_set_xy(p, e)
    p.ox = p.x
    p.oy = p.y
    if (p.down) {
        pointer_set_exy(p, p.down)
        pointer(p, p.down, PointerMode.Down)
    }
}
function on_move(e: PointerEvent) {
    if (event_native(e))
        return

    let p = pointer_find(e)
    if (!p) {
        p = hovers.find(x => x.id == e.pointerId)
        if (!p) {
            p = event_pointer(e)
            pointers.pop()
            hovers.push(p)
        }
        p.cur = pointer_hit(e)
        pointer_set_xy(p, e)
        if (p.cur) {
            pointer_set_exy(p, p.cur)
            pointer(p, p.cur, PointerMode.Hover)
        }
        return
    }

    if (e.buttons == 0 && p.isDrag) {
        on_up(e)
        return
    }

    p.cur = pointer_hit(e)
    pointer_set_xy(p, e)

    if (p.cur) pointer(p, p.cur, PointerMode.Hover)

    if (!p.isDrag) {
        if (hypot(p.dx, p.dy) < 4) {
            if (p.down) pointer(p, p.down, PointerMode.PendDrag)
        }
        else {
            p.isDrag = true
            if (p.down) pointer(p, p.down, PointerMode.DragStart)
        }
    }
    else if (p.isDrag) {
        if (p.down) pointer(p, p.down, PointerMode.Drag)
    }
}

function on_up(e: PointerEvent) {
    if (event_native(e)) {
        on_cancel(e)
        return
    }

    let p = event_pointer(e)
    p.cur = pointer_hit(e)
    pointer_set_xy(p, e)

    if (p.isDrag) {
        if (p.cur) {
            pointer(p, p.cur, PointerMode.Drop)
        }
        if (p.down) pointer(p, p.down, PointerMode.DragEnd)
    }
    if (p.down) pointer(p, p.down, PointerMode.Up)
    on_cancel(e)
}
function on_cancel(e: PointerEvent) {
    if (event_native(e))
        return
    let p = pointer_find(e)
    if (!p)
        return
    let index = pointers.indexOf(p)
    pointers.splice(index, 1)
}



function pointer_find(ev: PointerEvent) {
    return pointers.find(p => p.id == ev.pointerId)
}


function event_native(ev: PointerEvent): boolean {
    const target = ev.target as Element | null
    if (!target)
        return false

    if (target.closest("input, textarea, select, button, option, label, details, summary"))
        return true

    for (let el: Element | null = target; el; el = el.parentElement) {
        if (!(el instanceof HTMLElement))
            continue
        //scrollbar check
        if (ev.target === el && (ev.offsetX >= el.clientWidth || ev.offsetY >= el.clientHeight))
            return true
    }

    return false
}

function event_pointer(ev: PointerEvent): Pointer {
    let p = pointer_find(ev)
    if (!p) {
        p = { isDrag: false, id: ev.pointerId, ox: ev.clientX, oy: ev.clientY, x: ev.clientX, y: ev.clientY, ex: 0, ey: 0, dx: 0, dy: 0, cx: 0, cy: 0, down: null, cur: null, datatransfer: null, }
        pointers.push(p)
    }
    return p
}

function pointer_set_xy(p: Pointer, ev: PointerEvent) {
    p.x = ev.clientX
    p.y = ev.clientY
    p.dx = p.x - p.ox
    p.dy = p.y - p.oy
    if (p.cur) {
        let bound = p.cur.getBoundingClientRect()
        p.cx = p.x - bound.left
        p.cy = p.y - bound.top
    }
}

function pointer_set_exy(p: Pointer, el: HTMLElement) {
    let bound = el.getBoundingClientRect()
    p.ex = p.x - bound.left
    p.ey = p.y - bound.top
}


const enum Tool {
    None,
    Import,
    AssetDrag,
    ItemMove,
    ItemSetLeft,
    ItemSetRight,
    ItemRelayer,
    ItemRespeed,
    ItemSplit,

    TrackMerge,
    TrackUngap,
    TrackUngapLeft,
    TrackCut,

    TimelineViewMove,
    TimelineViewLeft,
    TimelineViewRight,
}

function init_input() {
    document.body.onkeydown = on_keydown
    document.body.onkeyup = on_keyup
    document.body.ondrop = on_dragdrop
    document.body.ondragover = on_dragover
    document.body.ondragenter = on_dragenter
    document.body.ondragleave = on_dragleave
    document.body.ondragend = on_dragend
    window.onpointerdown = on_down
    window.onpointermove = on_move
    window.onpointerup = on_up
    window.onpointercancel = on_cancel
    document.body.onselect = e => prevent(e)
}


const enum LogType { Log, Warn, Error }
const enum SelectMode { Once, Additive, Toggle, }
interface Asset {
    path: string
    res: Res
    thumb?: ImageBitmap
}

let editor: Editor
class Editor {
    path = ''
    scene!: Scene
    sceneAsset: Asset | null = null
    dirty = { scene: true, assets: true, res: new Set<Res>(), asset: new Set<Asset>(), item: new Set<Item>(), track: new Set<int>(), }
    tool = Tool.None
    autotool = true

    res: Res[] = []
    assets: Asset[] = []
    files: File[] = []

    selAsset = new Set<Asset>()
    selItem = new Set<Item>()

    requested = false


    log(msg: string, type: LogType) { console.log(type ? msg.toUpperCase() : msg); return null }
    loge(msg: string) { return this.log(msg, LogType.Error) }
    repath(s: string) { }
    import(res: Res, path: string) { }
    import_one(file: File, path: string) { }
    import_many(files: FileList, path: string) { }

    new_asset(res: Res, path: string): Asset | null {
        if (res.file && this.has_file(res.file)) return this.loge('file already imported ' + res.file.name)
        if (this.has_path(path)) return this.loge('path already exist')
        let asset: Asset = { path, res }
        if (res.file) this.files.push(res.file)
        this.assets.push(asset)
        this.res.push(asset.res)
        this.dirty_asset(asset)
        this.dirty_res(res)
        return asset
    }
    new_scene(path: string) { return this.new_asset(scene_create(), path) }
    open_scene(a: Asset) {
        if (a.res.type != ResType.Scene)
            return this.loge('not a scene')
        this.sceneAsset = a
        this.scene = a.res
        this.dirty_assets()
        this.dirty_scene()
        return this.scene
    }

    is_sel_asset(a: Asset) { return this.selAsset.has(a) }
    is_sel_item(i: Item) { return this.selItem.has(i) }
    sel_asset(a: Asset, v: boolean) { v ? this.selAsset.add(a) : this.selAsset.delete(a); this.dirty_asset(a) }
    sel_asset2(a: Asset, mode: SelectMode) {
        switch (mode) {
            case SelectMode.Once: this.unsel_assets(); this.sel_asset(a, true); break
            case SelectMode.Additive: this.sel_asset(a, true); break
            case SelectMode.Toggle: this.sel_asset(a, !this.is_sel_asset(a)); break
        }
    }
    sel_item(item: Item, v: boolean) { v ? this.selItem.add(item) : this.selItem.delete(item); this.dirty_item(item) }
    sel_item2(item: Item, mode: SelectMode) {
        switch (mode) {
            case SelectMode.Once: this.unsel_items(); this.sel_item(item, true); break
            case SelectMode.Additive: this.sel_item(item, true); break
            case SelectMode.Toggle: this.sel_item(item, !this.is_sel_item(item)); break
        }
    }
    unsel_assets() { this.selAsset.clear(); this.dirty_assets() }
    unsel_items() { this.selItem.clear(); this.dirty_scene() }

    time(from: float, to: float) { }
    timeplay(from: float, to: float) { }
    untimeplay() { }
    play(t: float) { }
    playcur() { }
    playnext() { }
    playprev() { }
    playing(b: boolean) { }

    time_preplace() { } //initialize a displacement state
    time_displace(delta: float) { } //displaces current selected timeline stuff

    dirty_scene() { this.dirty.scene = true; this.request() }
    dirty_asset(x: Asset) { this.dirty.asset.add(x); this.request() }
    dirty_res(x: Res) { this.dirty.res.add(x); this.request() }
    dirty_item(x: Item) { this.dirty.item.add(x); this.request() }
    dirty_track(x: int) { this.dirty.track.add(x); this.request() }
    dirty_assets() { this.dirty.assets = true; this.request() }

    request() {
        if (!this.requested) {
            requestAnimationFrame(() => {
                this.requested = false
                editor_update()
            })
            this.requested = true
        }
    }

    gui2time(x: float): float { return x * this.scene.duration / id('tracks').clientWidth }
    time2gui(t: float): float { return t * id('tracks').clientWidth / this.scene.duration }
    gui2space(p: Point): Point { let c = id('main'); return point(p[0] * this.scene.width / c.clientWidth, p[1] * this.scene.height / c.clientHeight,) }
    space2gui(p: Point): Point { let c = id('main'); return point(p[0] * c.clientWidth / this.scene.width, p[1] * c.clientHeight / this.scene.height,) }


    has_path(str: string) { return this.assets.findIndex(x => x.path == str) != -1 }
    has_file(f: File) { return this.files.findIndex(x => Editor.file_fingerprint(f) == Editor.file_fingerprint(x)) != -1 }
    static file_fingerprint(f: File) { return `${f.name}|${f.size}|${f.lastModified}` }
}

function editor_update() {
}