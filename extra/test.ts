function debug_bitmap(b: CanvasImageSource) {
    const canvas = document.createElement("canvas")
    canvas.width = b.width
    canvas.height = b.height

    const ctx = canvas.getContext("2d")!
    let rect = ctx.drawImage(b, 0, 0)

    console.log("%c ", `
        font-size: 1px;
        padding: ${b.height / 2}px ${b.width / 2}px;
        background: url(${canvas.toDataURL()}) no-repeat;
        background-size: contain;
    `)
}

async function file_write(path: string, data: string | Blob | ArrayBuffer) {
    const root = await navigator.storage.getDirectory()
    const handle = await root.getFileHandle(path, {
        create: true
    })
    const writable = await handle.createWritable()
    await writable.write(data)
    await writable.close()
}

async function file_read(path: string): Promise<File> {
    const root = await navigator.storage.getDirectory()
    const handle = await root.getFileHandle(path)
    return await handle.getFile()
}

function canvas_draw_test_gradient(ctx: CanvasRenderingContext2D, w: number, h: number, t: number,) {
    const gr = ctx.createLinearGradient(0, 0, w, h)

    t *= 10

    const eps = 0.001
    let last = ''

    for (let i = 0; i < 6; i++) {
        const p = i / 5
        const brightness = 0.7

        const r = (Math.cos(t + p * Math.PI * 2) * 0.5 + 0.5) * 255 * brightness
        const g = (Math.cos(t + p * Math.PI * 2 + Math.PI * 2 / 3) * 0.5 + 0.5) * 255 * brightness
        const b = (Math.cos(t + p * Math.PI * 2 + Math.PI * 4 / 3) * 0.5 + 0.5) * 255 * brightness

        const color = `rgb(${r | 0},${g | 0},${b | 0})`

        if (i)
            gr.addColorStop(Math.max(0, p - eps), last)

        gr.addColorStop(p, color)
        last = color
    }


    ctx.fillStyle = gr
    ctx.fillRect(0, 0, w, h)
}

function make_vide_icon(src: Canvas) {
    canvas_draw_test_gradient(src, src.canvas.width, src.canvas.height, 0)
    let dst = canvas_create(src.canvas.width, src.canvas.height)
    const w = src.canvas.width
    const h = src.canvas.height

    const tmp = document.createElement('canvas')
    tmp.width = w
    tmp.height = h

    const g = tmp.getContext('2d')!

    const m = g.measureText('V')

    const gx = w / 2 - (m.actualBoundingBoxLeft + m.actualBoundingBoxRight) / 2
    const gy = h / 2 + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2

    // Draw the V mask.
    g.font = `1000 ${Math.min(w, h) * 1.5}px Consolas, monospace`
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillStyle = 'white'
    g.fillText('V', w / 2, h / 2)

    // Keep only the source inside the V.
    g.globalCompositeOperation = 'source-in'
    g.drawImage(src.canvas, 0, 0)

    // Output.
    dst.clearRect(0, 0, w, h)
    dst.drawImage(tmp, 0, 0)

    //crop here you shit

    createImageBitmap(dst.canvas).then(bitmap => {
        debug_bitmap(bitmap)
    })


    const a = document.createElement('a')
    a.download = 'vide.png'
    a.href = dst.canvas.toDataURL('image/png')
    a.click()
}