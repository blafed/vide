interface Item {
    res: Res
    layer: int
    from: float, to: float, //absolute
    sfrom: float, sto: float //normalized
    rect: Rect //absolute
    srect: Rect //normalized
    opacity: float
}

interface Res {
    draw(ctx: Canvas, t: float, dst: Rect, src?: Rect): boolean //t and src are normalized; dst is absolute
    tc?(ctx: Canvas): void //temp canvas
    load?(chunk: int): Promise<void>
    unload?(chunk: int): Promise<void>
    prop?(s: string, val: float): void;
}

class TestRes implements Res {
    draw(ctx: Canvas, t: float, dst: Rect): boolean {
        ctx.fillStyle = `hsl(${255 * t}, 100%, 50%)`
        ctx.fillRect(dst[0], dst[1], dst[2], dst[3])
        return true;
    }
}

class ImageRes implements Res {
    blob: Blob
    bitmap: ImageBitmap | null = null;
    constructor(blob: Blob) { this.blob = blob; }
    draw(ctx: Canvas, t: float, dst: Rect, src: Rect): boolean {
        if (!this.bitmap) return false;
        rect_scale(src, this.bitmap.width, this.bitmap.height)
        canvas_draw_img3(ctx, this.bitmap, dst, src)
        return true;
    }
    async load(chunk: int): Promise<void> { if (!this.bitmap) this.bitmap = await createImageBitmap(this.blob); }
    async unload(chunk: int): Promise<void> { if (this.bitmap) { this.bitmap.close(); this.bitmap = null; } }
}

class SquareRes implements Res {
    color = { r: 0, g: 0, b: 255, a: 1 }
    outline = { r: 0, g: 0, b: 0, a: 1, w: 0 }

    prop(s: string, val: float): void {
        switch (s) {
            case 'r': case 'g': case 'b': case 'a': this.color[s] = val; break;
            case 'ow': case 'or': case 'og': case 'ob': case 'oa': this.outline[s.substring(1) as keyof typeof this.outline] = val; break;
        }
    }

    draw(ctx: Canvas, t: float, dst: Rect): boolean {
        let outline = this.outline.w / 2
        if (this.outline.w > 0) {
            ctx.strokeStyle = colori(this.outline.r, this.outline.b, this.outline.g, this.outline.a)
            ctx.strokeRect(dst[0] + outline, dst[1] + outline, dst[2] - outline * 2, dst[3] - outline * 2)
        }

        ctx.fillStyle = colori(this.color.r, this.color.b, this.color.g, this.color.a)
        ctx.fillRect(dst[0], dst[1], dst[2], dst[3])
        return true
    }
}


function items_sort(items: Item[]) { items.sort((a, b) => a.layer == b.layer ? a.from - b.from : a.layer - b.layer) }
function item_clone(item: Item): Item {
    let clone = { ...item }
    clone.srect = rect_clone(item.srect)
    clone.rect = rect_clone(item.rect)
    return clone
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
