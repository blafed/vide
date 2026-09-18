let entitys = new Map<HTMLElement, any>()
let ghosts = new Map<HTMLElement, HTMLElement>()

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
    } else return entitys.get(el)
}
function ent1<T>(el: HTMLElement): T {
    let e = ent<T>(el)
    if (e != undefined) return e
    else throw new Error('no entity ' + el)
}
function dent<T>(e: T): HTMLElement | null {
    for (let x of entitys)
        if (x[1] == e && x[0].style.display != 'none')
            return x[0]
    return null
}
function clone_with_canvas(el: HTMLElement) {
    let clone = el.cloneNode(true) as HTMLElement
    let src = [el, ...el.querySelectorAll('canvas')]
    let dst = [clone, ...clone.querySelectorAll('canvas')]

    for (let i = 0; i < src.length; i++) {
        let a = src[i]
        let b = dst[i]

        if (a instanceof HTMLCanvasElement && b instanceof HTMLCanvasElement) {
            b.width = a.width
            b.height = a.height
            b.getContext('2d')!.drawImage(a, 0, 0)
        }
    }
    return clone
}
function clone_ghost(el: HTMLElement) {
    let rect = el.getBoundingClientRect()
    let clone = clone_with_canvas(el)

    clone.classList.add('ghost')
    clone.classList.remove('comp')
    clone.style.left = `${rect.left}px`
    clone.style.top = `${rect.top}px`
    clone.style.width = `${rect.width}px`
    clone.style.height = `${rect.height}px`

    clone.dataset['startx'] = rect.left.toString()
    clone.dataset['starty'] = rect.top.toString()

    document.body.appendChild(clone)
    return clone
}
function spawn_ghost(el: HTMLElement, dx: float, dy: float) {
    var ghost = ghosts.get(el)
    if (!ghost) {
        ghost = clone_ghost(el)
        ghosts.set(el, ghost)
    }

    let sx = parseFloat(ghost.dataset['startx']!)
    let sy = parseFloat(ghost.dataset['starty']!)
    ghost.style.left = `${sx + dx}px`
    ghost.style.top = `${sy + dy}px`

    return ghost
}
function remove_ghosts() {
    for (let ghost of ghosts.values())
        ghost.remove()
    ghosts.clear()
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
        case 'delete': editor.lock_tool(name2tool(el.id)); break
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
function on_keydown(e: KeyboardEvent) {
    switch (e.key) {
        case ' ': tool(Tool.Play); break
        case 'ArrowLeft': tool(Tool.Prev); break
        case 'ArrowRight': tool(Tool.Next); break
        case 'Delete': tool(Tool._Delete); break
    }
}
function on_keyup(e: KeyboardEvent) { }

const enum Pint { None, Hover, Down, PendDrag, Up, Drag, DragStart, DragEnd, Drop, }

let pointers = <Pointer[]>[]
let hovers = <Pointer[]>[]
let gloves = new Map<Pointer, Tool>()
let grips = new Map<Pointer, Grip>()

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


function on_dragenter(ev: DragEvent) { prevent(ev) }
function on_dragleave(ev: DragEvent) {
    prevent(ev)
    let p = event_pointer_drag(ev)
    if (p.cur) datadrop(p, p.cur, Pint.DragEnd)
}
function on_dragover(ev: DragEvent) {
    prevent(ev)
    let p = event_pointer_drag(ev)
    let hit = pointer_hit(ev)

    if (hit != p.cur) {
        if (p.cur) datadrop(p, p.cur, Pint.DragEnd)
        p.cur = hit
        if (p.cur) datadrop(p, p.cur, Pint.DragStart)
    }
}
function on_dragend(ev: DragEvent) {
    prevent(ev)
    let p = event_pointer_drag(ev)
    if (p.cur) datadrop(p, p.cur, Pint.DragEnd)
    let index = pointers.indexOf(p)
    pointers.splice(index, 1)
}
function on_dragdrop(ev: DragEvent) {
    prevent(ev)
    let p = event_pointer_drag(ev)
    let hit = pointer_hit(ev)
    if (hit) {
        datadrop(p, hit, Pint.Drop)
        datadrop(p, hit, Pint.DragEnd)
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
        pointer(p, p.down, Pint.Down)
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
            pointer(p, p.cur, Pint.Hover)
        }
        return
    }

    if (e.buttons == 0 && p.isDrag) {
        on_up(e)
        return
    }

    p.cur = pointer_hit(e)
    pointer_set_xy(p, e)

    if (p.cur) pointer(p, p.cur, Pint.Hover)

    if (!p.isDrag) {
        if (hypot(p.dx, p.dy) < 4) {
            if (p.down) pointer(p, p.down, Pint.PendDrag)
        }
        else {
            p.isDrag = true
            if (p.down) pointer(p, p.down, Pint.DragStart)
        }
    }
    else if (p.isDrag) {
        if (p.down) pointer(p, p.down, Pint.Drag)
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
            pointer(p, p.cur, Pint.Drop)
        }
        if (p.down) pointer(p, p.down, Pint.DragEnd)
    }
    if (p.down) pointer(p, p.down, Pint.Up)
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
    if (p.down) {
        let bound = p.down.getBoundingClientRect()
        p.cx = p.x - bound.left
        p.cy = p.y - bound.top
    }
}

