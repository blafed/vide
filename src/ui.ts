//generic ui helpers

let entitys = new Map<HTMLElement, any>()
//visual drag previews independent of actual elements.
let ghosts = new Map<HTMLElement, HTMLElement>()
let drags = new Map<int, Drag>()


function id<T extends HTMLElement>(id: string) { return document.getElementById(id)! as T }
function classes(c: string, within: HTMLElement = document.body): Array<HTMLElement> {
    let arr = []
    let list = within.getElementsByClassName(c)
    for (let e = 0; e < list.length; ++e) arr.push(<HTMLElement>list[e])
    return arr
}
function class1(c: string, within: HTMLElement = document.body) { return classes(c, within)[0]! }
function prevent(e: Event) {
    e.stopPropagation()
    e.preventDefault()
}
function create_child<K extends keyof HTMLElementTagNameMap>(el: HTMLElement, tag: K, cls: string = ''): HTMLElementTagNameMap[K] {
    let child = document.createElement(tag)
    child.className = cls
    el.appendChild(child)
    return child
}

//reuse DOM elements instead of rebuilding everything.
function update_over<T>(contianer: HTMLElement, arr: Readonly<T[]>, fn: (v: T, el: HTMLElement, first: boolean, i: int) => void) {
    const template = contianer.children[0] as HTMLElement
    template.style.display = 'none'

    let lastLength = contianer.children.length - 1
    while (contianer.children.length - 1 < arr.length) {
        let clone = template.cloneNode(true) as HTMLElement
        contianer.appendChild(clone)
    }

    for (let i = 0; i < arr.length; i++) {
        let el = contianer.children[i + 1] as HTMLElement
        el.style.display = ''
        fn(arr[i], el, i >= lastLength, i)
    }

    for (let i = arr.length + 1; i < contianer.children.length; i++)
        (contianer.children[i] as HTMLElement).style.display = 'none'
}

function class_toggle(el: HTMLElement, c: string, cond: boolean) {
    if (cond) el.classList.add(c)
    else el.classList.remove(c)
}
function set_highlight(el: HTMLElement, v: boolean) { class_toggle(el, 'high', v) }
function set_dragging(el: HTMLElement, v: boolean) { class_toggle(el, 'drag', v) }
function event_closest(ev: Event, selector: string) {
    let target = ev.target
    if (!(target instanceof Element))
        return null
    return target.closest(selector) as HTMLElement
}

//associate DOM elements with data
function ent<T>(el: HTMLElement, set?: T): T | null {
    if (set != undefined) {
        (el as any)._ent = set //useless; only for debug
        entitys.set(el, set)
        return set
    } else return entitys.get(el)
}
function ent1<T>(el: HTMLElement): T {
    let e = ent<T>(el)
    if (e != undefined) return e
    else throw new Error('no entity ' + el)
}
function dent<T>(e: T): HTMLElement | null {
    for (let x of entitys)
        if (x[1] == e && x[0].style.display != 'none')
            return x[0]
    return null
}
function clone_with_canvas(el: HTMLElement) {
    let clone = el.cloneNode(true) as HTMLElement
    let src = [el, ...el.querySelectorAll('canvas')]
    let dst = [clone, ...clone.querySelectorAll('canvas')]

    for (let i = 0; i < src.length; i++) {
        let a = src[i]
        let b = dst[i]

        if (a instanceof HTMLCanvasElement && b instanceof HTMLCanvasElement) {
            b.width = a.width
            b.height = a.height
            b.getContext('2d')!.drawImage(a, 0, 0)
        }
    }
    return clone
}
function clone_ghost(el: HTMLElement) {
    let rect = el.getBoundingClientRect()
    let clone = clone_with_canvas(el)

    clone.classList.add('ghost')
    clone.classList.remove('comp')
    clone.style.left = `${rect.left}px`
    clone.style.top = `${rect.top}px`
    clone.style.width = `${rect.width}px`
    clone.style.height = `${rect.height}px`

    clone.dataset['startx'] = rect.left.toString()
    clone.dataset['starty'] = rect.top.toString()

    document.body.appendChild(clone)
    return clone
}
function spawn_ghost(el: HTMLElement, dx: float, dy: float) {
    var ghost = ghosts.get(el)
    if (!ghost) {
        ghost = clone_ghost(el)
        ghosts.set(el, ghost)
    }

    let sx = parseFloat(ghost.dataset['startx']!)
    let sy = parseFloat(ghost.dataset['starty']!)
    ghost.style.left = `${sx + dx}px`
    ghost.style.top = `${sy + dy}px`

    return ghost
}
function remove_ghost(el: HTMLElement) {
    let ghost = ghosts.get(el)
    if (ghost) {
        ghost.remove()
        ghosts.delete(el)
    }
}
function remove_ghosts() {
    for (let ghost of ghosts.values())
        ghost.remove()
    ghosts.clear()
}



