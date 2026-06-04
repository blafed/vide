
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
}

async function video_create(file: File, fps = 8) {
    const vid = document.createElement('video')

    vid.muted = true
    vid.preload = 'auto'
    vid.src = URL.createObjectURL(file)

    await new Promise<void>(ok => {
        vid.onloadedmetadata = () => ok()
    })

    const frames: Frame[] = []
    let count = Math.ceil(vid.duration * fps)

    for (let i = 0; i < count; i++) {
        await video_seek(vid, i / fps)
        let bitmap = await createImageBitmap(vid)
        frames.push({ frame: i, bitmap })
    }

    return <Video>{ frames, width: vid.videoWidth, height: vid.videoHeight, fps, duration: vid.duration }
}


async function video_seek(video: HTMLVideoElement, time: number) {
    return new Promise<void>(ok => {
        video.onseeked = () => ok()
        video.currentTime = time
    })
}