function pointer_set_exy(p: Pointer, el: HTMLElement) {
    let bound = el.getBoundingClientRect()
    p.ex = p.x - bound.left
    p.ey = p.y - bound.top
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

//tool is any action to get interaction, not actual tool
const enum Tool {
    None,
    Import,
    AssetDrag,
    AssetDrop,
    ItemMove,
    ItemClipLeft,
    ItemClipRight,
    // ItemSetLeft,
    // ItemSetRight,
    ItemRelayer,
    // ItemRespeed,
    ItemSplit,
    ItemDelete,

    Retime,

    TimeviewMove,

    SelItem,
    SelAsset,
    SelAssetpan,
    SelTrack,

    Play,
    Next,
    Prev,

    _Delete,

    // TrackMerge,
    // TrackUngap,
    // TrackUngapLeft,
    // TrackCut,

    // TimelineViewMove,
    // TimelineViewLeft,
    // TimelineViewRight,
}

let editor: Editor
class Editor {
    canvas: Canvas = canvas(id('main'))!
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
    time = 0; mintime = 0; maxtime = 2 //play
    duration = 2; layers = 3; //questionable
    isplaying = false
    tracks: Item[][] = []
    dragclones = new Map<HTMLElement, HTMLElement>()

    //memo are assigned by input, to calc between 2 input calls
    memox: float | null = null
    memoy: float | null = null
    memot: float | null = null

    get timescale() { return (this.to - this.from) / this.duration }

    selAsset = new Set<Asset>()
    selItem = new Set<Item>()

    requested = false

    framegives = { set: new Set(), next: 1 }

    timeviewGuiWidth = id('tracks').clientWidth

    constructor() {
        this.request()
        this.framegive((dt) => this.loopplay(dt))
        canvas_resize_dpr(this.canvas)
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
        this.changed_scene()
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

    private changed_scene() {
        scene_validate(this.scene)
        this.duration = this.scene.duration + 2
        this.layers = this.scene.layers + 2
        this.tracks.length = this.layers
        for (let i = 0; i < this.layers; i++) this.tracks[i] = this.scene.items.filter(x => x.layer == i)
        this.dirty_scene()
        this.dirty_timeview()
    }

    add_item(res: Res, layer: int, at: float, dst = res_rect(res)): Item {
        let item = item_create(res, at, undefined, dst)
        item.layer = layer
        this.scene.items.push(item)
        this.changed_scene()
        return item
    }
    move_item(item: Item, newFrom: float) {
        item_move(item, newFrom)
        scene_validate(this.scene)
        this.changed_scene()
    }
    displace_item_memo(item: Item, delta: float) {
        if (this.memot == null)
            this.memot = item.from
        this.move_item(item, this.memot + delta)
    }
    shift_item_left(item: Item, delta: float) {
        if (this.memot == null)
            this.memot = item.from;
        this.clip_item_left(item, this.memot + delta)
    }
    shift_item_right(item: Item, delta: float) {
        if (this.memot == null)
            this.memot = item.from;
        this.clip_item_right(item, this.memot + delta)
    }
    relayer_item(item: Item, layer: int) {
        item.layer = layer
        console.log(item.layer)
        this.changed_scene()
    }
    clip_item_left(item: Item, shift: float) {
        item_clip_left(item, shift)
        scene_validate(this.scene)
        this.changed_scene()
    }
    clip_item_right(item: Item, shift: float) {
        item_clip_right(item, shift)
        scene_validate(this.scene)
        this.changed_scene()
    }
    respeed_item(item: Item, newSpeed: float) {
        item_respeed(item, newSpeed, item.from)
        scene_validate(this.scene)
        this.changed_scene()
    }
    remove_item(item: Item) {
        this.scene.items.splice(this.scene.items.indexOf(item), 1)
        scene_validate(this.scene)
        this.changed_scene()
    }
    split_item(item: Item, t: float) {
        console.log('splitting ', t)
        let split = item_split(item, t)
        this.scene.items.splice(this.scene.items.indexOf(item), 1)
        this.scene.items.push(...split)
        scene_validate(this.scene)
        this.changed_scene()
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
        if (v) dent(item)?.classList.add('high')
        if (v) dent(item)?.classList.remove('high')
    }
    sel_item2(item: Item, mode: SelectMode) {
        switch (mode) {
            case SelectMode.Once: this.unsel_items(); this.sel_item(item, true); break
            case SelectMode.Additive: this.sel_item(item, true); break
            case SelectMode.Toggle: this.sel_item(item, !this.is_sel_item(item)); break
        }
    }
    unsel_assets() { this.selAsset.clear(); this.dirty_assets() }
    unsel_items() { this.selItem.clear(); this.changed_scene() }


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
            this.canvas.strokeStyle = '#aaa', this.canvas.lineWidth = 1
            canvas_stroke_rect(this.canvas, dst)
        }
        return dst
    }
    unframegive(id: number) { this.framegives.set.delete(id) }
    retime(t: float, snap = true) {
        this.time = clamp(t, this.mintime, this.maxtime)
        if (snap)
            this.time = floor(this.time * this.scene.fps) / this.scene.fps
        this.dirty_time()
    }
    retime_snap() { this.retime(this.time, true) }
    loopplay(dt: float) {
        if (this.isplaying) {
            this.time += dt
            if (this.time > this.maxtime)
                this.time = this.mintime
            this.retime(this.time, false)
        }
        return true
    }
    play(b: boolean) { this.isplaying = b, this.request() }
    retime_memo(delta: float, snap = true) {
        if (this.memot == null) this.memot = this.time
        this.retime(this.memot + delta, snap)
    }

    // time(from: float, to: float) { }
    // timeplay(from: float, to: float) { }
    // untimeplay() { }
    // playcur() { }
    frame2time(f: int) { return f / this.scene.fps }
    time2frame(t: float) { return floor(t * this.scene.fps) }
    playnext() { this.retime(this.frame2time(this.time2frame(this.time) + 1), true) }
    playprev() { this.retime(this.frame2time(this.time2frame(this.time) - 1), true) }
    // playing(b: boolean) { }

    time_preplace() { } //initialize a displacement state
    time_displace(delta: float) { } //displaces current selected timeline stuff
    //TODO fix the loaading, bad getting chunks from the scene duration

    dirty_scene() { this.jobs.unload_all(this.scene); this.jobs.load(this.scene, 0, this.scene.duration); this.dirty.scene = true; this.request() }
    dirty_asset(x: Asset) { this.dirty.asset.add(x); this.request() }
    dirty_res(x: Res) { this.dirty.res.add(x); this.request() }
    dirty_item(x: Item) { this.dirty.item.add(x); this.request() }
    dirty_track(x: int) { this.dirty.track.add(x); this.request() }
    dirty_assets() { this.dirty.assets = true; this.request() }
    dirty_time() { this.dirty.time = true; this.request() }
    dirty_timeview() { this.dirty.timeview = true; this.request() }

    get_current_assets() { return this.assets.filter(x => x.path.startsWith(this.path)) }
    get_asset_name(a: Asset) { return a.path.includes('/') ? a.path.split('/')[1] : a.path }

    get_tracks() { return this.tracks }
    get_tracks_int() { return this.tracks.map((x, i) => i) }
    get_track(i: int) { return this.tracks[i] }

    request() {
        this.dirty.render = this.dirty.render || this.dirty.item.size > 0 || this.dirty.time || this.dirty.scene
        if (!this.requested) {
            requestAnimationFrame(() => {
                this.requested = false
                if (this.dirty.render) {
                    this.dirty.render = false
                    this.render(this.time, this.canvas, true)
                }
                editor_update()
            })
            this.requested = true
        }
    }

    time_s2v(t: float) { return lerp(this.from, this.to, t - this.from) } //scene to view
    time_s2g(t: float) { return lerp(0, this.timeviewGuiWidth, unlerp(0, this.duration, t)) } //scene to gui
    time_s2vg(t: float) { return this.time_v2g(this.time_s2v(t)) } //scene to view to gui
    time_v2g(t: float) { return lerp(0, this.timeviewGuiWidth, unlerp(this.from, this.to, t)) } //view to gui
    time_g2s(x: float) { return lerp(0, this.duration, unlerp(0, this.timeviewGuiWidth, x)) } //gui to scene
    time_g2v(x: float) { return lerp(this.from, this.to, unlerp(0, this.timeviewGuiWidth, x)) } //gui to view
    dt_g2v(dx: float) { return dx / this.timeviewGuiWidth * (this.to - this.from) }
    dt_g2s(dx: float) { return dx / this.timeviewGuiWidth * this.duration }
    dt_s2g(dt: float) { return dt / this.duration * this.timeviewGuiWidth }
    dt_v2g(dt: float) { return dt / (this.to - this.from) * this.timeviewGuiWidth }
    // dt_g2s(dx: float) { return dx / this.timeviewGuiWidth * this.duration }

    gui2time(x: float): float { return lerp(this.from, this.to, unlerp(0, this.timeviewGuiWidth, x)) }
    time2gui(t: float): float { return lerp(0, this.timeviewGuiWidth, unlerp(this.from, this.to, t)) }
    // timelen2guilen(tlen: float): float { return lerp(0, this.timeviewGuiWidth, unlerp(0, this.to - this.from, tlen)) }
    scene2gui(tlen: float): float { return lerp(0, this.timeviewGuiWidth, unlerp(0, this.duration, tlen)) }

    gui2space(p: Point): Point { let c = id('main'); return point(p[0] * this.scene.width / c.clientWidth, p[1] * this.scene.height / c.clientHeight,) }
    space2gui(p: Point): Point { let c = id('main'); return point(p[0] * c.clientWidth / this.scene.width, p[1] * c.clientHeight / this.scene.height,) }


    timeview_move(delta?: float) {
        if (delta != null) {
            if (this.memot == null || this.memox == null) { this.memot = this.from; this.memox = this.to - this.from }
            let error = -min(this.memot + delta, 0)
            delta += error
            this.timeview(this.memot + delta, this.memot + this.memox + delta)
        } else this.memot = null;
    }
    //TODO this is also calls timeplay, should be seperate
    timeview(from: float, to: float) { this.from = from, this.to = to, this.dirty.timeview = true, this.dirty.time = true, this.timeplay(from, to), this.request() }
    timeplay(from: float, to: float) { this.mintime = from, this.maxtime = to, this.dirty.timeplay = true, this.dirty.time = true, this.request() }
    timeview_full() { this.timeview(0, this.duration) }
    timeview_scene() { this.timeview(0, this.scene.duration) }

    reset_memo() { this.memot = this.memox = this.memoy = null; }

    has_path(str: string) { return this.assets.findIndex(x => x.path == str) != -1 }
    has_file(f: File) { return this.files.findIndex(x => Editor.file_fingerprint(f) == Editor.file_fingerprint(x)) != -1 }
    static file_fingerprint(f: File) { return `${f.name}|${f.size}|${f.lastModified}` }

    // displace_ghost(el: HTMLElement, dx: float, dy: float) {
    //     var target = this.dragclones.get(el)
    //     if (!target) {
    //         target = clone_ghost(el)
    //         this.dragclones.set(el, target)
    //     }
    //     spawn_ghost(target, dx, dy)
    // }

    // remove_ghosts() {
    //     for (let target of this.dragclones.values()) {
    //         target.remove()
    //     }
    //     this.dragclones.clear()
    // }
}

