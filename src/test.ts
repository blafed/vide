// function debug_bitmap(b: CanvasImageSource | Canvas) {
//     if (b instanceof CanvasRenderingContext2D) b = b.canvas;

//     const canvas = document.createElement("canvas")
//     canvas.width = b.width
//     canvas.height = b.height

//     const ctx = canvas.getContext("2d")!
//     let rect = ctx.drawImage(b, 0, 0)

//     console.log("%c ", `
//         font-size: 1px;
//         padding: ${b.height / 2}px ${b.width / 2}px;
//         background: url(${canvas.toDataURL()}) no-repeat;
//         background-size: contain;
//     `)
// }

// async function mock_file_write(path: string, data: string | Blob | ArrayBuffer) {
//     const root = await navigator.storage.getDirectory()
//     const handle = await root.getFileHandle(path, {
//         create: true
//     })
//     const writable = await handle.createWritable()
//     await writable.write(data)
//     await writable.close()
// }

// async function mock_file_read(path: string): Promise<File> {
//     const root = await navigator.storage.getDirectory()
//     const handle = await root.getFileHandle(path)
//     return await handle.getFile()
// }


// function VIDE_icon(c: Canvas = canvas_create(64, 64)) {
//     const w = c.canvas.width, h = c.canvas.height

//     c.clearRect(0, 0, w, h)

//     c.font = `bold ${Math.min(w, h) * 1.5}px Consolas, monospace`
//     c.textAlign = 'center'
//     c.textBaseline = 'middle'
//     c.fillStyle = '#fff'
//     c.fillText('V', w / 2, h / 2)
//     c.fillStyle = '#000'
//     c.fillText('^', w / 2, h * 1.2)

//     let a = document.createElement('a')
//     a.download = 'vide.png'
//     a.href = c.canvas.toDataURL('image/png')
//     a.click()

//     createImageBitmap(c.canvas).then(bitmap => {
//         debug_bitmap(bitmap)
//     })

// }

// function test_rw() {
//     //AI vommit
//     let w = new Writer()

//     w.u8(255)
//     w.i8(-5)
//     w.u16(1234)
//     w.i16(-1234)
//     w.u32(123456)
//     w.i32(-123456)
//     w.f32(1.5)
//     w.f64(3.14159)
//     w.str("hello")
//     w.rect([1, 2, 3, 4])
//     w.color([5, 6, 7, 8])
//     w.buffer(new ArrayBuffer(100))

//     let r = new Reader(w.get())

//     console.assert(r.u8() == 255)
//     console.assert(r.i8() == -5)
//     console.assert(r.u16() == 1234)
//     console.assert(r.i16() == -1234)
//     console.assert(r.u32() == 123456)
//     console.assert(r.i32() == -123456)
//     console.assert(Math.abs(r.f32() - 1.5) < 0.001)
//     console.assert(Math.abs(r.f64() - 3.14159) < 0.000001)
//     console.assert(r.str() == "hello")
//     console.assert(JSON.stringify(r.rect()) == JSON.stringify([1, 2, 3, 4]))
//     console.assert(JSON.stringify(r.color()) == JSON.stringify([5, 6, 7, 8]))
//     console.assert(r.buffer().byteLength == 100)
//     console.log('all ok')
// }

// async function test_saveproject() {
//     let bufferA, bufferB

//     let w = new Writer()
//     let res = editor.res, files = editor.files, json = editor.getjsondata()
//     console.log('initial', res, files)

//     let b = await project_bytes(res, files, w, json)
//     console.log('serialized', w)
//     bufferA = w.get()

//     let reader = new Reader(bufferA)

//     let result = await project_debytes(reader)
//     console.log('parsed', result.res, result.files, result.json)

//     w = new Writer()
//     b = await project_bytes(result.res, result.files, w, result.json)
//     console.log('serialized again', w)
//     bufferB = w.get()

//     console.assert(bufferA.byteLength == bufferB.byteLength)
//     let i = 0
//     for (i = 0; i < bufferA.byteLength; i++) {
//         if (bufferA[i] != bufferB[i]) {
//             console.error('bytes differ at', i)
//             return
//         }
//     }

//     console.log('all ok')
// }

// //TODO move to editor.ts
// interface EditorJsonState {
//     assets: { name: string, res: int }[],
//     scene: int
// }

// function editor_get_json() {
//     return JSON.stringify({ assets: editor.assets.map(a => ({ name: a.path, res: editor.res.indexOf(a.res) })), scene: editor.res.indexOf(editor.scene) })
// }

// function editor_set_json(json: string) {
//     let state: EditorJsonState = JSON.parse(json)
//     editor.assets = state.assets.map(a => ({ path: a.name, res: editor.res[a.res] }))
//     editor.scene = editor.res[state.scene] as Scene
// }


// async function test_export() {
//     let res = res_create_test()
//     let width = 1920, height = 1024, dur = 1
//     let ctx = canvas_create(width, height)
//     let xideo = xideo_create(width, height, dur)
//     let frames = res_vrames(res, ctx, 8, 0, dur)
//     xideo_add(frames, xideo)
//     let blob = await xideo_finish(xideo)
//     console.log('all ok', blob)

//     let video = await res_create(new File([blob], 'test.mp4', { type: 'video/mp4' }), ResType.Video)
//     editor.new_asset(video!, 'exported')

//     // console.log(res_len(video), res_len(res))
//     return video
// }