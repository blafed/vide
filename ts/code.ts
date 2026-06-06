type int = number
type float = number
type ID = number

interface Project {
    file: File[]
    res: Res[]
    asset: Asset[]
}

const enum ResType {
    Unknown,
    Video, Audio, Image
}

type Res = VideoRes | AudioRes | ImageRes;

interface Resource {
    type: ResType
    file: File
}

interface VideoRes extends Resource {
    width: int
    height: int
    frames: (ImageBitmap | null)[]
    fps: int
    duration: float
    el: HTMLVideoElement
}


interface AudioRes extends Resource {
    srate: int
    channels: int
    length: int
    duration: float
    buffer: AudioBuffer
}

interface ImageRes extends Resource {
    bitmap: ImageBitmap
    width: int
    height: int
}

interface Asset {
    name: string
    res: Resource
    thumb: ImageBitmap
}



const project: Project = {
    file: [],
    res: [],
    asset: []
}

function main() {
    ui_init()
}
