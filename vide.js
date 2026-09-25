"use strict";
let entitys = new Map();
let ghosts = new Map();
function id(id) { return document.getElementById(id); }
function classes(c, within = document.body) {
    let arr = [];
    let list = within.getElementsByClassName(c);
    for (let e = 0; e < list.length; ++e)
        arr.push(list[e]);
    return arr;
}
function class1(c, within = document.body) { return classes(c, within)[0]; }
function prevent(e) {
    e.stopPropagation();
    e.preventDefault();
}
function create_child(el, tag, cls = '') {
    let child = document.createElement(tag);
    child.className = cls;
    el.appendChild(child);
    return child;
}
function update_over(contianer, arr, fn) {
    const template = contianer.children[0];
    template.style.display = 'none';
    let lastLength = contianer.children.length - 1;
    while (contianer.children.length - 1 < arr.length) {
        let clone = template.cloneNode(true);
        contianer.appendChild(clone);
    }
    for (let i = 0; i < arr.length; i++) {
        let el = contianer.children[i + 1];
        el.style.display = '';
        fn(arr[i], el, i >= lastLength, i);
    }
    for (let i = arr.length + 1; i < contianer.children.length; i++)
        contianer.children[i].style.display = 'none';
}
function class_toggle(el, c, cond) {
    if (cond)
        el.classList.add(c);
    else
        el.classList.remove(c);
}
function set_highlight(el, v) { class_toggle(el, 'high', v); }
function set_dragging(el, v) { class_toggle(el, 'drag', v); }
function event_closest(ev, selector) {
    let target = ev.target;
    if (!(target instanceof Element))
        return null;
    return target.closest(selector);
}
function ent(el, set) {
    if (set != undefined) {
        el._ent = set; //useless; only for debug
        entitys.set(el, set);
        return set;
    }
    else
        return entitys.get(el);
}
function ent1(el) {
    let e = ent(el);
    if (e != undefined)
        return e;
    else
        throw new Error('no entity ' + el);
}
function dent(e) {
    for (let x of entitys)
        if (x[1] == e && x[0].style.display != 'none')
            return x[0];
    return null;
}
function clone_with_canvas(el) {
    let clone = el.cloneNode(true);
    let src = [el, ...el.querySelectorAll('canvas')];
    let dst = [clone, ...clone.querySelectorAll('canvas')];
    for (let i = 0; i < src.length; i++) {
        let a = src[i];
        let b = dst[i];
        if (a instanceof HTMLCanvasElement && b instanceof HTMLCanvasElement) {
            b.width = a.width;
            b.height = a.height;
            b.getContext('2d').drawImage(a, 0, 0);
        }
    }
    return clone;
}
function clone_ghost(el) {
    let rect = el.getBoundingClientRect();
    let clone = clone_with_canvas(el);
    clone.classList.add('ghost');
    clone.classList.remove('comp');
    clone.style.left = `${rect.left}px`;
    clone.style.top = `${rect.top}px`;
    clone.style.width = `${rect.width}px`;
    clone.style.height = `${rect.height}px`;
    clone.dataset['startx'] = rect.left.toString();
    clone.dataset['starty'] = rect.top.toString();
    document.body.appendChild(clone);
    return clone;
}
function spawn_ghost(el, dx, dy) {
    var ghost = ghosts.get(el);
    if (!ghost) {
        ghost = clone_ghost(el);
        ghosts.set(el, ghost);
    }
    let sx = parseFloat(ghost.dataset['startx']);
    let sy = parseFloat(ghost.dataset['starty']);
    ghost.style.left = `${sx + dx}px`;
    ghost.style.top = `${sy + dy}px`;
    return ghost;
}
function remove_ghosts() {
    for (let ghost of ghosts.values())
        ghost.remove();
    ghosts.clear();
}
//======================
//#region INPUT
//======================
function text(el) {
    let value = el.value;
    switch (el.id) {
        case 'path':
            editor.repath(trim_edges(value.trimStart(), '/'));
            break;
    }
}
function btn(el) {
    switch (el.id) {
        case 'import':
            id('file').click();
            break;
        case 'notool':
        case 'split':
        case 'delete':
            editor.lock_tool(name2tool(el.id));
            break;
        case 'play':
            editor.play(!editor.isplaying);
            break;
        case 'next':
            editor.playnext();
            break;
        case 'prev':
            editor.playprev();
            break;
    }
}
function opt(el) { }
function file(el) {
    if (el.files)
        editor.import_many(el.files, editor.path);
    el.value = '';
}
function on_keydown(e) {
    switch (e.key) {
        case ' ':
            tool(16 /* Tool.Play */);
            break;
        case 'ArrowLeft':
            tool(18 /* Tool.Prev */);
            break;
        case 'ArrowRight':
            tool(17 /* Tool.Next */);
            break;
        case 'Delete':
            tool(19 /* Tool._Delete */);
            break;
    }
}
function on_keyup(e) { }
let pointers = [];
let hovers = [];
let gloves = new Map();
let grips = new Map();
function event_pointer_drag(ev) {
    let p = pointers.find(x => x.datatransfer);
    if (!p) {
        p = { isDrag: false, datatransfer: ev.dataTransfer, x: ev.clientX, y: ev.clientY, ox: ev.clientX, oy: ev.clientY, dx: 0, dy: 0, ex: 0, ey: 0, cx: 0, cy: 0, cur: null, down: ev.target, id: -1, };
        pointers.push(p);
    }
    else {
        p.x = ev.clientX, p.y = ev.clientY;
        p.dx = p.x - p.ox, p.dy = p.y - p.oy;
        p.datatransfer = ev.dataTransfer;
    }
    return p;
}
function pointer_hit(ev) {
    let el = event_closest(ev, '.comp');
    while (el) {
        if (el.style.pointerEvents != 'none')
            break;
        el = el.parentElement?.closest('.comp');
    }
    return el;
}
function on_dragenter(ev) { prevent(ev); }
function on_dragleave(ev) {
    prevent(ev);
    let p = event_pointer_drag(ev);
    if (p.cur)
        datadrop(p, p.cur, 7 /* Pint.DragEnd */);
}
function on_dragover(ev) {
    prevent(ev);
    let p = event_pointer_drag(ev);
    let hit = pointer_hit(ev);
    if (hit != p.cur) {
        if (p.cur)
            datadrop(p, p.cur, 7 /* Pint.DragEnd */);
        p.cur = hit;
        if (p.cur)
            datadrop(p, p.cur, 6 /* Pint.DragStart */);
    }
}
function on_dragend(ev) {
    prevent(ev);
    let p = event_pointer_drag(ev);
    if (p.cur)
        datadrop(p, p.cur, 7 /* Pint.DragEnd */);
    let index = pointers.indexOf(p);
    pointers.splice(index, 1);
}
function on_dragdrop(ev) {
    prevent(ev);
    let p = event_pointer_drag(ev);
    let hit = pointer_hit(ev);
    if (hit) {
        datadrop(p, hit, 8 /* Pint.Drop */);
        datadrop(p, hit, 7 /* Pint.DragEnd */);
        on_dragend(ev);
    }
}
function on_down(e) {
    if (event_native(e))
        return;
    let p = event_pointer(e);
    p.down = pointer_hit(e);
    pointer_set_xy(p, e);
    p.ox = p.x;
    p.oy = p.y;
    if (p.down) {
        pointer_set_exy(p, p.down);
        pointer(p, p.down, 2 /* Pint.Down */);
    }
}
function on_move(e) {
    if (event_native(e))
        return;
    let p = pointer_find(e);
    if (!p) {
        p = hovers.find(x => x.id == e.pointerId);
        if (!p) {
            p = event_pointer(e);
            pointers.pop();
            hovers.push(p);
        }
        p.cur = pointer_hit(e);
        pointer_set_xy(p, e);
        if (p.cur) {
            pointer_set_exy(p, p.cur);
            pointer(p, p.cur, 1 /* Pint.Hover */);
        }
        return;
    }
    if (e.buttons == 0 && p.isDrag) {
        on_up(e);
        return;
    }
    p.cur = pointer_hit(e);
    pointer_set_xy(p, e);
    if (p.cur)
        pointer(p, p.cur, 1 /* Pint.Hover */);
    if (!p.isDrag) {
        if (hypot(p.dx, p.dy) < 4) {
            if (p.down)
                pointer(p, p.down, 3 /* Pint.PendDrag */);
        }
        else {
            p.isDrag = true;
            if (p.down)
                pointer(p, p.down, 6 /* Pint.DragStart */);
        }
    }
    else if (p.isDrag) {
        if (p.down)
            pointer(p, p.down, 5 /* Pint.Drag */);
    }
}
function on_up(e) {
    if (event_native(e)) {
        on_cancel(e);
        return;
    }
    let p = event_pointer(e);
    p.cur = pointer_hit(e);
    pointer_set_xy(p, e);
    if (p.isDrag) {
        if (p.cur) {
            pointer(p, p.cur, 8 /* Pint.Drop */);
        }
        if (p.down)
            pointer(p, p.down, 7 /* Pint.DragEnd */);
    }
    if (p.down)
        pointer(p, p.down, 4 /* Pint.Up */);
    on_cancel(e);
}
function on_cancel(e) {
    if (event_native(e))
        return;
    let p = pointer_find(e);
    if (!p)
        return;
    let index = pointers.indexOf(p);
    pointers.splice(index, 1);
}
function pointer_find(ev) {
    return pointers.find(p => p.id == ev.pointerId);
}
function event_native(ev) {
    const target = ev.target;
    if (!target)
        return false;
    if (target.closest("input, textarea, select, button, option, label, details, summary"))
        return true;
    for (let el = target; el; el = el.parentElement) {
        if (!(el instanceof HTMLElement))
            continue;
        //scrollbar check
        if (ev.target === el && (ev.offsetX >= el.clientWidth || ev.offsetY >= el.clientHeight))
            return true;
    }
    return false;
}
function event_pointer(ev) {
    let p = pointer_find(ev);
    if (!p) {
        p = { isDrag: false, id: ev.pointerId, ox: ev.clientX, oy: ev.clientY, x: ev.clientX, y: ev.clientY, ex: 0, ey: 0, dx: 0, dy: 0, cx: 0, cy: 0, down: null, cur: null, datatransfer: null, };
        pointers.push(p);
    }
    return p;
}
function pointer_set_xy(p, ev) {
    p.x = ev.clientX;
    p.y = ev.clientY;
    p.dx = p.x - p.ox;
    p.dy = p.y - p.oy;
    if (p.down) {
        let bound = p.down.getBoundingClientRect();
        p.cx = p.x - bound.left;
        p.cy = p.y - bound.top;
    }
}
function pointer_set_exy(p, el) {
    let bound = el.getBoundingClientRect();
    p.ex = p.x - bound.left;
    p.ey = p.y - bound.top;
}
function init_input() {
    document.body.onkeydown = on_keydown;
    document.body.onkeyup = on_keyup;
    document.body.ondrop = on_dragdrop;
    document.body.ondragover = on_dragover;
    document.body.ondragenter = on_dragenter;
    document.body.ondragleave = on_dragleave;
    document.body.ondragend = on_dragend;
    window.onpointerdown = on_down;
    window.onpointermove = on_move;
    window.onpointerup = on_up;
    window.onpointercancel = on_cancel;
    document.body.onselect = e => prevent(e);
}
let editor;
class Editor {
    get timescale() { return (this.to - this.from) / this.duration; }
    constructor() {
        this.canvas = canvas(id('main'));
        this.thumbCtx = canvas_create(64, 64);
        this.jobs = new Jobs();
        this.path = '';
        this.sceneAsset = null;
        this.dirty = { scene: true, assets: true, res: new Set(), asset: new Set(), item: new Set(), track: new Set(), timeview: true, timeplay: true, time: true, render: true };
        this.tool = 0 /* Tool.None */;
        this.toolLock = false;
        this.res = [];
        this.assets = [];
        this.files = [];
        this.from = 0;
        this.to = 2; //the current timeview
        this.time = 0;
        this.mintime = 0;
        this.maxtime = 2; //play
        this.duration = 2;
        this.layers = 3; //questionable
        this.isplaying = false;
        this.tracks = [];
        this.dragclones = new Map();
        //memo are assigned by input, to calc between 2 input calls
        this.memox = null;
        this.memoy = null;
        this.memot = null;
        this.selAsset = new Set();
        this.selItem = new Set();
        this.requested = false;
        this.framegives = { set: new Set(), next: 1 };
        this.timeviewGuiWidth = id('tracks').clientWidth;
        this.request();
        this.framegive((dt) => this.loopplay(dt));
        canvas_resize_dpr(this.canvas);
    }
    log(msg, type) { console.log(type ? msg.toUpperCase() : msg); return null; }
    loge(msg) { return this.log(msg, 2 /* LogType.Error */); }
    repath(s) { }
    import(res, path) {
        let asset = this.new_asset(res, path);
    }
    async import_one(file, path) {
        let res = await res_create(file);
        if (!res)
            this.loge('invalid file ' + file.name);
        else
            this.import(res, path);
    }
    async import_many(files, path) {
        let all = Array.from(files).map(x => this.import_one(x, path + x.name));
        await Promise.all(all);
    }
    new_asset(res, path) {
        if (res.file && this.has_file(res.file))
            return this.loge('file already imported ' + res.file.name);
        if (this.has_path(path))
            return this.loge('path already exist');
        let asset = { path, res };
        this.generate_thumb(asset);
        if (res.file)
            this.files.push(res.file);
        this.assets.push(asset);
        this.res.push(asset.res);
        this.dirty_asset(asset);
        this.dirty_res(res);
        return asset;
    }
    new_scene(path) { return this.new_asset(scene_create(), path); }
    open_scene(a) {
        if (a.res.type != 1 /* ResType.Scene */)
            return this.loge('not a scene');
        this.sceneAsset = a;
        this.scene = a.res;
        this.dirty_assets();
        this.changed_scene();
        return this.scene;
    }
    generate_thumb(asset) {
        let res = asset.res;
        this.jobs.load(res, 0, 1).then(() => {
            this.thumbCtx.canvas.width = res_width(res), this.thumbCtx.canvas.height = res_height(res);
            res_draw_thumb(res, this.thumbCtx);
            createImageBitmap(this.thumbCtx.canvas).then(x => {
                asset.thumb = x;
                this.dirty_asset(asset);
            });
        });
    }
    changed_scene() {
        scene_validate(this.scene);
        this.duration = this.scene.duration + 2;
        this.layers = this.scene.layers + 2;
        this.tracks.length = this.layers;
        for (let i = 0; i < this.layers; i++)
            this.tracks[i] = this.scene.items.filter(x => x.layer == i);
        this.dirty_scene();
        this.dirty_timeview();
    }
    add_item(res, layer, at, dst = res_rect(res)) {
        let item = item_create(res, at, undefined, dst);
        item.layer = layer;
        this.scene.items.push(item);
        this.changed_scene();
        return item;
    }
    move_item(item, newFrom) {
        item_move(item, newFrom);
        scene_validate(this.scene);
        this.changed_scene();
    }
    displace_item_memo(item, delta) {
        if (this.memot == null)
            this.memot = item.from;
        this.move_item(item, this.memot + delta);
    }
    shift_item_left(item, delta) {
        if (this.memot == null)
            this.memot = item.from;
        this.clip_item_left(item, this.memot + delta);
    }
    shift_item_right(item, delta) {
        if (this.memot == null)
            this.memot = item.from;
        this.clip_item_right(item, this.memot + delta);
    }
    relayer_item(item, layer) {
        item.layer = layer;
        console.log(item.layer);
        this.changed_scene();
    }
    clip_item_left(item, shift) {
        item_clip_left(item, shift);
        scene_validate(this.scene);
        this.changed_scene();
    }
    clip_item_right(item, shift) {
        item_clip_right(item, shift);
        scene_validate(this.scene);
        this.changed_scene();
    }
    respeed_item(item, newSpeed) {
        item_respeed(item, newSpeed, item.from);
        scene_validate(this.scene);
        this.changed_scene();
    }
    remove_item(item) {
        this.scene.items.splice(this.scene.items.indexOf(item), 1);
        scene_validate(this.scene);
        this.changed_scene();
    }
    split_item(item, t) {
        console.log('splitting ', t);
        let split = item_split(item, t);
        this.scene.items.splice(this.scene.items.indexOf(item), 1);
        this.scene.items.push(...split);
        scene_validate(this.scene);
        this.changed_scene();
    }
    set_tool(tool) { this.tool = tool, this.request(); }
    lock_tool(tool) { this.set_tool(tool), this.toolLock = tool != 0 /* Tool.None */; }
    unlock_tool() { this.toolLock = false; this.reset_tool(); }
    reset_tool() { this.tool = 0; }
    is_sel_asset(a) { return this.selAsset.has(a); }
    is_sel_item(i) { return this.selItem.has(i); }
    sel_asset(a, v) { v ? this.selAsset.add(a) : this.selAsset.delete(a); this.dirty_asset(a); }
    sel_asset2(a, mode) {
        switch (mode) {
            case 0 /* SelectMode.Once */:
                this.unsel_assets();
                this.sel_asset(a, true);
                break;
            case 1 /* SelectMode.Additive */:
                this.sel_asset(a, true);
                break;
            case 2 /* SelectMode.Toggle */:
                this.sel_asset(a, !this.is_sel_asset(a));
                break;
        }
    }
    sel_item(item, v) {
        v ? this.selItem.add(item) : this.selItem.delete(item);
        this.dirty_item(item);
        if (v)
            dent(item)?.classList.add('high');
        if (v)
            dent(item)?.classList.remove('high');
    }
    sel_item2(item, mode) {
        switch (mode) {
            case 0 /* SelectMode.Once */:
                this.unsel_items();
                this.sel_item(item, true);
                break;
            case 1 /* SelectMode.Additive */:
                this.sel_item(item, true);
                break;
            case 2 /* SelectMode.Toggle */:
                this.sel_item(item, !this.is_sel_item(item));
                break;
        }
    }
    unsel_assets() { this.selAsset.clear(); this.dirty_assets(); }
    unsel_items() { this.selItem.clear(); this.changed_scene(); }
    framegive(cb) {
        let last = null;
        let id = this.framegives.next++;
        this.framegives.set.add(id);
        const loop = (now) => {
            if (!this.framegives.set.has(id))
                return;
            if (last !== null && !cb((now - last) / 1000))
                return;
            last = now, requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
        return id;
    }
    render(t, ctx, border) {
        var dst = rect_canvas(ctx);
        var src = res_rect(this.scene);
        rect_fit(src, dst, FitMethod.Contain);
        canvas_clear_all(ctx);
        res_draw(this.scene, ctx, t, dst, src);
        if (border) {
            this.canvas.strokeStyle = '#aaa', this.canvas.lineWidth = 1;
            canvas_stroke_rect(this.canvas, dst);
        }
        return dst;
    }
    unframegive(id) { this.framegives.set.delete(id); }
    retime(t, snap = true) {
        this.time = clamp(t, this.mintime, this.maxtime);
        if (snap)
            this.time = floor(this.time * this.scene.fps) / this.scene.fps;
        this.dirty_time();
    }
    retime_snap() { this.retime(this.time, true); }
    loopplay(dt) {
        if (this.isplaying) {
            this.time += dt;
            if (this.time > this.maxtime)
                this.time = this.mintime;
            this.retime(this.time, false);
        }
        return true;
    }
    play(b) { this.isplaying = b, this.request(); }
    retime_memo(delta, snap = true) {
        if (this.memot == null)
            this.memot = this.time;
        this.retime(this.memot + delta, snap);
    }
    // time(from: float, to: float) { }
    // timeplay(from: float, to: float) { }
    // untimeplay() { }
    // playcur() { }
    frame2time(f) { return f / this.scene.fps; }
    time2frame(t) { return floor(t * this.scene.fps); }
    playnext() { this.retime(this.frame2time(this.time2frame(this.time) + 1), true); }
    playprev() { this.retime(this.frame2time(this.time2frame(this.time) - 1), true); }
    // playing(b: boolean) { }
    time_preplace() { } //initialize a displacement state
    time_displace(delta) { } //displaces current selected timeline stuff
    //TODO fix the loaading, bad getting chunks from the scene duration
    dirty_scene() { this.jobs.unload_all(this.scene); this.jobs.load(this.scene, 0, this.scene.duration); this.dirty.scene = true; this.request(); }
    dirty_asset(x) { this.dirty.asset.add(x); this.request(); }
    dirty_res(x) { this.dirty.res.add(x); this.request(); }
    dirty_item(x) { this.dirty.item.add(x); this.request(); }
    dirty_track(x) { this.dirty.track.add(x); this.request(); }
    dirty_assets() { this.dirty.assets = true; this.request(); }
    dirty_time() { this.dirty.time = true; this.request(); }
    dirty_timeview() { this.dirty.timeview = true; this.request(); }
    get_current_assets() { return this.assets.filter(x => x.path.startsWith(this.path)); }
    get_asset_name(a) { return a.path.includes('/') ? a.path.split('/')[1] : a.path; }
    get_tracks() { return this.tracks; }
    get_tracks_int() { return this.tracks.map((x, i) => i); }
    get_track(i) { return this.tracks[i]; }
    request() {
        this.dirty.render = this.dirty.render || this.dirty.item.size > 0 || this.dirty.time || this.dirty.scene;
        if (!this.requested) {
            requestAnimationFrame(() => {
                this.requested = false;
                if (this.dirty.render) {
                    this.dirty.render = false;
                    this.render(this.time, this.canvas, true);
                }
                editor_update();
            });
            this.requested = true;
        }
    }
    time_s2v(t) { return lerp(this.from, this.to, t - this.from); } //scene to view
    time_s2g(t) { return lerp(0, this.timeviewGuiWidth, unlerp(0, this.duration, t)); } //scene to gui
    time_s2vg(t) { return this.time_v2g(this.time_s2v(t)); } //scene to view to gui
    time_v2g(t) { return lerp(0, this.timeviewGuiWidth, unlerp(this.from, this.to, t)); } //view to gui
    time_g2s(x) { return lerp(0, this.duration, unlerp(0, this.timeviewGuiWidth, x)); } //gui to scene
    time_g2v(x) { return lerp(this.from, this.to, unlerp(0, this.timeviewGuiWidth, x)); } //gui to view
    dt_g2v(dx) { return dx / this.timeviewGuiWidth * (this.to - this.from); }
    dt_g2s(dx) { return dx / this.timeviewGuiWidth * this.duration; }
    dt_s2g(dt) { return dt / this.duration * this.timeviewGuiWidth; }
    dt_v2g(dt) { return dt / (this.to - this.from) * this.timeviewGuiWidth; }
    // dt_g2s(dx: float) { return dx / this.timeviewGuiWidth * this.duration }
    gui2time(x) { return lerp(this.from, this.to, unlerp(0, this.timeviewGuiWidth, x)); }
    time2gui(t) { return lerp(0, this.timeviewGuiWidth, unlerp(this.from, this.to, t)); }
    // timelen2guilen(tlen: float): float { return lerp(0, this.timeviewGuiWidth, unlerp(0, this.to - this.from, tlen)) }
    scene2gui(tlen) { return lerp(0, this.timeviewGuiWidth, unlerp(0, this.duration, tlen)); }
    gui2space(p) { let c = id('main'); return point(p[0] * this.scene.width / c.clientWidth, p[1] * this.scene.height / c.clientHeight); }
    space2gui(p) { let c = id('main'); return point(p[0] * c.clientWidth / this.scene.width, p[1] * c.clientHeight / this.scene.height); }
    timeview_move(delta) {
        if (delta != null) {
            if (this.memot == null || this.memox == null) {
                this.memot = this.from;
                this.memox = this.to - this.from;
            }
            let error = -min(this.memot + delta, 0);
            delta += error;
            this.timeview(this.memot + delta, this.memot + this.memox + delta);
        }
        else
            this.memot = null;
    }
    //TODO this is also calls timeplay, should be seperate
    timeview(from, to) { this.from = from, this.to = to, this.dirty.timeview = true, this.dirty.time = true, this.timeplay(from, to), this.request(); }
    timeplay(from, to) { this.mintime = from, this.maxtime = to, this.dirty.timeplay = true, this.dirty.time = true, this.request(); }
    timeview_full() { this.timeview(0, this.duration); }
    timeview_scene() { this.timeview(0, this.scene.duration); }
    reset_memo() { this.memot = this.memox = this.memoy = null; }
    has_path(str) { return this.assets.findIndex(x => x.path == str) != -1; }
    has_file(f) { return this.files.findIndex(x => Editor.file_fingerprint(f) == Editor.file_fingerprint(x)) != -1; }
    static file_fingerprint(f) { return `${f.name}|${f.size}|${f.lastModified}`; }
}
const GUI = {
    TRACK_HEIGHT: 68
};
function editor_update() {
    var e = editor;
    if (e.dirty.timeview) {
        e.dirty.timeview = false;
        var el = id('timeview');
        el.style.left = e.scene2gui(e.from) + 'px';
        el.style.width = e.scene2gui(e.to - e.from) + 'px';
    }
    if (e.dirty.time) {
        e.dirty.time = false;
        var el = id('track-caret');
        el.style.left = e.time2gui(e.time) + 'px';
        el = id('time-caret');
        el.style.left = e.scene2gui(e.time) + 'px';
    }
    if (e.dirty.asset) {
        let arr = [...e.dirty.asset];
        update_over(id('assetpan'), arr, gui_update_asset);
        e.dirty.asset.clear();
    }
    if (e.dirty.assets)
        update_over(id('assetpan'), editor.get_current_assets(), gui_update_asset);
    if (e.dirty.scene)
        update_over(id('tracks'), editor.get_tracks_int(), gui_update_track);
    buttons();
}
function buttons() {
    let buttons = document.getElementsByTagName('button');
    for (let button of buttons) {
        set_highlight(button, editor.toolLock && editor.tool == name2tool(button.id));
    }
    set_highlight(id('notool'), !editor.toolLock);
    set_highlight(id('play'), editor.isplaying);
}
function gui_update_asset(a, el) {
    let c = canvas(el);
    canvas_resize_dpr(c);
    canvas_clear_all(c);
    if (a.thumb) {
        let src = rect_img(a.thumb), dst = rect_canvas(c);
        rect_fit(src, dst, FitMethod.Contain);
        canvas_draw_img2(c, a.thumb, dst, src);
    }
    let text = class1('name', el);
    text.innerText = editor.get_asset_name(a);
    class_toggle(el, 'high', editor.is_sel_asset(a));
    ent(el, a);
}
function gui_update_track(l, el) {
    let items = editor.get_track(l);
    update_over(el, items, gui_update_item);
    ent(el, l);
}
function gui_update_item(item, el) {
    let c = canvas(el);
    el.style.left = editor.time_v2g(item.from) + 'px';
    el.style.width = editor.dt_v2g(item.to - item.from) + 'px';
    canvas_resize_dpr(c);
    res_draw_track(item.res, c, item.sfrom, item.sto);
    ent(el, item);
}
function grip(p, el) {
    let asset = el.classList.contains('asset') ? ent1(el) : null;
    let track = el.classList.contains('track') ? ent1(el) : null;
    let item = el.classList.contains('item') ? ent1(el) : null;
    let assetpan = el.id == 'assetpan' ? true : null;
    let trackpan = el.id == 'trackpan' ? floor(p.cy / GUI.TRACK_HEIGHT) : null;
    let timepan = el.id == 'timepan' ? true : null;
    let timeview = el.id == 'timeview' ? true : null;
    let trackId = trackpan != null ? trackpan : track != null ? track : item ? item.layer : null;
    return { asset, track, item, assetpan, trackpan, timepan, timeview, trackId };
}
function glove(p, el, pint) {
    if (pint == 4 /* Pint.Up */)
        return 0 /* Tool.None */;
    var current = gloves.get(p) ?? 0 /* Tool.None */;
    let { asset, track, item, assetpan, trackpan, timepan, timeview, trackId } = grips.get(p);
    switch (current) {
        case 0 /* Tool.None */:
            if (pint == 2 /* Pint.Down */) {
                if (assetpan != null)
                    return 14 /* Tool.SelAssetpan */;
                if (asset != null)
                    return 13 /* Tool.SelAsset */;
                if (item != null) {
                    let width = editor.dt_v2g(item_len(item));
                    console.log(width);
                    //TODO move to sel item
                    // if (p.ex < 8) return Tool.ItemClipLeft;
                    // if (p.ex > width - 8) return Tool.ItemClipRight;
                    return 12 /* Tool.SelItem */;
                }
                if (track != null || trackpan != null || timepan != null)
                    return 10 /* Tool.Retime */;
                if (timeview != null)
                    return 11 /* Tool.TimeviewMove */;
            }
            break;
        case 13 /* Tool.SelAsset */:
            if (asset != null && pint == 6 /* Pint.DragStart */)
                return 2 /* Tool.AssetDrag */;
            break;
        case 12 /* Tool.SelItem */:
            if (pint == 6 /* Pint.DragStart */) {
                if (abs(p.dy) > abs(p.dx) * 2)
                    return 7 /* Tool.ItemRelayer */;
                else
                    return 4 /* Tool.ItemMove */;
            }
            break;
        case 2 /* Tool.AssetDrag */:
            if (pint == 8 /* Pint.Drop */ && trackId != null)
                return 3 /* Tool.AssetDrop */;
            break;
        case 10 /* Tool.Retime */:
            break;
    }
    return current;
}
function tool(t, pointer, grip) {
    let dx = pointer ? pointer.dx : 0;
    let dy = pointer ? pointer.dy : 0;
    switch (t) {
        case 16 /* Tool.Play */:
            editor.play(!editor.isplaying);
            break;
        case 17 /* Tool.Next */:
            editor.playnext();
            break;
        case 18 /* Tool.Prev */:
            editor.playprev();
            break;
        case 3 /* Tool.AssetDrop */:
            for (let x of editor.selAsset)
                editor.add_item(x.res, grip?.trackId ?? 0, editor.gui2time(pointer?.cx ?? 0));
            break;
        case 13 /* Tool.SelAsset */:
            editor.unsel_assets(), editor.sel_asset(grip.asset, true);
            break;
        case 14 /* Tool.SelAssetpan */:
            editor.unsel_assets();
            break;
        case 12 /* Tool.SelItem */:
            editor.unsel_items();
            editor.sel_item(grip.item, true);
            break;
        case 4 /* Tool.ItemMove */:
            if (pointer)
                for (let x of editor.selItem)
                    editor.displace_item_memo(x, editor.dt_g2v(pointer.dx));
            break;
        case 11 /* Tool.TimeviewMove */:
            if (pointer)
                editor.timeview_move(editor.dt_g2s(pointer.dx));
            break;
        case 10 /* Tool.Retime */:
            if (pointer)
                editor.retime(editor.time_g2v(pointer.cx), false);
            break;
        case 7 /* Tool.ItemRelayer */:
            if (pointer)
                for (let x of editor.selItem)
                    editor.relayer_item(x, grip?.trackId ?? 0);
            break;
        case 5 /* Tool.ItemClipLeft */:
            for (let x of editor.selItem)
                editor.shift_item_left(x, editor.dt_g2v(dx));
            break;
        case 6 /* Tool.ItemClipRight */:
            for (let x of editor.selItem)
                editor.shift_item_right(x, editor.dt_g2v(dx));
            break;
    }
}
function pointer(p, el, pint) {
    let same = p.down == el;
    let gr = grip(p, el);
    grips.set(p, gr);
    let glo = glove(p, el, pint);
    gloves.set(p, glo);
    if (pint == 2 /* Pint.Down */ || pint == 8 /* Pint.Drop */) {
        console.log(grip(p, el));
        tool(glo, p, gr);
    }
    switch (glo) {
        case 4 /* Tool.ItemMove */:
        case 11 /* Tool.TimeviewMove */:
        case 10 /* Tool.Retime */:
            if (pint == 5 /* Pint.Drag */)
                tool(glo, p, gr);
            break;
        case 7 /* Tool.ItemRelayer */:
            if (!same && gr.trackId != null)
                for (let x of editor.selItem)
                    spawn_ghost(dent(x), 0, GUI.TRACK_HEIGHT * (gr.trackId - x.layer));
            break;
        case 2 /* Tool.AssetDrag */:
            for (let x of editor.selAsset)
                spawn_ghost(dent(x), p.dx, p.dy);
            break;
    }
    if (pint == 4 /* Pint.Up */) {
        remove_ghosts();
        editor.reset_memo();
        grips.delete(p);
        gloves.delete(p);
    }
}
function pointer1(p, el, mode) {
    const on = (mode, id, klass) => {
        return mode == mode && (id ? el.id == id : klass ? el.classList.contains(klass) : true);
    };
    let asset = el.classList.contains('asset') ? ent1(el) : null;
    let track = el.classList.contains('track') ? ent1(el) : null;
    let item = el.classList.contains('item') ? ent1(el) : null;
    let itemTime = item ? editor.gui2time(p.ex) : 0;
    let assets = el.id == 'assetpan' ? true : null;
    let tracks = el.id == 'tracks' ? floor(p.cy / GUI.TRACK_HEIGHT) : null;
    let trackId = tracks != null ? tracks : track != null ? track : null;
    let timeview = el.id == 'timeview' ? true : null;
    let tool = editor.tool;
    switch (editor.tool) {
        case 0 /* Tool.None */:
            {
                if (assets != null && mode == 2 /* Pint.Down */)
                    editor.unsel_assets();
                else if (asset != null) {
                    if (mode == 2 /* Pint.Down */) {
                        editor.unsel_assets();
                        editor.sel_asset(asset, true);
                    }
                    else if (mode == 6 /* Pint.DragStart */)
                        editor.set_tool(2 /* Tool.AssetDrag */);
                }
                else if (item != null) {
                    //TODO there is double selection for items underneath
                    if (mode == 2 /* Pint.Down */) {
                        editor.unsel_items();
                        editor.sel_item(item, true);
                    }
                    else if (mode == 4 /* Pint.Up */)
                        editor.sel_item(item, false);
                    else if (mode == 6 /* Pint.DragStart */) {
                        if (abs(p.dy) > abs(p.dx) * 3)
                            editor.set_tool(7 /* Tool.ItemRelayer */);
                        else
                            editor.set_tool(4 /* Tool.ItemMove */);
                    }
                }
                else if (track != null && mode == 6 /* Pint.DragStart */)
                    editor.set_tool(10 /* Tool.Retime */);
                else if (timeview != null && mode == 6 /* Pint.DragStart */)
                    editor.set_tool(11 /* Tool.TimeviewMove */);
            }
            break;
        case 2 /* Tool.AssetDrag */:
            if ((track != null || tracks != null) && mode == 8 /* Pint.Drop */) {
                editor.reset_tool();
                for (let x of editor.selAsset)
                    editor.add_item(x.res, track ?? tracks, editor.gui2time(p.cx));
            }
            break;
        case 4 /* Tool.ItemMove */:
            if (mode == 7 /* Pint.DragEnd */)
                editor.reset_tool();
            if (editor.selItem.size > 1)
                console.log('some shit', editor.selItem);
            // for (let x of editor.selItem)
            // editor.move_item(x, (x as EditorItem).selFrom + editor.gui2time(p.dx))
            break;
        case 9 /* Tool.ItemDelete */:
            if (mode == 2 /* Pint.Down */) {
                if (item != null) {
                    editor.remove_item(item);
                }
            }
            break;
        case 8 /* Tool.ItemSplit */:
            if (mode == 2 /* Pint.Down */) {
                if (item != null)
                    editor.split_item(item, itemTime);
            }
            break;
        case 7 /* Tool.ItemRelayer */:
            if (mode == 7 /* Pint.DragEnd */)
                editor.reset_tool();
            if (trackId != null && editor.selItem.size > 0) {
                for (let x of editor.selItem)
                    editor.relayer_item(x, trackId);
            }
            break;
        case 10 /* Tool.Retime */:
            if (mode == 5 /* Pint.Drag */)
                editor.retime(editor.gui2time(p.cx));
            else if (mode == 7 /* Pint.DragEnd */)
                editor.reset_tool();
            break;
        case 11 /* Tool.TimeviewMove */:
            if (mode == 5 /* Pint.Drag */) {
                editor.timeview_move(p.dx / editor.timeviewGuiWidth * editor.duration);
            }
            break;
    }
}
function datadrop(p, el, mode) { }
function name2tool(name) {
    switch (name) {
        case 'split': return 8 /* Tool.ItemSplit */;
        case 'delete': return 9 /* Tool.ItemDelete */;
        default: return 0 /* Tool.None */;
    }
}
function tool2name(tool) {
    switch (tool) {
        case 8 /* Tool.ItemSplit */: return 'split';
        case 9 /* Tool.ItemDelete */: return 'delete';
        default: return '';
    }
}
const { PI, ceil, floor, cos, sin, acos, asin, atan2, sqrt, abs, min, max, round, trunc, pow, exp, log, hypot, random } = Math;
const TAU = PI * 2;
function approx(a, b) { return abs(a - b) < 0.000001; }
function lerp(a, b, t) { return a + (b - a) * t; }
function unlerp(a, b, x) { let len = b - a; return len ? (x - a) / len : 0; }
function clamp(v, a, b) { return min(max(v, a), b); }
function clamp01(v) { return clamp(v, 0, 1); }
function hypot2(x, y) { return sqrt(x * x + y * y); }
function sqmag(x, y) { return x * x + y * y; }
function wrap01(t) { return t == 1 ? 1 : t - floor(t); }
function within(a, b, t) { return a <= t && t <= b; }
function range_contains(a, b) { return a[0] <= b[0] && b[1] <= a[1]; }
function xrange_contains(a, b) { return a[0] <= b[0] && b[1] < a[1]; }
function range_within(r, x) { return r[0] <= x && x <= r[1]; }
function xrange_within(r, x) { return r[0] <= x && x < r[1]; }
function range_overlaps(a, b) { return a[0] <= b[1] && b[0] <= a[1]; }
function xrange_overlaps(a, b) { return a[0] < b[1] && b[0] < a[1]; }
function range_center(r) { return (r[0] + r[1]) / 2; }
function range_len(r) { return r[1] - r[0]; }
function range_sane(r) { return r[0] <= r[1]; }
function xrange_sane(r) { return r[0] < r[1]; }
function range_sany_min(r) { return r[0] <= r[1] ? r : range(r[1], r[1]); }
function range_sany_max(r) { return r[0] <= r[1] ? r : range(r[0], r[0]); }
function range_sany_flip(r) { return r[0] <= r[1] ? r : range(r[1], r[0]); }
function range_lerp(r, t) { return lerp(r[0], r[1], t); }
function range_unlerp(r, t) { return unlerp(r[0], r[1], t); }
function range_clamp(r, t) { return clamp(t, r[0], r[1]); }
function range_map(a, b, tb) { return range_lerp(a, range_unlerp(b, tb)); }
function range_and(a, b) { return range(max(a[0], b[0]), min(a[1], b[1])); }
function range_or(a, b) { return range(min(a[0], b[0]), max(a[1], b[1])); }
function range_intersect(a, b, tb) { return range_map(range_and(a, b), b, tb); }
function xrangeof(obj) { return xrange(obj.timestamp, obj.duration); }
function xrange(start, len) { return range(start, start + len); }
function range(a, b) {
    if (typeof a == 'number')
        return [a, b];
    return [a.from, a.to];
}
var FitMethod;
(function (FitMethod) {
    FitMethod[FitMethod["Stretch"] = 0] = "Stretch";
    FitMethod[FitMethod["Contain"] = 1] = "Contain";
    FitMethod[FitMethod["Cover"] = 2] = "Cover";
    FitMethod[FitMethod["FitWidth"] = 3] = "FitWidth";
    FitMethod[FitMethod["FitHeight"] = 4] = "FitHeight";
    FitMethod[FitMethod["CropWidth"] = 5] = "CropWidth";
    FitMethod[FitMethod["CropHeight"] = 6] = "CropHeight";
})(FitMethod || (FitMethod = {}));
function point(x, y) { return [x, y]; }
function rect(x, y, w, h) { return [x, y, w, h]; }
function rect_clone(r) { return [...r]; }
function rect_one() { return [0, 0, 1, 1]; }
function rect_zero() { return [0, 0, 0, 0]; }
function rect_canvas(c) { return rect(0, 0, c.canvas.width, c.canvas.height); }
function rect_img(c) { return rect(0, 0, c.width, c.height); }
function rect_fit(src, dst, method = FitMethod.Contain) {
    const src_w = src[2], src_h = src[3], dst_w = dst[2], dst_h = dst[3];
    if (src_w === 0 || src_h === 0 || dst_w === 0 || dst_h === 0) {
        src[0] = src[1] = src[2] = src[3] = 0;
        dst[0] = dst[1] = dst[2] = dst[3] = 0;
        return;
    }
    switch (method) {
        case FitMethod.Stretch:
            src[0] = 0, src[1] = 0, src[2] = src_w, src[3] = src_h;
            dst[0] = 0, dst[1] = 0, dst[2] = dst_w, dst[3] = dst_h;
            break;
        case FitMethod.Contain: {
            const scale = min(dst_w / src_w, dst_h / src_h);
            const w = src_w * scale, h = src_h * scale;
            src[0] = 0, src[1] = 0, src[2] = src_w, src[3] = src_h;
            dst[0] = (dst_w - w) / 2, dst[1] = (dst_h - h) / 2, dst[2] = w, dst[3] = h;
            break;
        }
        case FitMethod.Cover: {
            const scale = max(dst_w / src_w, dst_h / src_h);
            const crop_w = dst_w / scale, crop_h = dst_h / scale;
            src[0] = (src_w - crop_w) / 2, src[1] = (src_h - crop_h) / 2, src[2] = crop_w, src[3] = crop_h;
            dst[0] = 0, dst[1] = 0, dst[2] = dst_w, dst[3] = dst_h;
            break;
        }
        case FitMethod.FitWidth: {
            const scale = dst_w / src_w, h = src_h * scale;
            src[0] = 0, src[1] = 0, src[2] = src_w, src[3] = src_h;
            dst[0] = 0, dst[1] = (dst_h - h) / 2, dst[2] = dst_w, dst[3] = h;
            break;
        }
        case FitMethod.FitHeight: {
            const scale = dst_h / src_h, w = src_w * scale;
            src[0] = 0, src[1] = 0, src[2] = src_w, src[3] = src_h;
            dst[0] = (dst_w - w) / 2, dst[1] = 0, dst[2] = w, dst[3] = dst_h;
            break;
        }
        case FitMethod.CropWidth: {
            const scale = dst_w / src_w;
            const h = src_h * scale;
            let src_y = 0, src_h2 = src_h, dst_y = (dst_h - h) / 2, dst_h2 = h;
            if (h > dst_h) {
                src_h2 = dst_h / scale;
                src_y = (src_h - src_h2) / 2;
                dst_y = 0;
                dst_h2 = dst_h;
            }
            src[0] = 0, src[1] = src_y, src[2] = src_w, src[3] = src_h2;
            dst[0] = 0, dst[1] = dst_y, dst[2] = dst_w, dst[3] = dst_h2;
            break;
        }
        case FitMethod.CropHeight: {
            const scale = dst_h / src_h;
            const w = src_w * scale;
            let src_x = 0, src_w2 = src_w, dst_x = (dst_w - w) / 2, dst_w2 = w;
            if (w > dst_w) {
                src_w2 = dst_w / scale;
                src_x = (src_w - src_w2) / 2;
                dst_x = 0;
                dst_w2 = dst_w;
            }
            src[0] = src_x, src[1] = 0, src[2] = src_w2, src[3] = src_h;
            dst[0] = dst_x, dst[1] = 0, dst[2] = dst_w2, dst[3] = dst_h;
            break;
        }
    }
}
function rect_boundary_point(r, t) {
    let [x, y, w, h] = r;
    t = wrap01(t);
    if (t < 0.25)
        return [x + w * (t * 4), y];
    if (t < 0.50)
        return [x + w, y + h * ((t - 0.25) * 4)];
    if (t < 0.75)
        return [x + w - w * ((t - 0.50) * 4), y + h];
    return [x, y + h - h * ((t - 0.75) * 4)];
}
function circle_boundary_point(r, t) {
    let [x, y, w, h] = r;
    t = wrap01(t);
    const a = t * PI * 2;
    const cx = x + w * 0.5;
    const cy = y + h * 0.5;
    return [cx + cos(a) * w * 0.5, cy + sin(a) * h * 0.5];
}
function tween01(t, type = 0 /* Ease.Linear */) { return tween(0, 1, t, type); }
function tween(from, to, t, type = 0 /* Ease.Linear */) {
    switch (type) {
        case 1 /* Ease.InQuad */:
            t = t * t;
            break;
        case 2 /* Ease.OutQuad */:
            t = 1 - (1 - t) * (1 - t);
            break;
        case 3 /* Ease.InOutQuad */:
            t = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
            break;
        case 4 /* Ease.InCubic */:
            t = t * t * t;
            break;
        case 5 /* Ease.OutCubic */:
            t = 1 - Math.pow(1 - t, 3);
            break;
        case 6 /* Ease.InOutCubic */:
            t = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
            break;
        case 7 /* Ease.InExpo */:
            t = t === 0 ? 0 : Math.pow(2, 10 * t - 10);
            break;
        case 8 /* Ease.OutExpo */:
            t = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
            break;
        case 9 /* Ease.InOutExpo */:
            if (t === 0)
                t = 0;
            else if (t === 1)
                t = 1;
            else if (t < 0.5)
                t = Math.pow(2, 20 * t - 10) / 2;
            else
                t = (2 - Math.pow(2, -20 * t + 10)) / 2;
            break;
    }
    return from + (to - from) * t;
}
var WrapMode;
(function (WrapMode) {
    WrapMode[WrapMode["Clamp"] = 0] = "Clamp";
    WrapMode[WrapMode["Repeat"] = 1] = "Repeat";
    WrapMode[WrapMode["PingPong"] = 2] = "PingPong";
    WrapMode[WrapMode["Continue"] = 3] = "Continue";
})(WrapMode || (WrapMode = {}));
function wrap_time(t, duration, mode) {
    if (duration <= 0)
        return 0;
    switch (mode) {
        case WrapMode.Clamp: return clamp(t, 0, duration);
        case WrapMode.Repeat: return ((t % duration) + duration) % duration;
        case WrapMode.Continue: return t;
        case WrapMode.PingPong: {
            let cycle = duration * 2;
            t = ((t % cycle)) % cycle;
            return t > duration ? cycle - t : t;
        }
    }
}
function color(r, g, b, a = 1) {
    r = round(clamp(r, 0, 1) * 255), g = round(clamp(g, 0, 1) * 255), b = round(clamp(b, 0, 1) * 255), a = round(clamp(a, 0, 1) * 255);
    return "#" + r.toString(16).padStart(2, "0") + g.toString(16).padStart(2, "0") + b.toString(16).padStart(2, "0") + a.toString(16).padStart(2, "0");
}
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
function frame() { return new Promise(resolve => requestAnimationFrame(() => resolve())); }
function canvas_create(w, h) {
    let canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    return canvas.getContext('2d');
}
function canvas_clear_all(ctx) { ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height); }
function canvas_clear_color(ctx, color) { ctx.fillStyle = color; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height); }
function canvas_clear(ctx, dst) { ctx.clearRect(dst[0], dst[1], dst[2], dst[3]); }
function canvas_stroke_rect(ctx, rect) { ctx.strokeRect(rect[0], rect[1], rect[2], rect[3]); }
function canvas_fill_rect(ctx, rect) { ctx.fillRect(rect[0], rect[1], rect[2], rect[3]); }
function canvas_draw_img(ctx, b, dst) { ctx.drawImage(b, dst[0], dst[1], dst[2], dst[3]); }
function canvas_draw_img2(ctx, b, dst, src) { ctx.drawImage(b, src[0], src[1], src[2], src[3], dst[0], dst[1], dst[2], dst[3]); }
function canvas_draw_img3(ctx, b, dst, src) {
    if (src)
        ctx.drawImage(b, src[0], src[1], src[2], src[3], dst[0], dst[1], dst[2], dst[3]);
    else
        ctx.drawImage(b, dst[0], dst[1], dst[2], dst[3]);
}
function canvas_prep(ctx, neededWidth, neededHeight) {
    if (ctx.canvas.width < neededWidth)
        ctx.canvas.width = ceil(neededWidth);
    if (ctx.canvas.height < neededHeight)
        ctx.canvas.height = ceil(neededHeight);
}
function canvas_prep2(ctx, r) {
    let w = Math.ceil(r[0] + r[2]), h = Math.ceil(r[1] + r[3]);
    canvas_prep(ctx, w, h);
}
function canvas_resize_dpr(ctx, quality = 1) {
    let canvas = ctx.canvas;
    let dpr = window.devicePixelRatio || 1;
    let w = round(canvas.clientWidth * dpr) * quality;
    let h = round(canvas.clientHeight * dpr) * quality;
    if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
    }
    ctx.scale(quality, quality);
}
function canvas(e) {
    if (e instanceof HTMLCanvasElement)
        return e.getContext('2d');
    let c = e.getElementsByTagName('canvas')[0];
    if (!c)
        return null;
    return c.getContext('2d');
}
function res_create_script(f) {
    if (f instanceof Function)
        return { type: 4 /* ResType.Script */, file: null, func: f, canvas: canvas_create(256, 256) };
    else {
        f = eval(f);
        if (!(f instanceof Function))
            return null;
        else
            return { type: 4 /* ResType.Script */, file: null, func: f, canvas: canvas_create(256, 256) };
    }
}
function res_create_test() { return { canvas: canvas_create(256, 256), file: null, fps: 1, height: 1, type: 5 /* ResType.Test */, width: 1 }; }
async function res_create(file, type = res_type(file.type)) {
    switch (type) {
        case 2 /* ResType.Video */: return video_mp4_create(await mp4_info(file)); //TODO support others
        case 3 /* ResType.Image */:
            if (!file)
                return null;
            let bitmap = await createImageBitmap(file);
            return { type, file, bitmap, width: bitmap.width, height: bitmap.height };
        case 4 /* ResType.Script */:
            let text = await file.text();
            return res_create_script(text);
        case 5 /* ResType.Test */: return res_create_test();
        case 1 /* ResType.Scene */: return null;
        case 0 /* ResType.Unknown */: return null;
    }
}
function res_type(t) {
    if (t.startsWith("video/"))
        return 2 /* ResType.Video */;
    if (t.startsWith("image/"))
        return 3 /* ResType.Image */;
    if (t == "text/javascript")
        return 4 /* ResType.Script */;
    // if (t === "image/svg+xml") return ResType.Svg
    // if (t.startsWith("audio/")) return ResType.Audio
    // if (t == 'text/plain') return ResType.Text
    return 0 /* ResType.Unknown */;
}
function res_len(res) {
    switch (res.type) {
        case 2 /* ResType.Video */:
        case 1 /* ResType.Scene */: return res.duration;
        case 3 /* ResType.Image */:
        case 4 /* ResType.Script */:
        case 5 /* ResType.Test */: return 1;
    }
}
function res_width(res) {
    switch (res.type) {
        case 2 /* ResType.Video */:
        case 1 /* ResType.Scene */:
        case 3 /* ResType.Image */: return res.width;
        case 4 /* ResType.Script */:
        case 5 /* ResType.Test */: return 256;
    }
}
function res_height(res) {
    switch (res.type) {
        case 2 /* ResType.Video */:
        case 1 /* ResType.Scene */:
        case 3 /* ResType.Image */: return res.height;
        case 4 /* ResType.Script */:
        case 5 /* ResType.Test */: return 256;
    }
}
function res_size(res) { return [res_width(res), res_height(res)]; }
function res_rect(res) { return rect(0, 0, res_width(res), res_height(res)); }
function res_fps(res) {
    switch (res.type) {
        case 2 /* ResType.Video */:
        case 1 /* ResType.Scene */: return res.fps;
        case 4 /* ResType.Script */:
        case 3 /* ResType.Image */:
        case 5 /* ResType.Test */: return 1;
    }
}
const SCENE_CHUNK_FRAMES = 45;
function res_chunk(res, t) {
    t = clamp(t, 0, res_len(res));
    switch (res.type) {
        case 2 /* ResType.Video */:
            for (let i = 0; i < res.chunks.length; i++)
                if (xrange_within(xrangeof(res.chunks[i]), t))
                    return i;
            return res.chunks.length - 1;
        case 1 /* ResType.Scene */: return Math.floor(t * SCENE_CHUNK_FRAMES / res.fps);
        default: return 0;
    }
}
function res_xrange(res, chunk) {
    switch (res.type) {
        case 2 /* ResType.Video */: return xrange(res.chunks[chunk].timestamp, res.chunks[chunk].duration);
        case 1 /* ResType.Scene */: return xrange(chunk * SCENE_CHUNK_FRAMES / res.fps, SCENE_CHUNK_FRAMES / res.fps);
        default: return xrange(chunk, 1);
    }
}
function res_chunks(res, from, to) {
    let chunkA = res_chunk(res, from);
    let chunkB = res_chunk(res, to);
    let arr = [];
    for (let c = chunkA; c <= chunkB; c++)
        arr.push(c);
    return arr;
}
function res_xchunks(res, start, len) {
    let chunkA = res_chunk(res, start);
    let chunkB = res_chunk(res, start + len);
    //exlusive if to == chunkB.from
    if (chunkB != -1 && res_xrange(res, chunkB)[0] == start + len)
        chunkB--;
    let arr = [];
    for (let c = chunkA; c <= chunkB; c++)
        arr.push(c);
    return arr;
}
function res_chunk_deps(res, chunk) {
    let arr = [];
    switch (res.type) {
        case 1 /* ResType.Scene */:
            let time = res_xrange(res, chunk);
            scene_iters(res, time[0], time[1], (i, itemFrom, itemTo) => {
                let resFrom = item2res(i, itemFrom);
                let resTo = item2res(i, itemTo);
                let chunks = res_xchunks(i.res, resFrom, resTo - resFrom);
                for (let c of chunks)
                    arr.push({ res: i.res, chunk: c });
            });
            break;
    }
    return arr;
}
function res_chunk_cost(res, i) {
    switch (res.type) {
        case 2 /* ResType.Video */: return (res.chunks[i].sampleEnd - res.chunks[i].sampleStart + 1) * res.width * res.height;
        case 1 /* ResType.Scene */: return res.items.length * res.anims.length * SCENE_CHUNK_FRAMES;
        case 3 /* ResType.Image */: return res.width * res.height;
        case 4 /* ResType.Script */: return 0;
        case 5 /* ResType.Test */: return 0;
    }
}
function scene_create(items = [], fps = 30, width = 800, height = 600) {
    let s = { type: 1 /* ResType.Scene */, file: null, items, anims: [], fps, width, height, duration: 0, layers: 0, frames: [], aspect: 0, canvas: canvas_create(256, 256) };
    scene_validate(s);
    return s;
}
function scene_create_wrap(res, fps, width, height) {
    switch (res.type) {
        case 1 /* ResType.Scene */: if (fps == undefined)
            fps = res.fps;
        case 2 /* ResType.Video */:
        case 3 /* ResType.Image */:
            if (width == undefined)
                width = res.width;
            if (height == undefined)
                height = res.height;
            break;
        case 4 /* ResType.Script */:
        case 5 /* ResType.Test */:
            if (width == undefined)
                width = 256;
            if (height == undefined)
                height = 256;
            break;
    }
    return scene_create([item_create(res)], fps, width, height);
}
function scene_validate(s, reset = true) {
    s.duration = reset ? 0 : s.duration;
    s.layers = 0;
    for (let i = 0; i < s.items.length; i++) {
        let item = s.items[i];
        s.duration = max(s.duration, item.to);
        s.layers = max(s.layers, item.layer);
        item_move(item, floor(item.from * s.fps) / s.fps); //snap
    }
    s.layers++;
    items_sort(s.items);
    anims_sort(s.anims);
}
function scene_iters(scene, from, to, callback) { return items_iters(scene.items, from, to, callback); }
function scene_iter(scene, t, callback) { return items_iter(scene.items, t, callback); }
function scene_is_ancestor(me, ancestor) {
    if (me == ancestor)
        return true;
    for (let x of ancestor.items)
        if (x.res.type == 1 /* ResType.Scene */) {
            if (x.res == me)
                return true;
            if (scene_is_ancestor(me, x.res))
                return true;
        }
    return false;
}
function scene_layer(scene, layer) { return scene.items.filter(i => i.layer == layer); }
function scene_layers(scene) {
    let arr = [];
    for (let item of scene.items) {
        let a = arr[item.layer];
        if (!a)
            arr.push(a = []);
        a.push(item);
    }
    return arr;
}
function scene_layers_int(s) {
    let arr = new Set();
    for (let item of scene.items)
        arr.add(item.layer);
    return arr;
}
function item_create(res, from, to, rect, sfrom = 0, sto = 1, srect = rect_one()) {
    if (from == undefined)
        from = 0;
    if (to == undefined)
        to = from + res_len(res);
    if (rect == undefined)
        rect = [0, 0, ...res_size(res)];
    return { res, from, to, sfrom, sto, srect, rect, layer: 0, fillStyle: [0.4, 0.4, 0.4, 1], strokeStyle: [0, 0, 0, 1], opacity: 1, lineWidth: 2 };
}
function items_sort(items) { items.sort((a, b) => a.layer == b.layer ? a.from - b.from : a.layer - b.layer); }
function anims_sort(anims) { for (let a of anims)
    a.keys.sort((a, b) => a.t - b.t); }
