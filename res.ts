
interface Video {
    width: int
    height: int
    frames: Frame[]
    fps: int
    duration: float
    el: HTMLVideoElement
}

interface Audio {
    srate: int
    channels: int
    length: int
    duration: float
    buffer: AudioBuffer
}


async function video_create(file: File, fps = 8) {
    const el = document.createElement('video')

    el.muted = true
    el.preload = 'auto'
    el.src = URL.createObjectURL(file)

    await new Promise<void>(ok => {
        el.onloadedmetadata = () => ok()
    })

    const frames: Frame[] = []

    let v: Video = { frames: frames, width: el.videoWidth, height: el.videoHeight, fps: fps, duration: el.duration, el: el }
    return v
}

async function audio_create(file: File) {
    let ctx = new AudioContext()
    let bytes = await file.arrayBuffer()
    let buffer = await ctx.decodeAudioData(bytes)
    let aud: Audio = {
        buffer,
        srate: buffer.sampleRate, channels: buffer.numberOfChannels,
        duration: buffer.duration,
        length: buffer.length
    }
    return aud
}

interface Image {
    bitmap: ImageBitmap
    width: int
    height: int
}

interface Frame {
    frame: number
    bitmap: ImageBitmap | null
}


async function video_decode(v: Video, from: float, to: float, progress?: (f: float) => void) {
    let count = Math.ceil((to - from) * v.fps)

    for (let i = 0; i < count; i++) {
        await video_seek(v.el, i / v.fps)
        let bitmap = await createImageBitmap(v.el)
        v.frames.push({ frame: i, bitmap })
        progress?.(i / count)
    }
}


async function video_seek(video: HTMLVideoElement, time: number) {
    return new Promise<void>(ok => {
        video.onseeked = () => ok()
        video.currentTime = time
    })
}