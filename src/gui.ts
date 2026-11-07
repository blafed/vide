//editor UI
const GUI = {
    TRACK_HEIGHT: 68
}
function gui_init(e: Editor) {
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
        assets: id('assets'),
        timepan: id('timepan'),
        buttons
    }

    reg_data(gui.assetpan, (mode, tr) => mode != Pint.Drop ? null : e.import_many(tr!.files, e.path))
    reg_drag(gui.timepan, 0, (d) => {
        if (d.target == gui.timeCaret || d.target == gui.trackCaret) {
            if (d.pint == Pint.Drag) {
                let off = d.target == gui.timeCaret ? e.dt_g2s(d.dx) : e.dt_g2v(d.dx)
                e.retime_memo(off, false)
            }
        } else if (d.target == gui.timeview) {
            e.timeview_move(d.pint == Pint.Up ? undefined : e.dt_g2s(d.dx))
        } else if (d.target == gui.tracks || d.target.classList.contains('track')) {
            if (d.pint != Pint.Drag) return
            e.retime(e.time_g2v(d.ex), false)
        }
    })
    reg_drop(gui.tracks, (d) => {
        if (d.target.classList.contains('asset') && d.current.classList.contains('track')) {
            if (d.pint != Pint.Up) return
            console.log(d.target, d.current)
            let c = ent1<int>(d.current)
            e.add_item(ent1<Asset>(d.target).res, c, e.time_g2v(d.ex))
        }
    })

    reg_drag(gui.assets, 8, (d) => {
        if (d.target.classList.contains('asset'))
            drag_move(d, d.target, true)
    })


    return gui
}

function gui_update(g: Gui, e: Editor, force = false) {
    if (force || e.dirty.timeview) {
        var el = g.timeview
        el.style.left = e.scene2gui(e.from) + 'px'
        el.style.width = e.scene2gui(e.to - e.from) + 'px'
    }

    if (force || e.dirty.time) {
        var el = g.trackCaret
        el.style.left = e.time2gui(e.time) + 'px'
        el = g.timeCaret
        el.style.left = e.scene2gui(e.time) + 'px'
    }

    if (force || e.dirty.assets || e.dirty.asset.size)
        update_over_editor(e, g.assets, e.get_current_assets(), gui_update_asset)

    if (force || e.dirty.scene)
        update_over_editor(e, g.tracks, e.get_tracks_int(), gui_update_track)

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
