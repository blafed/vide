const text = `
TYPE: short
LENGTH: 1 minute

i made a video editor; and it works; lets see;

[SHOW: editor ui]
this is the editor, import some stuff, drag resources, place them, trim them, cut them and swap things;
add a layer, add an audio resource, adjust and tune a bit then click export;

[SFX: bip bop]
[VFX: things falls towards the garbage]
but i actually didnt use any of that (kinda);
i used JS to make this video, by calling things directly from code, and preview the thing in the live editor, [VSFX: very hot load];

finally, for the first time of my life, creating a video makes sense (*SMUGS);
now i can bother you;
`;



async function main() {
    let editor = new Editor();
    editor.gui();

    let scene = editor.new_scene('main', { width: 1080, height: 1920, fps: 30 });
    editor.open_scene(scene);

    let video = await editor.import_url('/ex/vid1/video.mp4')

    let item = editor.add_item(video, 0)
    let oneframe = editor.cut_item_frame(item, 0.0, 1)
    editor.remove_item(item)
    editor.stretch_item(oneframe, 3);

    ext.add_zoom_anim(editor, { time: 0, scale: 2, dur: 3 });
}