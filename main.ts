var sceneAsset: Asset
var scene: Scene
var item: Item
async function main() {
    init_input()
    editor = new Editor()
    sceneAsset = editor.new_scene('main')!
    editor.open_scene(sceneAsset)
    let res
    editor.import(res = res_create_test(), 'test')
    item = editor.add_item(res, 0, 0.5)
    item.to = 0.923

    scene = sceneAsset.res as Scene
    scene.duration = 1
}

function move(from: float, to: float) {
    editor.timeview(from, to)
}

function s(t: float) {
    console.log(editor.time_g2s(t))
    console.log(editor.time_g2v(t))
    console.log(editor.time_s2v(t))
    console.log(editor.time_s2vg(t))
}