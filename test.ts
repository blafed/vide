namespace test {
    export async function render_video(vid: Video) {
        console.log(vid)
        ctx.canvas.width = vid.width
        ctx.canvas.height = vid.height
        for (let frame of vid.frames) {
            await new Promise<void>(ok => setTimeout(() => ok(), 1 / vid.fps * 1000))
            ctx.drawImage(frame.bitmap!, 0, 0)
            console.log(frame)
        }
    }
}