const GUI = {
    TRACK_HEIGHT: 68
}

function editor_update() {
    var e = editor

    if (e.dirty.timeview) {
        e.dirty.timeview = false
        var el = id('timeview')
        el.style.left = e.scene2gui(e.from) + 'px'
        el.style.width = e.scene2gui(e.to - e.from) + 'px'
    }

    if (e.dirty.time) {
        e.dirty.time = false;
        var el = id('track-caret')
        el.style.left = e.time2gui(e.time) + 'px'
        el = id('time-caret')
        el.style.left = e.scene2gui(e.time) + 'px'
    }

    if (e.dirty.asset) {
        let arr = [...e.dirty.asset]
        update_over(id('assetpan'), arr, gui_update_asset)
        e.dirty.asset.clear()
    }

    if (e.dirty.assets)
        update_over(id('assetpan'), editor.get_current_assets(), gui_update_asset)

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
    el.style.left = editor.time_v2g(item.from) + 'px'
    el.style.width = editor.dt_v2g(item.to - item.from) + 'px'
    canvas_resize_dpr(c)

    res_draw_track(item.res, c, item.sfrom, item.sto)
    ent(el, item)
}

type Grip = ReturnType<typeof grip>

function grip(p: Pointer, el: HTMLElement) {
    let asset = el.classList.contains('asset') ? ent1<Asset>(el) : null
    let track = el.classList.contains('track') ? ent1<int>(el) : null
    let item = el.classList.contains('item') ? ent1<Item>(el) : null

    let assetpan = el.id == 'assetpan' ? true : null
    let trackpan = el.id == 'trackpan' ? floor(p.cy / GUI.TRACK_HEIGHT) : null
    let timepan = el.id == 'timepan' ? true : null
    let timeview = el.id == 'timeview' ? true : null

    let trackId = trackpan != null ? trackpan : track != null ? track : item ? item.layer : null

    return { asset, track, item, assetpan, trackpan, timepan, timeview, trackId }
}

