# Newsletter Segmentation Guide

## Why Segmentation Matters

Sending the right message to the right people increases:
- **Open rates** by 30-50%
- **Click rates** by 20-30%
- **Engagement** and community satisfaction
- **Retention** while reducing unsubscribes

## Segmentation Options Overview

### Three Levels of Targeting

1. **All Subscribers** - Everyone who opted in
2. **Basic Segmentation** - Simple, powerful filters (Phase 1)
3. **Advanced Segmentation** - Sophisticated targeting (Phase 2)

## Phase 1: Basic Segmentation

### Veterans vs Newbies

#### Veterans Only
**Who**: Members marked as veterans in the system
**Use Cases**:
- Advanced event announcements
- Mentor recruitment
- Community leadership opportunities
- Feedback requests on new initiatives

**Example Newsletter Ideas**:
- "Exclusive Veteran Meetup - Share Your Wisdom"
- "Become a Mentor - Help New Members"
- "Veterans: Your Input Needed on 2025 Events"

#### Newbies Only
**Who**: Members marked as newbies
**Use Cases**:
- Welcome series
- Beginner-friendly events
- Community guidelines
- First-timer tips

**Example Newsletter Ideas**:
- "Your First Event - What to Expect"
- "Newbie Night - Meet Other New Members"
- "Getting Started with Positiv - Complete Guide"

### Activity-Based Filters

#### Never Attended Events
**Who**: Registered but haven't attended any event
**Why Target**: High potential for first-time engagement
**Message Strategy**: 
- Address common concerns
- Highlight beginner-friendly events
- Share success stories from first-timers

**Example Content**:
```mdx
# Your First Event Awaits! 🌟

We noticed you haven't joined us yet. We understand - taking the first step can feel daunting.

## Why Not Start Here?

<EventCard 
  title="Newcomer Coffee Chat"
  date="2025-02-10"
  location="Cozy Café"
  spots={20}
/>

Small group, relaxed atmosphere, perfect for first-timers!
```

#### Has Attended Events
**Who**: Active participants with event history
**Why Target**: Engaged members, likely to attend again
**Message Strategy**:
- Exclusive or advanced events
- Community updates
- Appreciation messages

**Example Content**:
```mdx
# Thank You for Being Active! 💜

Your participation makes our community vibrant.

## Exclusive for Active Members

<EventCard 
  title="VIP Beach Day"
  date="2025-03-01"
  location="Private Beach Club"
  spots={30}
/>
```

#### New Registrations (Never Applied)
**Who**: Recently registered, haven't applied to events yet
**Time Window**: Customizable (e.g., last 30 days)
**Why Target**: Fresh interest, high engagement potential
**Message Strategy**:
- Welcome sequence
- Event recommendations
- Community introduction

**Settings**:
- Set "Activity Type" to "Never Applied"
- Set "Registered Within Days" to desired timeframe (e.g., 30)

#### Applied but Never Attended
**Who**: Showed interest but haven't participated
**Why Target**: Already interested, may need encouragement
**Message Strategy**:
- Address barriers to attendance
- Offer special incentives
- Highlight what they're missing

**Example Content**:
```mdx
# We Saved a Spot for You! 🪑

We noticed you applied before but couldn't make it. 
Life happens! Here's another chance:

<EventCard 
  title="Second Chance Sundae Social"
  date="2025-02-20"
  location="Ice Cream Parlor"
  spots={25}
/>

No pressure, just ice cream and new friends!
```

### Combining Basic Filters

You can combine multiple filters for precise targeting:

#### Example: Veteran Women
- Toggle: Veterans Only ✓
- Filter: Gender = Female
- Result: Experienced female members

#### Example: Newbie Recent Signups
- Toggle: Newbies Only ✓
- Activity: Never Applied
- Days: 14
- Result: Brand new members in their first two weeks

## Phase 2: Advanced Segmentation

### Activity Status Segments

#### Inactive Users (>90 days)
**Who**: Haven't attended in over 90 days
**Why Target**: Re-engagement opportunity
**Strategy**: Win-back campaigns

