let getbyid = (id: string) => document.getElementById(id)!;
let getbyclass = function (c: string, within: HTMLElement | Document = document): Array<HTMLElement> {
    let arr = [];
    let list = within.getElementsByClassName(c);

    for (let e = 0; e < list.length; ++e) arr.push(<HTMLElement>list[e]);
    return arr;
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

const ui = {
    add_asset: getbyid('add_asset'),
    file_input: <HTMLInputElement>getbyid('file'),
    assets: getbyid('assets'),
    assets_order: <HTMLSelectElement>getbyid('assets_order'),
    components: <Record<string, any>>{},
    requested_update: false
}

function ui_init() {
    prevent_select(document.body)
    ui.file_input.oninput = () => {
        if (ui.file_input.files)
            for (let f of ui.file_input.files)
                editor_import(f)
        ui.file_input.value = ''
    }

    ui.assets.onclick = (ev) => { if (ev.target == ui.assets) editor_unselect_assets() }
    ui.add_asset.onclick = editor_open_add_asset
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
    el.onclick = ui_asset_click
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

function ui_asset_click(ev: PointerEvent) {
    const ass = component_get<Asset>(ev.target as Element, 'asset')
    if (!ass) return
    editor_select_asset(ass)
}

function ui_assets_orderby(sel: HTMLSelectElement, ev: Event) {
    editor_assets_order_by(parseInt(sel.value))
}

function ui_assets_orderdesc(sel: HTMLInputElement, ev: Event) {
    editor_assets_order_desc(sel.checked)
}