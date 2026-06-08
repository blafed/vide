const pointers = <Pointer[]>[]

const enum PointerMode {
    None, Down, Up, Move
}

interface Pointer {
    mode: PointerMode
    pointerId: int,
    ox: float, oy: float, //start
    dx: float, dy: float, //displacement
    x: float, y: float, //current
    downTarget: HTMLElement, //start
    target: HTMLElement, //current
    drag: boolean, //did displacement > drag threshold
    dragTargets: HTMLElement[]
}


function mapkey(ev: KeyboardEvent): Action {
    switch (ev.code) {
        case 'KeyI': return Action.import
        default:
            switch (ev.key) {
                case 'Shift': return Action.sel_append
            }
            break
    }
    return Action.none
}

function mapkey_up(ev: KeyboardEvent): Action {
    switch (ev.key) {
        case 'Shift': return Action.sel_replace
    }
    return Action.none
}

function input_init() {
    document.body.onkeydown = on_keydown
    document.body.onkeyup = on_keyup
    document.body.ondrop = on_drop
    document.body.ondragover = on_dragover
    document.body.onpointerdown = on_down
    document.body.onpointermove = on_move
    document.body.onpointerup = on_up
    document.body.onpointercancel = on_cancel
    prevent_select(document.body)
}

function btn(s: string) {
    editor_action(Action[s as keyof typeof Action]);
}


function on_keydown(ev: KeyboardEvent) {
    let a = mapkey(ev)
    console.log(ev.code)
    if (a) {
        editor_action(a)
        prevent_default(ev)
    }
}

function on_keyup(ev: KeyboardEvent) {
    let a = mapkey_up(ev)
    if (a) {
        editor_action(a)
        prevent_bubble(ev)
    }
}

function on_dragover(ev: DragEvent) {
    prevent_default(ev)
}
function on_drop(ev: DragEvent) {
    if (ev.dataTransfer)
        for (let f of ev.dataTransfer.files)
            editor_import(f)
    prevent_default(ev)
}

function on_file(el: HTMLInputElement) {
    if (el.files)
        for (let f of el.files)
            editor_import(f)
    el.value = ''
}


function on_down(ev: PointerEvent) {
    let p = {
        mode: PointerMode.Down,
        pointerId: ev.pointerId,
        ox: ev.pageX, oy: ev.pageY,
        x: ev.pageX, y: ev.pageY,
        dx: 0, dy: 0,
        downTarget: <HTMLElement>ev.target,
        target: <HTMLElement>ev.target,
        drag: false,
        dragTargets: [],
    }
    let ass = ui_ev_asset(ev)
    if (ass && !editor_is_sel_asset(ass))
        ui_asset_down(ass)

    if (ass)
        p.target = p.downTarget = ui_asset(ass)!

    pointers.push(p)
}
function on_up(ev: PointerEvent) {
    let p = pointers.find(p => p.pointerId == ev.pointerId)
    if (!p)
        return

    let ass = ui_ev_asset(ev)
    if (ass && editor_is_sel_asset(ass) && !p.drag)
        ui_asset_down(ass)

    p.mode = PointerMode.Up

    on_cancel(ev)
}

function on_cancel(ev: PointerEvent) {
    let p = pointers.find(p => p.pointerId == ev.pointerId)
    if (!p)
        return
    for (let x of p.dragTargets)
        ui_drag_end(x)
    p.dragTargets.length = 0
    let i = pointers.indexOf(p)
    if (i != -1)
        pointers.splice(i, 1)

}
function on_move(ev: PointerEvent) {
    let p = pointers.find(p => p.pointerId == ev.pointerId)
    if (!p)
        return
    p.mode = PointerMode.Move
    p.x = ev.pageX
    p.y = ev.pageY
    p.dx = p.x - p.ox
    p.dy = p.y - p.oy

    if (!p.drag) {
        const dst = 4
        if (sqmag(p.dx, p.dy) > dst * dst) {
            p.drag = true
            p.dragTargets = sel.assets.map(x => ui_asset(x)).filter(x => x != null)

            if (!p.dragTargets.find(x => p.downTarget == x))
                p.dragTargets.length = 0

            for (let x of p.dragTargets)
                ui_drag_start(x)
        }
    } else {
        for (let x of p.dragTargets)
            ui_drag_move(x, p.dx, p.dy)
    }
}

function on_assets_order_by(el: HTMLSelectElement) {
    let i = +el.value
    editor_assets_order_by(i)
}

function on_assets_order_desc(el: HTMLInputElement) {
    editor_assets_order_desc(el.checked)
}