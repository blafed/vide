let timeEditor: TimeEditor
let proc = new Proc()

function main() {
    proc.add_square(200, 200)
    proc.anim_color(1, 1)
    proc.walk(0, 200)
    proc.add_text('hi there')
    proc.anim_walk(100, 100, 0.5)
    proc.anim_walk(50, 0, 0.5)
    console.log(proc.items)

    let spaceEditor = new SpaceEditor(id('spacepan'))
    items_render(proc.items, spaceEditor.space, 0, 1, undefined, async (t: float) => {
        console.log(t)
        for (let x of proc.curves)
            item_curvify2(x, t)
        return sleep(t)
    })


    // proc.add_square({ width = 200, height = 200 })
    // timeEditor = new TimeEditor(id('timepan'))
    // let spcaeEditor = new SpaceEditor(id('spacepan'))
    // let canvas = document.getElementsByTagName('canvas')[0];
    // let ctx = canvas.getContext('2d')!
    // let square = new SquareRes()

    // square.draw(ctx, 0, rect_canvas(ctx))
}