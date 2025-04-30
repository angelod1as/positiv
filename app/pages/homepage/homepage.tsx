import { HomePageAbout } from "./components/about/about"
import { HomePageCtaBanner } from "./components/cta-banner/home-page-cta-banner"
import { HomePageFounders } from "./components/founders/home-page-founders"
import { HomePageHero } from "./components/hero"
import { HomePageTestimonials } from "./components/testimonials/home-page-testimonials"

const Homepage = () => {
  return (
    <div>
      <HomePageHero />
      <HomePageAbout />
      <HomePageTestimonials />
      <HomePageCtaBanner />
      <HomePageFounders />
    </div>
  )
}

export default Homepage
