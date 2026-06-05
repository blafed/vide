namespace test {
    export async function render_video(vid: Video, aud: Audio) {
        console.log(vid)
        let rect = rect_fit(vid.width, vid.height, ctx.canvas.width, ctx.canvas.height)
        draw_audio_on_track(aud, track_video.getContext('2d'), 0, aud.duration)

        while (1)
            for (let frame of vid.frames) {
                await new Promise<void>(ok => setTimeout(() => ok(), 1 / vid.fps * 1000))
                ctx.drawImage(frame.bitmap!, rect[0], rect[1], rect[2], rect[3])
                console.log(frame)
            }
    }
}