function glove(p: Pointer, el: HTMLElement, pint: Pint): Tool {
    if (pint == Pint.Up)
        return Tool.None

    var current = gloves.get(p) ?? Tool.None

    let { asset, track, item, assetpan, trackpan, timepan, timeview, trackId } = grips.get(p)!

    switch (current) {
        case Tool.None:
            if (pint == Pint.Down) {
                if (assetpan != null) return Tool.SelAssetpan
                if (asset != null) return Tool.SelAsset
                if (item != null) {
                    let width = editor.dt_v2g(item_len(item))
                    console.log(width)
                    //TODO move to sel item
                    // if (p.ex < 8) return Tool.ItemClipLeft;
                    // if (p.ex > width - 8) return Tool.ItemClipRight;
                    return Tool.SelItem;
                }
                if (track != null || trackpan != null || timepan != null) return Tool.Retime
                if (timeview != null) return Tool.TimeviewMove
            }
            break
        case Tool.SelAsset:
            if (asset != null && pint == Pint.DragStart) return Tool.AssetDrag

            break
        case Tool.SelItem:
            if (pint == Pint.DragStart) {
                if (abs(p.dy) > abs(p.dx) * 2) return Tool.ItemRelayer
                else return Tool.ItemMove
            }
            break
        case Tool.AssetDrag:
            if (pint == Pint.Drop && trackId != null) return Tool.AssetDrop
            break
        case Tool.Retime:
            break
    }

    return current
}

