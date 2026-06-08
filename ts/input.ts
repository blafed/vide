enum Action {
    play,
    import,

    up, down,
    left, right,


    goto_assets,
    goto_timeline,
    goto_preview,
}


function input_init() {
    document.body.addEventListener('keydown', input_key)
}

function get_action(ev: KeyboardEvent) {
    switch (ev.code) {
        case 'KeyI': return Action.import
        case 'Space': return Action.play
        case 'ArrowUp': return Action.up
        case 'ArrowDown': return Action.down
        case 'ArrowLeft': return Action.left
        case 'ArrowRight': return Action.right
    }
}

function input_key(ev: KeyboardEvent) {
    let a = get_action(ev)
    if (a) {
        editor_action(a)
        prevent_default(ev)
    }
}


const input = {
    pointer: <Point>[0, 0],
    poiner_mode: <PointerMode>0,
}

function on_action() {

}

function on_pointer_move(ev: PointerEvent) {
}