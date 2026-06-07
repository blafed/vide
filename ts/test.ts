function debug_bitmap(b: ImageBitmap) {
    const canvas = document.createElement("canvas")
    canvas.width = b.width
    canvas.height = b.height

    const ctx = canvas.getContext("2d")!
    let rect =
        ctx.drawImage(b, 0, 0, 64, 64)

    console.log("%c ", `
        font-size: 1px;
        padding: ${b.height / 2}px ${b.width / 2}px;
        background: url(${canvas.toDataURL()}) no-repeat;
        background-size: contain;
    `)
}