function tool(t: Tool, pointer?: Pointer, grip?: Grip) {
    let dx = pointer ? pointer.dx : 0
    let dy = pointer ? pointer.dy : 0

    switch (t) {
        case Tool.Play: editor.play(!editor.isplaying); break
        case Tool.Next: editor.playnext(); break
        case Tool.Prev: editor.playprev(); break
        case Tool.AssetDrop: for (let x of editor.selAsset) editor.add_item(x.res, grip?.trackId ?? 0, editor.gui2time(pointer?.cx ?? 0)); break
        case Tool.SelAsset: editor.unsel_assets(), editor.sel_asset(grip!.asset!, true)!; break
        case Tool.SelAssetpan: editor.unsel_assets(); break
        case Tool.SelItem: editor.unsel_items(); editor.sel_item(grip!.item!, true); break;
        case Tool.ItemMove: if (pointer) for (let x of editor.selItem) editor.displace_item_memo(x, editor.dt_g2v(pointer.dx)); break
        case Tool.TimeviewMove: if (pointer) editor.timeview_move(editor.dt_g2s(pointer.dx)); break
        case Tool.Retime: if (pointer) editor.retime(editor.time_g2v(pointer.cx), false); break
        case Tool.ItemRelayer: if (pointer) for (let x of editor.selItem) editor.relayer_item(x, grip?.trackId ?? 0); break
        case Tool.ItemClipLeft: for (let x of editor.selItem) editor.shift_item_left(x, editor.dt_g2v(dx)); break
        case Tool.ItemClipRight: for (let x of editor.selItem) editor.shift_item_right(x, editor.dt_g2v(dx)); break
    }
}

