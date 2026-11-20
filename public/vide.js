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
function rect_from_canvas(c) { return [0, 0, c.canvas.width, c.canvas.height]; }
function rect_clone(r) { return [...r]; }
function rect_one() { return [0, 0, 1, 1]; }
function rect_zero() { return [0, 0, 0, 0]; }
function rect_canvas(c) { return rect(0, 0, c.canvas.width, c.canvas.height); }
function rect_img(c) { return rect(0, 0, c.width, c.height); }
function rect_scale(r, w, h) { return rect(r[0] * w, r[1] * h, r[2] * w, r[3] * h); }
function rect_contains(r, x, y) { return x >= r[0] && x <= r[0] + r[2] && y >= r[1] && y <= r[1] + r[3]; }
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
function tween01(t, type = 0) { return tween(0, 1, t, type); }
function tween(from, to, t, type = 0) {
    switch (type) {
        case 1:
            t = t * t;
            break;
        case 2:
            t = 1 - (1 - t) * (1 - t);
            break;
        case 3:
            t = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
            break;
        case 4:
            t = t * t * t;
            break;
        case 5:
            t = 1 - Math.pow(1 - t, 3);
            break;
        case 6:
            t = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
            break;
        case 7:
            t = t === 0 ? 0 : Math.pow(2, 10 * t - 10);
            break;
        case 8:
            t = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
            break;
        case 9:
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
function curve_eval(curve, x, fn) {
    if (!curve.length)
        return 0;
    if (curve.length % 2 != 0)
        throw 'odd curve: ' + curve.length;
    if (x < curve[0])
        return curve[1];
    for (let i = 2; i < curve.length; i += 2) {
        if (x <= curve[i]) {
            let a = curve[i - 2], b = curve[i];
            let va = curve[i - 1], vb = curve[i + 1];
            let t = unlerp(a, b, x);
            if (typeof fn == 'number')
                t = tween(0, 1, t, fn);
            let v = lerp(va, vb, t);
            return v;
        }
    }
    return curve[curve.length - 1];
}
function curve_add(curve, x, y) {
    for (let i = 0; i < curve.length; i += 2) {
        if (curve[i] >= x) {
            if (curve[i] == x)
                curve[i + 1] = y;
            else
                curve.splice(i, 0, x, y);
            return;
        }
    }
    curve.push(x, y);
}
function color(r, g, b, a = 1) {
    r = round(clamp(r, 0, 1) * 255), g = round(clamp(g, 0, 1) * 255), b = round(clamp(b, 0, 1) * 255), a = round(clamp(a, 0, 1) * 255);
    return "#" + r.toString(16).padStart(2, "0") + g.toString(16).padStart(2, "0") + b.toString(16).padStart(2, "0") + a.toString(16).padStart(2, "0");
}
function rgba(r, g, b, a = 1) {
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
function canvas_rect(ctx, dst) { ctx.beginPath(); ctx.rect(dst[0], dst[1], dst[2], dst[3]); }
function canvas_clear(ctx, dst) { ctx.clearRect(dst[0], dst[1], dst[2], dst[3]); }
function canvas_stroke(ctx, dst) { ctx.strokeRect(dst[0], dst[1], dst[2], dst[3]); }
function canvas_fill(ctx, dst) { ctx.fillRect(dst[0], dst[1], dst[2], dst[3]); }
function canvas_clip(ctx, rect) { ctx.beginPath(); ctx.rect(rect[0], rect[1], rect[2], rect[3]); ctx.clip(); }
function canvas_rect_in(ctx, dst, lw) { ctx.beginPath(); ctx.rect(dst[0] + lw / 2, dst[1] + lw / 2, dst[2] - lw, dst[3] - lw); }
function canvas_rectz(ctx, dst) { ctx.beginPath(); ctx.rect(dst[0] * ctx.canvas.width, dst[1] * ctx.canvas.height, dst[2] * ctx.canvas.width, dst[3] * ctx.canvas.height); }
function canvas_rectz_in(ctx, dst, lw) { ctx.beginPath(); ctx.rect(dst[0] * ctx.canvas.width + lw / 2, dst[1] * ctx.canvas.height + lw / 2, dst[2] * ctx.canvas.width - lw, dst[3] * ctx.canvas.height - lw); }
function canvas_clearz(ctx, dst) { ctx.clearRect(dst[0] * ctx.canvas.width, dst[1] * ctx.canvas.height, dst[2] * ctx.canvas.width, dst[3] * ctx.canvas.height); }
function canvas_fillz(ctx, dst) { ctx.fillRect(dst[0] * ctx.canvas.width, dst[1] * ctx.canvas.height, dst[2] * ctx.canvas.width, dst[3] * ctx.canvas.height); }
function canvas_clipz(ctx, rect) { ctx.beginPath(); ctx.rect(rect[0] * ctx.canvas.width, rect[1] * ctx.canvas.height, rect[2] * ctx.canvas.width, rect[3] * ctx.canvas.height); ctx.clip(); }
function canvas_strokez(ctx, dst) { ctx.strokeRect(dst[0] * ctx.canvas.width, dst[1] * ctx.canvas.height, dst[2] * ctx.canvas.width, dst[3] * ctx.canvas.height); }
function canvas_strokez_in(ctx, dst, lw) { ctx.strokeRect(dst[0] * ctx.canvas.width + lw / 2, dst[1] * ctx.canvas.height + lw / 2, dst[2] * ctx.canvas.width - lw, dst[3] * ctx.canvas.height - lw); }
function canvas_textz(ctx, text, dst) { ctx.fillText(text, dst[0] * ctx.canvas.width, dst[1] * ctx.canvas.height); }
function canvas_text(ctx, text, dst) { ctx.fillText(text, dst[0], dst[1]); }
function canvas_draw(ctx, b, dst, src, sw = 1, sh = 1) {
    if (src)
        ctx.drawImage(b, src[0] * sw, src[1] * sh, src[2] * sw, src[3] * sh, dst[0], dst[1], dst[2], dst[3]);
    else
        ctx.drawImage(b, dst[0], dst[1], dst[2], dst[3]);
}
function canvas_drawz(ctx, b, dst, src) {
    let w = ctx.canvas.width, h = ctx.canvas.height;
    if (src)
        ctx.drawImage(b, src[0], src[1], src[2], src[3], dst[0] * w, dst[1] * h, dst[2] * w, dst[3] * h);
    else
        ctx.drawImage(b, dst[0] * w, dst[1] * h, dst[2] * w, dst[3] * h);
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
function canvas_set_size(ctx, width, height) {
    if (ctx.canvas.width != width)
        ctx.canvas.width = width;
    if (ctx.canvas.height != height)
        ctx.canvas.height = height;
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
class SpaceEditor {
    constructor(el) {
        this.el = el;
        this.space = rect(0, 0, 200, 200);
        this.t = 0;
        this.items = [];
        this.curves = [];
        this.itemsHitStart = [];
        this.selItems = new Set();
        this.dragStarts = new Map();
        this.canvas = canvas(el);
        this.space = rect_from_canvas(this.canvas);
        reg_drag(this.el, 0, this.on_drag.bind(this));
    }
    s2g(x, y) {
        x = lerp(0, this.canvas.canvas.width, unlerp(this.space[0], this.space[0] + this.space[2], x));
        y = lerp(0, this.canvas.canvas.height, unlerp(this.space[1], this.space[1] + this.space[3], y));
        return [x, y];
    }
    g2s(x, y) {
        x = lerp(this.space[0], this.space[0] + this.space[2], unlerp(0, this.canvas.canvas.width, x));
        y = lerp(this.space[1], this.space[1] + this.space[3], unlerp(0, this.canvas.canvas.height, y));
        return [x, y];
    }
    on_drag(d) {
        let items = this.items_hit(d.ex, d.ey);
        if (d.pint == 0) {
            this.itemsHitStart = items;
            if (!d.ev.shiftKey) {
                this.selItems.clear();
                this.dragStarts.clear();
            }
            if (items.length) {
                let it = items[items.length - 1];
                this.selItems.add(it);
                for (let it of this.selItems)
                    this.dragStarts.set(it, point(it.rect[0], it.rect[1]));
            }
        }
        let cz = this.g2s(d.dx, d.dy);
        for (let it of this.selItems) {
            let o = this.dragStarts.get(it);
            let x = o[0] + cz[0], y = o[1] + cz[1];
            if (this.itemsHitStart.length == 0) {
                cz = this.g2s(d.ex, d.ey);
                x = cz[0];
                y = cz[1];
            }
            curves_add(this.curves, it, 0, this.t - it.from, x);
            curves_add(this.curves, it, 1, this.t - it.from, y);
        }
        this.update();
    }
    items_hit(x, y) {
        let time = this.t;
        let hits = [];
        for (let it of this.items)
            if (time >= it.from && time <= it.to && rect_contains(it.rect, x, y))
                hits.push(it);
        return hits;
    }
    update() {
        canvas_clear_all(this.canvas);
        items_draw2(this.items, this.curves, this.canvas, this.t);
        this.canvas.strokeStyle = '#000';
        this.canvas.lineWidth = 2;
        for (let x of this.selItems) {
            canvas_rect(this.canvas, x.rect);
            this.canvas.stroke();
            this.canvas.lineWidth = 1;
            this.canvas.strokeStyle = '#fff';
            this.canvas.stroke();
        }
    }
    play(t) { this.t = t; this.update(); }
    videoshot(dur) {
        console.log(this.canvas.canvas.width);
        return new VideoFrame(this.canvas.canvas, { timestamp: this.t * 1000000, duration: dur * 1000000 });
    }
}
class TimeEditor {
    constructor(el) {
        this.el = el;
        this.items = [];
    }
    update() {
        update_over(this.el, this.items, (item, el) => {
        });
    }
}
function item_create(res = null, from = 0, to = 1, rect = [0, 0, 100, 100]) {
    return {
        res: res, layer: 0, from, to, sfrom: 0, sto: 1, rect, srect: [0, 0, 1, 1], opacity: 1, rotation: 0,
        props: { ...((res?.constructor).PROPS ?? {}) }
    };
}
function items_sort(items) { items.sort((a, b) => a.layer == b.layer ? a.from - b.from : a.layer - b.layer); }
function item_clone(item) {
    let clone = { ...item };
    clone.srect = rect_clone(item.srect);
    clone.rect = rect_clone(item.rect);
    clone.props = { ...item.props };
    if (item.clip)
        clone.clip = { ...item.clip };
    return clone;
}
function item_prop(it, prop) {
    if (typeof prop == 'string') {
        if (!it.props)
            return 0;
        return it.props[prop];
    }
    switch (prop) {
        case 13: return it.rotation;
        case 0: return it.rect[0];
        case 1: return it.rect[1];
        case 2: return it.rect[2];
        case 3: return it.rect[3];
        case 4: return it.srect[0];
        case 5: return it.srect[1];
        case 6: return it.srect[2];
        case 7: return it.srect[3];
        case 9: return it.clip?.[0] ?? 0;
        case 10: return it.clip?.[1] ?? 0;
        case 11: return it.clip?.[2] ?? 1;
        case 12: return it.clip?.[3] ?? 1;
        case 8: return it.opacity;
    }
}
function item_propx(it, prop, value) {
    if (typeof prop == 'string') {
        if (!it.props)
            it.props = {};
        it.props[prop] = value;
        return;
    }
    switch (prop) {
        case 13:
            it.rotation = value;
            break;
        case 8:
            it.opacity = value;
            break;
        case 0:
            it.rect[0] = value;
            break;
        case 1:
            it.rect[1] = value;
            break;
        case 2:
            it.rect[2] = value;
            break;
        case 3:
            it.rect[3] = value;
            break;
        case 4:
            it.srect[0] = value;
            break;
        case 5:
            it.srect[1] = value;
            break;
        case 6:
            it.srect[2] = value;
            break;
        case 7:
            it.srect[3] = value;
            break;
        case 9:
        case 10:
        case 11:
        case 12:
            if (!it.clip)
                it.clip = [0, 0, 1, 1];
            it.clip[prop - 9] = value;
            break;
    }
}
function item_curvify(it, prop, curve, t) { let v = curve_eval(curve, t); item_propx(it, prop, v); }
function item_curvify2(curve, t) { item_curvify(curve.item, curve.prop, curve, t - curve.item.from); }
function item_uncurvify(curve) { item_propx(curve.item, curve.prop, curve[1]); }
function item_curve(it, prop) {
    let c = [0, item_prop(it, prop)];
    c.item = it;
    c.prop = prop;
    return c;
}
function curves_add(curves, it, prop, t, val) {
    let c = curves.find(x => x.item == it && x.prop == prop);
    if (c == null)
        curves.push(c = item_curve(it, prop));
    curve_add(c, t, val);
}
function items_draw(items, ctx, t) {
    for (let it of items) {
        if (t < it.from || t > it.to)
            continue;
        let tr = lerp(it.sfrom, it.sto, unlerp(it.from, it.to, t));
        ctx.globalAlpha = it.opacity;
        ctx.save();
        if (it.clip)
            canvas_clipz(ctx, it.clip);
        if (it.rotation) {
            const cx = it.rect[0] + it.rect[2] / 2;
            const cy = it.rect[1] + it.rect[3] / 2;
            ctx.translate(cx, cy);
            ctx.rotate(it.rotation);
            ctx.translate(-cx, -cy);
        }
        it.res.draw(ctx, it.rect, tr, it.srect, it.props);
        ctx.restore();
    }
}
function items_draw2(items, curves, ctx, t) {
    for (let x of curves)
        item_curvify2(x, t);
    items_draw(items, ctx, t);
}
function scene_draw(scene, ctx, t) {
    items_draw2(scene.items, scene.curves, ctx, t);
}
async function items_render2(items, curves, ctx, from, to, dt = 1 / 30, waiter = (t) => frame()) {
    if (to < from || dt <= 0)
        throw new Error(`wtf (${from},${to}, @${30 / dt})`);
    for (let t = from; t < to; t += dt) {
        canvas_clear_all(ctx);
        items_draw2(items, curves, ctx, t);
        if (waiter)
            await waiter(t);
    }
    canvas_clear_all(ctx);
    items_draw2(items, curves, ctx, to);
    if (waiter)
        await waiter(to);
    canvas_clear_all(ctx);
    items_draw2(items, curves, ctx, to);
}
async function items_render(items, ctx, from, to, dt = 1 / 30, waiter = (t) => frame()) {
    if (to < from || dt <= 0)
        throw new Error(`wtf (${from},${to}, @${30 / dt})`);
    for (let t = from; t < to; t += dt) {
        canvas_clear_all(ctx);
        items_draw(items, ctx, t);
        if (waiter)
            await waiter(t);
    }
    canvas_clear_all(ctx);
    items_draw(items, ctx, to);
    if (waiter)
        await waiter(to);
    canvas_clear_all(ctx);
    items_draw(items, ctx, to);
}
class TestRes {
    draw(ctx, dst, t) {
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
class ImageRes {
    constructor(blob, image) {
        this.blob = blob;
        this.image = image;
    }
    draw(ctx, dst, t, src, props) {
        if (!this.image)
            return false;
        canvas_draw(ctx, this.image, dst, src, this.image.width, this.image.height);
        return true;
    }
    async load(chunk) { if (!this.image)
        this.image = await createImageBitmap(this.blob); }
    unload(chunk) { if (this.image) {
        this.image.close();
        this.image = undefined;
    } }
}
function xideo_create(width, height, duration) {
    const codec = 'avc1.420028';
    let ex = { track: -1, mp4: mp4_create_file(), width, height, duration, encoder: null };
    ex.encoder = new VideoEncoder({
        output: (chunk, meta) => {
            if (ex.track < 0) {
                if (!meta || !meta.decoderConfig) {
                    console.error('missing meta or meta.decoderConfig', meta);
                    return;
                }
                ex.track = mp4_add_track(ex.mp4, codec, meta.decoderConfig.description, duration, width, height);
            }
            let data = new Uint8Array(new ArrayBuffer(chunk.byteLength));
            chunk.copyTo(data);
            mp4_add_video_chunk(ex.mp4, ex.track, data, chunk);
        },
        error: (e) => { console.error('encoding error: ', e); }
    });
    ex.encoder.configure({ codec, width, height });
    return ex;
}
function xideo_add(frames, exi) {
    for (let frame of frames)
        exi.encoder.encode(frame);
}
async function xideo_finish(ex) {
    await ex.encoder.flush();
    ex.encoder.close();
    let stream = ex.mp4.getBuffer();
    let blob = new Blob([stream.buffer], { type: 'video/mp4' });
    return blob;
}
function framegive(cb) {
    let last = null;
    const loop = (now) => {
        if (last !== null && !cb((now - last) / 1000))
            return;
        last = now;
        requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    return id;
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
        for (let i = 0; i < 200; i++) {
            let px = x + ((i * 137.5) % w);
            let py = y + ((i * 91.7) % h);
            let s = 1 + (i % 3);
            c.fillStyle = color(1, 1, 1, 0.2 + 0.8 * Math.abs(Math.sin(t * 30 + i)));
            c.fillRect(px, py, s, s);
        }
        let pulse = 0.5 + 0.5 * Math.sin(t * Math.PI * 2);
        let grad = c.createRadialGradient(cx, cy, 0, cx, cy, w * 0.3 + pulse * w * 0.1);
        grad.addColorStop(0, "#ffffffff");
        grad.addColorStop(0.1, "#80c0ffff");
        grad.addColorStop(0.5, "#2060ffff");
        grad.addColorStop(1, "#00000000");
        c.fillStyle = grad;
        c.fillRect(x, y, w, h);
        c.strokeStyle = "#40ffffff";
        for (let i = 0; i < 8; i++) {
            let rr = w * (0.1 + i * 0.05);
            c.lineWidth = 1 + i * 0.5;
            c.beginPath();
            c.arc(cx, cy, rr, 0, Math.PI * 2);
            c.stroke();
        }
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
        c.lineWidth = 3;
        for (let i = 0; i < 24; i++) {
            let a = t * 2 + i * Math.PI / 12;
            c.strokeStyle = color(0.2, 0.8, 1, 0.15);
            c.beginPath();
            c.moveTo(cx, cy);
            c.lineTo(cx + Math.cos(a) * w, cy + Math.sin(a) * h);
            c.stroke();
        }
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
async function mp4_info(f) {
    return new Promise(async (resolve, reject) => {
        const mp4box = MP4Box.createFile();
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
        const buffer = MP4Box.MP4BoxBuffer.fromArrayBuffer(await f.arrayBuffer(), 0);
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
        if (!sample.data) {
            console.error('error encoding a mp4 sample', sample);
            continue;
        }
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
    if (chunk.duration == undefined)
        throw new Error('chunk invalid duration ' + chunk);
    let sample = { dts: chunk.timestamp, cts: chunk.timestamp, duration: chunk.duration, is_sync: chunk.type == 'key' };
    f.addSample(track, data, sample);
    return sample;
}
function debug_bitmap(b) {
    if (b instanceof CanvasRenderingContext2D)
        b = b.canvas;
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
let entitys = new Map();
let ghosts = new Map();
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
        el._ent = set;
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
    if (d.pint == 2) {
        el.style.pointerEvents = '';
        remove_ghost(el);
        return;
    }
    if (d.pint != 3)
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
function recalc_drag(obj, el, e, move, thr) {
    if (!move) {
        obj.started = e.target;
        let bounding = obj.started.getBoundingClientRect();
        obj.startx = bounding.left, obj.starty = bounding.top;
        obj.target = obj.started;
        obj.pint = 0;
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
        obj.pint = obj.excced ? 3 : 1;
    }
    obj.ev = e;
}
function reg_drag(el, threshold = 4, cb) {
    let obj = { pint: 0, x: 0, y: 0, dx: 0, dy: 0, ox: 0, oy: 0, ex: 0, ey: 0, startx: 0, starty: 0, excced: false, started: null, target: null };
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
        obj.pint = 2;
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
            cb(2, d, ev);
        if (d == null)
            return;
        enter = true;
        if (ev.type == 'dragover')
            cb(3, d, ev);
        else if (ev.type == 'drop')
            cb(4, d, ev);
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
let spaceEditor;
async function demo_simple(ctx) {
    let items = [item_create(new TestRes())];
    items[0].from = 0.3;
    items[0].to = 1.3;
    let curves = [item_curve(items[0], 0), item_curve(items[0], 1), item_curve(items[0], 8)];
    curves[0].push(0.4, 100);
    curves[1].push(0.4, 0);
    curves[1].push(1, 100);
    curves[2].push(1, 0.2);
    await items_render2(items, curves, ctx, 0, 1.3, 1 / 100);
    for (let x of curves)
        item_uncurvify(x);
    canvas_clear_all(ctx);
    items_draw(items, ctx, 1.3);
}
async function demo_image(ctx) {
    let blob = await (await fetch('public/favicon.png')).blob();
    let res = new ImageRes(blob);
    await res.load(0);
    let items = [item_create(res, 0, 0.5, [100, 100, 200, 200])];
    items[0].rotation = 45;
    items_draw(items, ctx, 0);
}
function demo_play_export() {
    let items = [item_create(new TestRes()), item_create(new TestRes(), 0, 1.3, [300, 200, 200, 200])];
    items[0].from = 0.3;
    items[0].to = 1.3;
    let curves = [item_curve(items[0], 0), item_curve(items[0], 1), item_curve(items[0], 8)];
    curves[0].push(0.4, 100);
    curves[1].push(0.4, 0);
    curves[1].push(1, 100);
    curves[2].push(1, 0.2);
    spaceEditor.items = items;
    spaceEditor.curves = curves;
    id('play').onclick = () => playing = !playing;
    id('export').onclick = () => { t = 0; exporting = true; };
    let t = 0;
    let playing = true;
    let exporting = false;
    let exportFrames = [];
    const export_video = async function () {
        exporting = false;
        let xideo = xideo_create(exportFrames[0].displayWidth, exportFrames[1].displayHeight, 1.3);
        xideo_add(exportFrames, xideo);
        let blob = await xideo_finish(xideo);
        exportFrames = [];
        let url = URL.createObjectURL(blob);
        let a = document.createElement('a');
        a.href = url;
        a.download = 'video.mp4';
        a.click();
        URL.revokeObjectURL(url);
    };
    framegive((dt) => {
        if (playing) {
            spaceEditor.play(t);
            t += dt;
            if (exporting)
                exportFrames.push(spaceEditor.videoshot(dt));
            if (t > 1.3) {
                t = 0;
                if (exporting)
                    export_video();
            }
        }
        return true;
    });
}
async function main() {
    spaceEditor = new SpaceEditor(id('spacepan'));
    let ctx = spaceEditor.canvas;
    ctx.imageSmoothingEnabled = false;
    demo_play_export();
}
//# sourceMappingURL=vide.js.map