"use strict";
let entitys = new Map();
function id(id) { return document.getElementById(id); }
function classes(c, within = document) {
    let arr = [];
    let list = within.getElementsByClassName(c);
    for (let e = 0; e < list.length; ++e)
        arr.push(list[e]);
    return arr;
}
function class1(c, within) { return classes(c, within)[0]; }
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
    else {
        return entitys.get(el);
    }
}
function ent1(el) {
    let e = ent(el);
    if (e != undefined)
        return e;
    else
        throw new Error('no entity ' + el);
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
    }
}
function opt(el) { }
function file(el) {
    if (el.files)
        editor.import_many(el.files);
    el.value = '';
}
let pointers = [];
let hovers = [];
function pointer(p, el, mode) { }
function datadrop(p, el, mode) { }
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
function on_keydown(e) { }
function on_keyup(e) { }
function on_dragenter(ev) { prevent(ev); }
function on_dragleave(ev) {
    prevent(ev);
    let p = event_pointer_drag(ev);
    if (p.cur)
        datadrop(p, p.cur, 7 /* PointerMode.DragEnd */);
}
function on_dragover(ev) {
    prevent(ev);
    let p = event_pointer_drag(ev);
    let hit = pointer_hit(ev);
    if (hit != p.cur) {
        if (p.cur)
            datadrop(p, p.cur, 7 /* PointerMode.DragEnd */);
        p.cur = hit;
        if (p.cur)
            datadrop(p, p.cur, 6 /* PointerMode.DragStart */);
    }
}
function on_dragend(ev) {
    prevent(ev);
    let p = event_pointer_drag(ev);
    if (p.cur)
        datadrop(p, p.cur, 7 /* PointerMode.DragEnd */);
    let index = pointers.indexOf(p);
    pointers.splice(index, 1);
}
function on_dragdrop(ev) {
    prevent(ev);
    let p = event_pointer_drag(ev);
    let hit = pointer_hit(ev);
    if (hit) {
        datadrop(p, hit, 8 /* PointerMode.Drop */);
        datadrop(p, hit, 7 /* PointerMode.DragEnd */);
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
        pointer(p, p.down, 2 /* PointerMode.Down */);
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
            pointer(p, p.cur, 1 /* PointerMode.Hover */);
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
        pointer(p, p.cur, 1 /* PointerMode.Hover */);
    if (!p.isDrag) {
        if (hypot(p.dx, p.dy) < 4) {
            if (p.down)
                pointer(p, p.down, 3 /* PointerMode.PendDrag */);
        }
        else {
            p.isDrag = true;
            if (p.down)
                pointer(p, p.down, 6 /* PointerMode.DragStart */);
        }
    }
    else if (p.isDrag) {
        if (p.down)
            pointer(p, p.down, 5 /* PointerMode.Drag */);
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
            pointer(p, p.cur, 8 /* PointerMode.Drop */);
        }
        if (p.down)
            pointer(p, p.down, 7 /* PointerMode.DragEnd */);
    }
    if (p.down)
        pointer(p, p.down, 4 /* PointerMode.Up */);
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
    if (p.cur) {
        let bound = p.cur.getBoundingClientRect();
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
    repath(s) { }
    import_many(files) { }
    open_scene(a) { }
    sel_asset(a, v) { }
    sel_asset2(a, mode) { }
    sel_item(item, v) { }
    sel_item2(item, v) { }
    sel_time(from, to) { }
    unsel_assets() { }
    unsel_items() { }
    unsel_time() { }
    time(from, to) { }
    timeplay(from, to) { }
    untimeplay() { }
    play(t) { }
    playcur() { }
    playnext() { }
    playprev() { }
    set_play(b) { }
    time_preplace() { } //initialize a displacement state
    time_displace(delta) { } //displaces current selected timeline stuff
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
function range_and(a, b) { return range_sany_min(range(max(a[0], b[0]), min(a[1], b[1]))); }
function range_or(a, b) { return range(min(a[0], b[0]), max(a[1], b[1])); }
function range_intersect(a, b, tb) { return range_map(range_and(a, b), b, tb); }
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
                        codec: track.codec, width: track.track_width, height: track.track_height, duration: track.duration / track.timescale,
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
async function main() {
}
//# sourceMappingURL=script.js.map