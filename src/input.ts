
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


interface Drag {
    pint: Pint,
    x: float, y: float,
    dx: float, dy: float
    ox: float, oy: float,
    ex: float, ey: float, //delta relative to the element
    startx: float, starty: float //starting element position
    excced: boolean,
    target: HTMLElement
    current: HTMLElement
}


const drags = new Map<int, Drag>()

function recalc_drag(obj: Drag, el: HTMLElement, e: PointerEvent, move: boolean, thr: float) {
    if (!move) {
        let bounding = el.getBoundingClientRect()
        obj.startx = bounding.left, obj.starty = bounding.top

        obj.target = e.target as HTMLElement
        obj.current = obj.target
        obj.pint = Pint.Down
        obj.ox = obj.x = e.clientX
        obj.oy = obj.y = e.clientY
        obj.ex = e.clientX - obj.startx, obj.ey = e.clientY - obj.starty
        obj.dx = 0, obj.dy = 0
        obj.excced = false
    } else {
        obj.x = e.x, obj.y = e.y
        obj.dx = e.x - obj.ox, obj.dy = e.y - obj.oy
        obj.ex = e.clientX - obj.startx, obj.ey = e.clientY - obj.starty
        obj.current = e.target as HTMLElement

        if (sqmag(obj.dx, obj.dy) > thr)
            obj.excced = true

        obj.pint = obj.excced ? Pint.Drag : Pint.PendDrag
    }
}

function reg_drag(el: HTMLElement, threshold = 4, cb: (d: Drag) => void) {
    let obj: Drag = { pint: Pint.Down, x: 0, y: 0, dx: 0, dy: 0, ox: 0, oy: 0, ex: 0, ey: 0, startx: 0, starty: 0, excced: false, target: null!, current: null! }
    let pointerId = 0
    let downed = false
    let upped = false

    const down = (e: PointerEvent) => {
        pointerId = e.pointerId

        recalc_drag(obj, el, e, false, threshold)

        downed = true
        upped = false
        drags.set(e.pointerId, obj)

        window.addEventListener('pointermove', move)
        window.addEventListener('pointerup', up)
        window.addEventListener('pointercancel', up)

        cb(obj)
    }

    const move = (e: PointerEvent) => {
        if (!downed) return
        recalc_drag(obj, el, e, true, threshold)

        if (obj.current != obj.target)
            obj.current.dispatchEvent(new CustomEvent('dragdrop', { detail: obj, bubbles: true }))

        cb(obj)
    }

    const up = (e: PointerEvent) => {
        if (!downed) return
        if (upped) return

        recalc_drag(obj, el, e, true, threshold)

        downed = false
        upped = true
        obj.pint = Pint.Up

        if (obj.current != obj.target)
            obj.current.dispatchEvent(new CustomEvent('dragdrop', { detail: obj, bubbles: true }))

        cb(obj)
        drags.delete(pointerId)

        window.removeEventListener('pointermove', move)
        window.removeEventListener('pointerup', up)
    }

    el.addEventListener('pointerdown', down)
    return obj
}

function reg_data(el: HTMLElement, cb: (mode: Pint, dataTransfer: DataTransfer | null, ev: DragEvent) => void) {
    let enter = false
    const event = function (ev: DragEvent) {
        prevent(ev)

        let d = ev.dataTransfer
        if (ev.type == 'dragend' && enter) cb(Pint.DragEnd, d, ev)
        // if (d == null || !(ev.target instanceof Node) || el != ev.target && !el.contains(ev.target)) return
        if (d == null) return

        enter = true
        if (ev.type == 'dragover') cb(Pint.Drag, d, ev)
        else if (ev.type == 'drop') cb(Pint.Drop, d, ev)
    }

    el.addEventListener('dragenter', event)
    el.addEventListener('dragleave', event)
    el.addEventListener('dragover', event)
    el.addEventListener('drop', event)
    el.addEventListener('dragend', event)
}

function reg_drop(el: HTMLElement, cb: (d: Drag) => void) {
    el.addEventListener('dragdrop', e => {
        let d = (e as CustomEvent<Drag>).detail
        cb(d)
    })
}

function reg_pointer(el: HTMLElement, cb: (down: boolean) => void) {
    let downed = false
    el.addEventListener('pointerdown', () => {
        cb(true);
        downed = true
    })
    el.addEventListener('pointerup', () => {
        if (downed)
            cb(false);
        downed = false
    })
}

function reg_longtap(el: HTMLElement, cb: (ev: PointerEvent) => void) {
    let longtap: int | null = null;

    el.addEventListener('pointerdown', e => { longtap && clearTimeout(longtap); longtap = setTimeout(() => cb(e), 500); });
    el.addEventListener('pointerup', () => { longtap && clearTimeout(longtap); longtap = null; });
    el.addEventListener('pointerleave', () => { longtap && clearTimeout(longtap); longtap = null; });
};

function reg_context(el: HTMLElement, cb: (ev: PointerEvent) => void) {
    let longtap: int | null = null;

    el.addEventListener('pointerdown', e => {
        if (e.pointerType == 'mouse' && e.button == 2) cb(e);
        else {
            longtap && clearTimeout(longtap);
            longtap = setTimeout(() => cb(e), 500);
        }
    });
    el.addEventListener('pointerup', () => { longtap && clearTimeout(longtap); longtap = null; });
    el.addEventListener('pointerleave', () => { longtap && clearTimeout(longtap); longtap = null; });
}

function reg_doubletap(el: HTMLElement, cb: (ev: PointerEvent) => void) {
    let lastTime = 0;
    let lastTarget: EventTarget | null = null;


    el.addEventListener('pointerdown', e => {
        const now = Date.now();

        if (e.target === lastTarget && now - lastTime < 500) {
            cb(e); lastTime = 0; lastTarget = null;
        } else {
            lastTime = now; lastTarget = e.target;
        }
    });
}

let reg_focusity = function (cb: (focus: boolean) => void) {
    //dedup
    let focus = true
    let set = (x: boolean) => { if (x != focus) cb(focus = x) }

    window.addEventListener("beforeunload", () => set(false))
    document.addEventListener("visibilitychange", () => set(document.visibilityState === 'visible'));
    window.onblur = window.onpagehide = () => set(false);
    window.onfocus = window.onpageshow = () => set(true);
};
