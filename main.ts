var sceneAsset: Asset
var scene: Scene

async function main() {
    init_input()
    editor = new Editor()
    sceneAsset = editor.new_scene('main')!
    editor.open_scene(sceneAsset)
    scene = sceneAsset.res as Scene
    scene.duration = 1
}