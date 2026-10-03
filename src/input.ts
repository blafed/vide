
//======================
//#region INPUT
//======================
let pointers = <Pointer[]>[]
let hovers = <Pointer[]>[]

const enum Pint { None, Hover, Down, PendDrag, Up, Drag, DragStart, DragEnd, Drop, }



interface Pointer {
    id: int,
    ox: float, oy: float, //start
    dx: float, dy: float, //displacement
    x: float, y: float, //current
    ex: float, ey: float, //down starting position, relative
    cx: float, cy: float, //current starting position, relative
    down: HTMLElement | null, cur: HTMLElement | null
    datatransfer: DataTransfer | null
    isDrag: boolean
}


function event_pointer_drag(ev: DragEvent) {
    let p = pointers.find(x => x.datatransfer)
    if (!p) {
        p = { isDrag: false, datatransfer: ev.dataTransfer, x: ev.clientX, y: ev.clientY, ox: ev.clientX, oy: ev.clientY, dx: 0, dy: 0, ex: 0, ey: 0, cx: 0, cy: 0, cur: null, down: ev.target as HTMLElement, id: -1, }
        pointers.push(p)
    } else {
        p.x = ev.clientX, p.y = ev.clientY
        p.dx = p.x - p.ox, p.dy = p.y - p.oy
        p.datatransfer = ev.dataTransfer
    }
    return p
}


function pointer_hit(ev: Event): HTMLElement | null {
    let el = event_closest(ev, '.comp')
    while (el) {
        if (el.style.pointerEvents != 'none') break
        el = el.parentElement?.closest('.comp') as HTMLElement | null
    }
    return el
}


function on_dragenter(ev: DragEvent) { prevent(ev) }
function on_dragleave(ev: DragEvent) {
    prevent(ev)
    let p = event_pointer_drag(ev)
    if (p.cur) datadrop(p, p.cur, Pint.DragEnd)
}
function on_dragover(ev: DragEvent) {
    prevent(ev)
    let p = event_pointer_drag(ev)
    let hit = pointer_hit(ev)

    if (hit != p.cur) {
        if (p.cur) datadrop(p, p.cur, Pint.DragEnd)
        p.cur = hit
        if (p.cur) datadrop(p, p.cur, Pint.DragStart)
    }
}
function on_dragend(ev: DragEvent) {
    prevent(ev)
    let p = event_pointer_drag(ev)
    if (p.cur) datadrop(p, p.cur, Pint.DragEnd)
    let index = pointers.indexOf(p)
    pointers.splice(index, 1)
}
function on_dragdrop(ev: DragEvent) {
    prevent(ev)
    let p = event_pointer_drag(ev)
    let hit = pointer_hit(ev)
    if (hit) {
        datadrop(p, hit, Pint.Drop)
        datadrop(p, hit, Pint.DragEnd)
        on_dragend(ev)
    }
}

function on_down(e: PointerEvent) {
    if (event_native(e))
        return
    let p = event_pointer(e)
    p.down = pointer_hit(e)
    pointer_set_xy(p, e)
    p.ox = p.x
    p.oy = p.y
    if (p.down) {
        pointer_set_exy(p, p.down)
        pointer(p, p.down, Pint.Down)
    }
}
function on_move(e: PointerEvent) {
    if (event_native(e))
        return

    let p = pointer_find(e)
    if (!p) {
        p = hovers.find(x => x.id == e.pointerId)
        if (!p) {
            p = event_pointer(e)
            pointers.pop()
            hovers.push(p)
        }
        p.cur = pointer_hit(e)
        pointer_set_xy(p, e)
        if (p.cur) {
            pointer_set_exy(p, p.cur)
            pointer(p, p.cur, Pint.Hover)
        }
        return
    }

    if (e.buttons == 0 && p.isDrag) {
        on_up(e)
        return
    }

    p.cur = pointer_hit(e)
    pointer_set_xy(p, e)

    if (p.cur) pointer(p, p.cur, Pint.Hover)

    if (!p.isDrag) {
        if (hypot(p.dx, p.dy) < 4) {
            if (p.down) pointer(p, p.down, Pint.PendDrag)
        }
        else {
            p.isDrag = true
            if (p.down) pointer(p, p.down, Pint.DragStart)
        }
    }
    else if (p.isDrag) {
        if (p.down) pointer(p, p.down, Pint.Drag)
    }
}

function on_up(e: PointerEvent) {
    if (event_native(e)) {
        on_cancel(e)
        return
    }

    let p = event_pointer(e)
    p.cur = pointer_hit(e)
    pointer_set_xy(p, e)

    if (p.isDrag) {
        if (p.cur) {
            pointer(p, p.cur, Pint.Drop)
        }
        if (p.down) pointer(p, p.down, Pint.DragEnd)
    }
    if (p.down) pointer(p, p.down, Pint.Up)
    on_cancel(e)
}
function on_cancel(e: PointerEvent) {
    if (event_native(e))
        return
    let p = pointer_find(e)
    if (!p)
        return
    let index = pointers.indexOf(p)
    pointers.splice(index, 1)
}



function pointer_find(ev: PointerEvent) {
    return pointers.find(p => p.id == ev.pointerId)
}


function event_native(ev: PointerEvent): boolean {
    const target = ev.target as Element | null
    if (!target)
        return false

    if (target.closest("input, textarea, select, button, option, label, details, summary"))
        return true

    for (let el: Element | null = target; el; el = el.parentElement) {
        if (!(el instanceof HTMLElement))
            continue
        //scrollbar check
        if (ev.target === el && (ev.offsetX >= el.clientWidth || ev.offsetY >= el.clientHeight))
            return true
    }

    return false
}

function event_pointer(ev: PointerEvent): Pointer {
    let p = pointer_find(ev)
    if (!p) {
        p = { isDrag: false, id: ev.pointerId, ox: ev.clientX, oy: ev.clientY, x: ev.clientX, y: ev.clientY, ex: 0, ey: 0, dx: 0, dy: 0, cx: 0, cy: 0, down: null, cur: null, datatransfer: null, }
        pointers.push(p)
    }
    return p
}

function pointer_set_xy(p: Pointer, ev: PointerEvent) {
    p.x = ev.clientX
    p.y = ev.clientY
    p.dx = p.x - p.ox
    p.dy = p.y - p.oy
    if (p.down) {
        let bound = p.down.getBoundingClientRect()
        p.cx = p.x - bound.left
        p.cy = p.y - bound.top
    }
}

function pointer_set_exy(p: Pointer, el: HTMLElement) {
    let bound = el.getBoundingClientRect()
    p.ex = p.x - bound.left
    p.ey = p.y - bound.top
}

function init_input() {
    document.body.onkeydown = keydown
    document.body.onkeyup = keyup

    document.body.ondrop = on_dragdrop
    document.body.ondragover = on_dragover
    document.body.ondragenter = on_dragenter
    document.body.ondragleave = on_dragleave
    document.body.ondragend = on_dragend
    window.onpointerdown = on_down
    window.onpointermove = on_move
    window.onpointerup = on_up
    window.onpointercancel = on_cancel
    document.body.onselect = e => prevent(e)
}

declare function pointer(p: Pointer, el: HTMLElement, pint: Pint): void
declare function keydown(e: KeyboardEvent): void
declare function keyup(e: KeyboardEvent): void