function drag_move(d: Drag, el: HTMLElement, useghost = false) {
    if (d.pint == Pint.Up) {
        el.style.pointerEvents = ''
        remove_ghost(el)
        return
    }
    if (d.pint != Pint.Drag) return
    if (useghost) {
        let ghost = spawn_ghost(el, d.dx, d.dy)
        ghost.style.left = `${d.startx + d.dx}px`
        ghost.style.top = `${d.starty + d.dy}px`
    } else {
        el.style.left = `${d.startx + d.dx}px`
        el.style.top = `${d.starty + d.dy}px`
        el.style.pointerEvents = 'none'
    }
}

// class Box {
//     bar: HTMLElement
//     body: HTMLElement

//     constructor(public el: HTMLElement) {
//         this.bar = class1('boxbar', el)
//         this.body = class1('boxbot', el)
//         reg_drag(this.bar, 0, (d) => drag_move(d, el))
//     }

//     getpos(): Point { return [this.el.offsetLeft, this.el.offsetTop] }
//     setpos(p: Point) { this.el.style.left = `${p[0]}px`; this.el.style.top = `${p[1]}px` }
// }


// function init_gui() {
//     let forbox = document.querySelectorAll('[for-box]')
//     classes('box').forEach(e => {
//         let box = new Box(e)
//         for (let i = 0; i < forbox.length; i++) if (forbox[i].getAttribute('for-box') == e.id)
//             box.body.appendChild(forbox[i])
//         boxes.set(e, box)
//     })
// }

const enum Pint { Down, PendDrag, Up, Drag, Drop, }
interface Drag {
    pint: Pint,
    x: float, y: float,
    dx: float, dy: float
    ox: float, oy: float,
    ex: float, ey: float, //delta relative to the element
    startx: float, starty: float //starting element position
    excced: boolean,
    started: HTMLElement
    target: HTMLElement
    ev: PointerEvent
}

function recalc_drag(obj: Drag, el: HTMLElement, e: PointerEvent, move: boolean, thr: float) {
    if (!move) {
        obj.started = e.target as HTMLElement

        let bounding = obj.started.getBoundingClientRect()
        obj.startx = bounding.left, obj.starty = bounding.top

        obj.target = obj.started
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
        obj.target = e.target as HTMLElement

        if (sqmag(obj.dx, obj.dy) > thr)
            obj.excced = true

        obj.pint = obj.excced ? Pint.Drag : Pint.PendDrag
    }
    obj.ev = e
}

function reg_drag(el: HTMLElement, threshold = 4, cb: (d: Drag) => void) {
    let obj: Drag = { pint: Pint.Down, x: 0, y: 0, dx: 0, dy: 0, ox: 0, oy: 0, ex: 0, ey: 0, startx: 0, starty: 0, excced: false, started: null!, target: null! }
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

        if (obj.target != obj.started)
            obj.target.dispatchEvent(new CustomEvent('dragdrop', { detail: obj, bubbles: true }))

        cb(obj)
    }

    const up = (e: PointerEvent) => {
        if (!downed) return
        if (upped) return

        recalc_drag(obj, el, e, true, threshold)

        downed = false
        upped = true
        obj.pint = Pint.Up

        if (obj.target != obj.started)
            obj.target.dispatchEvent(new CustomEvent('dragdrop', { detail: obj, bubbles: true }))

        cb(obj)
        drags.delete(pointerId)

        window.removeEventListener('pointermove', move)
        window.removeEventListener('pointerup', up)
        window.removeEventListener('pointercancel', up)
    }

    el.addEventListener('pointerdown', down)
    return obj
}

function reg_datadrag(el: HTMLElement, cb: (mode: Pint, dataTransfer: DataTransfer | null, ev: DragEvent) => void) {
    let enter = false
    const event = function (ev: DragEvent) {
        prevent(ev)

        let d = ev.dataTransfer
        if (ev.type == 'dragend' && enter) cb(Pint.Up, d, ev)
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


let reg_wheel = function (el: HTMLElement, cb: (ev: WheelEvent) => void) {
    el.addEventListener(window.PointerEvent ? 'pointerenter' : 'mouseenter', () => window.addEventListener('wheel', cb));
    el.addEventListener(window.PointerEvent ? 'pointerleave' : 'mouseleave', () => window.removeEventListener('wheel', cb));
};
