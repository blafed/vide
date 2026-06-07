

function res_type(f: File) {
    if (f.type.startsWith("image/"))
        return ResType.Image
    else if (f.type.startsWith("video/"))
        return ResType.Video
    else if (f.type.startsWith("audio/"))
        return ResType.Audio
    return ResType.Unknown
}

async function res_create_video(f: File, fps: int) {
    const el = document.createElement('video')

    el.muted = true
    el.preload = 'auto'
    el.src = URL.createObjectURL(f)

    await new Promise<void>(ok => {
        el.onloadedmetadata = () => ok()
    })

    let length = Math.ceil(el.duration * fps)
    const frames = new Array(length)

    let v: VideoRes = {
        type: ResType.Video, file: f,
        frames: frames, width: el.videoWidth, height: el.videoHeight, fps: fps, duration: el.duration, el: el
    }
    return v
}

async function res_create_image(f: File) {
    const bitmap = await createImageBitmap(f)
    let res: ImageRes = {
        file: f, type: ResType.Image,
        bitmap, width: bitmap.width, height: bitmap.height
    }
    return res
}

async function res_create_audio(f: File) {
    let ctx = new AudioContext()
    let bytes = await f.arrayBuffer()
    try {
        let buffer = await ctx.decodeAudioData(bytes)

        let res: AudioRes = {
            type: ResType.Audio,
            file: f,
            buffer,
            srate: buffer.sampleRate, channels: buffer.numberOfChannels,
            duration: buffer.duration,
            length: buffer.length
        }
        return res
    } catch { return null }
}


async function video_decode(v: VideoRes, from: float, to: float, skip_exist = false) {
    let start = Math.floor(from * v.fps)
    let end = Math.ceil(to * v.fps)

    for (let i = start; i < end; i++) {
        if (v.frames[i] && skip_exist)
            continue
        await video_seek(v.el, i / v.fps)
        let bitmap = await createImageBitmap(v.el)

        v.frames[i]?.close()
        v.frames[i] = bitmap
    }
}

async function video_seek(video: HTMLVideoElement, time: number) {
    return new Promise<void>(ok => {
        video.onseeked = () => ok()
        video.currentTime = time
    })
}


function video_draw_frames(vid: VideoRes, ctx: CanvasRenderingContext2D, from: float = 0, to: float = vid.duration) {
    let start = Math.floor(from * vid.fps)
    let end = Math.ceil(to * vid.fps)

    start = clamp(start, 0, vid.frames.length)
    end = clamp(end, 0, vid.frames.length)

    let count = end - start
    if (count <= 0)
        return

    let fw = ctx.canvas.width / count


    for (let i = start; i < end; i++) {
        let x = Math.floor((i - start) * fw)
        let w = Math.ceil(fw)
        let frame = vid.frames[i]
        if (!frame)
            continue

        ctx.drawImage(frame, x, 0, w, ctx.canvas.height)
    }
}

function audio_draw_frames(aud: AudioRes, ctx: CanvasRenderingContext2D, from: float = 0, to: float = aud.duration) {
    let start = Math.floor(from * aud.srate)
    let end = Math.ceil(to * aud.srate)

    start = clamp(start, 0, aud.length)
    end = clamp(end, 0, aud.length)

    let count = end - start
    if (count <= 0)
        return

    let samples = aud.buffer.getChannelData(0)
    let step = count / ctx.canvas.width

    const cy = ctx.canvas.height / 2

    ctx.strokeStyle = "black"
    ctx.beginPath()

    for (let x = 0; x < ctx.canvas.width; x++) {
        const a = Math.floor(start + x * step)
        const b = Math.floor(start + (x + 1) * step)

        let min = 1
        let max = -1

        for (let i = a; i < b; i++) {
            let s = samples[i]

            if (s < min) min = s
            if (s > max) max = s
        }

        let y0 = cy + min * cy
        let y1 = cy + max * cy

        if (Math.abs(y1 - y0) < 1) {
            y0 = cy - 0.5
            y1 = cy + 0.5
        }

        ctx.moveTo(x, y0)
        ctx.lineTo(x, y1)
    }

    ctx.stroke()
}