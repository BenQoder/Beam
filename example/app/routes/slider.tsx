import { createRoute } from 'honox/factory'
import { Layout } from '../components/Layout'

export default createRoute((c) => {
  const authToken = c.get('beamAuthToken')

  return c.html(
    <Layout title="Animated Slider Demo" authToken={authToken}>
      <h1>Animated Slider with Tailwind</h1>
      <p class="text-muted">Using <code>beam-class</code> for smooth CSS transitions.</p>

      {/* Slider */}
      <div class="slider-demo">
        <div beam-state='{"slide": 0, "total": 4}' class="slider-container">

          {/* Slides */}
          <div class="slides-wrapper">
            <div
              beam-class="{ active: slide === 0, 'slide-left': slide > 0 }"
              class="slide slide-1"
            >
              <h2>Slide 1</h2>
              <p>Welcome to Beam Reactivity</p>
            </div>

            <div
              beam-class="{ active: slide === 1, 'slide-right': slide < 1, 'slide-left': slide > 1 }"
              class="slide slide-2"
            >
              <h2>Slide 2</h2>
              <p>Zero dependencies, pure HTML</p>
            </div>

            <div
              beam-class="{ active: slide === 2, 'slide-right': slide < 2, 'slide-left': slide > 2 }"
              class="slide slide-3"
            >
              <h2>Slide 3</h2>
              <p>Fine-grained reactivity</p>
            </div>

            <div
              beam-class="{ active: slide === 3, 'slide-right': slide < 3 }"
              class="slide slide-4"
            >
              <h2>Slide 4</h2>
              <p>Works everywhere</p>
            </div>
          </div>

          {/* Navigation Arrows */}
          <button beam-click="slide = (slide - 1 + total) % total" class="nav-btn nav-prev">
            &#8592;
          </button>
          <button beam-click="slide = (slide + 1) % total" class="nav-btn nav-next">
            &#8594;
          </button>

          {/* Dots */}
          <div class="dots">
            <button beam-click="slide = 0" beam-class="{ active: slide === 0 }" class="dot"></button>
            <button beam-click="slide = 1" beam-class="{ active: slide === 1 }" class="dot"></button>
            <button beam-click="slide = 2" beam-class="{ active: slide === 2 }" class="dot"></button>
            <button beam-click="slide = 3" beam-class="{ active: slide === 3 }" class="dot"></button>
          </div>

          {/* Counter */}
          <div class="slide-counter">
            <span beam-text="slide + 1"></span> / <span beam-text="total"></span>
          </div>
        </div>
      </div>

      {/* Fade Slider */}
      <h2 style="margin-top: 3rem;">Fade Transition Variant</h2>
      <div class="slider-demo">
        <div beam-state='{"slide": 0, "total": 3}' class="slider-container fade-slider">

          <div class="slides-wrapper">
            <div beam-class="{ active: slide === 0 }" class="slide slide-fade slide-a">
              <h2>Panel A</h2>
              <p>Fade in/out effect</p>
            </div>
            <div beam-class="{ active: slide === 1 }" class="slide slide-fade slide-b">
              <h2>Panel B</h2>
              <p>Smooth opacity transitions</p>
            </div>
            <div beam-class="{ active: slide === 2 }" class="slide slide-fade slide-c">
              <h2>Panel C</h2>
              <p>No JavaScript animations needed</p>
            </div>
          </div>

          <button beam-click="slide = (slide - 1 + total) % total" class="nav-btn nav-prev">&#8592;</button>
          <button beam-click="slide = (slide + 1) % total" class="nav-btn nav-next">&#8594;</button>

          <div class="dots">
            <button beam-click="slide = 0" beam-class="{ active: slide === 0 }" class="dot"></button>
            <button beam-click="slide = 1" beam-class="{ active: slide === 1 }" class="dot"></button>
            <button beam-click="slide = 2" beam-class="{ active: slide === 2 }" class="dot"></button>
          </div>
        </div>
      </div>

      {/* Code Example */}
      <h2 style="margin-top: 3rem;">How It Works</h2>
      <pre class="code-block">{`<div beam-state='{"slide": 0, "total": 4}' class="slider">

  <!-- Each slide uses beam-class for animations -->
  <div beam-class="{
    active: slide === 0,
    'slide-left': slide > 0
  }" class="slide">
    Slide 1
  </div>

  <div beam-class="{
    active: slide === 1,
    'slide-right': slide < 1,
    'slide-left': slide > 1
  }" class="slide">
    Slide 2
  </div>

  <!-- Navigation -->
  <button beam-click="slide = (slide - 1 + total) % total">Prev</button>
  <button beam-click="slide = (slide + 1) % total">Next</button>

  <!-- Dots -->
  <button beam-click="slide = 0" beam-class="{ active: slide === 0 }"></button>
  <button beam-click="slide = 1" beam-class="{ active: slide === 1 }"></button>

</div>

<style>
.slide {
  position: absolute;
  inset: 0;
  transition: all 0.5s ease-out;
  opacity: 0;
  transform: translateX(100%);
}
.slide.active {
  opacity: 1;
  transform: translateX(0);
}
.slide.slide-left {
  transform: translateX(-100%);
}
.slide.slide-right {
  transform: translateX(100%);
}
</style>`}</pre>

      <style>{`
        .slider-demo {
          margin: 2rem 0;
        }

        .slider-container {
          position: relative;
          width: 100%;
          max-width: 600px;
          margin: 0 auto;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        }

        .slides-wrapper {
          position: relative;
          height: 300px;
        }

        .slide {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: white;
          text-align: center;
          transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
          opacity: 0;
          transform: translateX(100%);
        }

        .slide h2 {
          font-size: 2.5rem;
          margin: 0 0 0.5rem;
          font-weight: 700;
        }

        .slide p {
          font-size: 1.1rem;
          opacity: 0.9;
          margin: 0;
        }

        /* Slide positions */
        .slide.active {
          opacity: 1;
          transform: translateX(0);
        }

        .slide.slide-left {
          opacity: 0;
          transform: translateX(-100%);
        }

        .slide.slide-right {
          opacity: 0;
          transform: translateX(100%);
        }

        /* Slide colors */
        .slide-1 { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        .slide-2 { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
        .slide-3 { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
        .slide-4 { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); }
        .slide-a { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); }
        .slide-b { background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%); color: #333; }
        .slide-c { background: linear-gradient(135deg, #d299c2 0%, #fef9d7 100%); color: #333; }

        /* Fade variant */
        .fade-slider .slide {
          transform: none;
        }
        .fade-slider .slide.active {
          opacity: 1;
        }
        .fade-slider .slide:not(.active) {
          opacity: 0;
        }
        .slide-fade {
          transform: none !important;
        }

        /* Navigation buttons */
        .nav-btn {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 44px;
          height: 44px;
          border: none;
          border-radius: 50%;
          background: rgba(255,255,255,0.2);
          color: white;
          font-size: 1.25rem;
          cursor: pointer;
          transition: all 0.2s;
          backdrop-filter: blur(4px);
        }

        .nav-btn:hover {
          background: rgba(255,255,255,0.4);
          transform: translateY(-50%) scale(1.1);
        }

        .nav-prev { left: 16px; }
        .nav-next { right: 16px; }

        /* Dots */
        .dots {
          position: absolute;
          bottom: 16px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 8px;
        }

        .dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          border: none;
          background: rgba(255,255,255,0.4);
          cursor: pointer;
          transition: all 0.2s;
          padding: 0;
        }

        .dot:hover {
          background: rgba(255,255,255,0.6);
        }

        .dot.active {
          background: white;
          transform: scale(1.2);
        }

        /* Counter */
        .slide-counter {
          position: absolute;
          top: 16px;
          right: 16px;
          background: rgba(0,0,0,0.3);
          color: white;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.875rem;
          backdrop-filter: blur(4px);
        }

        /* Code block */
        .code-block {
          background: #1f2937;
          color: #e5e7eb;
          padding: 1.5rem;
          border-radius: 8px;
          overflow-x: auto;
          font-size: 0.85rem;
          line-height: 1.6;
        }

        .text-muted {
          color: #6b7280;
        }
      `}</style>
    </Layout>
  )
})
