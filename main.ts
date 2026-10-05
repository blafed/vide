//init
function main() {
    //need exactly this to init
    init_input()
    init_gui()

    editor = new Editor()
    let scene = editor.new_scene('main')!
    editor.open_scene(scene)

    //run demo
    demo()
}

//DEMO
var sceneAsset: Asset
var scene: Scene
var item: Item

function demo() {
    sceneAsset = editor.assets[0]
    scene = editor.scene
    let res = editor.new_res_test('test')!.res
    item = editor.add_item(res, 0, 0.5)
    item.to = 0.923

    scene = sceneAsset.res as Scene
    scene.duration = 1
}