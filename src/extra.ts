namespace effects {
    export function something(c: Canvas, t: float, r: Rect) {
        let x = r[0]
        let y = r[1]
        let w = r[2]
        let h = r[3]

        let cx = x + w * 0.5
        let cy = y + h * 0.5
        let s = Math.min(w, h)

        c.fillRect(x, y, w, h)

        let blast = 1 - Math.pow(1 - t, 3)

        for (let ring = 0; ring < 60; ring++) {
            let base = (ring + 1) / 60

            c.beginPath()

            for (let i = 0; i <= 500; i++) {
                let a = i / 500 * Math.PI * 2

                let n =
                    Math.sin(a * 5 + ring * 0.3) *
                    Math.sin(a * 9 + ring * 0.7) *
                    Math.sin(a * 17 + ring * 0.1)

                let rr =
                    blast *
                    base *
                    (0.15 + Math.abs(n) * 0.25)

                let px = cx + Math.cos(a) * rr * s * 0.45
                let py = cy + Math.sin(a) * rr * s * 0.45

                if (i == 0)
                    c.moveTo(px, py)
                else
                    c.lineTo(px, py)
            }

            c.stroke()
        }

        for (let i = 0; i < 2000; i++) {
            let a = i * 2.399963229728653

            let speed =
                0.1 +
                0.9 *
                Math.abs(
                    Math.sin(i * 12.345)
                )

            let rr =
                blast *
                speed *
                s * 0.45

            let px = cx + Math.cos(a) * rr
            let py = cy + Math.sin(a) * rr

            let sz =
                (1 - blast * 0.5) *
                (0.002 + speed * 0.004) *
                s

            c.fillStyle = "#fff"
            c.fillRect(
                px - sz * 0.5,
                py - sz * 0.5,
                sz,
                sz
            )
        }

        c.lineWidth = s * 0.01

        c.beginPath()

        for (let i = 0; i <= 1000; i++) {
            let a = i / 1000 * Math.PI * 2

            let n =
                Math.sin(a * 13) *
                Math.sin(a * 21)

            let rr =
                blast *
                (0.25 + n * 0.05)

            let px = cx + Math.cos(a) * rr * s * 0.45
            let py = cy + Math.sin(a) * rr * s * 0.45

            if (i == 0)
                c.moveTo(px, py)
            else
                c.lineTo(px, py)
        }

        c.stroke()
    }
    export function scene(c: Canvas, t: float, r: Rect) {
        let x = r[0]
        let y = r[1]
        let w = r[2]
        let h = r[3]

        c.fillStyle = "#000"
        c.fillRect(x, y, w, h)

        c.strokeStyle = "#0f0"
        c.lineWidth = 2

        c.beginPath()

        for (let i = 0; i <= w; i++) {
            let u = i / w

            let yy =
                Math.sin(u * 20 + t * 8) * 0.3 +
                Math.sin(u * 60 - t * 12) * 0.1

            let px = x + i
            let py = y + h * (0.5 - yy)

            if (i == 0)
                c.moveTo(px, py)
            else
                c.lineTo(px, py)
        }

        c.stroke()
    }
    export function epic(c: CanvasRenderingContext2D, t: float, r: Rect) {
        let x = r[0]
        let y = r[1]
        let w = r[2]
        let h = r[3]

        let cx = x + w * 0.5
        let cy = y + h * 0.5

        c.fillStyle = "#020408"
        c.fillRect(x, y, w, h)

        // stars
        for (let i = 0; i < 200; i++) {
            let px = x + ((i * 137.5) % w)
            let py = y + ((i * 91.7) % h)
            let s = 1 + (i % 3)

            c.fillStyle = color(1, 1, 1, 0.2 + 0.8 * Math.abs(Math.sin(t * 30 + i)))
            c.fillRect(px, py, s, s)
        }

        // giant pulsating core
        let pulse = 0.5 + 0.5 * Math.sin(t * Math.PI * 2)

        let grad = c.createRadialGradient(
            cx, cy, 0,
            cx, cy, w * 0.3 + pulse * w * 0.1
        )

        grad.addColorStop(0, "#ffffffff")
        grad.addColorStop(0.1, "#80c0ffff")
        grad.addColorStop(0.5, "#2060ffff")
        grad.addColorStop(1, "#00000000")

        c.fillStyle = grad
        c.fillRect(x, y, w, h)

        // orbit rings
        c.strokeStyle = "#40ffffff"

        for (let i = 0; i < 8; i++) {
            let rr = w * (0.1 + i * 0.05)

            c.lineWidth = 1 + i * 0.5

            c.beginPath()
            c.arc(cx, cy, rr, 0, Math.PI * 2)
            c.stroke()
        }

        // orbiting particles
        for (let i = 0; i < 64; i++) {
            let a = t * 6 + i * 0.3
            let rr = w * (0.12 + (i % 8) * 0.05)

            let px = cx + Math.cos(a) * rr
            let py = cy + Math.sin(a * 1.7) * rr

            c.fillStyle = color(
                0.5 + 0.5 * Math.sin(i),
                0.5 + 0.5 * Math.sin(i + 2),
                0.5 + 0.5 * Math.sin(i + 4),
                1
            )

            c.beginPath()
            c.arc(px, py, 2 + (i % 4), 0, Math.PI * 2)
            c.fill()
        }

        // energy beams
        c.lineWidth = 3

        for (let i = 0; i < 24; i++) {
            let a = t * 2 + i * Math.PI / 12

            c.strokeStyle = color(
                0.2,
                0.8,
                1,
                0.15
            )

            c.beginPath()
            c.moveTo(cx, cy)
            c.lineTo(
                cx + Math.cos(a) * w,
                cy + Math.sin(a) * h
            )
            c.stroke()
        }

        // rotating hexagon swarm
        c.strokeStyle = "#ffffffff"

        for (let k = 0; k < 12; k++) {
            let rr = w * (0.15 + k * 0.03)
            let rot = t * (k + 1)

            c.beginPath()

            for (let i = 0; i <= 6; i++) {
                let a = rot + i * Math.PI / 3

                let px = cx + Math.cos(a) * rr
                let py = cy + Math.sin(a) * rr

                if (i == 0)
                    c.moveTo(px, py)
                else
                    c.lineTo(px, py)
            }

            c.stroke()
        }
    }
    export function circle_grow(c: Canvas, t: float, r: Rect) {
        let cx = r[0] + r[2] / 2
        let cy = r[1] + r[3] / 2
        let radius = min(r[2], r[3]) / 2 * t

        c.beginPath()
        c.arc(cx, cy, radius, 0, TAU)
        c.fill()
    }
    export function square_outline(c: Canvas, t: float, r: Rect, ccw = false) {
        //time normalized
        //space absolute
        const n = floor(t * 4)

        c.beginPath()

        let p = rect_boundary_point(r, 0)
        c.moveTo(p[0], p[1])

        const s = ccw ? -1 : 1

        for (let i = 1; i <= n; i++) {
            p = rect_boundary_point(r, s * i / 4)
            c.lineTo(p[0], p[1])
        }

        p = rect_boundary_point(r, s * t)
        c.lineTo(p[0], p[1])

        c.stroke()
    }

    export function square_outline_blend(c: Canvas, t: float, r: Rect, ccw = 0.5) {
        square_outline(c, t * (1 - ccw), r, false)
        square_outline(c, t * ccw, r, true)
    }

    export function circle_outline(c: Canvas, t: float, r: Rect, ccw = false) {
        let [x, y, w, h] = r

        t = wrap01(t)

        const margin = c.lineWidth * 0.5
        c.lineCap = "round"

        const cx = x + w * 0.5
        const cy = y + h * 0.5

        const a0 = 0
        const a1 = t * PI * 2

        c.beginPath()
        c.ellipse(cx, cy, w * 0.5 - margin, h * 0.5 - margin, 0, a0, ccw ? -a1 : a1)
        c.stroke()
    }

    export function circle_outline_blend(c: Canvas, t: float, r: Rect, ccw = 0.5) {
        circle_outline(c, t * (1 - ccw), r, false)
        circle_outline(c, t * ccw, r, true)
    }
}