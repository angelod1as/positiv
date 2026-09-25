export const homepageQuery = `*[_id == "homepage"][0]{
  hero{ title, subtitle },
  nextEvents{ title, subtitle, count },
  about{ title, cards[]{ _key, title, body } },
  testimonials{ title, subtitle, quotes[]{ _key, author, quote } },
  ctaBanner{ title, body },
  founders{
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
  feedback{ title, body, ctaLabel }
}`