function pointer(p: Pointer, el: HTMLElement, pint: Pint) {
    let same = p.down == el;

    let gr = grip(p, el)
    grips.set(p, gr)
    let glo = glove(p, el, pint)
    gloves.set(p, glo)

    if (pint == Pint.Down || pint == Pint.Drop) {
        console.log(grip(p, el))
        tool(glo, p, gr)
    }

    switch (glo) {
        case Tool.ItemMove:
        case Tool.TimeviewMove:
        case Tool.Retime:
            if (pint == Pint.Drag)
                tool(glo, p, gr)
            break

        case Tool.ItemRelayer:
            if (!same && gr.trackId != null)
                for (let x of editor.selItem)
                    spawn_ghost(dent(x)!, 0, GUI.TRACK_HEIGHT * (gr.trackId! - x.layer))
            break

        case Tool.AssetDrag:
            for (let x of editor.selAsset)
                spawn_ghost(dent(x)!, p.dx, p.dy)
            break
    }

    if (pint == Pint.Up) {
        remove_ghosts()
        editor.reset_memo()
        grips.delete(p)
        gloves.delete(p)
    }
}

function pointer1(p: Pointer, el: HTMLElement, mode: Pint) {

    const on = (mode: Pint, id?: string, klass?: string) => {
        return mode == mode && (id ? el.id == id : klass ? el.classList.contains(klass) : true)
    }

    let asset = el.classList.contains('asset') ? ent1<Asset>(el) : null
    let track = el.classList.contains('track') ? ent1<int>(el) : null
    let item = el.classList.contains('item') ? ent1<Item>(el) : null
    let itemTime = item ? editor.gui2time(p.ex) : 0
    let assets = el.id == 'assetpan' ? true : null
    let tracks = el.id == 'tracks' ? floor(p.cy / GUI.TRACK_HEIGHT) : null
    let trackId = tracks != null ? tracks : track != null ? track : null
    let timeview = el.id == 'timeview' ? true : null


    let tool = editor.tool

    switch (editor.tool) {
        case Tool.None: {
            if (assets != null && mode == Pint.Down)
                editor.unsel_assets()
            else if (asset != null) {
                if (mode == Pint.Down) {
                    editor.unsel_assets()
                    editor.sel_asset(asset, true)
                } else if (mode == Pint.DragStart)
                    editor.set_tool(Tool.AssetDrag)
            }
            else if (item != null) {
                //TODO there is double selection for items underneath
                if (mode == Pint.Down) {
                    editor.unsel_items()
                    editor.sel_item(item, true)
                }
                else if (mode == Pint.Up)
                    editor.sel_item(item, false)
                else if (mode == Pint.DragStart) {
                    if (abs(p.dy) > abs(p.dx) * 3) editor.set_tool(Tool.ItemRelayer)
                    else editor.set_tool(Tool.ItemMove)
                }
            }
            else if (track != null && mode == Pint.DragStart)
                editor.set_tool(Tool.Retime)
            else if (timeview != null && mode == Pint.DragStart)
                editor.set_tool(Tool.TimeviewMove)

        }
            break;
        case Tool.AssetDrag:
            if ((track != null || tracks != null) && mode == Pint.Drop) {
                editor.reset_tool()
                for (let x of editor.selAsset) editor.add_item(x.res, track ?? tracks!, editor.gui2time(p.cx))
            }
            break;
        case Tool.ItemMove:
            if (mode == Pint.DragEnd)
                editor.reset_tool()
            if (editor.selItem.size > 1)
                console.log('some shit', editor.selItem);
            // for (let x of editor.selItem)
            // editor.move_item(x, (x as EditorItem).selFrom + editor.gui2time(p.dx))
            break;
        case Tool.ItemDelete:
            if (mode == Pint.Down) {
                if (item != null) {
                    editor.remove_item(item)
                }
            }
            break
        case Tool.ItemSplit:
            if (mode == Pint.Down) {
                if (item != null)
                    editor.split_item(item, itemTime)
            }
            break
        case Tool.ItemRelayer:
            if (mode == Pint.DragEnd)
                editor.reset_tool()
            if (trackId != null && editor.selItem.size > 0) {
                for (let x of editor.selItem)
                    editor.relayer_item(x, trackId)
            }
            break
        case Tool.Retime:
            if (mode == Pint.Drag)
                editor.retime(editor.gui2time(p.cx))
            else if (mode == Pint.DragEnd)
                editor.reset_tool()
            break
        case Tool.TimeviewMove:
            if (mode == Pint.Drag) {
                editor.timeview_move(p.dx / editor.timeviewGuiWidth * editor.duration)
            }
            break
    }
}
function datadrop(p: Pointer, el: HTMLElement, mode: Pint.DragStart | Pint.DragEnd | Pint.Drop) { }


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
