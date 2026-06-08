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
let prevent_bubble = function (e: Event) { e.stopPropagation(); };
let prevent_default = function (e: Event) { e.stopPropagation(); e.preventDefault(); };
let prevent_select = function (el: HTMLElement) { el.onselectstart = prevent_default }

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
    el.setAttribute(key, list.length + '')
    list[list.length] = component;
};

interface DragElement {
    el: HTMLElement,
    ox: float, oy: float
    startX: float, startY: float
    first: boolean
}

const ui = {
    assets: getbyid('assets'),
    tracks: getbyid('tracks'),
    components: <Record<string, any>>{},
    requested_update: false,
    drag: <DragElement[]>[],
}

function ui_init() {
    prevent_select(document.body)

    document.body.addEventListener('pointerdown', ui_detect_drag, true)
    document.body.addEventListener('pointermove', ui_detect_drag_move)
    document.body.addEventListener('pointerup', ui_detect_drag_up)
    document.body.addEventListener('pointercancel', ui_detect_drag_cancel)

    ui.assets.onclick = (ev) => { if (ev.target == ui.assets) editor_unselect_assets() }
    ui.assets.ondragover = (ev) => {
        ui.assets.classList.add('high')
        prevent_default(ev)
    }
    ui.assets.ondragleave = () => ui.assets.classList.remove('high')
    ui.assets.ondrop = (ev) => {
        if (ev.dataTransfer)
            for (let f of ev.dataTransfer.files)
                editor_import(f)
        prevent_default(ev)
        ui.assets.classList.remove('high')
    }
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
    ui_update_array(ui.assets, editor.assets.items, ui_render_asset)
    ui_update_array(ui.tracks, project.track, ui_render_track)
    for (let x of sel.asset) {
        ui_high_asset(x, true)
    }
}

function ui_error(s: string) {
    alert(s)
}

