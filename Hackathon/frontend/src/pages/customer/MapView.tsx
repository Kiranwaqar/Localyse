import { useEffect, useMemo, useState } from 'react';
import { OfferCard } from '@/components/OfferCard';
import { toast } from 'sonner';
import { claimOffer, getCustomerCouponClaims, getOffers } from '@/lib/api';
import type { Offer } from '@/lib/domain';
import { getSession } from '@/lib/auth';
import { useCustomerNotifications } from '@/contexts/CustomerNotificationsContext';

type Coordinates = {
  lat: number;
  lng: number;
};

type PlacePin = {
  key: string;
  merchantName: string;
  location: Coordinates;
  distanceMeters: number;
  offers: Offer[];
};

const RADIUS_METERS = 2000;
const EARTH_RADIUS_METERS = 6371000;

const getDistanceMeters = (from: Coordinates, to: Coordinates) => {
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const deltaLat = ((to.lat - from.lat) * Math.PI) / 180;
  const deltaLng = ((to.lng - from.lng) * Math.PI) / 180;
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  return EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const getPinPosition = (center: Coordinates, pin: Coordinates) => {
  const metersPerDegreeLat = 111320;
  const metersPerDegreeLng = 111320 * Math.cos((center.lat * Math.PI) / 180);
  const dx = (pin.lng - center.lng) * metersPerDegreeLng;
  const dy = (pin.lat - center.lat) * metersPerDegreeLat;

  return {
    left: `${Math.min(94, Math.max(6, 50 + (dx / RADIUS_METERS) * 50))}%`,
    top: `${Math.min(94, Math.max(6, 50 - (dy / RADIUS_METERS) * 50))}%`,
  };
};

const MapView = () => {
  const session = getSession();
  const { push: pushNotification } = useCustomerNotifications();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [locationError, setLocationError] = useState('');
  const [activeMerchant, setActiveMerchant] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const locateUser = () => {
    if (!navigator.geolocation) {
      setLocationError('Your browser does not support location detection.');
      return;
    }

    setLocationError('');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {
        setLocationError('Allow location access to see offers within 2km of you.');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  useEffect(() => {
    locateUser();
    Promise.all([
      getOffers(),
      session?._id || session?.email
        ? getCustomerCouponClaims({ customerId: session?._id, customerEmail: session?.email })
        : Promise.resolve({ claims: [], summary: { totalClaims: 0, redeemedClaims: 0, pendingClaims: 0 } }),
    ])
      .then(([data, history]) => {
        const claimedOfferIds = new Set(history.claims.map((claim) => claim.offerId));
        setOffers(data.filter((offer) => !claimedOfferIds.has(offer.id)));
      })
      .catch(() => setOffers([]))
      .finally(() => setLoading(false));
  }, [session?._id, session?.email]);

  const nearbyPins = useMemo<PlacePin[]>(() => {
    if (!userLocation) return [];

    const grouped = offers
      .filter((offer) => offer.location)
      .reduce<Record<string, PlacePin>>((pins, offer) => {
        const location = offer.location as Coordinates;
        const distanceMeters = getDistanceMeters(userLocation, location);

        if (distanceMeters > RADIUS_METERS) return pins;

        const key = offer.merchantId || offer.merchantName;

        if (!pins[key]) {
          pins[key] = {
            key,
            merchantName: offer.merchantName,
            location,
            distanceMeters,
            offers: [],
          };
        }

        pins[key].offers.push({
          ...offer,
          distanceMeters: Math.round(distanceMeters),
        });
        pins[key].distanceMeters = Math.min(pins[key].distanceMeters, distanceMeters);
        return pins;
      }, {});

    return Object.values(grouped).sort((a, b) => a.distanceMeters - b.distanceMeters);
  }, [offers, userLocation]);

  useEffect(() => {
    if (nearbyPins.length > 0 && !nearbyPins.some((pin) => pin.key === activeMerchant)) {
      setActiveMerchant(nearbyPins[0].key);
    }
  }, [activeMerchant, nearbyPins]);

  const activePin = nearbyPins.find((pin) => pin.key === activeMerchant) || nearbyPins[0];
  const nearbyOffers = activePin?.offers || [];
  const offersWithLocation = offers.filter((offer) => offer.location).length;
  const mapSrc = userLocation
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${userLocation.lng - 0.006}%2C${userLocation.lat - 0.0045}%2C${userLocation.lng + 0.006}%2C${userLocation.lat + 0.0045}&layer=mapnik&marker=${userLocation.lat}%2C${userLocation.lng}`
    : '';

  const onClaimOffer = async (offer: Offer) => {
    try {
      const result = await claimOffer(offer.id, {
        customerId: session?._id,
        customerName: session?.name,
        customerEmail: session?.email,
      });

      setOffers((current) => current.filter((item) => item.id !== offer.id));
      if (!result.alreadyClaimed) {
        pushNotification({
          title: 'Offer claimed',
          body: `${offer.merchantName} — coupon ${result.couponCode}. Open your wallet to use it.`,
          href: '/app/wallet',
        });
      }
      toast.success(`Offer claimed at ${offer.merchantName}`, {
        description: result.walletImpact
          ? `Coupon code: ${result.couponCode} · ${result.walletImpact.message}`
          : `Coupon code: ${result.couponCode}`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not claim this offer.';
      toast.error('Claim failed', { description: message });
    }
  };

  return (
    <div className="px-3 xs:px-4 sm:px-5 pt-4 sm:pt-5 space-y-5">
      <section>
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Live map</p>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight leading-tight">Offers within 2km</h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Auto-detects your location and pins nearby merchants with active unclaimed offers.
        </p>
      </section>

      <div className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-xs">
        <div className="relative h-[280px] xs:h-[320px] sm:h-[380px] bg-secondary">
          {userLocation ? (
            <>
              <iframe
                title="Nearby Localyse offers map"
                src={mapSrc}
                className="absolute inset-0 h-full w-full border-0 grayscale-[0.15]"
                loading="lazy"
              />
              <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-background/10 to-background/20" />
              <div className="absolute left-1/2 top-1/2 z-10 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-primary shadow-lg">
                <span className="absolute -inset-3 rounded-full bg-primary/20" />
              </div>
              <div className="absolute left-1/2 top-1/2 z-10 h-[190px] w-[190px] xs:h-[230px] xs:w-[230px] sm:h-[280px] sm:w-[280px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/40 bg-primary/5" />
              {nearbyPins.map((pin) => {
                const position = getPinPosition(userLocation, pin.location);
                const active = activePin?.key === pin.key;

                return (
                  <button
                    key={pin.key}
                    onClick={() => setActiveMerchant(pin.key)}
                    className={
                      'absolute z-20 -translate-x-1/2 -translate-y-full rounded-full px-2.5 sm:px-3 py-2 text-[11px] sm:text-xs font-semibold shadow-lg transition ' +
                      (active ? 'bg-primary text-primary-foreground scale-105' : 'bg-card text-foreground hover:bg-primary-soft')
                    }
                    style={position}
                  >
                    <i className="bi bi-geo-alt-fill mr-1" />
                    {pin.offers.length}
                  </button>
                );
              })}
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
              <i className="bi bi-crosshair text-4xl text-muted-foreground" />
              <p className="text-sm font-semibold mt-3">Location needed</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[260px]">
                {locationError || 'We need your current location to find offers within 2km.'}
              </p>
              <button
                onClick={locateUser}
                className="mt-4 h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
              >
                Detect my location
              </button>
            </div>
          )}
        </div>

        <div className="border-t border-border p-4">
          <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">
                {userLocation ? `${nearbyPins.length} nearby places with offers` : 'Waiting for location'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {offersWithLocation} live offers have merchant coordinates saved.
              </p>
            </div>
            <button onClick={locateUser} className="w-full xs:w-auto rounded-xl border border-border px-3 py-2 text-xs font-semibold">
              <i className="bi bi-arrow-clockwise mr-1" /> Refresh
            </button>
          </div>
        </div>
      </div>

      {nearbyPins.length > 0 && (
        <div className="flex gap-2 overflow-x-auto -mx-3 xs:-mx-4 sm:-mx-5 px-3 xs:px-4 sm:px-5 scrollbar-none">
          {nearbyPins.map((pin) => (
            <button
              key={pin.key}
              onClick={() => setActiveMerchant(pin.key)}
              className={
                'whitespace-nowrap text-xs font-medium px-3.5 h-8 rounded-full border transition ' +
                (activePin?.key === pin.key
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-card text-foreground border-border')
              }
            >
              {pin.merchantName} · {Math.round(pin.distanceMeters)}m
            </button>
          ))}
        </div>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold tracking-tight">{activePin?.merchantName || 'Nearby offers'}</h2>
          <span className="text-xs text-muted-foreground">{nearbyOffers.length}</span>
        </div>
        {loading ? (
          <div className="bg-card border border-border rounded-2xl p-6 text-sm text-muted-foreground">
            Loading nearby offers...
          </div>
        ) : nearbyOffers.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-8 text-center">
            <i className="bi bi-search text-2xl text-muted-foreground" />
            <p className="text-sm font-medium mt-3">No unclaimed offers within 2km right now</p>
            <p className="text-xs text-muted-foreground mt-1">
              Make sure merchants have location saved in MongoDB, then generate active offers.
            </p>
          </div>
        ) : (
          nearbyOffers.map((o) => (
            <OfferCard key={o.id} {...o} onClaim={() => onClaimOffer(o)} />
          ))
        )}
      </section>
    </div>
  );
};

export default MapView;
