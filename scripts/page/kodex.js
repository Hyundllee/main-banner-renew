import Slide from '../class/slide.js'

export default class Main {
    constructor() {
        this.slide = null
    }

    load() {
        const $main = document.querySelector('.main')
        const isFund = $main ? $main.classList.contains('fund') : false

        this.slide = new Slide(isFund ? 'FUND' : 'KODEX')
        if (isFund) this.slide.start()
    }
}

const main = new Main()

window.addEventListener('DOMContentLoaded', () => {
    main.load()
})
