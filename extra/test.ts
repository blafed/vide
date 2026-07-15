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