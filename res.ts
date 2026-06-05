

interface Image {
    bitmap: ImageBitmap
    width: int
    height: int
}

interface Frame {
    frame: number
    bitmap: ImageBitmap | null
}

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

async function image_create(file: File): Promise<Image> {
    const bitmap = await createImageBitmap(file)
    return { bitmap, width: bitmap.width, height: bitmap.height }
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

const enum RawType { Unknown, Image, Video, Audio }
function raw_type(f: File) {
    if (f.type.startsWith("image/"))
        return RawType.Image
    else if (f.type.startsWith("video/"))
        return RawType.Video
    else if (f.type.startsWith("audio/"))
        return RawType.Audio
    return RawType.Unknown
}

type ID = int

interface Raw {
    type: RawType
    file: File
    name: string
}

interface Resource {
    raw: ID | null
}

interface Asset {
    res: ID
    name: string
}


// class Resources {
//     images: Image[] = []
//     videos: Video[] = []
//     audios: Audio[] = []

//     add_image(image: Image) { }
//     add_video(video: Video) { }
//     add_audio(audio: Audio) { }
// }