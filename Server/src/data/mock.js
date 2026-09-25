const compounds = [
  {
    id: 'marassi',
    name: 'Marassi',
    region: 'North Coast',
    unitCount: 42,
    image:
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'fouka-bay',
    name: 'Fouka Bay',
    region: 'North Coast',
    unitCount: 28,
    image:
      'https://images.unsplash.com/photo-1499793983690-e29dafd473d5?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'gouna',
    name: 'El Gouna',
    region: 'Red Sea',
    unitCount: 18,
    image:
      'https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'cfc',
    name: 'Cairo Festival City',
    region: 'New Cairo',
    unitCount: 24,
    image:
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'sodic-villette',
    name: 'SODIC Villette',
    region: 'New Cairo',
    unitCount: 16,
    image:
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'sheikh-zayed',
    name: 'Sheikh Zayed',
    region: 'Giza',
    unitCount: 22,
    image:
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'mivida',
    name: 'Mivida',
    region: 'New Cairo',
    unitCount: 12,
    image:
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'playa',
    name: 'Playa',
    region: 'North Coast',
    unitCount: 9,
    image:
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=900&q=80',
  },
];

const listings = [
  {
    id: '1',
    slug: 'lagoon-view-chalet-marassi',
    title: 'Elegant Lagoon View Chalet',
    compoundId: 'marassi',
    compound: 'Marassi',
    region: 'North Coast',
    city: 'Sidi Abdel Rahman',
    propertyType: 'Chalet',
    bedrooms: 3,
    bathrooms: 3,
    areaSqm: 190,
    maxGuests: 6,
    pricePerNight: 16100,
    currency: 'EGP',
    featured: true,
    available: true,
    amenities: ['Pool access', 'Wi-Fi', 'AC', 'Parking', 'Kitchen', 'Sea breeze'],
    description:
      'A refined three-bedroom chalet overlooking the lagoon — light-filled living spaces, curated interiors, and resort amenities moments away.',
    images: [
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80',
    ],
  },
  {
    id: '2',
    slug: 'sea-view-villa-fouka-bay',
    title: 'Ultra Luxury Villa with Private Pool',
    compoundId: 'fouka-bay',
    compound: 'Fouka Bay',
    region: 'North Coast',
    city: 'Al Dabaa',
    propertyType: 'Standalone Villa',
    bedrooms: 4,
    bathrooms: 5,
    areaSqm: 340,
    maxGuests: 8,
    pricePerNight: 33000,
    currency: 'EGP',
    featured: true,
    available: true,
    amenities: ['Private pool', 'Sea view', 'Wi-Fi', 'AC', 'Garden', 'Parking'],
    description:
      'Front-row sea views and a private pool — a statement villa for gatherings that deserve space, stillness, and horizon light.',
    images: [
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=80',
    ],
  },
  {
    id: '3',
    slug: 'marina-suite-marassi',
    title: 'Luxury Sea & Marina View Suite',
    compoundId: 'marassi',
    compound: 'Marassi',
    region: 'North Coast',
    city: 'Sidi Abdel Rahman',
    propertyType: 'Chalet',
    bedrooms: 3,
    bathrooms: 4,
    areaSqm: 200,
    maxGuests: 6,
    pricePerNight: 18400,
    currency: 'EGP',
    featured: true,
    available: true,
    amenities: ['Marina view', 'Wi-Fi', 'AC', 'Smart TV', 'Kitchen'],
    description:
      'Steps from the marina — contemporary finishes, expansive glass, and evenings that open onto water and lights.',
    images: [
      'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80',
    ],
  },
  {
    id: '4',
    slug: 'city-apartment-cfc',
    title: 'Bright Apartment at Cairo Festival City',
    compoundId: 'cfc',
    compound: 'Cairo Festival City',
    region: 'New Cairo',
    city: 'New Cairo',
    propertyType: 'Apartment',
    bedrooms: 2,
    bathrooms: 2,
    areaSqm: 145,
    maxGuests: 4,
    pricePerNight: 8500,
    currency: 'EGP',
    featured: true,
    available: true,
    amenities: ['Mall access', 'Wi-Fi', 'AC', 'Parking', 'Workspace'],
    description:
      'Urban ease with hotel-grade comfort — walk to dining and retail, then return to a calm, well-appointed home base.',
    images: [
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80',
    ],
  },
  {
    id: '5',
    slug: 'lagoon-retreat-gouna',
    title: 'Serene Lagoon Retreat',
    compoundId: 'gouna',
    compound: 'El Gouna',
    region: 'Red Sea',
    city: 'El Gouna',
    propertyType: 'Apartment',
    bedrooms: 2,
    bathrooms: 2,
    areaSqm: 120,
    maxGuests: 4,
    pricePerNight: 12000,
    currency: 'EGP',
    featured: true,
    available: true,
    amenities: ['Lagoon access', 'Wi-Fi', 'AC', 'Balcony'],
    description:
      'Red Sea calm in a thoughtfully styled two-bedroom — marina mornings and lagoon afternoons.',
    images: [
      'https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1499793983690-e29dafd473d5?auto=format&fit=crop&w=1200&q=80',
    ],
  },
  {
    id: '6',
    slug: 'family-townhouse-villette',
    title: 'Family Townhouse in SODIC Villette',
    compoundId: 'sodic-villette',
    compound: 'SODIC Villette',
    region: 'New Cairo',
    city: 'New Cairo',
    propertyType: 'Townhouse',
    bedrooms: 3,
    bathrooms: 3,
    areaSqm: 220,
    maxGuests: 6,
    pricePerNight: 11000,
    currency: 'EGP',
    featured: true,
    available: true,
    amenities: ['Garden', 'Wi-Fi', 'AC', 'Parking', 'Family friendly'],
    description:
      'Spacious living for longer stays — community greens, soft interiors, and room for everyone to unwind.',
    images: [
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1200&q=80',
    ],
  },
  {
    id: '7',
    slug: 'modern-studio-zayed',
    title: 'Modern Studio in Sheikh Zayed',
    compoundId: 'sheikh-zayed',
    compound: 'Sheikh Zayed',
    region: 'Giza',
    city: 'Sheikh Zayed',
    propertyType: 'Studio',
    bedrooms: 1,
    bathrooms: 1,
    areaSqm: 75,
    maxGuests: 2,
    pricePerNight: 4500,
    currency: 'EGP',
    featured: false,
    available: true,
    amenities: ['Wi-Fi', 'AC', 'Kitchenette', 'Parking'],
    description:
      'Compact and considered — ideal for couples or solo travelers who want West Cairo convenience.',
    images: [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80',
    ],
  },
  {
    id: '8',
    slug: 'penthouse-mivida',
    title: 'Refined Penthouse in Mivida',
    compoundId: 'mivida',
    compound: 'Mivida',
    region: 'New Cairo',
    city: 'New Cairo',
    propertyType: 'Penthouse',
    bedrooms: 4,
    bathrooms: 4,
    areaSqm: 280,
    maxGuests: 8,
    pricePerNight: 22000,
    currency: 'EGP',
    featured: true,
    available: true,
    amenities: ['Terrace', 'City view', 'Wi-Fi', 'AC', 'Parking', 'Elevator'],
    description:
      'Elevated living with a wide terrace and calm interiors — New Cairo skyline as the backdrop.',
    images: [
      'https://images.unsplash.com/photo-1600607687644-c7171b42498b?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600210492493-0946911123ea?auto=format&fit=crop&w=1200&q=80',
    ],
  },
  {
    id: '9',
    slug: 'cabana-playa',
    title: 'First Row Cabana at Playa',
    compoundId: 'playa',
    compound: 'Playa',
    region: 'North Coast',
    city: 'Al Dabaa',
    propertyType: 'Studio',
    bedrooms: 1,
    bathrooms: 1,
    areaSqm: 50,
    maxGuests: 2,
    pricePerNight: 10000,
    currency: 'EGP',
    featured: false,
    available: true,
    amenities: ['Garden', 'Lagoon view', 'Wi-Fi', 'AC'],
    description:
      'A compact coastal escape on the first row — wake to garden light and lagoon stillness.',
    images: [
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
    ],
  },
  {
    id: '10',
    slug: 'cozy-chalet-fouka',
    title: 'Cozy 2BR Lagoon View Chalet',
    compoundId: 'fouka-bay',
    compound: 'Fouka Bay',
    region: 'North Coast',
    city: 'Al Dabaa',
    propertyType: 'Chalet',
    bedrooms: 2,
    bathrooms: 2,
    areaSqm: 130,
    maxGuests: 4,
    pricePerNight: 7700,
    currency: 'EGP',
    featured: false,
    available: true,
    amenities: ['Lagoon view', 'Wi-Fi', 'AC', 'Kitchen'],
    description:
      'Relaxed first-floor living with lagoon outlook — easy beach days and quiet evenings.',
    images: [
      'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=80',
    ],
  },
];

