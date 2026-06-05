const ui = {
    preview: <HTMLCanvasElement>document.getElementById('main'),
    file_input: <HTMLInputElement>document.getElementById('file'),
    file_label: <HTMLLabelElement>document.getElementById('file_label'),
    tracks: <HTMLDivElement>document.getElementById('tracks'),
}

function ui_init() {
    ui_draggable_init(getbyid('t-drag'))
    _drag.drops = getbyclass('drop')
}

function ui_draggable_init(el: HTMLElement) {
    el.style.position = 'relative'
    reg_drag(el, (e, mode, args) => {
        el.style.left = args.offX + 'px'
        el.style.top = args.offY + 'px'
    })
}


// class UICanvas {
//     ctx: CanvasRenderingContext2D
//     el: HTMLCanvasElement

//     constructor(el: HTMLCanvasElement) {
//         this.el = el
//         this.ctx = el.getContext('2d')!
//     }
// }

// class UIPreview {
//     constructor(public canvas: UICanvas) { }
// }

// class UIFileLoader {
//     constructor(el: HTMLElement) {

//     }
// }

function ui_create(id: string): HTMLElement {
    let tpl = document.getElementById("t-" + id) as HTMLTemplateElement
    return tpl.content.firstElementChild!.cloneNode(true) as HTMLElement
}


type UserInputEvent = MouseEvent | PointerEvent | Touch;

interface Drag { obj: HTMLElement | null, active: boolean, args: DragArgs, cb: DragEventCallback | null, xy: Point, wh: Point, drops: HTMLElement[] }
interface DragArgs { offX: float, offY: float, startScreenX: float, startScreenY: float }
type DragEventCallback = (e: UserInputEvent, mode: DragMode, args: DragArgs) => void;
interface DragComponent { cb: DragEventCallback, el: HTMLElement, reg: boolean };
const enum DragMode { Start, Move, End }


let _component: Record<string, any> = {}

let _drag: Drag = { obj: null, cb: null, active: false, args: null!, xy: [0, 0], wh: [0, 0], drops: [] }


let component_get = function <T>(el: HTMLElement, key: string, create: boolean = false): T | null {
    let list = _component[key] as T[];
    if (list == null) list = _component[key] = [];
    let attr = el.getAttribute(key)
    if (!attr) {
        if (create) component_set(el, key, {});
        else return null;
        attr = el.getAttribute(key)!;
    }
    return list[+attr];
};

let component_set = function <T>(el: HTMLElement, key: string, component: T) {
    let list: T[] | null = _component[key] as T[];
    if (list == null)
        list = _component[key] = [];
    el.setAttribute(key, list.length + '')
    list[list.length] = component;
};

let drag_start = function (e: UserInputEvent, entry: DragComponent) {
    if ((e as any).preventDefault) (<Event>e).preventDefault();

    let cb = entry.cb, el = entry.el;

    if (!el || !cb) return;

    reg_pointer(document, 'move', <any>drag_move, true);
    reg_pointer(document, 'up', <any>drag_end, true);

    _drag.active = true;
    _drag.obj = el; _drag.cb = cb;
    _drag.args = { offX: 0, offY: 0, startScreenX: e.clientX, startScreenY: e.clientY };
    _drag.cb?.(e, DragMode.Start, _drag.args);
};

let drag_end = function (e: UserInputEvent) {
    if (!_drag.active)
        return;

    _drag.obj = null;
    _drag.active = false
    _drag.cb?.(e, DragMode.End, _drag.args);
    _drag.cb = null;

    regmove_pointer(document, 'move', <any>drag_move, true);
    regmove_pointer(document, 'up', <any>drag_end, true);
};

let drag_move = function (e: UserInputEvent) {
    if (!_drag.active)
        return;
    _drag.args.offX = e.clientX - _drag.args.startScreenX;
    _drag.args.offY = e.clientY - _drag.args.startScreenY;
    _drag.cb?.(e, DragMode.Move, _drag.args);
};

/** registers a drag event handler to element. ONLY ONE callback at time*/
let reg_drag = function (el: HTMLElement, onDrag: DragEventCallback, options = true) {
    let comp = component_get<DragComponent>(el, 'drag', true)!;
    comp.cb = onDrag; comp.el = el;
    if (!comp.reg) {
        reg_pointer(el, 'down', (e) => drag_start('changedTouches' in e ? (<TouchEvent>e).changedTouches[0] : <UserInputEvent>e, comp), options);
    }
    comp.reg = true; //to not register another time
};


let reg_pointer = function (el: HTMLElement | Document, msg: 'down' | 'up' | 'move' | 'cancel' | 'enter' | 'leave', cb: (e: Event) => void, options?: boolean) {
    if (window.PointerEvent) el.addEventListener('pointer' + msg, cb, options);
    else {
        if (msg == 'down' || msg == 'up' || msg == 'move' || msg == 'cancel')
            el.addEventListener(msg == 'down' ? 'touchstart' : msg == 'up' ? 'touchend' : msg == 'move' ? 'touchmove' : 'touchcancel', cb, options);
        el.addEventListener('mouse' + msg, cb, options);
    }
};

let regmove_pointer = function (el: HTMLElement | Document, msg: 'down' | 'up' | 'move' | 'cancel' | 'enter' | 'leave', cb: (e: Event) => void, options?: boolean) {
    if (window.PointerEvent) el.removeEventListener('pointer' + msg, cb, options);
    else {
        if (msg == 'down' || msg == 'up' || msg == 'move' || msg == 'cancel')
            el.removeEventListener(msg == 'down' ? 'touchstart' : msg == 'up' ? 'touchend' : msg == 'move' ? 'touchmove' : 'touchcancel', cb, options);
        el.removeEventListener('mouse' + msg, cb, options);
    }
};


let reg_longtap = function (el: HTMLElement, cb: (ev: PointerEvent) => void) {
    let longtap: int | null = null;

    el.addEventListener('pointerdown', e => { longtap && clearTimeout(longtap); longtap = setTimeout(() => cb(e), 500); });
    el.addEventListener('pointerup', () => { longtap && clearTimeout(longtap); longtap = null; });
    el.addEventListener('pointerleave', () => { longtap && clearTimeout(longtap); longtap = null; });
};

function reg_doubletap(el: HTMLElement, cb: (ev: PointerEvent) => void) {
    let lastTime = 0;
    let lastTarget: EventTarget | null = null;


    el.addEventListener('pointerdown', e => {
        const now = Date.now();

        if (e.target === lastTarget && now - lastTime < 1000) {
            cb(e); lastTime = 0; lastTarget = null;
        } else {
            lastTime = now; lastTarget = e.target;
        }
    });
}


let getbyid = (id: string) => document.getElementById(id)!;

let getbyclass = function (c: string, within: HTMLElement | Document = document): Array<HTMLElement> {
    let arr = [];
    let list = within.getElementsByClassName(c);

    for (let e = 0; e < list.length; ++e) arr.push(<HTMLElement>list[e]);
    return arr;
}