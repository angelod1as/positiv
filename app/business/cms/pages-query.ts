import { ruleProjection } from "./rules-query"

export const pagesQuery = `*[_type == "page"]{
  _id,
  _updatedAt,
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
    _type == "nextEvents" => { title, subtitle, count, comingSoon },
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
    },
    _type == "statsSection" => {
      title,
      cards[]{
        _type,
        _key,
        unit,
        caption,
        _type == "statNumber" => { value },
        _type == "statRange" => { min, average, max },
        _type == "statComparison" => { before, beforeLabel, after, afterLabel }
      }
    },
    _type == "chartSection" => {
      title,
      summary,
      chartType,
      unit,
      series,
      rows[]{ _key, label, values, highlight }
    },
    _type == "callout" => { emoji, title, body, color },
    _type == "sideBySide" => {
      title,
      items[]{ _type, _key, emoji, title, body, color }
    },
    _type == "systemComponent" => { component },
    _type == "rulesSection" => {
      part,
      "title": select(
        part == "generalRules" => *[_id == "rules"][0].generalRulesTitle,
        part == "agreements" => *[_id == "rules"][0].agreementsTitle
      ),
      "subtitle": select(
        part == "generalRules" => *[_id == "rules"][0].generalRulesSubtitle,
        part == "agreements" => *[_id == "rules"][0].agreementsSubtitle
      ),
      "rules": select(
        part == "generalRules" => *[_id == "rules"][0].generalRules[]${ruleProjection},
        part == "agreements" => *[_id == "rules"][0].agreements[]${ruleProjection}
      )
    }
  },
  seo{ title, description, image{ alt, hotspot, crop, asset }, noIndex }
}`