function ui_update_array<T>(contianer: HTMLElement, arr: T[], fn: (v: T, el: HTMLElement) => void) {
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

function ui_render_asset(a: Asset, el: HTMLElement) {
    let name = getbyclass('name', el)[0]
    name.innerText = a.name
    let canv = getbyclass('thumb', el)[0] as HTMLCanvasElement
    let ctx = canv.getContext('2d')!
    ctx.clearRect(0, 0, canv.width, canv.height)
    ctx.drawImage(a.thumb, 0, 0, canv.width, canv.height)
    // el.onclick = ui_asset_click
    prevent_select(el)
    component_set(el, 'asset', a)
    el.classList.remove('high')
}

function ui_asset_element(a: Asset) {
    for (let x of ui.assets.children) {
        if (component_get(x, 'asset') == a)
            return x
    }
    return null
}

function ui_high_asset(a: Asset, on: boolean) {
    let el = ui_asset_element(a)
    if (el == null) return
    if (on) el.classList.add('high')
    else el.classList.remove('high')
}

function ui_asset_click(el: HTMLElement, ev?: PointerEvent) {
    const ass = component_get<Asset>(el, 'asset')
    if (!ass) return
    editor_select_asset(ass)
}

function ui_assets_orderby(sel: HTMLSelectElement, ev: Event) {
    editor_assets_order_by(parseInt(sel.value))
}

function ui_assets_orderdesc(sel: HTMLInputElement, ev: Event) {
    editor_assets_order_desc(sel.checked)
}

function ui_file_input(el: HTMLInputElement, ev: Event) {
    if (el.files)
        for (let f of el.files)
            editor_import(f)
    el.value = ''
}


function ui_asset_rename(el: HTMLElement, ev: PointerEvent) {
    let parent = getbyclass_parent('asset', el)
    if (parent) {
        console.log('renaming', parent)
    }
}


function btn(type: string) {
    switch (type) {
        case 'file': return editor_open_add_asset()
        case 'add': return editor_open_add_asset()
        default: console.log(type)
    }
}

function hotkey(ev: KeyboardEvent): string | null {
    switch (ev.code) {
        case 'Escape': return 'cancel'
        case 'Space': return 'play'
        case 'Delete': return 'delete'
        case 'Enter': return 'confirm'
        case 'Backspace': return 'back'
        case 'KeyS': if (ev.ctrlKey) return 'save'; break
        case 'KeyO': if (ev.ctrlKey) return 'open'; break
        case 'KeyI': if (ev.ctrlKey) return 'import'; break
        case 'KeyE': if (ev.ctrlKey) return 'export'; break
        case 'KeyZ':
            if (ev.ctrlKey && ev.shiftKey) return 'redo'
            if (ev.ctrlKey) return 'undo'
            break
        case 'KeyY': if (ev.ctrlKey) return 'redo'; break
        case 'KeyC': if (ev.ctrlKey) return 'copy'; break
        case 'KeyX': if (ev.ctrlKey) return 'cut'; break
        case 'KeyV': if (ev.ctrlKey) return 'paste'; break
        case 'KeyD': if (ev.ctrlKey) return 'duplicate'; break
        case 'KeyM': return 'marker'
        case 'ArrowLeft': return ev.shiftKey ? 'seek_prev_big' : 'seek_prev'
        case 'ArrowRight': return ev.shiftKey ? 'seek_next_big' : 'seek_next'
        case 'Home': return 'timeline_start'
        case 'End': return 'timeline_end'
        case 'Equal': case 'Plus': return 'zoom_in'
        case 'Minus': return 'zoom_out'
        case 'Backslash': return 'zoom_fit'
        case 'Digit1': return '1'
        case 'Digit2': return '2'
        case 'Digit3': return '3'
        case 'Digit4': return '4'
    }

    return null
}

function ui_key(ev: KeyboardEvent) {
    switch (ev.key) {
        case 'Escape': btn('cancel'); break
        case 'Space': btn('play'); break
        case 'Delete': btn('delete'); break
        case 'KeyZ': if (ev.ctrlKey && ev.shiftKey) btn('redo'); else if (ev.ctrlKey) btn('undo'); break
        case 'KeyS': if (ev.ctrlKey) btn('save'); break
        case 'KeyA': if (ev.ctrlKey) btn('selecta'); break
        case 'KeyD': if (ev.ctrlKey) btn('duplicate'); break
        case 'KeyC': if (ev.ctrlKey) btn('copy'); break
        case 'KeyV': if (ev.ctrlKey) btn('paste'); break
        case 'KeyX': if (ev.ctrlKey) btn('cut'); break
        case 'KeyF': if (ev.ctrlKey) btn('find'); break

    }

    prevent_default(ev)
}

function ui_contextmenu(ev: Event) {

}

function ui_render_track(t: Track, el: HTMLElement) {
    let canvas = <HTMLCanvasElement>getbytag('canvas', el)[0]
    let ctx = canvas.getContext('2d')!
    let items = project.item.filter(x => x.track == t)

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    for (let x of items) {

    }
}


const enum PointerMode {
    Down, Up, Move
}


function ui_detect_drag(ev: PointerEvent) {
    const target = (ev.target as HTMLElement)?.closest('.drag')

    if (target instanceof HTMLElement && target.classList.contains('drag')) {
        ui.drag.push({
            el: target, ox: ev.pageX, oy: ev.pageY,
            startX: target.offsetLeft, startY: target.offsetTop,
            first: false
        })
    }
}


function ui_detect_drag_move(ev: PointerEvent) {
    for (let d of ui.drag) {

        let dx = ev.pageX - d.ox
        let dy = ev.pageY - d.oy
        if (!d.first) {
            if (sqmag(dx, dy) >= 8) {
                d.first = true
                ui_on_drag(d, dx, dy, PointerMode.Down)
            } else
                continue
        }
        ui_on_drag(d, dx, dy, PointerMode.Move)
    }
}

function ui_detect_drag_up(ev: PointerEvent) {
    for (let d of ui.drag) {
        let dx = ev.pageX - d.ox
        let dy = ev.pageY - d.oy
        ui_on_drag(d, dx, dy, PointerMode.Up)
    }
    ui_detect_drag_cancel()
}

function ui_detect_drag_cancel() {
    for (let x of ui.drag) {

    }
    ui.drag.length = 0
}

function ui_on_drag(d: DragElement, dx: number, dy: number, mode: PointerMode) {
    let el = d.el

    switch (mode) {
        case PointerMode.Down:
            const r = el.getBoundingClientRect()

            el.style.position = 'absolute'
            el.style.left = window.scrollX + r.left + 'px'
            el.style.top = window.scrollY + r.top + 'px'
            break;
        case PointerMode.Up:
            el.style.position = ''
            el.style.top = ''
            el.style.left = ''
            break;
        case PointerMode.Move:
            el.style.left = d.startX + dx + 'px'
            el.style.top = d.startY + dy + 'px'
            break;
    }
}
