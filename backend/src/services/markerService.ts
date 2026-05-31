import { Marker, Translation } from '@prisma/client';
import prisma from '../config/database';
import { GetMarkersQuery } from '../types/marker';
import { calculateDistance } from '../utils/geo';

export class MarkerService {
  /**
   * Get markers within radius with optional filtering
   */
  async getMarkers(query: GetMarkersQuery) {
    const { lat, lng, radius, types, lang, limit } = query;

    // Parse types filter
    const categoryFilter = types
      ? { category: { in: types.split(',') } }
      : {};

    // Query markers within approximate bounding box (for performance)
    const latOffset = radius / 111320;
    const lngOffset = radius / (111320 * Math.cos((lat * Math.PI) / 180));

    const markers = await prisma.marker.findMany({
      where: {
        ...categoryFilter,
        reviewStatus: 'approved',
        status: 1,
        publicLatitude: {
          gte: lat - latOffset,
          lte: lat + latOffset,
        },
        publicLongitude: {
          gte: lng - lngOffset,
          lte: lng + lngOffset,
        },
      },
      include: {
        translations: {
          where: { locale: lang },
        },
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    // Filter by exact distance and format response
    const results = markers
      .map((marker) => {
        const distance = calculateDistance(
          lat,
          lng,
          marker.publicLatitude,
          marker.publicLongitude
        );

        if (distance > radius) return null;

        return this.formatMarkerResponse(marker, lang, distance);
      })
      .filter((m) => m !== null);

    return {
      data: results,
      next_cursor: null,
    };
  }

  /**
   * Get single marker by ID
   */
  async getMarkerById(id: number, lang: string = 'zh-CN') {
    const marker = await prisma.marker.findUnique({
      where: { id },
      include: {
        translations: {
          where: { locale: lang },
        },
      },
    });

    if (!marker || marker.reviewStatus !== 'approved' || marker.status !== 1) {
      return null;
    }

    return this.formatMarkerResponse(marker, lang);
  }

  /**
   * Format marker response with translations
   */
  private formatMarkerResponse(
    marker: Marker & { translations: Translation[] },
    lang: string,
    distance?: number
  ) {
    const translation = marker.translations[0];
    const isTranslated = !!translation;

    return {
      id: marker.id,
      category: marker.category,
      title: isTranslated ? translation.title : marker.title,
      source_locale: marker.sourceLocale,
      locale: lang,
      is_translated: isTranslated,
      latitude: marker.publicLatitude,
      longitude: marker.publicLongitude,
      address: isTranslated ? translation.address : marker.address,
      description: isTranslated ? translation.description : marker.description,
      media_url: marker.mediaUrl,
      visibility: marker.visibility,
      review_status: marker.reviewStatus,
      consensus_status: marker.consensusStatus,
      confidence_score: marker.confidenceScore,
      contact_info: marker.visibility === 'public' ? marker.contactInfo : null,
      created_at: marker.createdAt.toISOString(),
      ...(distance !== undefined && { distance_m: Math.round(distance) }),
    };
  }

  /**
   * Submit new marker
   */
  async submitMarker(data: {
    category: string;
    title: string;
    latitude: number;
    longitude: number;
    address: string;
    description: string;
    sourceLocale: string;
    contactInfo?: string;
    visibility: string;
    fingerprint: string;
    ipAddress: string;
  }) {
    // Determine if coordinates should be masked
    const shouldMask = ['station', 'food_bank', 'helper'].includes(data.category);

    const marker = await prisma.marker.create({
      data: {
        category: data.category,
        title: data.title,
        publicLatitude: data.latitude,
        publicLongitude: data.longitude,
        privateLatitude: data.latitude,
        privateLongitude: data.longitude,
        address: data.address,
        description: data.description,
        sourceLocale: data.sourceLocale,
        contactInfo: data.contactInfo,
        visibility: shouldMask ? 'masked' : data.visibility,
        fingerprint: data.fingerprint,
        reviewStatus: 'pending',
        consensusStatus: 'pending',
      },
    });

    return {
      id: marker.id,
      review_status: marker.reviewStatus,
      status: marker.status,
    };
  }
}

export default new MarkerService();
