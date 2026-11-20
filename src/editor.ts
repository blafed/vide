//will contain: state + gui


class SpaceEditor {
    space: Rect = rect(0, 0, 200, 200)
    canvas: Canvas
    t: float = 0
    items: Item[] = []
    curves: ItemCurve[] = []

    itemsHitStart: Item[] = []
    selItems: Set<Item> = new Set()
    dragStarts: Map<Item, Point> = new Map()

    constructor(public el: HTMLElement) {
        this.canvas = canvas(el)!
        this.space = rect_from_canvas(this.canvas)

        reg_drag(this.el, 0, this.on_drag.bind(this))
    }

    s2g(x: float, y: float): Point {
        x = lerp(0, this.canvas.canvas.width, unlerp(this.space[0], this.space[0] + this.space[2], x));
        y = lerp(0, this.canvas.canvas.height, unlerp(this.space[1], this.space[1] + this.space[3], y));
        return [x, y];
    }

    g2s(x: float, y: float): Point {
        x = lerp(this.space[0], this.space[0] + this.space[2], unlerp(0, this.canvas.canvas.width, x));
        y = lerp(this.space[1], this.space[1] + this.space[3], unlerp(0, this.canvas.canvas.height, y));
        return [x, y];
    }

    on_drag(d: Drag) {
        let items = this.items_hit(d.ex, d.ey);

        if (d.pint == Pint.Down) {
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
            let o = this.dragStarts.get(it)!;
            let x = o[0] + cz[0], y = o[1] + cz[1];

            if (this.itemsHitStart.length == 0) {
                cz = this.g2s(d.ex, d.ey);
                x = cz[0]; y = cz[1];
            }

            curves_add(this.curves, it, Prop.DstX, this.t - it.from, x);
            curves_add(this.curves, it, Prop.DstY, this.t - it.from, y);
        }

        this.update();

    }

    items_hit(x: float, y: float) {
        let time = this.t;
        let hits = [];
        for (let it of this.items)
            if (time >= it.from && time <= it.to && rect_contains(it.rect, x, y))
                hits.push(it)
        return hits;
    }

    update() {
        canvas_clear_all(this.canvas);
        items_draw2(this.items, this.curves, this.canvas, this.t)

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

    play(t: float) { this.t = t; this.update(); }

    videoshot(dur: float) {
        console.log(this.canvas.canvas.width);
        return new VideoFrame(this.canvas.canvas, { timestamp: this.t * 1_000_000, duration: dur * 1_000_000 });
    }
}

class TimeEditor {
    items: Item[] = []

    constructor(public el: HTMLElement) {
    }

    update() {
        update_over(this.el, this.items, (item, el) => {

        })
    }
}