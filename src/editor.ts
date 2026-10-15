let gloves = new Map<Pointer, Tool>()
let grips = new Map<Pointer, Grip>()

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
function keydown(e: KeyboardEvent) {
    switch (e.key) {
        case ' ': tool(Tool.Play); break
        case 'ArrowLeft': tool(Tool.Prev); break
        case 'ArrowRight': tool(Tool.Next); break
        case 'Delete': tool(Tool._Delete); break
    }
}
function keyup(e: KeyboardEvent) { }

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

interface Project {
    files: File[]
    res: Res[]
    other: {
        assets: Asset[]
        scene: int
        editor: EditorState
    }
}

interface EditorState {
    time: float, from: float, to: float
    duration: float, fps: float,
    layers: int, items: Item[][], tracks: Item[][],
    isplaying: boolean,
    selAssets: int[], selItems: int[], selTracks: int[],
}

interface Gui {
    main: HTMLElement
    canvas: Canvas
    tracks: HTMLElement
    timeview: HTMLElement
    trackCaret: HTMLElement
    timeCaret: HTMLElement
    assetpan: HTMLElement
    buttons: Map<string, HTMLElement>
}



let editor: Editor
class Editor {
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

    get timeviewGuiWidth() { return this.gui.tracks.clientWidth }
    get canvas() { return this.gui.canvas }

    gui: Gui

    constructor() {
        this.gui = gui_init(this)
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
    new_res_test(path: string) { return this.new_asset(res_create_test(), path) }
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
    undirty() {
        let d = this.dirty
        d.scene = d.timeview = d.time = d.assets = false
        d.asset.clear(); d.res.clear(); d.item.clear(); d.track.clear()
    }

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
                gui_update(this.gui, this)
                this.undirty()
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



class StoreVault {
    private db: IDBDatabase | null = null

    constructor(public name: string, public store: string, public version = 1) { }

    async getdb() {
        if (this.db) return this.db
        this.db = await new Promise<IDBDatabase>((resolve, reject) => {
            let req = indexedDB.open(this.name, this.version)
            req.onupgradeneeded = () => req.result.createObjectStore(this.store)
            req.onsuccess = () => resolve(req.result)
            req.onerror = () => reject(req.error)
        })
        return this.db
    }

    async save(s: string, blob: Blob) {
        let db = await this.getdb()
        await new Promise<void>((resolve, reject) => {
            let tx = db.transaction(this.store, 'readwrite')
            tx.objectStore(this.store).put(blob, s)
            tx.oncomplete = () => resolve()
            tx.onerror = () => reject(tx.error)
        })
    }

    async load(s: string) {
        let db = await this.getdb()
        return await new Promise<Blob | undefined>((resolve, reject) => {
            let req = db.transaction(this.store).objectStore(this.store).get(s)
            req.onsuccess = () => resolve(req.result)
            req.onerror = () => reject(req.error)
        })
    }

    async list(s: string) {
        let db = await this.getdb()
        return await new Promise<{ name: string, size: number }[]>((resolve, reject) => {
            let req = db.transaction(this.store).objectStore(this.store).openCursor()
            let out: { name: string, size: number }[] = []

            req.onsuccess = () => {
                let c = req.result
                if (!c) return resolve(out)
                let name = c.key as string
                if (name.startsWith(s)) out.push({ name, size: (c.value as Blob).size })
                c.continue()
            }

            req.onerror = () => reject(req.error)
        })
    }
}

class ProjectVault {
    static TEMP_PATH = "_temp"

    constructor(public store: StoreVault) { }

    async save_temp(project: Project) { await this.save(ProjectVault.TEMP_PATH, project) }
    async load_temp() { return this.load(ProjectVault.TEMP_PATH) }
    async save(name: string, project: Project) {
        let writer = new Writer()
        await project_bytes(project.res, project.files, writer, JSON.stringify(project.other))

        let blob = new Blob([writer.get()], { type: 'application/octet-stream' })
        await this.store.save(name, blob)
    }
    async load(name: string) {
        let blob = await this.store.load(name)

        if (blob == undefined)
            return null

        let reader = new Reader(new Uint8Array(await blob.arrayBuffer()))
        let data = await project_debytes(reader)
        let project: Project = { files: data.files, res: data.res, other: JSON.parse(data.json) as Project['other'] }
        return project
    }
    list() { return this.store.list('') }
}


class Pixelmaker {
    ctx: Canvas
    tool: 'pen' = 'pen'
    color = 'red'
    points: Point[] = []

    constructor(public el: HTMLCanvasElement) {
        this.ctx = canvas(el)!
        this.ctx.imageSmoothingEnabled = false

        reg_drag(el, 0, (d) => d.pint == Pint.Up ? null : this.push_point(d.ex, d.ey))
        reg_pointer(el, (down) => this.pointer(down))
        reg_data(el, (mode, d, ev) => mode != Pint.Drop ? null : this.import_transfer(d!, ev.offsetX, ev.offsetY))
    }

    size(w: number, h: number) {
        const dpr = devicePixelRatio

        this.el.width = Math.round(w * dpr)
        this.el.height = Math.round(h * dpr)

        this.ctx.scale(dpr, dpr)
    }

    set(x: number, y: number, color: string) {
        this.ctx.fillStyle = color
        this.ctx.fillRect(x, y, 1, 1)
    }

    import_transfer(d: DataTransfer, x = 0, y = 0) {
        let files = d.files
        if (files.length == 0) return

        for (let i = 0; i < files.length; i++) {
            let type = res_type(files[i].type)
            if (type != ResType.Image) return;
            let reader = new FileReader()
            reader.onload = () => this.import_dataurl(reader.result as string, x, y)
            reader.readAsDataURL(files[i])
        }
    }

    import_dataurl(dataurl: string, x = 0, y = 0) {
        let image = new Image()
        image.src = dataurl
        image.onload = () => {
            let ctx = this.ctx
            ctx.drawImage(image, x, y)
        }
    }

    reset_points() { this.points.length = 0 }
    pointer(down: boolean) {
        switch (this.tool) {
            default: if (!down) this.reset_points()
        }
    }
    push_point(x: float, y: float) {
        let ctx = this.ctx, points = this.points

        if (points.length == 0 || points[points.length - 1][0] != x || points[points.length - 1][1] != y) {
            points.push([x, y])
        }

        let past = null
        if (points.length > 2)
            past = points[points.length - 2]


        switch (this.tool) {
            case 'pen':
                ctx.strokeStyle = this.color
                ctx.fillStyle = this.color
                if (!past) {
                    ctx.fillRect(x, y, 1, 1)
                    ctx.beginPath()
                    ctx.moveTo(x, y)
                }
                else {
                    ctx.lineTo(x, y)
                    ctx.stroke()
                }
                break
        }
    }
}

let pix = new Pixelmaker(id('pixelmaker'))