**Message Approach**:
- Acknowledge the absence
- Share what's new
- Special "welcome back" offer

**Example**:
```mdx
# We Miss You! 🫂

It's been a while since we've seen you. 
The community has grown and we'd love to have you back.

## Special Welcome Back Event

<EventCard 
  title="Reunion Brunch"
  date="2025-02-25"
  location="Sunny Terrace"
  spots={40}
/>

Reconnect with old friends and meet new ones!
```

#### Recent Attendees (Last 30 days)
**Who**: Currently active members
**Why Target**: High engagement, momentum
**Strategy**: Keep them engaged

**Message Types**:
- Thank you messages
- Exclusive previews
- Loyalty rewards
- Feedback requests

#### Lapsed Users (30-90 days)
**Who**: Starting to disengage
**Why Target**: Prevent full inactivity
**Strategy**: Re-activation before they go cold

**Message Approach**:
- Gentle reminder
- FOMO on upcoming events
- Personal touch

### Event Attendance Count Filters

#### High-Frequency Attendees
**Settings**: Min: 5, Max: (none)
**Who**: Super engaged members
**Use Cases**:
- VIP events
- Beta testing new formats
- Ambassador programs
- Special recognition

#### Moderate Attendees
**Settings**: Min: 2, Max: 4
**Who**: Regular but not frequent
**Use Cases**:
- Encouragement to attend more
- Mid-tier rewards
- Feedback on frequency preferences

#### Single Event Attendees
**Settings**: Exact: 1
**Who**: Tried once
**Use Cases**:
- Second event encouragement
- Feedback on first experience
- Special second-event offers

### Custom Date Ranges

#### Last Attendance Range
**Use**: Target based on specific time windows

**Examples**:
- **Holiday Season**: Last attended Dec 1 - Dec 31
- **Summer Events**: Last attended Jun 1 - Aug 31
- **Recent Month**: Last 30 days custom range

### Inactivity Period

**Settings**: Specific number of days inactive
**Examples**:
- 45 days: Just becoming inactive
- 60 days: Clear disengagement
- 120 days: Long-term inactive

### Specific Event Participation

**Use**: Target attendees of particular events
**Examples**:
- Follow-up for workshop series
- Reunion for special event attendees
- Surveys for specific event types

## Combining Advanced Filters

### Power User Segments

#### Example 1: Engaged Veterans
```
- Veterans Only: ✓
- Activity Status: Recent
- Event Count: Min 3
- Result: Highly engaged experienced members
```

#### Example 2: Re-engaging Newbies
```
- Newbies Only: ✓
- Activity Status: Lapsed
- Event Count: 1-2
- Result: New members who need encouragement
```

#### Example 3: Super Users
```
- Activity Status: Recent
- Event Count: Min 10
- Last 30 days
- Result: Most active current members
```

## Segmentation Strategy Guide

### Monthly Newsletter Calendar

**Week 1**: All subscribers - Major announcements
**Week 2**: Segmented - Activity based
**Week 3**: Segmented - Demographics
**Week 4**: Targeted - Re-engagement

### Segment Performance Benchmarks

| Segment | Expected Open Rate | Expected Click Rate |
|---------|-------------------|-------------------|
| All Subscribers | 20-25% | 2-3% |
| Veterans | 30-35% | 4-5% |
| Newbies | 25-30% | 3-4% |
| Recent Attendees | 40-45% | 6-8% |
| Inactive | 15-20% | 1-2% |
| Never Attended | 20-25% | 3-5% |

## Best Practices

### Do's ✅

1. **Test segment sizes first**
   - Always check recipient count
   - Ensure adequate audience size (minimum 10-20)

2. **Match message to segment**
   - Veterans: Advanced content
   - Newbies: Beginner-friendly
   - Inactive: Win-back offers

3. **Track performance by segment**
   - Compare open rates
   - Monitor unsubscribes
   - Adjust strategy based on data

