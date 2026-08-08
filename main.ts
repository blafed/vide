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

    scene = sceneAsset.res as Scene
    scene.duration = 1
}