//editor UI
const GUI = {
    TRACK_HEIGHT: 68
}
function gui_init(e: Editor): Gui {
    let dombuttons = document.getElementsByTagName('button')
    let buttons = new Map<string, HTMLElement>()
    for (let i = 0; i < dombuttons.length; i++)
        buttons.set(dombuttons[i].id, dombuttons[i])

    let gui = {
        main: id('main'),
        canvas: canvas(id('main'))!,
        tracks: id('tracks'),
        timeview: id('timeview'),
        trackCaret: id('track-caret'),
        timeCaret: id('time-caret'),
        assetpan: id('assetpan'),
        buttons
    }

    reg_data(gui.assetpan, (mode, tr) => mode != Pint.Drop ? null : e.import_many(tr!.files, e.path))

    return gui
}

function gui_update(g: Gui, e: Editor) {
    if (e.dirty.timeview) {
        var el = id('timeview')
        el.style.left = e.scene2gui(e.from) + 'px'
        el.style.width = e.scene2gui(e.to - e.from) + 'px'
    }

    if (e.dirty.time) {
        var el = id('track-caret')
        el.style.left = e.time2gui(e.time) + 'px'
        el = id('time-caret')
        el.style.left = e.scene2gui(e.time) + 'px'
    }

    if (e.dirty.assets || e.dirty.asset.size)
        update_over_editor(e, id('assetpan'), e.get_current_assets(), gui_update_asset)

    if (e.dirty.scene)
        update_over_editor(e, id('tracks'), e.get_tracks_int(), gui_update_track)

    let bt = g.buttons

    for (let entry of bt) {
        set_highlight(entry[1], editor.toolLock && editor.tool == name2tool(entry[0]))
    }

    set_highlight(bt.get('notool')!, !editor.toolLock)

    set_highlight(bt.get('play')!, editor.isplaying)
}


function update_over_editor<T>(editor: Editor, contianer: HTMLElement, arr: Readonly<T[]>, fn: (editor: Editor, v: T, el: HTMLElement, first: boolean, i: int) => void) {
    update_over(contianer, arr, (v, el, first, i) => fn(editor, v, el, first, i))
}


function buttons(editor: Editor) {
    let buttons = document.getElementsByTagName('button')

    for (let button of buttons) {
        set_highlight(button, editor.toolLock && editor.tool == name2tool(button.id))
    }
    set_highlight(id('notool'), !editor.toolLock)

    set_highlight(id('play'), editor.isplaying)
}

function gui_update_asset(editor: Editor, a: Asset, el: HTMLElement) {
    let c = canvas(el)!
    canvas_resize_dpr(c)
    canvas_clear_all(c)
    if (a.thumb) {
        let src = rect_img(a.thumb), dst = rect_canvas(c)
        rect_fit(src, dst, FitMethod.Contain)
        canvas_draw_img2(c, a.thumb, dst, src)
    }
    let text = class1('name', el)
    text.innerText = editor.get_asset_name(a)
    class_toggle(el, 'high', editor.is_sel_asset(a))
    ent(el, a)
}

function gui_update_track(editor: Editor, l: int, el: HTMLElement) {
    let items = editor.get_track(l)
    update_over_editor(editor, el, items, gui_update_item)
    ent(el, l)
}

function gui_update_item(editor: Editor, item: Item, el: HTMLElement) {
    let c = canvas(el)!
    el.style.left = editor.time_v2g(item.from) + 'px'
    el.style.width = editor.dt_v2g(item.to - item.from) + 'px'
    canvas_resize_dpr(c)

    let tpp = (editor.to - editor.from) / editor.timeviewGuiWidth
    res_draw_track(item.res, c, editor.scene.fps, tpp, item.sfrom, item.sto)
    ent(el, item)
}
