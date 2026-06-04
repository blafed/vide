const enum Tween {
    Linear,

    InQuad,
    OutQuad,
    InOutQuad,

    InCubic,
    OutCubic,
    InOutCubic,

    InExpo,
    OutExpo,
    InOutExpo,
}

function tween(from: number, to: number, t: number, type: Tween = Tween.Linear): number {
    switch (type) {
        case Tween.InQuad: t = t * t; break
        case Tween.OutQuad: t = 1 - (1 - t) * (1 - t); break

        case Tween.InOutQuad:
            t = t < 0.5
                ? 2 * t * t
                : 1 - Math.pow(-2 * t + 2, 2) / 2
            break

        case Tween.InCubic: t = t * t * t; break
        case Tween.OutCubic: t = 1 - Math.pow(1 - t, 3); break

        case Tween.InOutCubic:
            t = t < 0.5
                ? 4 * t * t * t
                : 1 - Math.pow(-2 * t + 2, 3) / 2
            break

        case Tween.InExpo: t = t === 0 ? 0 : Math.pow(2, 10 * t - 10); break
        case Tween.OutExpo: t = t === 1 ? 1 : 1 - Math.pow(2, -10 * t); break

        case Tween.InOutExpo:
            if (t === 0) t = 0
            else if (t === 1) t = 1
            else if (t < 0.5)
                t = Math.pow(2, 20 * t - 10) / 2
            else
                t = (2 - Math.pow(2, -20 * t + 10)) / 2
            break
    }

    return from + (to - from) * t
}