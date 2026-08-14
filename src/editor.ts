let entitys = new Map<HTMLElement, any>()

function id<T extends HTMLElement>(id: string) { return document.getElementById(id)! as T }
function classes(c: string, within: HTMLElement = document.body): Array<HTMLElement> {
    let arr = []
    let list = within.getElementsByClassName(c)
    for (let e = 0; e < list.length; ++e) arr.push(<HTMLElement>list[e])
    return arr
}
function class1(c: string, within: HTMLElement = document.body) { return classes(c, within)[0]! }
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
function ent<T>(el: HTMLElement, set?: T): T | null {
    if (set != undefined) {
        (el as any)._ent = set //useless; only for debug
        entitys.set(el, set)
        return set
    } else {
        return entitys.get(el)
    }
}
function ent1<T>(el: HTMLElement): T {
    let e = ent<T>(el)
    if (e != undefined) return e
    else throw new Error('no entity ' + el)
}
function dent<T>(e: T): HTMLElement | null {
    for (let x of entitys)
        if (x[1] == e)
            return x[0]
    return null
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
        case 'notool':
        case 'split':
        case 'delete':
            editor.lock_tool(name2tool(el.id)); break
        case 'play': editor.play(!editor.isplaying); break
        case 'next': editor.playnext(); break
        case 'prev': editor.playprev(); break
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
    ItemDelete,

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

interface EditorItem extends Item {
    selFrom: float
}

let editor: Editor
class Editor {
    renderCtx: Canvas = canvas(id('main'))!
    thumbCtx: Canvas = canvas_create(64, 64)
    jobs = new Jobs()
    path = ''
    scene!: Scene
    sceneAsset: Asset | null = null
    dirty = { scene: true, assets: true, res: new Set<Res>(), asset: new Set<Asset>(), item: new Set<Item>(), track: new Set<int>(), timeview: true, timeplay: true, time: true, render: true }
    tool = Tool.None; toolLock = false

    res: Res[] = []
    assets: Asset[] = []
    files: File[] = []

    from = 0; to = 2 //the current timeview
    time = 0; mintime = 0; maxtime = 2
    isplaying = false

    selAsset = new Set<Asset>()
    selItem = new Set<Item>()

    requested = false

    framegives = { set: new Set(), next: 1 }

    timeviewGuiWidth = id('tracks').clientWidth

    constructor() {
        this.request()
        this.framegive((dt) => this.loopplay(dt))
        canvas_resize_dpr(this.renderCtx)
    }

    log(msg: string, type: LogType) { console.log(type ? msg.toUpperCase() : msg); return null }
    loge(msg: string) { return this.log(msg, LogType.Error) }
    repath(s: string) { }
    import(res: Res, path: string) {
        let asset = this.new_asset(res, path)
    }
    async import_one(file: File, path: string) {
        let res = await res_create(file)
        if (!res) this.loge('invalid file ' + file.name)
        else this.import(res, path)
    }
    async import_many(files: FileList, path: string) {
        let all = Array.from(files).map(x => this.import_one(x, path + x.name))
        await Promise.all(all);
    }

    new_asset(res: Res, path: string): Asset | null {
        if (res.file && this.has_file(res.file)) return this.loge('file already imported ' + res.file.name)
        if (this.has_path(path)) return this.loge('path already exist')
        let asset: Asset = { path, res }
        this.generate_thumb(asset)
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

    generate_thumb(asset: Asset) {
        let res = asset.res
        this.jobs.load(res, 0, 1).then(() => {
            this.thumbCtx.canvas.width = res_width(res), this.thumbCtx.canvas.height = res_height(res)
            res_draw_thumb(res, this.thumbCtx)
            createImageBitmap(this.thumbCtx.canvas).then(x => {
                asset.thumb = x
                this.dirty_asset(asset)
            })
        })
    }

    add_item(res: Res, layer: int, at: float, dst = res_rect(res)): Item {
        let item = item_create(res, at, undefined, dst)
        item.layer = layer
        this.scene.items.push(item)
        scene_validate(this.scene)
        this.dirty_scene()
        return item
    }
    move_item(item: Item, newFrom: float) {
        item_move(item, newFrom)
        scene_validate(this.scene)
        this.dirty_scene()
    }
    clip_item_left(item: Item, shift: float) {
        item_clip_left(item, shift)
        scene_validate(this.scene)
        this.dirty_scene()
    }
    clip_item_right(item: Item, shift: float) {
        item_clip_right(item, shift)
        scene_validate(this.scene)
        this.dirty_scene()
    }
    respeed_item(item: Item, newSpeed: float) {
        item_respeed(item, newSpeed, item.from)
        scene_validate(this.scene)
        this.dirty_scene()
    }
    remove_item(item: Item) {
        this.scene.items.splice(this.scene.items.indexOf(item), 1)
        scene_validate(this.scene)
        this.dirty_scene()
    }
    split_item(item: Item, t: float) {
        console.log('splitting ', t)
        let split = item_split(item, t)
        this.scene.items.splice(this.scene.items.indexOf(item), 1)
        this.scene.items.push(...split)
        scene_validate(this.scene)
        this.dirty_scene()
    }

    set_tool(tool: Tool) { this.tool = tool, this.request() }
    lock_tool(tool: Tool) { this.set_tool(tool), this.toolLock = tool != Tool.None; }
    unlock_tool() { this.toolLock = false; this.reset_tool() }
    reset_tool() { this.tool = 0 }

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
    sel_item(item: Item, v: boolean) {
        v ? this.selItem.add(item) : this.selItem.delete(item); this.dirty_item(item);
        (item as EditorItem).selFrom = item.from;
    }
    sel_item2(item: Item, mode: SelectMode) {
        switch (mode) {
            case SelectMode.Once: this.unsel_items(); this.sel_item(item, true); break
            case SelectMode.Additive: this.sel_item(item, true); break
            case SelectMode.Toggle: this.sel_item(item, !this.is_sel_item(item)); break
        }
    }
    unsel_assets() { this.selAsset.clear(); this.dirty_assets() }
    unsel_items() { this.selItem.clear(); this.dirty_scene() }


    framegive(cb: (dt: float) => boolean | void) {
        let last: number | null = null
        let id = this.framegives.next++
        this.framegives.set.add(id)
        const loop = (now: number) => {
            if (!this.framegives.set.has(id)) return
            if (last !== null && !cb((now - last) / 1000)) return
            last = now, requestAnimationFrame(loop)
        }
        requestAnimationFrame(loop)
        return id
    }
    render(t: float, ctx: Canvas, border: boolean) {
        var dst = rect_canvas(ctx)
        var src = res_rect(this.scene)
        rect_fit(src, dst, FitMethod.Contain)
        canvas_clear_all(ctx)
        res_draw(this.scene, ctx, t, dst, src)
        if (border) {
            this.renderCtx.strokeStyle = '#aaa', this.renderCtx.lineWidth = 1
            canvas_stroke_rect(this.renderCtx, dst)
        }
        return dst
    }
    unframegive(id: number) { this.framegives.set.delete(id) }
    retime(t: float, snap = false) {
        this.time = clamp(t, this.mintime, this.maxtime)
        if (snap)
            this.time = floor(this.time * this.scene.fps) / this.scene.fps
        this.dirty_time()
    }
    loopplay(dt: float) {
        if (this.isplaying) {
            this.time += dt
            if (this.time > this.maxtime)
                this.time = this.mintime
            this.retime(this.time)
        }
        return true
    }
    play(b: boolean) { this.isplaying = b, this.request() }

    // time(from: float, to: float) { }
    // timeplay(from: float, to: float) { }
    // untimeplay() { }
    // playcur() { }
    playnext() { this.retime(this.time + 1 / this.scene.fps, true) }
    playprev() { this.retime(this.time - 1 / this.scene.fps, true) }
    // playing(b: boolean) { }

    time_preplace() { } //initialize a displacement state
    time_displace(delta: float) { } //displaces current selected timeline stuff

    dirty_scene() { res_load(this.scene, 0); this.dirty.scene = true; this.request() }
    dirty_asset(x: Asset) { this.dirty.asset.add(x); this.request() }
    dirty_res(x: Res) { this.dirty.res.add(x); this.request() }
    dirty_item(x: Item) { this.dirty.item.add(x); this.request() }
    dirty_track(x: int) { this.dirty.track.add(x); this.request() }
    dirty_assets() { this.dirty.assets = true; this.request() }
    dirty_time() { this.dirty.time = true; this.request() }

    get_current_assets() { return this.assets.filter(x => x.path.startsWith(this.path)) }
    get_asset_name(a: Asset) { return a.path.includes('/') ? a.path.split('/')[1] : a.path }

    get_tracks() { return scene_layers(this.scene) }
    get_tracks_int() { return [...scene_layers_int(this.scene)] }
    get_track(i: int) { return scene_layer(this.scene, i) }

    request() {
        this.dirty.render = this.dirty.render || this.dirty.item.size > 0 || this.dirty.time || this.dirty.scene
        if (!this.requested) {
            requestAnimationFrame(() => {
                this.requested = false
                if (this.dirty.render) {
                    this.dirty.render = false
                    this.render(this.time, this.renderCtx, true)
                }
                editor_update()
            })
            this.requested = true
        }
    }

    gui2time(x: float): float { return lerp(this.from, this.to, unlerp(0, this.timeviewGuiWidth, x)) }
    time2gui(t: float): float { return lerp(0, this.timeviewGuiWidth, unlerp(this.from, this.to, t)) }
    timelen2guilen(tlen: float): float { return lerp(0, this.timeviewGuiWidth, unlerp(0, this.to - this.from, tlen)) }
    scenetime2gui(tlen: float): float { return lerp(0, this.timeviewGuiWidth, unlerp(0, this.scene.duration, tlen)) }

    gui2space(p: Point): Point { let c = id('main'); return point(p[0] * this.scene.width / c.clientWidth, p[1] * this.scene.height / c.clientHeight,) }
    space2gui(p: Point): Point { let c = id('main'); return point(p[0] * c.clientWidth / this.scene.width, p[1] * c.clientHeight / this.scene.height,) }

    timeview(from: float, to: float) { this.from = from, this.to = to, this.dirty.timeview = true, this.dirty.time = true, this.request() }
    timeplay(from: float, to: float) { this.mintime = from, this.maxtime = to, this.dirty.timeplay = true, this.dirty.time = true, this.request() }


    has_path(str: string) { return this.assets.findIndex(x => x.path == str) != -1 }
    has_file(f: File) { return this.files.findIndex(x => Editor.file_fingerprint(f) == Editor.file_fingerprint(x)) != -1 }
    static file_fingerprint(f: File) { return `${f.name}|${f.size}|${f.lastModified}` }
}

const GUI = {
    TRACK_HEIGHT: 68
}

function editor_update() {
    var e = editor

    if (e.dirty.timeview) {
        e.dirty.timeview = false
        var el = id('timeview')
        el.style.left = e.time2gui(e.from) + 'px'
        el.style.width = e.time2gui(e.to - e.from) + 'px'
    }

    if (e.dirty.asset) {
        let arr = [...e.dirty.asset]
        update_over(id('assets'), arr, gui_update_asset)
        e.dirty.asset.clear()
    }

    if (e.dirty.assets)
        update_over(id('assets'), editor.get_current_assets(), gui_update_asset)

    if (e.dirty.scene)
        update_over(id('tracks'), editor.get_tracks_int(), gui_update_track)

    buttons()
}


function buttons() {
    let buttons = document.getElementsByTagName('button')

    for (let button of buttons) {
        set_highlight(button, editor.toolLock && editor.tool == name2tool(button.id))
    }
    set_highlight(id('notool'), !editor.toolLock)

    set_highlight(id('play'), editor.isplaying)
}

function gui_update_asset(a: Asset, el: HTMLElement) {
    let c = canvas(el)!
    canvas_resize_dpr(c)
    canvas_clear_all(c)
    if (a.thumb) {
        let src = rect_img(a.thumb), dst = rect_canvas(c)
        rect_fit(src, dst, FitMethod.Contain)
        canvas_draw_img2(c, a.thumb, dst, src)
    }
    let text = class1('name', el)
    text.innerText = editor.get_asset_name(a)
    class_toggle(el, 'high', editor.is_sel_asset(a))
    ent(el, a)
}

function gui_update_track(l: int, el: HTMLElement) {
    let items = editor.get_track(l)
    update_over(el, items, gui_update_item)
    ent(el, l)
}

function gui_update_item(item: Item, el: HTMLElement) {
    let c = canvas(el)!
    el.style.width = editor.time2gui(item.to - item.from) + 'px'
    el.style.left = editor.time2gui(item.from) + 'px'

    res_draw_track(item.res, c, item.sfrom, item.sto)
    ent(el, item)
}



function pointer(p: Pointer, el: HTMLElement, mode: PointerMode) {

    const on = (mode: PointerMode, id?: string, klass?: string) => {
        return mode == mode && (id ? el.id == id : klass ? el.classList.contains(klass) : true)
    }

    let asset = el.classList.contains('asset') ? ent1<Asset>(el) : null
    let track = el.classList.contains('track') ? ent1<int>(el) : null
    let item = el.classList.contains('item') ? ent1<Item>(el) : null
    let itemTime = item ? editor.gui2time(p.ex) : 0
    let assets = el.id == 'assets'
    let tracks = el.id == 'tracks' ? floor(p.cy / GUI.TRACK_HEIGHT) : null

    let tool = editor.tool
    switch (editor.tool) {
        case Tool.None: {
            if (assets != null && mode == PointerMode.Down)
                editor.unsel_assets()
            if (asset != null && asset != null) {
                if (mode == PointerMode.Down) {
                    editor.unsel_assets()
                    editor.sel_asset(asset, true)
                } else if (mode == PointerMode.DragStart)
                    editor.set_tool(Tool.AssetDrag)
            }
            if (item != null) {
                //TODO there is double selection for items underneath
                if (mode == PointerMode.Down)
                    editor.sel_item(item, true)
                else if (mode == PointerMode.Up)
                    editor.sel_item(item, false)
                else if (mode == PointerMode.DragStart)
                    editor.set_tool(Tool.ItemMove)
            }
            if (tracks != null && mode == PointerMode.Drag)
                editor.retime(editor.gui2time(p.cx))
        }
            break;
        case Tool.AssetDrag:
            if ((track != null || tracks != null) && mode == PointerMode.Drop) {
                editor.reset_tool()
                for (let x of editor.selAsset) editor.add_item(x.res, track ?? tracks!, editor.gui2time(p.cx))
            }
            break;
        case Tool.ItemMove:
            if (mode == PointerMode.DragEnd)
                editor.reset_tool()
            if (editor.selItem.size > 1)
                console.log('some shit', editor.selItem);
            for (let x of editor.selItem)
                editor.move_item(x, (x as EditorItem).selFrom + editor.gui2time(p.dx))
            break;
        case Tool.ItemDelete:
            if (mode == PointerMode.Down) {
                if (item != null) {
                    editor.remove_item(item)
                }
            }
            break
        case Tool.ItemSplit:
            if (mode == PointerMode.Down) {
                if (item != null)
                    editor.split_item(item, itemTime)
            }
            break
    }

    // if (el.id == 'assets') {
    //     if (mode == PointerMode.Down)
    //         editor.unsel_assets()
    // }

    // if (el.classList.contains('asset')) {
    //     if (mode == PointerMode.Down)
    //         editor.sel_asset(ent1(el), true)
    //     else if (mode == PointerMode.DragStart)
    //         editor.set_tool(Tool.AssetDrag)
    // }

    // if (el.id == 'tracks') {
    //     let layer = floor(p.cy / GUI.TRACK_HEIGHT)
    //     if (mode == PointerMode.Drop)
    //         switch (tool) {
    //             case Tool.AssetDrag:
    //                 editor.reset_tool()
    //                 for (let x of editor.selAsset) editor.add_item(x.res, layer, editor.gui2time(p.cx))
    //                 break
    //         }
    // }

    // if (el.classList.contains('track')) {
    //     let layer: int = ent1(el)
    //     if (mode == PointerMode.Drop) {
    //         switch (tool) {
    //             case Tool.AssetDrag:
    //                 editor.reset_tool()
    //                 for (let x of editor.selAsset) editor.add_item(x.res, layer, editor.gui2time(p.cx))
    //                 break
    //         }
    //     }
    //     if (mode == PointerMode.Drag) {
    //         switch (tool) {
    //             case Tool.ItemMove:
    //                 for (let x of editor.selItem) editor.move_item(x, layer, editor.gui2time(p.cx))
    //                 break
    //         }
    //     }
    // }

    // if (el.classList.contains('item')) {
    //     let item = ent1(el)
    //     if (mode == PointerMode.DragStart) {
    //         editor.set_tool(Tool.ItemMove)
    //     }
    // }
}
function datadrop(p: Pointer, el: HTMLElement, mode: PointerMode.DragStart | PointerMode.DragEnd | PointerMode.Drop) { }


function name2tool(name: string): Tool {
    switch (name) {
        case 'split': return Tool.ItemSplit
        case 'delete': return Tool.ItemDelete
        default: return Tool.None
    }
}


function tool2name(tool: Tool): string {
    switch (tool) {
        case Tool.ItemSplit: return 'split'
        case Tool.ItemDelete: return 'delete'
        default: return ''
    }
}
