let entitys = new Map<HTMLElement, any>()
let ghosts = new Map<HTMLElement, HTMLElement>()
let boxes: Map<HTMLElement, Box> = new Map()

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

class Box {
    bar: HTMLElement
    body: HTMLElement

    constructor(public el: HTMLElement) {
        this.bar = class1('boxbar', el)
        this.body = class1('boxbot', el)
        reg_drag(this.bar, 0, (d) => drag_move(d, el))
    }

    getpos(): Point { return [this.el.offsetLeft, this.el.offsetTop] }
    setpos(p: Point) { this.el.style.left = `${p[0]}px`; this.el.style.top = `${p[1]}px` }
}


function init_gui() {
    let forbox = document.querySelectorAll('[for-box]')
    classes('box').forEach(e => {
        let box = new Box(e)
        for (let i = 0; i < forbox.length; i++) if (forbox[i].getAttribute('for-box') == e.id)
            box.body.appendChild(forbox[i])
        boxes.set(e, box)
    })
}