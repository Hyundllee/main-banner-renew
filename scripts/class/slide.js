import gsap, { Quart } from 'gsap'
import lottie from 'lottie-web'
import { Autoplay, Navigation, Parallax, Swiper, Pagination } from 'swiper'

Swiper.use([Parallax, Autoplay, Navigation, Pagination])

const BASE = 1920
const KV_VIEW = 3
const THEME_VIEW = 4

// 기존 호출 유지: new Slide(isFund ? 'FUND' : 'KODEX')
export default class Slide {
    constructor(type = 'KODEX') {
        this.type = type
        this.$root = document.querySelector('.kv-kodex')
        if (!this.$root) return

        this.$swiperEl = this.$root.querySelector(type === 'FUND' ? '.swiper' : '.kv-swiper')

        if (type === 'FUND') {
            this.setFundSwiper()
        } else if (type === 'KODEX') {
            this.setKvSwiper()
            this.setThemeSwiper()
            this.onResize = () => {
                if (this.swiper && !this.swiper.destroyed) {
                    this.swiper.params.spaceBetween = this.__vw(20)
                    this.swiper.update()
                }
                if (this.themeSwiper && !this.themeSwiper.destroyed) {
                    this.themeSwiper.params.spaceBetween = this.__vw(24)
                    this.themeSwiper.update()
                }
            }
            window.addEventListener('resize', this.onResize)
        }

        if (!this.$swiperEl) return
        this.onMouseEnter = () => this.$swiperEl.classList.add('is-hold')
        this.onMouseLeave = () => this.$swiperEl.classList.remove('is-hold')
        this.$swiperEl.addEventListener('mouseenter', this.onMouseEnter)
        this.$swiperEl.addEventListener('mouseleave', this.onMouseLeave)
    }

    // FUND: 최초 코드의 슬라이드 설정 유지
    setFundSwiper() {
        if (!this.$swiperEl) return
        gsap.set(this.$swiperEl, { x: '100%' })

        if (this.$swiperEl.querySelectorAll('.swiper-slide').length > 1) {
            this.swiper = new Swiper(this.$swiperEl, {
                speed: 800,
                loop: true,
                navigation: {
                    nextEl: this.$swiperEl.querySelector('.swiper-button-next'),
                    prevEl: this.$swiperEl.querySelector('.swiper-button-prev'),
                },
                pagination: {
                    el: this.$swiperEl.querySelector('.swiper-pagination'),
                    clickable: true,
                },
            })
            this.swiper.on('autoplayTimeLeft', (s, time, progress) => {
                this.$swiperEl.style.setProperty('--per', 1 - progress)
            })
        } else {
            this.$swiperEl.classList.add('no-swipe')
        }
        // 자동 넘김은 최초 코드처럼 비활성 상태입니다.
    }

    // FUND: 기존 호출 시점과 GSAP 카드 보정 / Lottie 로딩 유지
    start() {
        if (this.type !== 'FUND' || !this.$swiperEl || this.started || this.destroyed) return
        this.started = true
        this.timers = []
        this.lotties = []

        const render = () => {
            this.$swiperEl.querySelectorAll('.kv-slide-item').forEach((item) => {
                const rect = item.getBoundingClientRect()
                const x = rect.x < 0 ? rect.x * 0.2 : rect.x * 1.2
                item.querySelectorAll('.card').forEach((card, idx) => {
                    gsap.set(card, { clearProps: 'width, transform' })
                    if (rect.x > 0 && idx === 0) {
                        gsap.set(card, { width: card.clientWidth + rect.x })
                    }
                    gsap.set(card, { x: x < 0 ? x : Math.min(idx, 2) * x })
                })
            })
            this.raf = requestAnimationFrame(render)
        }
        this.raf = requestAnimationFrame(render)
        this.intro = gsap.to(this.$swiperEl, { x: '0%', duration: 1, ease: Quart.easeOut })

        this.$swiperEl.querySelectorAll('.lottie-content').forEach((el, idx) => {
            el.style.visibility = 'hidden'
            this.timers.push(setTimeout(() => this.loadLotties(el), 100 * idx + 1000))
        })
    }

