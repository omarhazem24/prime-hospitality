/** Map DB snake_case ↔ app camelCase */

function compoundFromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    region: row.region || '',
    destinationId: row.destination_id || '',
    unitCount: Number(row.unit_count) || 0,
    image: row.image || '',
    sortOrder: Number(row.sort_order) || 0,
    showOnHome: row.show_on_home !== false,
    published: row.published !== false,
    kwentraProjectId: row.kwentra_project_id || '',
    kwentraDestinationId: row.kwentra_destination_id || '',
  };
}

function compoundToRow(item) {
  return {
    id: item.id,
    name: item.name,
    region: item.region || '',
    destination_id: item.destinationId || '',
    unit_count: Number(item.unitCount) || 0,
    image: item.image || '',
    sort_order: Number(item.sortOrder) || 0,
    show_on_home: item.showOnHome !== false,
    published: item.published !== false,
    kwentra_project_id: item.kwentraProjectId || '',
    kwentra_destination_id: item.kwentraDestinationId || '',
    updated_at: new Date().toISOString(),
  };
}

function unitFromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    compoundId: row.compound_id || '',
    compound: row.compound || '',
    region: row.region || '',
    city: row.city || '',
    propertyType: row.property_type || 'Apartment',
    bedrooms: Number(row.bedrooms) || 1,
    bathrooms: Number(row.bathrooms) || 1,
    areaSqm: Number(row.area_sqm) || 0,
    maxGuests: Number(row.max_guests) || 2,
    pricePerNight: Number(row.price_per_night) || 0,
    currency: row.currency || 'EGP',
    featured: Boolean(row.featured),
    available: row.available !== false,
    published: row.published !== false,
    amenities: Array.isArray(row.amenities) ? row.amenities : [],
    facilities: Array.isArray(row.facilities) ? row.facilities : [],
    description: row.description || '',
    images: Array.isArray(row.images) ? row.images : [],
    driveFolderUrl: row.drive_folder_url || '',
    kwentraRoomTypeId: row.kwentra_room_type_id || '',
    homeOrder: Number(row.home_order) || 999,
    searchOrder: Number(row.search_order) || 0,
    averageRating: Number(row.average_rating) || 0,
    reviewCount: Number(row.review_count) || 0,
    reviews: Array.isArray(row.reviews) ? row.reviews : [],
  };
}

function unitToRow(item) {
  return {
    id: item.id,
    slug: item.slug,
    title: item.title,
    compound_id: item.compoundId || null,
    compound: item.compound || '',
    region: item.region || '',
    city: item.city || '',
    property_type: item.propertyType || 'Apartment',
    bedrooms: Number(item.bedrooms) || 1,
    bathrooms: Number(item.bathrooms) || 1,
    area_sqm: Number(item.areaSqm) || 0,
    max_guests: Number(item.maxGuests) || 2,
    price_per_night: Number(item.pricePerNight) || 0,
    currency: item.currency || 'EGP',
    featured: Boolean(item.featured),
    available: item.available !== false,
    published: item.published !== false,
    amenities: item.amenities || [],
    facilities: item.facilities || [],
    description: item.description || '',
    images: item.images || [],
    drive_folder_url: item.driveFolderUrl || '',
    kwentra_room_type_id: item.kwentraRoomTypeId || '',
    home_order: Number.isFinite(Number(item.homeOrder)) ? Number(item.homeOrder) : 999,
    search_order: Number(item.searchOrder) || 0,
    average_rating: Number(item.averageRating) || 0,
    review_count: Number(item.reviewCount) || 0,
    reviews: item.reviews || [],
    updated_at: new Date().toISOString(),
  };
}

function slideFromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    image: row.image,
    alt: row.alt || '',
    enabled: row.enabled !== false,
    sortOrder: Number(row.sort_order) || 0,
  };
}

function slideToRow(item) {
  return {
    id: item.id,
    image: item.image,
    alt: item.alt || '',
    enabled: item.enabled !== false,
    sort_order: Number(item.sortOrder) || 0,
  };
}

function settingsFromRow(row) {
  if (!row) {
    return {
      metaPixelId: '',
      facebookPixelId: '',
      googleAdsId: '',
      gtmId: '',
      content: {},
    };
  }
  return {
    metaPixelId: row.meta_pixel_id || '',
    facebookPixelId: row.facebook_pixel_id || '',
    googleAdsId: row.google_ads_id || '',
    gtmId: row.gtm_id || '',
    content: row.content || {},
  };
}

function bookingFromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    status: row.status,
    createdAt: row.created_at,
    slug: row.slug,
    listingId: row.listing_id,
    listingTitle: row.listing_title,
    name: row.name,
    email: row.email,
    phone: row.phone,
    guests: row.guests,
    checkIn: row.check_in,
    checkOut: row.check_out,
    notes: row.notes,
    pricePerNight: row.price_per_night != null ? Number(row.price_per_night) : null,
    currency: row.currency || 'EGP',
  };
}

module.exports = {
  compoundFromRow,
  compoundToRow,
  unitFromRow,
  unitToRow,
  slideFromRow,
  slideToRow,
  settingsFromRow,
  bookingFromRow,
};
