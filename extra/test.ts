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

async function mock_file_write(path: string, data: string | Blob | ArrayBuffer) {
    const root = await navigator.storage.getDirectory()
    const handle = await root.getFileHandle(path, {
        create: true
    })
    const writable = await handle.createWritable()
    await writable.write(data)
    await writable.close()
}

async function mock_file_read(path: string): Promise<File> {
    const root = await navigator.storage.getDirectory()
    const handle = await root.getFileHandle(path)
    return await handle.getFile()
}


function VIDE_icon(c: Canvas = canvas_create(64, 64)) {
    const w = c.canvas.width, h = c.canvas.height

    c.clearRect(0, 0, w, h)

    c.font = `bold ${Math.min(w, h) * 1.5}px Consolas, monospace`
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    c.fillStyle = '#fff'
    c.fillText('V', w / 2, h / 2)
    c.fillStyle = '#000'
    c.fillText('^', w / 2, h * 1.2)

    let a = document.createElement('a')
    a.download = 'vide.png'
    a.href = c.canvas.toDataURL('image/png')
    a.click()

    createImageBitmap(c.canvas).then(bitmap => {
        debug_bitmap(bitmap)
    })

}