    loadLotties(el) {
        if (this.type !== 'FUND' || this.destroyed) return
        lottie.useWebWorker(true)
        const srcPath = window.location.origin + el.getAttribute('src')
        const $wrap = el.closest('.v-wrap')
        const poster = $wrap ? $wrap.querySelector('.lottie-poster') : null
        const lottieAnim = lottie.loadAnimation({
            container: el,
            renderer: 'canvas',
            loop: true,
            autoplay: true,
            path: srcPath,
        })
        if (!this.lotties) this.lotties = []
        this.lotties.push(lottieAnim)
        lottieAnim.addEventListener('DOMLoaded', () => {
            if (this.destroyed) return
            if (poster) poster.remove()
            el.style.visibility = 'visible'
        })
    }

    // KODEX: 1920 기준 간격 계산
    __vw(size) {
        return (size / BASE) * window.innerWidth
    }

    // KODEX: 상단 3장 + 좌우 미리보기 / hover 카드 상세 노출
    setKvSwiper() {
        if (!this.$swiperEl) return
        const length = this.$swiperEl.querySelectorAll('.swiper-slide').length
        if (!length) return
        const isSwipe = length > KV_VIEW
        const $inner = this.$swiperEl.closest('.inner')
        if ($inner) $inner.classList.toggle('no-swipe', !isSwipe)
        const $controls = this.$swiperEl.closest('.kv-slide') || this.$root

        // 루프 없이 상품 개수만큼만 이동 / 끝 위치에서 다음 클릭 시 처음으로 복귀
        this.swiper = new Swiper(this.$swiperEl, {
            slidesPerView: KV_VIEW,
            spaceBetween: this.__vw(20),
            speed: 800,
            loop: false,
            rewind: true,
            watchSlidesProgress: true,
            allowTouchMove: isSwipe,
            navigation: {
                prevEl: $controls.querySelector('.swiper-button-prev'),
                nextEl: $controls.querySelector('.swiper-button-next'),
            },
            pagination: { el: $controls.querySelector('.swiper-pagination'), clickable: true },
        })

        // hover 중인 카드에만 is-open
        this.kvHoverEvents = this.swiper.slides.map(($slide) => {
            const enter = () => $slide.classList.add('is-open')
            const leave = () => $slide.classList.remove('is-open')
            $slide.addEventListener('mouseenter', enter)
            $slide.addEventListener('mouseleave', leave)
            return { $slide, enter, leave }
        })
    }

    // KODEX: 하단 테마 4장씩 이동 / 처음·마지막 화살표 비활성
    setThemeSwiper() {
        const $el = this.$root.querySelector('.theme-swiper')
        if (!$el) return
        const length = $el.querySelectorAll('.swiper-slide').length
        if (!length) return
        const isSwipe = length > THEME_VIEW
        const $inner = $el.closest('.inner')
        if ($inner) $inner.classList.toggle('no-swipe', !isSwipe)
        const $controls = $el.closest('.kv-theme') || this.$root

        this.themeSwiper = new Swiper($el, {
            slidesPerView: THEME_VIEW,
            slidesPerGroup: THEME_VIEW,
            spaceBetween: this.__vw(24),
            speed: 600,
            loop: false,
            watchSlidesProgress: true,
            allowTouchMove: isSwipe,
            navigation: {
                prevEl: $controls.querySelector('.theme-prev'),
                nextEl: $controls.querySelector('.theme-next'),
            },
            pagination: { el: $controls.querySelector('.theme-pagination'), clickable: true },
        })
    }

    // 페이지 종료 시 실행 중인 애니메이션 / 이벤트 정리
    destroy() {
        this.destroyed = true
        if (this.raf != null) cancelAnimationFrame(this.raf)
        if (this.intro) this.intro.kill()
        ;(this.timers || []).forEach((id) => clearTimeout(id))
        ;(this.lotties || []).forEach((animation) => animation.destroy())
        if (this.onResize) window.removeEventListener('resize', this.onResize)
        if (this.$swiperEl) {
            this.$swiperEl.removeEventListener('mouseenter', this.onMouseEnter)
            this.$swiperEl.removeEventListener('mouseleave', this.onMouseLeave)
        }
        ;(this.kvHoverEvents || []).forEach(({ $slide, enter, leave }) => {
            $slide.removeEventListener('mouseenter', enter)
            $slide.removeEventListener('mouseleave', leave)
        })
        if (this.swiper && !this.swiper.destroyed) this.swiper.destroy(true, true)
        if (this.themeSwiper && !this.themeSwiper.destroyed) this.themeSwiper.destroy(true, true)
    }
}
