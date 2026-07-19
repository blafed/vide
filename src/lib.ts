///<reference path="../lib/mp4box.js" />

interface Mp4Video {
    file: File, width: number, height: number, duration: float,
    codec: string; description?: Uint8Array; samples: Mp4Sample[]
}

interface Mp4Sample {
    alreadyRead: number;
    chunk_index: number;
    chunk_run_index: number;

    cts: number;
    dts: number;
    duration: number;
    timescale: number;

    data: Uint8Array;

    degradation_priority: number;
    depends_on: number;
    has_redundancy: number;
    is_depended_on: number;
    is_leading: number;

    is_sync: boolean;

    number: number;
    offset: number;
    size: number;

    track_id: number;
    description_index: number;

    description: any; // MP4Box sample description object
}

async function mp4_info(f: File): Promise<Mp4Video> {
    return new Promise(async (resolve, reject) => {
        const mp4box = MP4Box.createFile();

        //TODO support multi track
        mp4box.onReady = (info: any) => {
            try {
                const track = info.videoTracks[0];
                const trak = mp4box.getTrackById(track.id);
                const entry = trak.mdia.minf.stbl.stsd.entries[0];

                mp4box.setExtractionOptions(track.id);
                mp4box.start();

                mp4box.onSamples = (track_id: any, ref: any, samples: Mp4Sample[]) => {
                    console.log(track)
                    resolve({
                        file: f, codec: track.codec, width: track.track_width, height: track.track_height, duration: track.duration / track.timescale,
                        description: avcc_to_description(entry.avcC), samples
                    });
                };
            }
            catch (e) {
                reject(e);
            }
        };

        const buffer = await f.arrayBuffer();
        (buffer as any).fileStart = 0;

        mp4box.appendBuffer(buffer);
        mp4box.flush();
    });
}

function avcc_to_description(avcC: any): Uint8Array {
    const sps = avcC.SPS[0].data;
    const pps = avcC.PPS[0].data;

    const size =
        7 +
        2 + sps.length +
        1 +
        2 + pps.length;

    const out = new Uint8Array(size);
    let i = 0;

    out[i++] = avcC.configurationVersion;
    out[i++] = avcC.AVCProfileIndication;
    out[i++] = avcC.profile_compatibility;
    out[i++] = avcC.AVCLevelIndication;
    out[i++] = 0xfc | avcC.lengthSizeMinusOne;
    out[i++] = 0xe0 | 1;

    out[i++] = sps.length >> 8;
    out[i++] = sps.length & 255;
    out.set(sps, i);
    i += sps.length;

    out[i++] = 1;

    out[i++] = pps.length >> 8;
    out[i++] = pps.length & 255;
    out.set(pps, i);

    return out;
}

async function mp4_to_frames(file: File) {
    let info = await mp4_info(file)
    let frames: VideoFrame[] = []

    let decoder = new VideoDecoder({
        output: (v: VideoFrame) => {
            frames.push(v)
        },
        error: (e: DOMException) => {
            console.error(e)
        }
    })

    decoder.configure({ codec: info.codec, description: info.description })

    for (let sample of info.samples) {
        decoder.decode(
            new EncodedVideoChunk({
                type: sample.is_sync ? 'key' : 'delta',
                timestamp: mp4_sample_pts(sample),
                duration: mp4_sample_dur(sample),
                data: sample.data
            })
        );
    }

    await decoder.flush()

    return frames.sort((a, b) => a.timestamp - b.timestamp)
}

function mp4_samples_fps(samples: Mp4Sample[]) {
    let first = samples[0];
    let last = samples[samples.length - 1];

    let start = first.dts;
    let end = last.dts + last.duration;

    return samples.length * first.timescale / (end - start);
}

function mp4_sample_pts(s: Mp4Sample) {
    return s.cts / s.timescale
}
function mp4_sample_dur(s: Mp4Sample) {
    return s.duration / s.timescale
}
