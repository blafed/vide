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

function main() {
    spaceEditor = new SpaceEditor(id('spacepan'))
    demo_simple(spaceEditor.space)
}