function item_clone(item) {
    let clone = { ...item };
    clone.srect = rect_clone(item.srect);
    clone.rect = rect_clone(item.rect);
    return clone;
}
function item2res(item, itemTime) { return range_map(range(item.sfrom, item.sto), range(item), itemTime) * res_len(item.res); }
function res2item(item, resTime) { return range_map(range(item), range(item.sfrom, item.sto), resTime / res_len(item.res)); }
function item_prop(item, prop) {
    switch (prop) {
        case 1 /* Prop.DstX */: return item.rect[0];
        case 2 /* Prop.DstY */: return item.rect[1];
        case 3 /* Prop.DstW */: return item.rect[2];
        case 4 /* Prop.DstH */: return item.rect[3];
        case 5 /* Prop.SrcX */: return item.srect[0];
        case 6 /* Prop.SrcY */: return item.srect[1];
        case 7 /* Prop.SrcW */: return item.srect[2];
        case 8 /* Prop.SrcH */: return item.srect[3];
        case 9 /* Prop.Opacity */: return item.opacity;
        case 11 /* Prop.LineWidth */: return item.lineWidth;
        case 12 /* Prop.FillR */:
        case 13 /* Prop.FillG */:
        case 14 /* Prop.FillB */:
        case 15 /* Prop.FillA */:
            return item.fillStyle[prop - 12 /* Prop.FillR */];
        case 16 /* Prop.StrokeR */:
        case 17 /* Prop.StrokeG */:
        case 18 /* Prop.StrokeB */:
        case 19 /* Prop.StrokeA */:
            return item.strokeStyle[prop - 16 /* Prop.StrokeR */];
    }
    return 0;
}
function item_propset(item, prop, value) {
    switch (prop) {
        case 1 /* Prop.DstX */:
            item.rect[0] = value;
            break;
        case 2 /* Prop.DstY */:
            item.rect[1] = value;
            break;
        case 3 /* Prop.DstW */:
            item.rect[2] = value;
            break;
        case 4 /* Prop.DstH */:
            item.rect[3] = value;
            break;
        case 5 /* Prop.SrcX */:
            item.srect[0] = value;
            break;
        case 6 /* Prop.SrcY */:
            item.srect[1] = value;
            break;
        case 7 /* Prop.SrcW */:
            item.srect[2] = value;
            break;
        case 8 /* Prop.SrcH */:
            item.srect[3] = value;
            break;
        case 9 /* Prop.Opacity */:
            item.opacity = value;
            break;
        case 11 /* Prop.LineWidth */:
            item.lineWidth = value;
            break;
        case 12 /* Prop.FillR */:
        case 13 /* Prop.FillG */:
        case 14 /* Prop.FillB */:
        case 15 /* Prop.FillA */:
            item.fillStyle[prop - 12 /* Prop.FillR */] = value;
            break;
        case 16 /* Prop.StrokeR */:
        case 17 /* Prop.StrokeG */:
        case 18 /* Prop.StrokeB */:
        case 19 /* Prop.StrokeA */:
            item.strokeStyle[prop - 16 /* Prop.StrokeR */] = value;
            break;
    }
}
function anim_prop(anim, prop, itemTime, item = anim.target) {
    let keys = anim.keys;
    keys = keys.filter(x => x.prop == prop);
    let t = itemTime / item_len(item);
    let a, b;
    for (let i = 0; i < keys.length; i++) {
        if (t >= keys[i].t)
            a = keys[i];
        else {
            b = keys[i];
            break;
        }
    }
    let va, vb, ta, tb, ease;
    if (a && b) {
        ta = a.t, tb = b.t;
        va = a.value, vb = b.value;
        ease = a.ease;
    }
    else if (a) { //after last key
        ta = a.t, tb = 1, ease = a.ease;
        va = a.value, vb = item_prop(item, prop);
    }
    else if (b) { //before first key
        ta = 0, tb = b.t, ease = b.ease;
        va = item_prop(item, prop), vb = b.value;
    }
    else
        return item_prop(item, prop);
    let at = clamp01(unlerp(ta, tb, t)); //TODO use wrap mode
    return tween(va, vb, at, ease);
}
function anim_color(anim, itemTime, c) {
    let r = anim_prop(anim, c + 0, itemTime);
    let g = anim_prop(anim, c + 1, itemTime);
    let b = anim_prop(anim, c + 2, itemTime);
    let a = anim_prop(anim, c + 3, itemTime);
    return color(r, g, b, a);
}
function scene_item_prop(scene, item, prop, animTime) {
    let anim = scene.anims.find(a => a.target == item);
    if (!anim)
        return item_prop(item, prop);
    return anim_prop(anim, prop, animTime);
}
function scene_item_color(scene, item, prop, itemTime) {
    let anim = scene.anims.find(a => a.target == item);
    if (!anim)
        return item_color(item, prop);
    return anim_color(anim, prop, itemTime);
}
function item_color(item, c) {
    let r = item_prop(item, c + 0);
    let g = item_prop(item, c + 1);
    let b = item_prop(item, c + 2);
    let a = item_prop(item, c + 3);
    return color(r, g, b, a);
}
function item_len(item) { return item.to - item.from; }
function item_move(item, newfrom) {
    let len = item_len(item);
    item.from = max(newfrom, 0);
    item.to = item.from + len;
}
function item_speed(item) { return range_len(range(item.sfrom, item.sto)) / item_len(item) * res_len(item.res); }
function item_respeed(item, speed, pivotTime) {
    if (speed <= 0)
        return;
    let oldLen = item_len(item);
    let srcLen = range_len(range(item.sfrom, item.sto));
    let newLen = srcLen / speed;
    let t = (pivotTime - item.from) / oldLen;
    item.from = pivotTime - t * newLen;
    item.to = item.from + newLen;
}
function item_split(item, t) {
    let ratio = t / item_len(item);
    let newSto = lerp(item.sfrom, item.sto, ratio);
    let a = item_create(item.res, item.from, item.from + t, item.rect, item.sfrom, newSto, item.srect);
    let b = item_create(item.res, a.to, item.to, item.rect, newSto, item.sto, item.srect);
    a.layer = b.layer = item.layer;
    return [a, b];
}
function item_clip_left(item, newSfrom) {
    newSfrom = clamp01(newSfrom / res_len(item.res));
    let speed = item_speed(item);
    let delta = newSfrom - item.sfrom;
    item.from += delta * speed;
    item.sfrom = newSfrom;
}
function item_clip_right(item, newSto) {
    newSto = clamp01(newSto / res_len(item.res));
    let speed = item_speed(item);
    let delta = newSto - item.sto;
    item.to += delta * speed;
    item.sto = newSto;
}
function items_iters(items, from, to, callback) {
    let ts = range(from, to);
    for (let item of items) {
        let is = range(item);
        let os = range_and(ts, is);
        if (!range_sane(os))
            continue;
        callback(item, os[0] - item.from, os[1] - item.from);
    }
}
function items_iter(items, t, callback) {
    for (let item of items)
        if (within(item.from, item.to, t))
            callback(item, t - item.from);
}
function video_mp4_create(info) {
    let chunks = [];
    const samples = info.samples;
    let sampleStart = 0, sampleEnd = 1; //exlusive end
    while (sampleStart < samples.length) {
        while (sampleStart < samples.length && !samples[sampleStart].is_sync)
            sampleStart++;
        while (sampleEnd < samples.length && (!samples[sampleEnd].is_sync || (sampleEnd - sampleStart) < 30))
            sampleEnd++;
        if (sampleStart >= samples.length)
            return null;
        let first = samples[sampleStart];
        let chunk = {
            timestamp: mp4_sample_pts(first), duration: mp4_sample_dur(first),
            sampleStart, sampleEnd, frames: [],
            loaded: false
        };
        chunks.push(chunk);
        for (let i = sampleStart + 1; i < sampleEnd; i++)
            chunk.duration += mp4_sample_dur(samples[i]);
        sampleStart = sampleEnd;
        sampleEnd = sampleStart + 1;
    }
    if (chunks.length) {
        chunks[0].timestamp = 0; //HACK
        for (let i = 0; i < chunks.length - 1; i++)
            chunks[i].duration = chunks[i + 1].timestamp - chunks[i].timestamp;
        chunks[chunks.length - 1].duration = info.duration - chunks[chunks.length - 1].timestamp; //HACK
    }
    let r = {
        type: 2 /* ResType.Video */, file: info.file, width: info.width, height: info.height, duration: info.duration, info,
        fps: mp4_samples_fps(info.samples),
        chunks, currentChunk: -1, queueChunk: [],
        decoder: new VideoDecoder({
            output: (v) => {
                let currentChunk = r.currentChunk;
                //TODO handle this should be awaitable, so flush wait until all is created
                createImageBitmap(v).then((bitmap) => {
                    r.chunks[currentChunk].frames.push({ bitmap, timestamp: v.timestamp });
                    v.close();
                });
            },
            error: (e) => { }
        })
    };
    r.decoder.configure({ codec: info.codec, description: info.description });
    return r;
}
function video_get_frame(v, t) {
    let chunk = res_chunk(v, t);
    if (chunk < 0 || !v.chunks[chunk].loaded)
        return null;
    t *= 1000000;
    let cur = null, max = Infinity;
    for (let f of v.chunks[chunk].frames) {
        let d = abs(t - f.timestamp);
        if (d < max) {
            cur = f;
            max = d;
        }
    }
    return cur;
}
async function video_load_chunk(v, chunk) {
    if (v.chunks[chunk].loaded || chunk < 0 || v.queueChunk.includes(chunk) || v.currentChunk == chunk)
        return;
    else if (v.currentChunk < 0) {
        v.currentChunk = chunk;
        await video_decode(v, chunk);
    }
    else
        v.queueChunk.unshift(chunk);
}
function video_unload_chunk(v, chunk) {
    //TODO unload while being loaded
    v.queueChunk = v.queueChunk.filter(x => x != chunk);
    v.chunks[chunk].frames.forEach(x => x.bitmap.close());
    v.chunks[chunk].frames.length = 0;
    v.chunks[chunk].loaded = false;
}
async function video_decode(v, chunk) {
    let from = v.chunks[chunk].sampleStart;
    let to = v.chunks[chunk].sampleEnd;
    let samples = v.info.samples;
    for (let i = from; i < to; i++) {
        let sample = samples[i];
        v.decoder.decode(new EncodedVideoChunk({
            type: sample.is_sync ? 'key' : 'delta',
            timestamp: mp4_sample_pts(sample) * 1000000,
            duration: mp4_sample_dur(sample) * 1000000,
            data: sample.data
        }));
    }
    await v.decoder.flush();
    let c = v.chunks[chunk];
    c.frames.sort((a, b) => a.timestamp - b.timestamp);
    c.loaded = true;
    if (v.queueChunk.length > 0) {
        v.currentChunk = v.queueChunk.shift();
        video_decode(v, v.currentChunk);
    }
    else
        v.currentChunk = -1;
}
function res_draw(res, ctx, t, dst = rect_canvas(ctx), src) {
    switch (res.type) {
        case 2 /* ResType.Video */:
            let frame = video_get_frame(res, t);
            if (frame)
                canvas_draw_img3(ctx, frame.bitmap, dst, src);
            return frame != null;
        case 3 /* ResType.Image */:
            if (res.bitmap)
                canvas_draw_img3(ctx, res.bitmap, dst, src);
            return res.bitmap != null;
        case 5 /* ResType.Test */:
            {
                let tc = res.canvas;
                canvas_prep(tc, dst[2], dst[3]);
                canvas_clear_all(tc);
                tc.fillStyle = `hsl(${255 * t}, 100%, 50%)`;
                tc.fillRect(0, 0, tc.canvas.width, tc.canvas.height);
                canvas_draw_img3(ctx, tc.canvas, dst, src);
            }
            return true;
        case 4 /* ResType.Script */:
            {
                let tc = res.canvas;
                canvas_prep(tc, dst[2], dst[3]);
                canvas_clear_all(tc);
                tc.strokeStyle = ctx.strokeStyle;
                tc.fillStyle = ctx.fillStyle;
                tc.lineWidth = ctx.lineWidth;
                tc.globalAlpha = ctx.globalAlpha;
                res.func(tc, t, rect_canvas(tc));
                canvas_draw_img3(ctx, tc.canvas, dst, src);
            }
            return true;
        case 1 /* ResType.Scene */:
            let tc = res.canvas;
            canvas_prep(tc, res.width, res.height);
            canvas_clear_all(tc);
            let sample = res.frames[floor(res.fps * t)];
            if (!sample)
                return false;
            for (let x of sample.commands) {
                tc.fillStyle = x.fillStyle;
                tc.strokeStyle = x.strokeStyle;
                tc.lineWidth = x.lineWidth;
                tc.globalAlpha = x.opacity;
                res_draw(x.res, tc, x.resTime, x.drect, x.srect);
            }
            canvas_draw_img3(ctx, tc.canvas, dst, src);
            return true;
    }
}
function res_draw_track(res, ctx, from, to, dst = rect_canvas(ctx), src) {
    switch (res.type) {
        case 3 /* ResType.Image */:
            if (src == null)
                src = res_rect(res);
            rect_fit(src, dst, FitMethod.Contain);
            console.log(src, dst);
            if (res.bitmap)
                canvas_draw_img2(ctx, res.bitmap, dst, src);
            break;
        case 5 /* ResType.Test */:
            for (let i = dst[0]; i < dst[2]; i++) {
                let t = lerp(from, to, i / dst[2]);
                ctx.fillStyle = `hsl(${255 * t}, 100%, 50%)`;
                ctx.fillRect(dst[0] + i, dst[1], 1, dst[3]);
            }
            break;
        default: res_draw(res, ctx, 0, undefined, src); //TODO implement for others
    }
}
function res_draw_thumb(res, ctx, dst = rect_canvas(ctx)) {
    switch (res.type) {
        case 5 /* ResType.Test */:
            let lin = ctx.createLinearGradient(dst[0], dst[1], dst[2], dst[3]);
            lin.addColorStop(0, `hsl(0, 100%, 50%)`);
            lin.addColorStop(1, `hsl(120, 100%, 50%)`);
            ctx.fillStyle = lin;
            canvas_fill_rect(ctx, dst);
            break;
        default: res_draw(res, ctx, min(0.1, res_len(res)), dst);
    }
}
async function res_load(res, chunk) {
    switch (res.type) {
        case 2 /* ResType.Video */:
            await video_load_chunk(res, chunk);
            break;
        case 1 /* ResType.Scene */:
            scene_validate(res);
            let [from, to] = res_xrange(res, chunk);
            canvas_prep(res.canvas, res.width, res.height);
            let sampleStart = floor(from * res.fps), sampleEnd = floor(sampleStart + SCENE_CHUNK_FRAMES), dt = 1 / res.fps;
            for (let sample = sampleStart; sample < sampleEnd; sample++) {
                let timestamp = sample / res.fps;
                res.frames[sample] = { commands: [], timestamp, duration: dt };
                for (let item of res.items) {
                    if (item.from > timestamp || item.to < timestamp)
                        continue;
                    let t = unlerp(item.from, item.to, timestamp);
                    let opacity = scene_item_prop(res, item, 9 /* Prop.Opacity */, t);
                    let srcX = scene_item_prop(res, item, 5 /* Prop.SrcX */, t);
                    let srcY = scene_item_prop(res, item, 6 /* Prop.SrcY */, t);
                    let srcW = scene_item_prop(res, item, 7 /* Prop.SrcW */, t);
                    let srcH = scene_item_prop(res, item, 8 /* Prop.SrcH */, t);
                    let dstX = scene_item_prop(res, item, 1 /* Prop.DstX */, t);
                    let dstY = scene_item_prop(res, item, 2 /* Prop.DstY */, t);
                    let dstW = scene_item_prop(res, item, 3 /* Prop.DstW */, t);
                    let dstH = scene_item_prop(res, item, 4 /* Prop.DstH */, t);
                    let lineWidth = scene_item_prop(res, item, 11 /* Prop.LineWidth */, t);
                    let fillStyle = scene_item_color(res, item, t, 12 /* Prop.FillR */);
                    let strokeStyle = scene_item_color(res, item, t, 16 /* Prop.StrokeR */);
                    let W = res_width(item.res);
                    let H = res_height(item.res);
                    let command = {
                        res: item.res, item,
                        drect: [dstX, dstY, dstW, dstH],
                        srect: [srcX * W, srcY * H, srcW * W, srcH * H],
                        opacity: opacity,
                        fillStyle: fillStyle,
                        strokeStyle: strokeStyle,
                        lineWidth: lineWidth,
                        resTime: item2res(item, timestamp)
                    };
                    res.frames[sample].commands.push(command);
                }
            }
            break;
        case 3 /* ResType.Image */:
            if (!res.bitmap && res.file)
                res.bitmap = await createImageBitmap(res.file);
            break;
        case 4 /* ResType.Script */: break;
        case 5 /* ResType.Test */: break;
    }
}
function res_unload(res, chunk) {
    switch (res.type) {
        case 2 /* ResType.Video */:
            video_unload_chunk(res, chunk);
            break;
        case 1 /* ResType.Scene */:
            let [from, to] = res_xrange(res, chunk);
            let sampleFrom = from * res.fps, sampleTo = to * res.fps;
            for (let i = sampleFrom; i < sampleTo; i++)
                res.frames[i] = undefined;
            break;
        case 3 /* ResType.Image */:
            res.bitmap?.close();
            res.bitmap = null;
            break;
    }
}
class Jobs {
    constructor() {
        this.queue = new Map(); //list of awaiting, gets shifted then processed
        this.jobs = new Map(); //list of ever
        this.workers = new Set();
    }
    async load(res, from, to) {
        let chunks = res_chunks(res, from, to);
        let jobs = [];
        for (let c of chunks) {
            let job = this.register(res, c);
            jobs.push(job);
            this.enqueue_job(job);
        }
        await Promise.all(jobs.map(j => j.promise));
    }
    async load_chunk(res, chunk) {
        let job = this.register(res, chunk);
        this.enqueue_job(job);
        await job.promise;
        return job;
    }
    get_job(res, chunk) {
        let map = this.jobs.get(res);
        if (!map)
            return null;
        return map.get(chunk);
    }
    pin(res, chunk) {
        let j = this.get_job(res, chunk);
        if (j)
            j.pinned = true;
    }
    unpin(res, chunk) {
        let j = this.get_job(res, chunk);
        if (j)
            j.pinned = false;
    }
    unload(res, from, to) {
        let chunks = res_chunks(res, from, to);
        for (let c of chunks)
            this.unload_chunk(res, c);
    }
    unload_chunk(res, chunk) {
        let job = this.get_job(res, chunk);
        if (job)
            this.remove(job);
    }
    remove(job) {
        if (job.state != 4 /* JobState.Done */)
            return;
        let map = this.jobs.get(job.res);
        if (!map)
            return;
        map.delete(job.chunk);
        for (let x of job.deps)
            x.refcount--;
        if (map.size == 0)
            this.jobs.delete(job.res);
        res_unload(job.res, job.chunk);
    }
    register(res, chunk) {
        let map = this.jobs.get(res);
        if (!map)
            this.jobs.set(res, map = new Map());
        else {
            let job = map.get(chunk);
            if (job) {
                job.score = Math.min(10, job.score + 1);
                return job;
            }
        }
        let job = this.make_job(res, chunk);
        job.score = Math.min(10, job.score + 1);
        map.set(chunk, job);
        let deps = res_chunk_deps(res, chunk);
        for (let x of deps) {
            let sub = this.register(x.res, x.chunk);
            sub.refcount++;
            job.deps.push(sub);
        }
        return job;
    }
    unload_unrefed(res) {
        let map = this.jobs.get(res);
        if (!map)
            return;
        let stack = [];
        for (let job of map.values())
            if (!job.pinned && job.refcount == 0)
                stack.push(job);
        for (let job of stack)
            this.remove(job);
        return stack;
    }
    unload_all(res) {
        let map = this.jobs.get(res);
        if (!map)
            return;
        let stack = [...map.values()];
        for (let job of stack)
            this.remove(job);
    }
    enqueue_job(job) {
        if (job.state != 1 /* JobState.Queue */ && job.state != 0 /* JobState.None */)
            return;
        let q = this.queue.get(job.res);
        if (!q)
            this.queue.set(job.res, q = []);
        let index = job.state == 1 /* JobState.Queue */ ? q.indexOf(job) : -1;
        if (index == -1)
            q.unshift(job);
        else {
            let tmp = q[0];
            q[0] = job;
            q[index] = tmp;
        }
        if (job.state == 0 /* JobState.None */) {
            job.state = 1 /* JobState.Queue */;
            for (let x of job.deps)
                this.enqueue_job(x);
        }
        this.res_worker(job.res);
    }
    async res_worker(res) {
        if (this.workers.has(res))
            return;
        this.workers.add(res);
        let jobs = this.queue.get(res);
        if (jobs)
            await this.worker(jobs);
        this.workers.delete(res);
        this.queue.delete(res);
    }
    async worker(jobs) {
        while (jobs.length) {
            let job = jobs.shift();
            job.state = 2 /* JobState.WaitingDeps */;
            await Promise.all(job.deps.map(j => j.promise));
            job.state = 3 /* JobState.Running */;
            let now = performance.now();
            await res_load(job.res, job.chunk);
            job.loadite = performance.now() - now;
            job.state = 4 /* JobState.Done */;
            job.resolve();
        }
    }
    make_job(res, chunk) {
        let resolve;
        let promise = new Promise(res => resolve = res);
        let job = { res, chunk, deps: [], resolve, promise, state: 0 /* JobState.None */, refcount: 0, loadite: 0, cost: res_chunk_cost(res, chunk), score: 0 };
        return job;
    }
}
function trim_edges(s, c) {
    let start = 0;
    let end = s.length;
    while (start < end && s[start] == c)
        start++;
    return s.slice(start, end);
}
///<reference path="../lib/mp4box.js" />
async function mp4_info(f) {
    return new Promise(async (resolve, reject) => {
        const mp4box = MP4Box.createFile();
        //TODO support multi track
        mp4box.onReady = (info) => {
            try {
                const track = info.videoTracks[0];
                const trak = mp4box.getTrackById(track.id);
                const entry = trak.mdia.minf.stbl.stsd.entries[0];
                mp4box.setExtractionOptions(track.id);
                mp4box.start();
                mp4box.onSamples = (track_id, ref, samples) => {
                    console.log(track);
                    resolve({
                        file: f, codec: track.codec, width: track.track_width, height: track.track_height, duration: track.duration / track.timescale,
                        description: avcc_to_description(entry.avcC), samples
                    });
                };
            }
            catch (e) {
                reject(e);
            }
        };
        const buffer = await f.arrayBuffer();
        buffer.fileStart = 0;
        mp4box.appendBuffer(buffer);
        mp4box.flush();
    });
}
function avcc_to_description(avcC) {
    const sps = avcC.SPS[0].data;
    const pps = avcC.PPS[0].data;
    const size = 7 +
        2 + sps.length +
        1 +
        2 + pps.length;
    const out = new Uint8Array(size);
    let i = 0;
    out[i++] = avcC.configurationVersion;
    out[i++] = avcC.AVCProfileIndication;
    out[i++] = avcC.profile_compatibility;
    out[i++] = avcC.AVCLevelIndication;
    out[i++] = 0xfc | avcC.lengthSizeMinusOne;
    out[i++] = 0xe0 | 1;
    out[i++] = sps.length >> 8;
    out[i++] = sps.length & 255;
    out.set(sps, i);
    i += sps.length;
    out[i++] = 1;
    out[i++] = pps.length >> 8;
    out[i++] = pps.length & 255;
    out.set(pps, i);
    return out;
}
async function mp4_to_frames(file) {
    let info = await mp4_info(file);
    let frames = [];
    let decoder = new VideoDecoder({
        output: (v) => {
            frames.push(v);
        },
        error: (e) => {
            console.error(e);
        }
    });
    decoder.configure({ codec: info.codec, description: info.description });
    for (let sample of info.samples) {
        decoder.decode(new EncodedVideoChunk({
            type: sample.is_sync ? 'key' : 'delta',
            timestamp: mp4_sample_pts(sample),
            duration: mp4_sample_dur(sample),
            data: sample.data
        }));
    }
    await decoder.flush();
    return frames.sort((a, b) => a.timestamp - b.timestamp);
}
function mp4_samples_fps(samples) {
    let first = samples[0];
    let last = samples[samples.length - 1];
    let start = first.dts;
    let end = last.dts + last.duration;
    return samples.length * first.timescale / (end - start);
}
function mp4_sample_pts(s) {
    return s.cts / s.timescale;
}
function mp4_sample_dur(s) {
    return s.duration / s.timescale;
}
var effects;
(function (effects) {
    function something(c, t, r) {
        let x = r[0];
        let y = r[1];
        let w = r[2];
        let h = r[3];
        let cx = x + w * 0.5;
        let cy = y + h * 0.5;
        let s = Math.min(w, h);
        c.fillRect(x, y, w, h);
        let blast = 1 - Math.pow(1 - t, 3);
        for (let ring = 0; ring < 60; ring++) {
            let base = (ring + 1) / 60;
            c.beginPath();
            for (let i = 0; i <= 500; i++) {
                let a = i / 500 * Math.PI * 2;
                let n = Math.sin(a * 5 + ring * 0.3) *
                    Math.sin(a * 9 + ring * 0.7) *
                    Math.sin(a * 17 + ring * 0.1);
                let rr = blast *
                    base *
                    (0.15 + Math.abs(n) * 0.25);
                let px = cx + Math.cos(a) * rr * s * 0.45;
                let py = cy + Math.sin(a) * rr * s * 0.45;
                if (i == 0)
                    c.moveTo(px, py);
                else
                    c.lineTo(px, py);
            }
            c.stroke();
        }
        for (let i = 0; i < 2000; i++) {
            let a = i * 2.399963229728653;
            let speed = 0.1 +
                0.9 *
                    Math.abs(Math.sin(i * 12.345));
            let rr = blast *
                speed *
                s * 0.45;
            let px = cx + Math.cos(a) * rr;
            let py = cy + Math.sin(a) * rr;
            let sz = (1 - blast * 0.5) *
                (0.002 + speed * 0.004) *
                s;
            c.fillStyle = "#fff";
            c.fillRect(px - sz * 0.5, py - sz * 0.5, sz, sz);
        }
        c.lineWidth = s * 0.01;
        c.beginPath();
        for (let i = 0; i <= 1000; i++) {
            let a = i / 1000 * Math.PI * 2;
            let n = Math.sin(a * 13) *
                Math.sin(a * 21);
            let rr = blast *
                (0.25 + n * 0.05);
            let px = cx + Math.cos(a) * rr * s * 0.45;
            let py = cy + Math.sin(a) * rr * s * 0.45;
            if (i == 0)
                c.moveTo(px, py);
            else
                c.lineTo(px, py);
        }
        c.stroke();
    }
    effects.something = something;
    function scene(c, t, r) {
        let x = r[0];
        let y = r[1];
        let w = r[2];
        let h = r[3];
        c.fillStyle = "#000";
        c.fillRect(x, y, w, h);
        c.strokeStyle = "#0f0";
        c.lineWidth = 2;
        c.beginPath();
        for (let i = 0; i <= w; i++) {
            let u = i / w;
            let yy = Math.sin(u * 20 + t * 8) * 0.3 +
                Math.sin(u * 60 - t * 12) * 0.1;
            let px = x + i;
            let py = y + h * (0.5 - yy);
            if (i == 0)
                c.moveTo(px, py);
            else
                c.lineTo(px, py);
        }
        c.stroke();
    }
    effects.scene = scene;
    function epic(c, t, r) {
        let x = r[0];
        let y = r[1];
        let w = r[2];
        let h = r[3];
        let cx = x + w * 0.5;
        let cy = y + h * 0.5;
        c.fillStyle = "#020408";
        c.fillRect(x, y, w, h);
        // stars
        for (let i = 0; i < 200; i++) {
            let px = x + ((i * 137.5) % w);
            let py = y + ((i * 91.7) % h);
            let s = 1 + (i % 3);
            c.fillStyle = color(1, 1, 1, 0.2 + 0.8 * Math.abs(Math.sin(t * 30 + i)));
            c.fillRect(px, py, s, s);
        }
        // giant pulsating core
        let pulse = 0.5 + 0.5 * Math.sin(t * Math.PI * 2);
        let grad = c.createRadialGradient(cx, cy, 0, cx, cy, w * 0.3 + pulse * w * 0.1);
        grad.addColorStop(0, "#ffffffff");
        grad.addColorStop(0.1, "#80c0ffff");
        grad.addColorStop(0.5, "#2060ffff");
        grad.addColorStop(1, "#00000000");
        c.fillStyle = grad;
        c.fillRect(x, y, w, h);
        // orbit rings
        c.strokeStyle = "#40ffffff";
        for (let i = 0; i < 8; i++) {
            let rr = w * (0.1 + i * 0.05);
            c.lineWidth = 1 + i * 0.5;
            c.beginPath();
            c.arc(cx, cy, rr, 0, Math.PI * 2);
            c.stroke();
        }
        // orbiting particles
        for (let i = 0; i < 64; i++) {
            let a = t * 6 + i * 0.3;
            let rr = w * (0.12 + (i % 8) * 0.05);
            let px = cx + Math.cos(a) * rr;
            let py = cy + Math.sin(a * 1.7) * rr;
            c.fillStyle = color(0.5 + 0.5 * Math.sin(i), 0.5 + 0.5 * Math.sin(i + 2), 0.5 + 0.5 * Math.sin(i + 4), 1);
            c.beginPath();
            c.arc(px, py, 2 + (i % 4), 0, Math.PI * 2);
            c.fill();
        }
        // energy beams
        c.lineWidth = 3;
        for (let i = 0; i < 24; i++) {
            let a = t * 2 + i * Math.PI / 12;
            c.strokeStyle = color(0.2, 0.8, 1, 0.15);
            c.beginPath();
            c.moveTo(cx, cy);
            c.lineTo(cx + Math.cos(a) * w, cy + Math.sin(a) * h);
            c.stroke();
        }
        // rotating hexagon swarm
        c.strokeStyle = "#ffffffff";
        for (let k = 0; k < 12; k++) {
            let rr = w * (0.15 + k * 0.03);
            let rot = t * (k + 1);
            c.beginPath();
            for (let i = 0; i <= 6; i++) {
                let a = rot + i * Math.PI / 3;
                let px = cx + Math.cos(a) * rr;
                let py = cy + Math.sin(a) * rr;
                if (i == 0)
                    c.moveTo(px, py);
                else
                    c.lineTo(px, py);
            }
            c.stroke();
        }
    }
    effects.epic = epic;
    function circle_grow(c, t, r) {
        let cx = r[0] + r[2] / 2;
        let cy = r[1] + r[3] / 2;
        let radius = min(r[2], r[3]) / 2 * t;
        c.beginPath();
        c.arc(cx, cy, radius, 0, TAU);
        c.fill();
    }
    effects.circle_grow = circle_grow;
    function square_outline(c, t, r, ccw = false) {
        //time normalized
        //space absolute
        const n = floor(t * 4);
        c.beginPath();
        let p = rect_boundary_point(r, 0);
        c.moveTo(p[0], p[1]);
        const s = ccw ? -1 : 1;
        for (let i = 1; i <= n; i++) {
            p = rect_boundary_point(r, s * i / 4);
            c.lineTo(p[0], p[1]);
        }
        p = rect_boundary_point(r, s * t);
        c.lineTo(p[0], p[1]);
        c.stroke();
    }
    effects.square_outline = square_outline;
    function square_outline_blend(c, t, r, ccw = 0.5) {
        square_outline(c, t * (1 - ccw), r, false);
        square_outline(c, t * ccw, r, true);
    }
    effects.square_outline_blend = square_outline_blend;
    function circle_outline(c, t, r, ccw = false) {
        let [x, y, w, h] = r;
        t = wrap01(t);
        const margin = c.lineWidth * 0.5;
        c.lineCap = "round";
        const cx = x + w * 0.5;
        const cy = y + h * 0.5;
        const a0 = 0;
        const a1 = t * PI * 2;
        c.beginPath();
        c.ellipse(cx, cy, w * 0.5 - margin, h * 0.5 - margin, 0, a0, ccw ? -a1 : a1);
        c.stroke();
    }
    effects.circle_outline = circle_outline;
    function circle_outline_blend(c, t, r, ccw = 0.5) {
        circle_outline(c, t * (1 - ccw), r, false);
        circle_outline(c, t * ccw, r, true);
    }
    effects.circle_outline_blend = circle_outline_blend;
})(effects || (effects = {}));
function debug_bitmap(b) {
    const canvas = document.createElement("canvas");
    canvas.width = b.width;
    canvas.height = b.height;
    const ctx = canvas.getContext("2d");
    let rect = ctx.drawImage(b, 0, 0);
    console.log("%c ", `
        font-size: 1px;
        padding: ${b.height / 2}px ${b.width / 2}px;
        background: url(${canvas.toDataURL()}) no-repeat;
        background-size: contain;
    `);
}
async function file_write(path, data) {
    const root = await navigator.storage.getDirectory();
    const handle = await root.getFileHandle(path, {
        create: true
    });
    const writable = await handle.createWritable();
    await writable.write(data);
    await writable.close();
}
async function file_read(path) {
    const root = await navigator.storage.getDirectory();
    const handle = await root.getFileHandle(path);
    return await handle.getFile();
}
function canvas_draw_test_gradient(ctx, w, h, t) {
    const gr = ctx.createLinearGradient(0, 0, w, h);
    t *= 10;
    const eps = 0.001;
    let last = '';
    for (let i = 0; i < 6; i++) {
        const p = i / 5;
        const brightness = 0.7;
        const r = (Math.cos(t + p * Math.PI * 2) * 0.5 + 0.5) * 255 * brightness;
        const g = (Math.cos(t + p * Math.PI * 2 + Math.PI * 2 / 3) * 0.5 + 0.5) * 255 * brightness;
        const b = (Math.cos(t + p * Math.PI * 2 + Math.PI * 4 / 3) * 0.5 + 0.5) * 255 * brightness;
        const color = `rgb(${r | 0},${g | 0},${b | 0})`;
        if (i)
            gr.addColorStop(Math.max(0, p - eps), last);
        gr.addColorStop(p, color);
        last = color;
    }
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, w, h);
}
function make_vide_icon(src) {
    canvas_draw_test_gradient(src, src.canvas.width, src.canvas.height, 0);
    let dst = canvas_create(src.canvas.width, src.canvas.height);
    const w = src.canvas.width;
    const h = src.canvas.height;
    const tmp = document.createElement('canvas');
    tmp.width = w;
    tmp.height = h;
    const g = tmp.getContext('2d');
    const m = g.measureText('V');
    const gx = w / 2 - (m.actualBoundingBoxLeft + m.actualBoundingBoxRight) / 2;
    const gy = h / 2 + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
    // Draw the V mask.
    g.font = `1000 ${Math.min(w, h) * 1.5}px Consolas, monospace`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = 'white';
    g.fillText('V', w / 2, h / 2);
    // Keep only the source inside the V.
    g.globalCompositeOperation = 'source-in';
    g.drawImage(src.canvas, 0, 0);
    // Output.
    dst.clearRect(0, 0, w, h);
    dst.drawImage(tmp, 0, 0);
    //crop here you shit
    createImageBitmap(dst.canvas).then(bitmap => {
        debug_bitmap(bitmap);
    });
    const a = document.createElement('a');
    a.download = 'vide.png';
    a.href = dst.canvas.toDataURL('image/png');
    a.click();
}
var sceneAsset;
var scene;
var item;
async function main() {
    init_input();
    editor = new Editor();
    sceneAsset = editor.new_scene('main');
    editor.open_scene(sceneAsset);
    let res;
    editor.import(res = res_create_test(), 'test');
    item = editor.add_item(res, 0, 0.5);
    item.to = 0.923;
    scene = sceneAsset.res;
    scene.duration = 1;
}
function move(from, to) {
    editor.timeview(from, to);
}
function s(t) {
    console.log(editor.time_g2s(t));
    console.log(editor.time_g2v(t));
    console.log(editor.time_s2v(t));
    console.log(editor.time_s2vg(t));
}
//# sourceMappingURL=vide.js.map