4. **Use progressive segmentation**
   - Start broad
   - Refine based on results
   - Get more specific over time

### Don'ts ❌

1. **Over-segment**
   - Avoid segments < 10 people
   - Don't create 10+ segments

2. **Ignore context**
   - Don't send veteran content to newbies
   - Don't assume all inactive users are the same

3. **Forget to test**
   - Always preview with segmentation
   - Verify recipient list makes sense

## Segmentation Decision Tree

```
Start: What's your goal?
│
├── Announce new event
│   ├── Beginner-friendly? → Newbies only
│   ├── Advanced? → Veterans only
│   └── General? → All subscribers
│
├── Re-engagement
│   ├── Recently lapsed? → 30-90 days inactive
│   ├── Long-term inactive? → 90+ days
│   └── Never engaged? → Never attended
│
├── Appreciation
│   ├── Very active? → 5+ events
│   ├── Regular? → Recent attendees
│   └── Trying to activate? → 1-2 events
│
└── Special campaign
    ├── Demographics? → Use combined filters
    ├── Behavior-based? → Use activity filters
    └── Time-based? → Use date ranges
```

## Quick Reference

### Phase 1 Filters
- `veteransOnly`: true/false
- `newbiesOnly`: true/false
- `activityType`: never_attended | has_attended | never_applied | applied_never_attended
- `registeredWithinDays`: number (with never_applied)
- `excludeRejected`: true/false (default: true)

### Phase 2 Filters
- `activityStatus`: inactive | recent | lapsed
- `lastAttendanceRange`: { from: Date, to: Date }
- `eventAttendanceCount`: { min?: number, max?: number, exact?: number }
- `inactivityPeriodDays`: number
- `specificEventIds`: string[]

## Testing Your Segments

### Before Sending

1. **Check recipient count**: Is it reasonable?
2. **Preview recipient list**: Are the right people included?
3. **Test with small segment**: Try with admins first
4. **Verify exclusions**: Are unsubscribed users excluded?

### After Sending

1. **Monitor open rates**: Compare to benchmarks
2. **Check unsubscribes**: Higher than usual?
3. **Review engagement**: Clicks and responses
4. **Gather feedback**: Survey or direct responses

## Examples by Use Case

### Welcome Series (3 emails)
1. **Immediately after signup**: Never applied + registered within 1 day
2. **One week later**: Never applied + registered within 7 days
3. **Two weeks later**: Never attended + registered within 14 days

### Win-Back Campaign
1. **Soft re-engagement**: Lapsed (30-90 days)
2. **Stronger incentive**: Inactive (90-120 days)
3. **Last attempt**: Inactive (120+ days)

### VIP Recognition
1. **Monthly**: Recent + 10+ events
2. **Quarterly**: Has attended + 5+ events
3. **Annual**: All time high attendees

## Troubleshooting

### No recipients showing
- Check if filters are too restrictive
- Verify users have marketing consent
- Ensure date ranges are correct

### Too many recipients
- Add more specific filters
- Check if combining filters correctly
- Verify segmentation logic

### Wrong people included
- Review filter combinations
- Check boolean logic (AND vs OR)
- Test with known profiles

## Advanced Tips

### Seasonal Segmentation
- Summer: Target beach event lovers
- Winter: Indoor activity preferences
- Holidays: Family-friendly event attendees

### Behavioral Patterns
- Weekend warriors: Attend weekend events
- Weekday networkers: After-work events
- Early birds: Morning event attendees

### Engagement Scoring (Mental Model)
- High: Recent + 5+ events = Priority segment
- Medium: Has attended + 1-4 events = Growth potential
- Low: Never attended or inactive = Re-engagement needed

## Measuring Success

### Key Metrics by Segment

**New Members**
- Success: 30%+ open rate
- Goal: First event registration

**Active Members**
- Success: 40%+ open rate
- Goal: Continued engagement

**Inactive Members**
- Success: 20%+ open rate
- Goal: Re-activation

### A/B Testing Segments
- Test different messages to same segment
- Test same message to different segments
- Compare and optimize