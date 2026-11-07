"use strict";
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
function deg2rad(n) { return n * Math.PI / 180; }
function rad2deg(n) { return n * 180 / Math.PI; }
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
function point(x, y) { return [x, y]; }
function rect(x, y, w, h) { return [x, y, w, h]; }
function rect_clone(r) { return [...r]; }
function rect_one() { return [0, 0, 1, 1]; }
function rect_zero() { return [0, 0, 0, 0]; }
function rect_canvas(c) { return rect(0, 0, c.canvas.width, c.canvas.height); }
function rect_img(c) { return rect(0, 0, c.width, c.height); }
function rect_scale(r, w, h) { return rect(r[0] * w, r[1] * h, r[2] * w, r[3] * h); }
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
function curve_eval(c, x) {
    if (!c.length)
        return 0;
    if (x <= c[0][0])
        return c[0][1]; //min
    for (let i = 1; i < c.length; i++) {
        let a = c[i - 1], b = c[i];
        if (x <= b[0]) {
            let t = unlerp(a[0], b[0], x);
            if (typeof (a[2]) == "number")
                return tween(a[1], b[1], t, a[2]);
            else if (typeof (a[2]) == "function")
                return a[1] + (b[1] - a[1]) * a[2](t);
            return lerp(a[1], b[1], t); //map
        }
    }
    return c[c.length - 1][1]; //max
}
function color(r, g, b, a = 1) {
    r = round(clamp(r, 0, 1) * 255), g = round(clamp(g, 0, 1) * 255), b = round(clamp(b, 0, 1) * 255), a = round(clamp(a, 0, 1) * 255);
    return "#" + r.toString(16).padStart(2, "0") + g.toString(16).padStart(2, "0") + b.toString(16).padStart(2, "0") + a.toString(16).padStart(2, "0");
}
function colori(r, g, b, a = 1) {
    r = clamp(r, 0, 255), g = clamp(g, 0, 255), b = clamp(b, 0, 255), a = round(clamp(a, 0, 1) * 255);
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
class TestRes {
    draw(ctx, t, dst) {
        ctx.fillStyle = `hsl(${255 * t}, 100%, 50%)`;
        ctx.fillRect(dst[0], dst[1], dst[2], dst[3]);
        return true;
    }
}
class ImageRes {
    constructor(blob) {
        this.bitmap = null;
        this.blob = blob;
    }
    draw(ctx, t, dst, src) {
        if (!this.bitmap)
            return false;
        rect_scale(src, this.bitmap.width, this.bitmap.height);
        canvas_draw_img3(ctx, this.bitmap, dst, src);
        return true;
    }
    async load(chunk) { if (!this.bitmap)
        this.bitmap = await createImageBitmap(this.blob); }
    async unload(chunk) { if (this.bitmap) {
        this.bitmap.close();
        this.bitmap = null;
    } }
}
class SquareRes {
    constructor() {
        this.color = { r: 0, g: 0, b: 255, a: 1 };
        this.outline = { r: 0, g: 0, b: 0, a: 1, w: 0 };
    }
    prop(s, val) {
        switch (s) {
            case 'r':
            case 'g':
            case 'b':
            case 'a':
                this.color[s] = val;
                break;
            case 'ow':
            case 'or':
            case 'og':
            case 'ob':
            case 'oa':
                this.outline[s.substring(1)] = val;
                break;
        }
    }
    draw(ctx, t, dst) {
        let outline = this.outline.w / 2;
        if (this.outline.w > 0) {
            ctx.strokeStyle = colori(this.outline.r, this.outline.b, this.outline.g, this.outline.a);
            ctx.strokeRect(dst[0] + outline, dst[1] + outline, dst[2] - outline * 2, dst[3] - outline * 2);
        }
        ctx.fillStyle = colori(this.color.r, this.color.b, this.color.g, this.color.a);
        ctx.fillRect(dst[0], dst[1], dst[2], dst[3]);
        return true;
    }
}
function items_sort(items) { items.sort((a, b) => a.layer == b.layer ? a.from - b.from : a.layer - b.layer); }
function item_clone(item) {
    let clone = { ...item };
    clone.srect = rect_clone(item.srect);
    clone.rect = rect_clone(item.rect);
    return clone;
}
// interface SceneCommand { item: Item, res: Res, resTime: float, drect: Rect, srect: Rect, lineWidth: float, strokeStyle: string, fillStyle: string, opacity: float }
// interface SceneFrame { timestamp: float, duration: float, commands: SceneCommand[] }
// interface ItemRenderer { fps: float, width: int, height: int }
// function items_compile(items: Item[], from: float, to: float, rend: ItemRenderer) {
//     let frames = [];
//     let sampleStart = floor(from * rend.fps), sampleEnd = floor(sampleStart + SCENE_CHUNK_FRAMES), dt = 1 / rend.fps
//     for (let sample = sampleStart; sample < sampleEnd; sample++) {
//         let timestamp = sample / rend.fps
//         frames[sample] = { commands: [], timestamp, duration: dt }
//         for (let item of items) {
//             if (item.from > timestamp || item.to < timestamp)
//                 continue
//             let t = unlerp(item.from, item.to, timestamp)
//             let W = res_width(item.res)
//             let H = res_height(item.res)
//             let command: SceneCommand = {
//                 res: item.res, item,
//                 drect: [dstX, dstY, dstW, dstH],
//                 srect: [srcX * W, srcY * H, srcW * W, srcH * H],
//                 opacity: opacity,
//                 fillStyle: fillStyle,
//                 strokeStyle: strokeStyle,
//                 lineWidth: lineWidth,
//                 resTime: item2res(item, timestamp)
//             }
//             res.frames[sample]!.commands.push(command)
//         }
//     }
// }
// // function res_create_test(): Res {
// //     return {
// //         draw(ctx, t, dst, src) {
// //             let tc = res.canvas
// //             canvas_prep(tc, dst[2], dst[3])
// //             canvas_clear_all(tc)
// //             tc.fillStyle = `hsl(${255 * t}, 100%, 50%)`
// //             tc.fillRect(0, 0, tc.canvas.width, tc.canvas.height)
// //             canvas_draw_img3(ctx, tc.canvas, dst, src);
// //         },
// //     }
// // }
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
function mp4_create_file() { return MP4Box.createFile(); }
function mp4_add_track(f, codec, desc, duration, width, height) {
    let trackOptions = {
        timescale: 1000000, media_duration: duration * 1000000,
        width, height, codec, avcDecoderConfigRecord: desc,
    };
    return f.addTrack(trackOptions);
}
function mp4_add_video_chunk(f, track, data, chunk) {
    let sample = { dts: chunk.timestamp, cts: chunk.timestamp, duration: chunk.duration, is_sync: chunk.type == 'key' };
    f.addSample(track, data, sample);
    return sample;
}
let entitys = new Map();
let ghosts = new Map();
let boxes = new Map();
let drags = new Map();
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
function remove_ghost(el) {
    let ghost = ghosts.get(el);
    if (ghost) {
        ghost.remove();
        ghosts.delete(el);
    }
}
function remove_ghosts() {
    for (let ghost of ghosts.values())
        ghost.remove();
    ghosts.clear();
}
function drag_move(d, el, useghost = false) {
    if (d.pint == 2 /* Pint.Up */) {
        el.style.pointerEvents = '';
        remove_ghost(el);
        return;
    }
    if (d.pint != 3 /* Pint.Drag */)
        return;
    if (useghost) {
        let ghost = spawn_ghost(el, d.dx, d.dy);
        ghost.style.left = `${d.startx + d.dx}px`;
        ghost.style.top = `${d.starty + d.dy}px`;
    }
    else {
        el.style.left = `${d.startx + d.dx}px`;
        el.style.top = `${d.starty + d.dy}px`;
        el.style.pointerEvents = 'none';
    }
}
class Box {
    constructor(el) {
        this.el = el;
        this.bar = class1('boxbar', el);
        this.body = class1('boxbot', el);
        reg_drag(this.bar, 0, (d) => drag_move(d, el));
    }
    getpos() { return [this.el.offsetLeft, this.el.offsetTop]; }
    setpos(p) { this.el.style.left = `${p[0]}px`; this.el.style.top = `${p[1]}px`; }
}
function init_gui() {
    let forbox = document.querySelectorAll('[for-box]');
    classes('box').forEach(e => {
        let box = new Box(e);
        for (let i = 0; i < forbox.length; i++)
            if (forbox[i].getAttribute('for-box') == e.id)
                box.body.appendChild(forbox[i]);
        boxes.set(e, box);
    });
}
function recalc_drag(obj, el, e, move, thr) {
    if (!move) {
        obj.started = e.target;
        let bounding = obj.started.getBoundingClientRect();
        obj.startx = bounding.left, obj.starty = bounding.top;
        obj.target = obj.started;
        obj.pint = 0 /* Pint.Down */;
        obj.ox = obj.x = e.clientX;
        obj.oy = obj.y = e.clientY;
        obj.ex = e.clientX - obj.startx, obj.ey = e.clientY - obj.starty;
        obj.dx = 0, obj.dy = 0;
        obj.excced = false;
    }
    else {
        obj.x = e.x, obj.y = e.y;
        obj.dx = e.x - obj.ox, obj.dy = e.y - obj.oy;
        obj.ex = e.clientX - obj.startx, obj.ey = e.clientY - obj.starty;
        obj.target = e.target;
        if (sqmag(obj.dx, obj.dy) > thr)
            obj.excced = true;
        obj.pint = obj.excced ? 3 /* Pint.Drag */ : 1 /* Pint.PendDrag */;
    }
}
function reg_drag(el, threshold = 4, cb) {
    let obj = { pint: 0 /* Pint.Down */, x: 0, y: 0, dx: 0, dy: 0, ox: 0, oy: 0, ex: 0, ey: 0, startx: 0, starty: 0, excced: false, started: null, target: null };
    let pointerId = 0;
    let downed = false;
    let upped = false;
    const down = (e) => {
        pointerId = e.pointerId;
        recalc_drag(obj, el, e, false, threshold);
        downed = true;
        upped = false;
        drags.set(e.pointerId, obj);
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
        window.addEventListener('pointercancel', up);
        cb(obj);
    };
    const move = (e) => {
        if (!downed)
            return;
        recalc_drag(obj, el, e, true, threshold);
        if (obj.target != obj.started)
            obj.target.dispatchEvent(new CustomEvent('dragdrop', { detail: obj, bubbles: true }));
        cb(obj);
    };
    const up = (e) => {
        if (!downed)
            return;
        if (upped)
            return;
        recalc_drag(obj, el, e, true, threshold);
        downed = false;
        upped = true;
        obj.pint = 2 /* Pint.Up */;
        if (obj.target != obj.started)
            obj.target.dispatchEvent(new CustomEvent('dragdrop', { detail: obj, bubbles: true }));
        cb(obj);
        drags.delete(pointerId);
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);
    };
    el.addEventListener('pointerdown', down);
    return obj;
}
function reg_datadrag(el, cb) {
    let enter = false;
    const event = function (ev) {
        prevent(ev);
        let d = ev.dataTransfer;
        if (ev.type == 'dragend' && enter)
            cb(2 /* Pint.Up */, d, ev);
        // if (d == null || !(ev.target instanceof Node) || el != ev.target && !el.contains(ev.target)) return
        if (d == null)
            return;
        enter = true;
        if (ev.type == 'dragover')
            cb(3 /* Pint.Drag */, d, ev);
        else if (ev.type == 'drop')
            cb(4 /* Pint.Drop */, d, ev);
    };
    el.addEventListener('dragenter', event);
    el.addEventListener('dragleave', event);
    el.addEventListener('dragover', event);
    el.addEventListener('drop', event);
    el.addEventListener('dragend', event);
}
function reg_drop(el, cb) {
    el.addEventListener('dragdrop', e => {
        let d = e.detail;
        cb(d);
    });
}
function reg_pointer(el, cb) {
    let downed = false;
    el.addEventListener('pointerdown', () => {
        cb(true);
        downed = true;
    });
    el.addEventListener('pointerup', () => {
        if (downed)
            cb(false);
        downed = false;
    });
}
function reg_longtap(el, cb) {
    let longtap = null;
    el.addEventListener('pointerdown', e => { longtap && clearTimeout(longtap); longtap = setTimeout(() => cb(e), 500); });
    el.addEventListener('pointerup', () => { longtap && clearTimeout(longtap); longtap = null; });
    el.addEventListener('pointerleave', () => { longtap && clearTimeout(longtap); longtap = null; });
}
;
function reg_context(el, cb) {
    let longtap = null;
    el.addEventListener('pointerdown', e => {
        if (e.pointerType == 'mouse' && e.button == 2)
            cb(e);
        else {
            longtap && clearTimeout(longtap);
            longtap = setTimeout(() => cb(e), 500);
        }
    });
    el.addEventListener('pointerup', () => { longtap && clearTimeout(longtap); longtap = null; });
    el.addEventListener('pointerleave', () => { longtap && clearTimeout(longtap); longtap = null; });
}
function reg_doubletap(el, cb) {
    let lastTime = 0;
    let lastTarget = null;
    el.addEventListener('pointerdown', e => {
        const now = Date.now();
        if (e.target === lastTarget && now - lastTime < 500) {
            cb(e);
            lastTime = 0;
            lastTarget = null;
        }
        else {
            lastTime = now;
            lastTarget = e.target;
        }
    });
}
let reg_focusity = function (cb) {
    //dedup
    let focus = true;
    let set = (x) => { if (x != focus)
        cb(focus = x); };
    window.addEventListener("beforeunload", () => set(false));
    document.addEventListener("visibilitychange", () => set(document.visibilityState === 'visible'));
    window.onblur = window.onpagehide = () => set(false);
    window.onfocus = window.onpageshow = () => set(true);
};
let reg_wheel = function (el, cb) {
    el.addEventListener(window.PointerEvent ? 'pointerenter' : 'mouseenter', () => window.addEventListener('wheel', cb));
    el.addEventListener(window.PointerEvent ? 'pointerleave' : 'mouseleave', () => window.removeEventListener('wheel', cb));
};
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
async function mock_file_write(path, data) {
    const root = await navigator.storage.getDirectory();
    const handle = await root.getFileHandle(path, {
        create: true
    });
    const writable = await handle.createWritable();
    await writable.write(data);
    await writable.close();
}
async function mock_file_read(path) {
    const root = await navigator.storage.getDirectory();
    const handle = await root.getFileHandle(path);
    return await handle.getFile();
}
function VIDE_icon(c = canvas_create(64, 64)) {
    const w = c.canvas.width, h = c.canvas.height;
    c.clearRect(0, 0, w, h);
    c.font = `bold ${Math.min(w, h) * 1.5}px Consolas, monospace`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = '#fff';
    c.fillText('V', w / 2, h / 2);
    c.fillStyle = '#000';
    c.fillText('^', w / 2, h * 1.2);
    let a = document.createElement('a');
    a.download = 'vide.png';
    a.href = c.canvas.toDataURL('image/png');
    a.click();
    createImageBitmap(c.canvas).then(bitmap => {
        debug_bitmap(bitmap);
    });
}
function test_rw() {
    //AI vommit
    let w = new Writer();
    w.u8(255);
    w.i8(-5);
    w.u16(1234);
    w.i16(-1234);
    w.u32(123456);
    w.i32(-123456);
    w.f32(1.5);
    w.f64(3.14159);
    w.str("hello");
    w.rect([1, 2, 3, 4]);
    w.color([5, 6, 7, 8]);
    w.buffer(new ArrayBuffer(100));
    let r = new Reader(w.get());
    console.assert(r.u8() == 255);
    console.assert(r.i8() == -5);
    console.assert(r.u16() == 1234);
    console.assert(r.i16() == -1234);
    console.assert(r.u32() == 123456);
    console.assert(r.i32() == -123456);
    console.assert(Math.abs(r.f32() - 1.5) < 0.001);
    console.assert(Math.abs(r.f64() - 3.14159) < 0.000001);
    console.assert(r.str() == "hello");
    console.assert(JSON.stringify(r.rect()) == JSON.stringify([1, 2, 3, 4]));
    console.assert(JSON.stringify(r.color()) == JSON.stringify([5, 6, 7, 8]));
    console.assert(r.buffer().byteLength == 100);
    console.log('all ok');
}
async function test_saveproject() {
    let bufferA, bufferB;
    let w = new Writer();
    let res = editor.res, files = editor.files, json = editor.getjsondata();
    console.log('initial', res, files);
    let b = await project_bytes(res, files, w, json);
    console.log('serialized', w);
    bufferA = w.get();
    let reader = new Reader(bufferA);
    let result = await project_debytes(reader);
    console.log('parsed', result.res, result.files, result.json);
    w = new Writer();
    b = await project_bytes(result.res, result.files, w, result.json);
    console.log('serialized again', w);
    bufferB = w.get();
    console.assert(bufferA.byteLength == bufferB.byteLength);
    let i = 0;
    for (i = 0; i < bufferA.byteLength; i++) {
        if (bufferA[i] != bufferB[i]) {
            console.error('bytes differ at', i);
            return;
        }
    }
    console.log('all ok');
}
function editor_get_json() {
    return JSON.stringify({ assets: editor.assets.map(a => ({ name: a.path, res: editor.res.indexOf(a.res) })), scene: editor.res.indexOf(editor.scene) });
}
function editor_set_json(json) {
    let state = JSON.parse(json);
    editor.assets = state.assets.map(a => ({ path: a.name, res: editor.res[a.res] }));
    editor.scene = editor.res[state.scene];
}
async function test_export() {
    let res = res_create_test();
    let width = 1920, height = 1024, dur = 1;
    let ctx = canvas_create(width, height);
    let xideo = xideo_create(width, height, dur);
    let frames = res_vrames(res, ctx, 8, 0, dur);
    xideo_add(frames, xideo);
    let blob = await xideo_finish(xideo);
    console.log('all ok', blob);
    let video = await res_create(new File([blob], 'test.mp4', { type: 'video/mp4' }), ResType.Video);
    editor.new_asset(video, 'exported');
    // console.log(res_len(video), res_len(res))
    return video;
}
//# sourceMappingURL=vide.js.map