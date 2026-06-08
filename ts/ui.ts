let getbyid = (id: string) => document.getElementById(id)!;
let getbyclass = function (c: string, within: HTMLElement | Document = document): Array<HTMLElement> {
    let arr = [];
    let list = within.getElementsByClassName(c);

    for (let e = 0; e < list.length; ++e) arr.push(<HTMLElement>list[e]);
    return arr;
}
function getbyclass_parent(c: string, el: HTMLElement) {
    while (el) {
        if (el.classList.contains(c)) return el
        el = el.parentElement!
    }
    return el
}
let getbytag = function (c: string, within: HTMLElement | Document = document): Array<HTMLElement> {
    let arr = [];
    let list = within.getElementsByTagName(c);

    for (let e = 0; e < list.length; ++e) arr.push(<HTMLElement>list[e]);
    return arr;
}
function toggle_class(el: HTMLElement, c: string, cond: boolean) {
    if (cond) el.classList.add(c)
    else el.classList.remove(c)
}
let prevent_bubble = function (e: Event) { e.stopPropagation(); };
let prevent_default = function (e: Event) { e.stopPropagation(); e.preventDefault(); };
let prevent_select = function (el: HTMLElement) { el.onselectstart = prevent_default }

function ui_is_native_control(x: any) {
    return x instanceof HTMLInputElement || x instanceof HTMLTextAreaElement || x instanceof HTMLSelectElement || x instanceof HTMLButtonElement
}

let component_get = function <T>(el: Element, key: string, create: boolean = false): T | null {
    key = 'data-' + key
    let list = ui.components[key] as T[];
    if (list == null) list = ui.components[key] = [];
    let attr = el.getAttribute(key)
    if (!attr) {
        if (create) component_set(el, key, {});
        else return null;
        attr = el.getAttribute(key)!;
    }
    return list[+attr];
};

let component_set = function <T>(el: Element, key: string, component: T) {
    key = 'data-' + key
    let list: T[] | null = ui.components[key] as T[];
    if (list == null)
        list = ui.components[key] = [];

    let index = el.getAttribute(key)
    if (index) {
        list[+index] = component
    } else {
        el.setAttribute(key, list.length + '')
        list[list.length] = component;
    }
};

function update_elements<T>(contianer: HTMLElement, arr: T[], fn: (v: T, el: HTMLElement) => void) {
    const template = contianer.children[0] as HTMLElement
    template.style.display = 'none'
    while (contianer.children.length - 1 < arr.length)
        contianer.appendChild(template.cloneNode(true))

    for (let i = 0; i < arr.length; i++) {
        let el = contianer.children[i + 1] as HTMLElement
        el.style.display = ''
        fn(arr[i], el)
    }

    for (let i = arr.length + 1; i < contianer.children.length; i++)
        (contianer.children[i] as HTMLElement).style.display = 'none'
}



const ui = {
    components: <Record<string, any>>{},
    file: getbyid('file'),
    requested_update: false,
    assets: getbyid('assets'),
    tracks: getbyid('tracks'),
    pointers: <Pointer[]>[],
    drag: <DragElement[]>[],
    notif: getbyid('notif')
}

interface DragElement {
    ox: float, oy: float
}


function ui_init() {
}

function ui_notif(s: string) {
    ui.notif.textContent = s
    ui.notif.style.visibility = 'visible'
    setTimeout(() => ui.notif.style.visibility = 'hidden', 5000)
}

function ui_error(s: string) {
    ui.notif.className = 'error'
    ui_notif(s)
}
function ui_warn(s: string) {
    ui.notif.className = 'warn'
    ui_notif(s)
}
function ui_request() {
    if (ui.requested_update)
        return
    ui.requested_update = true
    requestAnimationFrame(() => {
        ui_update()
        ui.requested_update = false
    })
}

function ui_update() {
    update_elements(ui.assets, editor.assets, ui_update_asset)
    update_elements(ui.tracks, editor.tracks, ui_update_track)
}

function ui_drag_start(el: HTMLElement) {
    component_set(el, 'drag', { ox: el.offsetLeft, oy: el.offsetTop })
    el.style.pointerEvents = 'none'
}

function ui_drag_move(el: HTMLElement, dx: float, dy: float) {
    let d = component_get<DragElement>(el, 'drag')!
    el.style.position = 'absolute'
    el.style.left = d.ox + dx + 'px'
    el.style.top = d.oy + dy + 'px'
}

function ui_drag_end(el: HTMLElement) {
    el.style.position = ''
    el.style.left = ''
    el.style.top = ''
    el.style.pointerEvents = ''
}


function ui_update_asset(a: Asset, el: HTMLElement) {
    let name = getbyclass('name', el)[0]
    let canv = getbyclass('thumb', el)[0] as HTMLCanvasElement
    let ctx = canv.getContext('2d')!

    name.innerText = a.name
    ctx.clearRect(0, 0, canv.width, canv.height)
    ctx.drawImage(a.thumb, 0, 0, canv.width, canv.height)

    component_set(el, 'asset', a)
    toggle_class(el, 'high', editor_is_sel_asset(a))
}

function ui_asset(a: Asset): HTMLElement | null {
    for (let child of ui.assets.children) {
        if (component_get(child, 'asset') == a)
            return child as HTMLElement
    }
    return null
}

function ui_track(t: Track): HTMLElement | null {
    for (let child of ui.tracks.children) {
        if (component_get(child, 'track') == t)
            return child as HTMLElement
    }
    return null
}

function ui_ev_asset(ev: Event): Asset | null {
    let el = (ev.target as HTMLElement).closest('.asset') as HTMLElement
    if (!el)
        return null
    return component_get(el, 'asset')
}

function ui_ev_track(ev: Event): Track | null {
    let el = (ev.target as HTMLElement).closest('.track') as HTMLElement
    if (!el)
        return null
    return component_get(el, 'track')
}


function ui_asset_down(a: Asset) {
    editor_sel_asset(a)
}

function ui_update_track(t: Track, el: HTMLElement) {
    let canvas = getbytag('canvas', el)[0]

    component_set(el, 'track', t)
}