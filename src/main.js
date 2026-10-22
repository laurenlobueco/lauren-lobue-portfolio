
// Import Flowbite and CSS
import 'flowbite'
import './index.css'

// Import GSAP
// GSAP stands for GreenSock Animation Platform. It’s a JavaScript library for animating things on a web page: moving, scaling, fading, rotating, or changing the color of elements smoothly
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

// Register ScrollTrigger
gsap.registerPlugin(ScrollTrigger)

// Find the Strategy elements
const strategyScroll = document.querySelector('#strategy-scroll')
const strategySticky = document.querySelector('.strategy-sticky')
const strategyWheel = document.querySelector('.strategy-wheel')
const strategyReel = document.querySelector('#strategy-reel')
const strategyWords = gsap.utils.toArray('.strategy-word')

// Only run if all elements exist
if (
    strategyScroll &&
    strategySticky &&
    strategyWheel &&
    strategyReel &&
    strategyWords.length > 0
) {

    const totalWords = strategyWords.length

    function getStickyTop() {
        return parseFloat(getComputedStyle(strategySticky).top) || 0
    }

    function getFocusLine() {
        return strategyWords[0].offsetHeight * 1
    }

    /**
     * Calculate where the reel should move
     * so each word passes through the focus line
     */
    function getReelPosition(index) {

        const rowHeight = strategyWords[0].offsetHeight

        return (
            getFocusLine() -
            rowHeight / 2 -
            index * rowHeight
        )
    }

    /**
     * Make the active word larger and fully visible.
     * Fade surrounding words out.
     */
    function updateWords(position) {

        strategyWords.forEach((word, index) => {

            const distance = Math.abs(index - position)

            // Larger near the focus line
            // (1.3 max so the active word fits inside its row)
            const scale = gsap.utils.clamp(
                0.75,
                1.3,
                1.3 - distance * 0.3
            )

            // Fade away from the focus line
            const opacity = gsap.utils.clamp(
                0.12,
                1,
                1 - distance * 0.35
            )

            gsap.set(word, {
                scale: scale,
                opacity: opacity
            })
        })
    }

    // Center the first word
    gsap.set(strategyReel, {
        y: getReelPosition(0)
    })

    updateWords(0)

    // Check reduced-motion preference
    const prefersReducedMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
    ).matches

    if (!prefersReducedMotion) {

        gsap.to(strategyReel, {

            // Move from first word to last word
            y: () => getReelPosition(totalWords - 1),

            ease: 'none',

            scrollTrigger: {

                // Track the outer scrolling container
                trigger: strategyScroll,

                // Begin when the panel locks in place:
                // the container's top reaches the panel's sticky "top" line
                start: () => `top ${getStickyTop()}px`,

                // Finish when the panel lets go:
                // the container's bottom reaches the panel's bottom edge
                end: () => `bottom ${getStickyTop() + strategySticky.offsetHeight}px`,

                // Follow scrolling
                scrub: true,


                // Recalculate start/end on resize
                // (panel height and top change between desktop and mobile)
                invalidateOnRefresh: true,

                onUpdate: (self) => {

                    const position =
                        self.progress * (totalWords - 1)

                    updateWords(position)
                }
            }
        })

    } else {

        // Keep the first word visible
        gsap.set(strategyReel, {
            y: getReelPosition(0)
        })

        updateWords(0)
    }

    // Re-center on resize for reduced-motion users
    window.addEventListener('resize', () => {

        if (prefersReducedMotion) {

            gsap.set(strategyReel, {
                y: getReelPosition(0)
            })
        }
    })
}