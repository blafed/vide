//will contain: state + gui


class SpaceEditor {
    space: Canvas

    constructor(public el: HTMLElement) {
        this.space = canvas(el)!
    }

    items: Item[] = []

    update() { }
}

class TimeEditor {
    items: Item[] = []

    constructor(public el: HTMLElement) {
    }

    update() {
        update_over(this.el, this.items, (item, el) => {

        })
    }
}