"use strict";
let project;
const editor = {
    assets_order: 0 /* OrderBy.Name */,
    assets_desc: false,
    assets: [],
    tracks: [],
    sel_beh: 0 /* SelBeh.Replace */,
    timeline: { from: 0, to: 30 }
};
const sel = {
    tracks: [],
    assets: [],
};
function editor_init() { }
function editor_project_new() {
    project = { file: [], res: [], asset: [], track: [], item: [], fps: 30 };
    project_track_create(project, 0 /* ItemType.Video */);
    editor_assets_refresh();
    editor_tracks_refresh();
}
function editor_import_open() {
    ui.file.click();
}
async function editor_import(f) {
    if (project_file_exists(f)) {
        ui_warn("skipped file " + f.name + ". it already imported");
        return;
    }
    let ass = await project_asset_create(project, f);
    if (!ass) {
        ui_error("Unsupported file type: " + f.name + " " + f.type);
        return;
    }
    editor_assets_refresh();
    editor_sel_asset(ass, 1 /* SelBeh.Append */);
    ui_request();
}
function editor_is_sel_asset(a) {
    return sel.assets.includes(a);
}
function editor_sel_asset_range(a, b) {
    let ia = editor.assets.indexOf(a);
    let ib = editor.assets.indexOf(b);
}
function editor_sel_mode() {
    let m = 0;
    if (sel.assets.length)
        m |= 2 /* SelMode.Asset */;
    if (sel.tracks.length)
        m |= 1 /* SelMode.Track */;
    return m;
}
function editor_unsel_all() {
    sel.tracks.length = 0;
    sel.assets.length = 0;
    ui_request();
}
function editor_sel_asset(a, be = editor.sel_beh) {
    if (be == 0 /* SelBeh.Replace */)
        editor_unsel_all();
    sel.assets.push(a);
    ui_request();
}
function editor_assets_refresh() {
    let a = editor.assets;
    a.length = 0;
    a.push(...project.asset);
    let sign = editor.assets_desc ? -1 : 1;
    let order = editor.assets_order;
    if (order == 0 /* OrderBy.Name */)
        a.sort((a, b) => sign * a.name.localeCompare(b.name));
    else if (order == 1 /* OrderBy.Type */)
        a.sort((a, b) => sign * (a.res.type - b.res.type));
    else if (order == 2 /* OrderBy.Date */)
        a.sort((a, b) => sign * (a.date - b.date));
    ui_request();
}
function editor_assets_order_by(o) {
    editor.assets_order = o;
    editor_assets_refresh();
}
function editor_assets_order_desc(b) {
    editor.assets_desc = b;
    editor_assets_refresh();
}
function editor_tracks_refresh() {
    editor.tracks.length = 0;
    editor.tracks.push(...project.track);
}
function editor_timeline_off(p01) { return sight_off(editor.timeline, p01); }
function editor_track_add_assets(t, assets, off) {
    editor_tracks_refresh();
    ui_request();
}
var Action;
(function (Action) {
    Action[Action["none"] = 0] = "none";
    Action[Action["import"] = 1] = "import";
    Action[Action["sel_append"] = 2] = "sel_append";
    Action[Action["sel_replace"] = 3] = "sel_replace";
})(Action || (Action = {}));
function editor_action(a) {
    switch (a) {
        case Action.import: return editor_import_open();
        case Action.sel_append: return editor.sel_beh = 1 /* SelBeh.Append */;
        case Action.sel_replace: return editor.sel_beh = 0 /* SelBeh.Replace */;
    }
}
const pointers = [];
function mapkey(ev) {
    switch (ev.code) {
        case 'KeyI': return Action.import;
        default:
            switch (ev.key) {
                case 'Shift': return Action.sel_append;
            }
            break;
    }
    return Action.none;
}
function mapkey_up(ev) {
    switch (ev.key) {
        case 'Shift': return Action.sel_replace;
    }
    return Action.none;
}
function input_init() {
    document.body.onkeydown = on_keydown;
    document.body.onkeyup = on_keyup;
    document.body.ondrop = on_drop;
    document.body.ondragover = on_dragover;
    document.body.onpointerdown = on_down;
    document.body.onpointermove = on_move;
    document.body.onpointerup = on_up;
    document.body.onpointercancel = on_cancel;
    prevent_select(document.body);
}
function btn(s) {
    editor_action(Action[s]);
}
function on_keydown(ev) {
    let a = mapkey(ev);
    console.log(ev.code);
    if (a) {
        editor_action(a);
        prevent_default(ev);
    }
}
function on_keyup(ev) {
    let a = mapkey_up(ev);
    if (a) {
        editor_action(a);
        prevent_bubble(ev);
    }
}
function on_dragover(ev) {
    prevent_default(ev);
}
function on_drop(ev) {
    if (ev.dataTransfer)
        for (let f of ev.dataTransfer.files)
            editor_import(f);
    prevent_default(ev);
}
function on_file(el) {
    if (el.files)
        for (let f of el.files)
            editor_import(f);
    el.value = '';
}
function on_down(ev) {
    let p = {
        mode: 1 /* PointerMode.Down */,
        pointerId: ev.pointerId,
        ox: ev.pageX, oy: ev.pageY,
        x: ev.pageX, y: ev.pageY,
        dx: 0, dy: 0,
        downTarget: ev.target,
        target: ev.target,
        drag: false,
        dragTargets: [],
    };
    let ass = ui_ev_asset(ev);
    if (ass && !editor_is_sel_asset(ass))
        ui_asset_down(ass);
    if (ass)
        p.target = p.downTarget = ui_asset(ass);
    if (!ass)
        editor_unsel_all();
    pointers.push(p);
}
function on_up(ev) {
    let p = pointers.find(p => p.pointerId == ev.pointerId);
    if (!p)
        return;
    let ass = ui_ev_asset(ev);
    if (ass && editor_is_sel_asset(ass) && !p.drag)
        ui_asset_down(ass);
    let track = ui_ev_track(ev);
    if (track) {
        let el = ui_track(track);
        let p01 = (p.x - el.offsetLeft) / el.offsetWidth;
        editor_track_add_assets(track, sel.assets, editor_timeline_off(p01));
    }
    p.mode = 2 /* PointerMode.Up */;
    on_cancel(ev);
}
function on_cancel(ev) {
    let p = pointers.find(p => p.pointerId == ev.pointerId);
    if (!p)
        return;
    for (let x of p.dragTargets)
        ui_drag_end(x);
    p.dragTargets.length = 0;
    let i = pointers.indexOf(p);
    if (i != -1)
        pointers.splice(i, 1);
}
function on_move(ev) {
    let p = pointers.find(p => p.pointerId == ev.pointerId);
    if (!p)
        return;
    p.mode = 3 /* PointerMode.Move */;
    p.x = ev.pageX;
    p.y = ev.pageY;
    p.dx = p.x - p.ox;
    p.dy = p.y - p.oy;
    if (!p.drag) {
        const dst = 4;
        if (sqmag(p.dx, p.dy) > dst * dst) {
            p.drag = true;
            p.dragTargets = sel.assets.map(x => ui_asset(x)).filter(x => x != null);
            if (!p.dragTargets.find(x => p.downTarget == x))
                p.dragTargets.length = 0;
            for (let x of p.dragTargets)
                ui_drag_start(x);
        }
    }
    else {
        for (let x of p.dragTargets)
            ui_drag_move(x, p.dx, p.dy);
    }
}
function on_assets_order_by(el) {
    let i = +el.value;
    editor_assets_order_by(i);
}
function on_assets_order_desc(el) {
    editor_assets_order_desc(el.checked);
}
function main() {
    ui_init();
    input_init();
    editor_init();
    editor_project_new();
}
function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, min, max) { return Math.min(Math.max(v, min), max); }
function rect_one() { return [0, 0, 1, 1]; }
function rect_zero() { return [0, 0, 0, 0]; }
function rect_lerp(dst, a, b, t) {
    dst[0] = lerp(a[0], b[0], t);
    dst[1] = lerp(a[1], b[1], t);
    dst[2] = lerp(a[2], b[2], t);
    dst[3] = lerp(a[3], b[3], t);
}
function rect_fit(src_w, src_h, dst_w, dst_h) {
    let scale = Math.min(dst_w / src_w, dst_h / src_h);
    let w = src_w * scale;
    let h = src_h * scale;
    let x = (dst_w - w) / 2;
    let y = (dst_h - h) / 2;
    return [x, y, w, h];
}
function tween(from, to, t, type = 0 /* Tween.Linear */) {
    switch (type) {
        case 1 /* Tween.InQuad */:
            t = t * t;
            break;
        case 2 /* Tween.OutQuad */:
            t = 1 - (1 - t) * (1 - t);
            break;
        case 3 /* Tween.InOutQuad */:
            t = t < 0.5
                ? 2 * t * t
                : 1 - Math.pow(-2 * t + 2, 2) / 2;
            break;
        case 4 /* Tween.InCubic */:
            t = t * t * t;
            break;
        case 5 /* Tween.OutCubic */:
            t = 1 - Math.pow(1 - t, 3);
            break;
        case 6 /* Tween.InOutCubic */:
            t = t < 0.5
                ? 4 * t * t * t
                : 1 - Math.pow(-2 * t + 2, 3) / 2;
            break;
        case 7 /* Tween.InExpo */:
            t = t === 0 ? 0 : Math.pow(2, 10 * t - 10);
            break;
        case 8 /* Tween.OutExpo */:
            t = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
            break;
        case 9 /* Tween.InOutExpo */:
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
function sight_len(s) {
    return s.to - s.from;
}
function sight_speed(dst, src) {
    return sight_len(src) / sight_len(dst);
}
function sight_set_speed(dst, src, speed) {
    dst.to = dst.from + sight_len(src) / speed;
}
function sight_map(x, from, to) {
    return to.from + (x - from.from) * sight_len(to) / sight_len(from);
}
function hypot(x, y) { return Math.sqrt(x * x + y * y); }
function sqmag(x, y) { return x * x + y * y; }
function project_item_create(project, res, track) {
    let item;
    switch (res.type) {
        case 1 /* ResType.Video */:
            item = { type: 0 /* ItemType.Video */, track, res, from: 0, to: res.duration, clip: { from: 0, to: res.duration } };
            break;
        case 2 /* ResType.Audio */:
            item = { type: 1 /* ItemType.Audio */, track, res, from: 0, to: res.duration, clip: { from: 0, to: res.duration } };
            break;
        case 3 /* ResType.Image */:
        case 4 /* ResType.Svg */:
            item = { type: 2 /* ItemType.Image */, track, res, from: 0, to: 1 };
            break;
    }
    project.item.push(item);
}
function project_file_exists(f) {
    for (let i = 0; i < project.file.length; i++) {
        if (file_fingerprint(project.file[i]) === file_fingerprint(f))
            return true;
    }
    return false;
}
async function project_asset_create(project, f) {
    let type = res_type(f);
    let res;
    switch (type) {
        case 2 /* ResType.Audio */:
            res = (await res_create_audio(f));
            break;
        case 3 /* ResType.Image */:
            res = await res_create_image(f);
            break;
        case 1 /* ResType.Video */:
            res = await res_create_video(f, 8);
            break;
        case 4 /* ResType.Svg */:
            res = await res_svg_create(f, 64, 64);
            break;
        default: return null;
    }
    let ass = { name: f.name, res, thumb: await res_generate_thumb(res, 64, 64), date: Date.now() };
    project.file.push(f);
    project.res.push(res);
    project.asset.push(ass);
    return ass;
}
function project_track_create(project, type) {
    let track = { type };
    project.track.push(track);
    return track;
}
function file_fingerprint(f) {
    return `${f.name}|${f.size}|${f.lastModified}`;
}
function res_type(f) {
    const t = f.type;
    if (t.startsWith("video/"))
        return 1 /* ResType.Video */;
    if (t.startsWith("audio/"))
        return 2 /* ResType.Audio */;
    if (t === "image/svg+xml")
        return 4 /* ResType.Svg */;
    if (t.startsWith("image/"))
        return 3 /* ResType.Image */;
    return 0 /* ResType.Unknown */;
}
async function res_create_video(f, fps) {
    const el = document.createElement('video');
    el.muted = true;
    el.preload = 'auto';
    el.src = URL.createObjectURL(f);
    await new Promise(ok => {
        el.onloadedmetadata = () => ok();
    });
    let length = Math.ceil(el.duration * fps);
    let v = {
        type: 1 /* ResType.Video */, file: f,
        frames: new Array(length), preview: new Array(length),
        width: el.videoWidth, height: el.videoHeight, fps: fps, duration: el.duration, el: el,
        audio: await res_create_audio(f)
    };
    return v;
}
async function res_create_image(f) {
    const bitmap = await createImageBitmap(f);
    let res = {
        file: f, type: 3 /* ResType.Image */,
        bitmap, width: bitmap.width, height: bitmap.height
    };
    return res;
}
async function res_create_audio(f) {
    let ctx = new AudioContext();
    let bytes = await f.arrayBuffer();
    try {
        let buffer = await ctx.decodeAudioData(bytes);
        let res = {
            type: 2 /* ResType.Audio */,
            file: f,
            buffer,
            srate: buffer.sampleRate, channels: buffer.numberOfChannels,
            duration: buffer.duration,
            length: buffer.length
        };
        return res;
    }
    catch {
        return null;
    }
}
async function video_decode_frames(v, from, to, out, max_width = 0, skip_exist = false) {
    let start = Math.floor(from * v.fps);
    let end = Math.ceil(to * v.fps);
    let aspect = v.height / v.width;
    for (let i = start; i < end; i++) {
        if (out[i]) {
            if (skip_exist)
                continue;
            out[i]?.close();
        }
        await video_seek(v.el, i / v.fps);
        if (!max_width) {
            let bitmap = await createImageBitmap(v.el);
            out[i] = bitmap;
        }
        else {
            let bitmap = await createImageBitmap(v.el, { resizeWidth: max_width, resizeHeight: Math.floor(max_width * aspect), resizeQuality: "low" });
            out[i] = bitmap;
        }
    }
}
async function video_decode(v, from, to, skip_exist = false) {
    let start = Math.floor(from * v.fps);
    let end = Math.ceil(to * v.fps);
    for (let i = start; i < end; i++) {
        if (v.frames[i] && skip_exist)
            continue;
        await video_seek(v.el, i / v.fps);
        let bitmap = await createImageBitmap(v.el);
        v.frames[i]?.close();
        v.frames[i] = bitmap;
    }
}
async function video_seek(video, time) {
    return new Promise(ok => {
        video.onseeked = () => ok();
        video.currentTime = time;
    });
}
function video_draw_frames(vid, ctx, from = 0, to = vid.duration) {
    let start = Math.floor(from * vid.fps);
    let end = Math.ceil(to * vid.fps);
    start = clamp(start, 0, vid.frames.length);
    end = clamp(end, 0, vid.frames.length);
    let count = end - start;
    if (count <= 0)
        return;
    let fw = ctx.canvas.width / count;
    for (let i = start; i < end; i++) {
        let x = Math.floor((i - start) * fw);
        let w = Math.ceil(fw);
        let frame = vid.frames[i];
        if (!frame)
            continue;
        ctx.drawImage(frame, x, 0, w, ctx.canvas.height);
    }
}
function audio_draw_frames(aud, ctx, from = 0, to = aud.duration) {
    let start = Math.floor(from * aud.srate);
    let end = Math.ceil(to * aud.srate);
    start = clamp(start, 0, aud.length);
    end = clamp(end, 0, aud.length);
    let count = end - start;
    if (count <= 0)
        return;
    let samples = aud.buffer.getChannelData(0);
    let step = count / ctx.canvas.width;
    const cy = ctx.canvas.height / 2;
    ctx.strokeStyle = "black";
    ctx.beginPath();
    for (let x = 0; x < ctx.canvas.width; x++) {
        const a = Math.floor(start + x * step);
        const b = Math.floor(start + (x + 1) * step);
        let min = 1;
        let max = -1;
        for (let i = a; i < b; i++) {
            let s = samples[i];
            if (s < min)
                min = s;
            if (s > max)
                max = s;
        }
        let y0 = cy + min * cy;
        let y1 = cy + max * cy;
        if (Math.abs(y1 - y0) < 1) {
            y0 = cy - 0.5;
            y1 = cy + 0.5;
        }
        ctx.moveTo(x, y0);
        ctx.lineTo(x, y1);
    }
    ctx.stroke();
}
async function res_svg_create(f, width, height) {
    let svg = await f.text();
    let el = new Image();
    let blob = new Blob([svg], { type: "image/svg+xml" });
    let dataurl = URL.createObjectURL(blob);
    let s = { type: 4 /* ResType.Svg */, file: f, bitmap: null, dataurl, el, svg, width, height };
    await svg_raster_over(s, width, height);
    return s;
}
async function svg_raster(svg, width, height) {
    if (svg.bitmap && width == svg.width && height == svg.height)
        return svg.bitmap;
    svg.el.width = width;
    svg.el.height = height;
    svg.el.src = svg.dataurl;
    await svg.el.decode();
    return await createImageBitmap(svg.el);
}
async function svg_raster_over(svg, width, height) {
    if (svg.bitmap && svg.bitmap.width == width && svg.bitmap.height == height)
        return;
    svg.bitmap?.close();
    svg.bitmap = await svg_raster(svg, width, height);
}
const _thumb_canvas = document.createElement('canvas').getContext('2d');
async function res_generate_thumb(res, w, h) {
    _thumb_canvas.clearRect(0, 0, _thumb_canvas.canvas.width, _thumb_canvas.canvas.height);
    _thumb_canvas.canvas.width = w;
    _thumb_canvas.canvas.height = h;
    switch (res.type) {
        case 1 /* ResType.Video */:
            let vres = res;
            let len = 1 / vres.fps;
            await video_decode(vres, 0, len, true);
            video_draw_frames(vres, _thumb_canvas, 0, len);
            break;
        case 3 /* ResType.Image */:
        case 4 /* ResType.Svg */:
            let rect = rect_fit(res.width, res.height, w, h);
            _thumb_canvas.drawImage(res.bitmap, rect[0], rect[1], rect[2], rect[3]);
            break;
    }
    return await createImageBitmap(_thumb_canvas.canvas);
}
async function res_generate_preview(res) {
    switch (res.type) {
        case 1 /* ResType.Video */:
            video_decode_frames(res, 0, res.duration, res.preview, 32, true);
            break;
    }
}
function debug_bitmap(b) {
    const canvas = document.createElement("canvas");
    canvas.width = b.width;
    canvas.height = b.height;
    const ctx = canvas.getContext("2d");
    let rect = ctx.drawImage(b, 0, 0, 64, 64);
    console.log("%c ", `
        font-size: 1px;
        padding: ${b.height / 2}px ${b.width / 2}px;
        background: url(${canvas.toDataURL()}) no-repeat;
        background-size: contain;
    `);
}
let getbyid = (id) => document.getElementById(id);
let getbyclass = function (c, within = document) {
    let arr = [];
    let list = within.getElementsByClassName(c);
    for (let e = 0; e < list.length; ++e)
        arr.push(list[e]);
    return arr;
};
function getbyclass_parent(c, el) {
    while (el) {
        if (el.classList.contains(c))
            return el;
        el = el.parentElement;
    }
    return el;
}
let getbytag = function (c, within = document) {
    let arr = [];
    let list = within.getElementsByTagName(c);
    for (let e = 0; e < list.length; ++e)
        arr.push(list[e]);
    return arr;
};
function toggle_class(el, c, cond) {
    if (cond)
        el.classList.add(c);
    else
        el.classList.remove(c);
}
let prevent_bubble = function (e) { e.stopPropagation(); };
let prevent_default = function (e) { e.stopPropagation(); e.preventDefault(); };
let prevent_select = function (el) { el.onselectstart = prevent_default; };
function ui_is_native_control(x) {
    return x instanceof HTMLInputElement || x instanceof HTMLTextAreaElement || x instanceof HTMLSelectElement || x instanceof HTMLButtonElement;
}
let component_get = function (el, key, create = false) {
    key = 'data-' + key;
    let list = ui.components[key];
    if (list == null)
        list = ui.components[key] = [];
    let attr = el.getAttribute(key);
    if (!attr) {
        if (create)
            component_set(el, key, {});
        else
            return null;
        attr = el.getAttribute(key);
    }
    return list[+attr];
};
let component_set = function (el, key, component) {
    key = 'data-' + key;
    let list = ui.components[key];
    if (list == null)
        list = ui.components[key] = [];
    let index = el.getAttribute(key);
    if (index) {
        list[+index] = component;
    }
    else {
        el.setAttribute(key, list.length + '');
        list[list.length] = component;
    }
};
function update_elements(contianer, arr, fn) {
    const template = contianer.children[0];
    template.style.display = 'none';
    while (contianer.children.length - 1 < arr.length)
        contianer.appendChild(template.cloneNode(true));
    for (let i = 0; i < arr.length; i++) {
        let el = contianer.children[i + 1];
        el.style.display = '';
        fn(arr[i], el);
    }
    for (let i = arr.length + 1; i < contianer.children.length; i++)
        contianer.children[i].style.display = 'none';
}
const ui = {
    components: {},
    file: getbyid('file'),
    requested_update: false,
    assets: getbyid('assets'),
    tracks: getbyid('tracks'),
    pointers: [],
    drag: [],
    notif: getbyid('notif')
};
function ui_init() {
}
function ui_notif(s) {
    ui.notif.textContent = s;
    ui.notif.style.visibility = 'visible';
    setTimeout(() => ui.notif.style.visibility = 'hidden', 5000);
}
function ui_error(s) {
    ui.notif.className = 'error';
    ui_notif(s);
}
function ui_warn(s) {
    ui.notif.className = 'warn';
    ui_notif(s);
}
function ui_request() {
    if (ui.requested_update)
        return;
    ui.requested_update = true;
    requestAnimationFrame(() => {
        ui_update();
        ui.requested_update = false;
    });
}
function ui_update() {
    update_elements(ui.assets, editor.assets, ui_update_asset);
    update_elements(ui.tracks, editor.tracks, ui_update_track);
}
function ui_drag_start(el) {
    component_set(el, 'drag', { ox: el.offsetLeft, oy: el.offsetTop });
    el.style.pointerEvents = 'none';
}
function ui_drag_move(el, dx, dy) {
    let d = component_get(el, 'drag');
    el.style.position = 'absolute';
    el.style.left = d.ox + dx + 'px';
    el.style.top = d.oy + dy + 'px';
}
function ui_drag_end(el) {
    el.style.position = '';
    el.style.left = '';
    el.style.top = '';
    el.style.pointerEvents = '';
}
function ui_update_asset(a, el) {
    let name = getbyclass('name', el)[0];
    let canv = getbyclass('thumb', el)[0];
    let ctx = canv.getContext('2d');
    name.innerText = a.name;
    ctx.clearRect(0, 0, canv.width, canv.height);
    ctx.drawImage(a.thumb, 0, 0, canv.width, canv.height);
    component_set(el, 'asset', a);
    toggle_class(el, 'high', editor_is_sel_asset(a));
}
function ui_asset(a) {
    for (let child of ui.assets.children) {
        if (component_get(child, 'asset') == a)
            return child;
    }
    return null;
}
function ui_track(t) {
    for (let child of ui.tracks.children) {
        if (component_get(child, 'track') == t)
            return child;
    }
    return null;
}
function ui_ev_asset(ev) {
    let el = ev.target.closest('.asset');
    if (!el)
        return null;
    return component_get(el, 'asset');
}
function ui_ev_track(ev) {
    let el = ev.target.closest('.track');
    if (!el)
        return null;
    return component_get(el, 'track');
}
function ui_asset_down(a) {
    editor_sel_asset(a);
}
function ui_update_track(t, el) {
    let canvas = getbytag('canvas', el)[0];
    component_set(el, 'track', t);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NyaXB0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidHMvZWRpdG9yLnRzIiwidHMvaW5wdXQudHMiLCJ0cy9tYWluLnRzIiwidHMvbWF0aC50cyIsInRzL3Byb2plY3QudHMiLCJ0cy9yZXMudHMiLCJ0cy90ZXN0LnRzIiwidHMvdWkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLElBQUksT0FBZ0IsQ0FBQTtBQUNwQixNQUFNLE1BQU0sR0FBRztJQUNYLFlBQVksc0JBQWM7SUFDMUIsV0FBVyxFQUFFLEtBQUs7SUFDbEIsTUFBTSxFQUFXLEVBQUU7SUFDbkIsTUFBTSxFQUFXLEVBQUU7SUFDbkIsT0FBTyx3QkFBZ0I7SUFDdkIsUUFBUSxFQUFTLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFO0NBQ3ZDLENBQUE7QUFXRCxNQUFNLEdBQUcsR0FBRztJQUNSLE1BQU0sRUFBVyxFQUFFO0lBQ25CLE1BQU0sRUFBVyxFQUFFO0NBQ3RCLENBQUE7QUFNRCxTQUFTLFdBQVcsS0FBSyxDQUFDO0FBQzFCLFNBQVMsa0JBQWtCO0lBQ3ZCLE9BQU8sR0FBRyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLENBQUE7SUFDeEUsb0JBQW9CLENBQUMsT0FBTyx5QkFBaUIsQ0FBQTtJQUU3QyxxQkFBcUIsRUFBRSxDQUFBO0lBQ3ZCLHFCQUFxQixFQUFFLENBQUE7QUFDM0IsQ0FBQztBQUVELFNBQVMsa0JBQWtCO0lBQ3ZCLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUE7QUFDbkIsQ0FBQztBQUVELEtBQUssVUFBVSxhQUFhLENBQUMsQ0FBTztJQUNoQyxJQUFJLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFD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