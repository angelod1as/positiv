export const pagesQuery = `*[_type == "page"]{
  _id,
  title,
  address,
  header[]{
    _type,
    _type == "homepageHero" => { title, subtitle },
    _type == "pageHero" => { title, subtitle },
    _type == "pageTitle" => { title, intro }
  },
  sections[]{
    _type,
    _key,
    _type == "nextEvents" => { title, subtitle, count },
    _type == "about" => { title, cards[]{ _key, title, body } },
    _type == "testimonials" => {
      title,
      subtitle,
      quotes[]{ _key, author, quote }
    },
    _type == "ctaBanner" => { title, body },
    _type == "founders" => {
      title,
      videoUrl,
      videoTitle,
      people[]->{
        _id,
        name,
        pronouns,
        instagram,
        photo{ alt, hotspot, crop, asset },
        bio
      }
    },
    _type == "feedback" => { title, body, ctaLabel },
    _type == "richTextSection" => { title, body },
    _type == "imageSection" => {
      image{
        alt,
        hotspot,
        crop,
        asset,
        "dimensions": asset->metadata.dimensions{ width, height }
      },
      caption
    }
  },
  seo{ title, description, image{ alt, hotspot, crop, asset }, noIndex }
}`
