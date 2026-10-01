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

    // KODEX: 상단 3장 + 좌우 미리보기 / 맨 왼쪽 카드 상세 노출
    setKvSwiper() {
        if (!this.$swiperEl) return
        const $wrapper = this.$swiperEl.querySelector('.swiper-wrapper')
        if (!$wrapper) return
        const $origin = [...$wrapper.children]
        this.originLength = $origin.length
        if (!this.originLength) return

        const isLoop = this.originLength > KV_VIEW
        const $inner = this.$swiperEl.closest('.inner')
        if ($inner) $inner.classList.toggle('no-swipe', !isLoop)

        // 원본 묶음 단위로 복제해 루프 경계에서도 상품 순서 유지
        this.clones = []
        if (isLoop) {
            while ($wrapper.children.length < KV_VIEW * 4) {
                $origin.forEach(($slide) => {
                    const $clone = $slide.cloneNode(true)
                    $wrapper.appendChild($clone)
                    this.clones.push($clone)
                })
            }
        }
        this.slideLength = $wrapper.children.length
        const $controls = this.$swiperEl.closest('.kv-slide') || this.$root
        this.$pagination = $controls.querySelector('.swiper-pagination')

        this.swiper = new Swiper(this.$swiperEl, {
            slidesPerView: KV_VIEW,
            centeredSlides: isLoop,
            initialSlide: isLoop ? 1 : 0,
            spaceBetween: this.__vw(20),
            speed: 800,
            loop: isLoop,
            watchSlidesProgress: true,
            allowTouchMove: isLoop,
            navigation: {
                prevEl: $controls.querySelector('.swiper-button-prev'),
                nextEl: $controls.querySelector('.swiper-button-next'),
            },
            pagination: { el: this.$pagination, clickable: true },
        })

        // 가운데를 2번 상품으로 맞춰, 왼쪽부터 1-2-3 순서로 시작
        if (isLoop) {
            for (let i = 0; i < this.slideLength && this.swiper.realIndex !== 1; i += 1) {
                this.swiper.slideNext(0, false)
            }
        }
        this.setOpenCard()
        this.swiper.on('slideChange', () => this.setOpenCard())
        this.swiper.on('paginationUpdate', () => this.setOpenCard())
        this.swiper.on('slideChangeTransitionEnd', () => {
            this.$swiperEl.style.setProperty('--index', this.swiper.realIndex)
        })
        this.swiper.on('autoplayTimeLeft', (s, time, progress) => {
            this.$swiperEl.style.setProperty('--per', 1 - progress)
        })

        // 기본 클릭 처리보다 먼저, 왼쪽 카드 기준으로 이동
        this.onPaginationClick = (e) => {
            const $bullet = e.target.closest('.swiper-pagination-bullet')
            if (!$bullet) return
            e.stopPropagation()
            const $bullets = [...this.$pagination.querySelectorAll('.swiper-pagination-bullet')]
            const index = $bullets.indexOf($bullet)
            if (isLoop && index >= 0 && index < this.originLength) {
                this.swiper.slideToLoop(index + 1)
            }
        }
        if (this.$pagination) this.$pagination.addEventListener('click', this.onPaginationClick, true)
    }

    setOpenCard() {
        const swiper = this.swiper
        if (!swiper || swiper.destroyed) return
        const index = swiper.params.loop
            ? (swiper.realIndex - 1 + this.slideLength) % this.slideLength : 0

        swiper.slides.forEach(($slide, i) => {
            const dataIndex = $slide.getAttribute('data-swiper-slide-index')
            $slide.classList.toggle('is-open', (dataIndex === null ? i : Number(dataIndex)) === index)
        })
        if (!this.$pagination) return
        this.$pagination.querySelectorAll('.swiper-pagination-bullet').forEach(($bullet, i) => {
            $bullet.classList.toggle('is-hidden', i >= this.originLength)
            $bullet.classList.toggle('swiper-pagination-bullet-active', i === index % this.originLength)
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
        if (this.$pagination) this.$pagination.removeEventListener('click', this.onPaginationClick, true)
        if (this.swiper && !this.swiper.destroyed) this.swiper.destroy(true, true)
        if (this.themeSwiper && !this.themeSwiper.destroyed) this.themeSwiper.destroy(true, true)
        ;(this.clones || []).forEach(($clone) => $clone.remove())
    }
}