const propertyTypes = [
  'Apartment',
  'Chalet',
  'Standalone Villa',
  'Townhouse',
  'Penthouse',
  'Studio',
];

const partners = [
  {
    id: 'homeaway',
    name: 'HomeAway',
    logo: 'https://logo.clearbit.com/homeaway.com',
  },
  {
    id: 'tripadvisor',
    name: 'Tripadvisor',
    logo: 'https://cdn.simpleicons.org/tripadvisor/00AF87',
  },
  {
    id: 'booking',
    name: 'Booking.com',
    logo: 'https://cdn.simpleicons.org/bookingdotcom/003580',
  },
  {
    id: 'hotels',
    name: 'Hotels.com',
    logo: 'https://logo.clearbit.com/hotels.com',
  },
  {
    id: 'agoda',
    name: 'Agoda',
    logo: 'https://logo.clearbit.com/agoda.com',
  },
  {
    id: 'flipkey',
    name: 'FlipKey',
    logo: 'https://logo.clearbit.com/flipkey.com',
  },
  {
    id: 'vrbo',
    name: 'VRBO',
    logo: 'https://logo.clearbit.com/vrbo.com',
  },
  {
    id: 'superhost',
    name: 'Superhost',
    logo: 'https://cdn.simpleicons.org/airbnb/FF5A5F',
  },
  {
    id: 'expedia',
    name: 'Expedia',
    logo: 'https://cdn.simpleicons.org/expedia/191E3B',
  },
];

