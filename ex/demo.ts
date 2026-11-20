let spaceEditor: SpaceEditor

async function demo_simple(ctx: Canvas) {
    let items = [item_create(new TestRes())]
    items[0].from = 0.3
    items[0].to = 1.3
    let curves: ItemCurve[] = [item_curve(items[0], Prop.DstX), item_curve(items[0], Prop.DstY), item_curve(items[0], Prop.Opacity)]

    curves[0].push(0.4, 100)
    curves[1].push(0.4, 0)
    curves[1].push(1, 100)
    curves[2].push(1, 0.2)

    await items_render2(items, curves, ctx, 0, 1.3, 1 / 100)

    for (let x of curves) item_uncurvify(x)
    canvas_clear_all(ctx);
    items_draw(items, ctx, 1.3)
}

async function demo_image(ctx: Canvas) {
    let blob = await (await fetch('public/favicon.png')).blob()
    let res = new ImageRes(blob)
    await res.load(0)

    let items = [item_create(res, 0, 0.5, [100, 100, 200, 200])]
    items[0].rotation = 45;
    items_draw(items, ctx, 0)
}

function demo_play_export() {
    let items = [item_create(new TestRes()), item_create(new TestRes(), 0, 1.3, [300, 200, 200, 200])]
    items[0].from = 0.3
    items[0].to = 1.3
    let curves: ItemCurve[] = [item_curve(items[0], Prop.DstX), item_curve(items[0], Prop.DstY), item_curve(items[0], Prop.Opacity)]

    curves[0].push(0.4, 100)
    curves[1].push(0.4, 0)
    curves[1].push(1, 100)
    curves[2].push(1, 0.2)

    spaceEditor.items = items;
    spaceEditor.curves = curves;

    id('play').onclick = () => playing = !playing;
    id('export').onclick = () => { t = 0; exporting = true; };

    let t = 0;
    let playing = true;
    let exporting = false;
    let exportFrames: VideoFrame[] = [];

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
    }

    framegive((dt) => {
        if (playing) {
            spaceEditor.play(t)
            t += dt;
            if (exporting) exportFrames.push(spaceEditor.videoshot(dt));
            if (t > 1.3) {
                t = 0;
                if (exporting) export_video();
            }
        }
        return true;
    });
}

async function main() {
    spaceEditor = new SpaceEditor(id('spacepan'))
    let ctx = spaceEditor.canvas;
    ctx.imageSmoothingEnabled = false
    demo_play_export();

    // await demo_simple(ctx)
    // await demo_image(ctx);
}