const trustPoints = [
  {
    title: 'Designs that feel like home',
    body: 'Artfully finished interiors and comfortable stays — each space chosen for character and calm.',
  },
  {
    title: 'Where you want to be',
    body: 'From Sahel shores to New Cairo compounds — stays matched to how you live and travel.',
  },
  {
    title: 'Hotel perks, home warmth',
    body: 'Premium amenities with attentive support — so every stay feels effortless.',
  },
];

const faqs = [
  {
    q: 'Can I stay with my partner?',
    a: 'Following Egyptian law, couples with Egyptian or Arab passports must present an official marriage certificate. Non-Arab passport holders are welcomed without a marriage certificate.',
  },
  {
    q: 'Are visits allowed?',
    a: 'For Arab guests, visitors of the same gender are allowed; mixed visitors should be first- or second-degree relatives, otherwise please meet in public areas.',
  },
  {
    q: 'Do you allow pets?',
    a: 'It depends on each property policy. Check the listing details or ask our team before booking.',
  },
  {
    q: 'Are there long-stay discounts?',
    a: 'Yes — weekly and monthly rates are available depending on duration and property.',
  },
];

const STOCK_IMAGES = [
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=900&q=80',
];

const DEFAULT_FACILITIES = [
  'Compound security',
  'Shared pools',
  'Landscaped gardens',
  'Guest parking',
  '24/7 access control',
];

const REVIEW_POOL = [
  {
    guestName: 'Nour A.',
    rating: 5,
    comment: 'Immaculate stay — quiet, polished, and exactly as pictured. Prime’s team made check-in seamless.',
  },
  {
    guestName: 'James K.',
    rating: 5,
    comment: 'Beautiful interiors and a calm compound setting. We will book again for our next coast trip.',
  },
  {
    guestName: 'Sara M.',
    rating: 4,
    comment: 'Spacious and well equipped. Communication was clear from inquiry through departure.',
  },
  {
    guestName: 'Omar H.',
    rating: 5,
    comment: 'Felt like a private residence, not a rental. Details were thoughtful throughout.',
  },
];

listings.forEach((listing, index) => {
  const images = [...(listing.images || [])];
  let cursor = index % STOCK_IMAGES.length;
  while (images.length < 6) {
    const next = STOCK_IMAGES[cursor % STOCK_IMAGES.length];
    if (!images.includes(next)) images.push(next);
    cursor += 1;
  }
  listing.images = images;

  if (!listing.facilities?.length) {
    listing.facilities = DEFAULT_FACILITIES.slice(0, 3 + (index % 3));
  }

  const reviewCount = 2 + (index % 3);
  const reviews = Array.from({ length: reviewCount }, (_, r) => {
    const base = REVIEW_POOL[(index + r) % REVIEW_POOL.length];
    const day = 4 + ((index * 3 + r * 5) % 20);
    return {
      id: `${listing.id}-rev-${r}`,
      guestName: base.guestName,
      rating: base.rating,
      comment: base.comment,
      createdAt: `2026-0${1 + ((index + r) % 8)}-${String(day).padStart(2, '0')}`,
    };
  });
  const averageRating =
    Math.round((reviews.reduce((sum, rev) => sum + rev.rating, 0) / reviews.length) * 10) / 10;

  listing.reviews = reviews;
  listing.reviewCount = reviews.length;
  listing.averageRating = averageRating;
});

module.exports = { compounds, listings, propertyTypes, partners, trustPoints, faqs };
