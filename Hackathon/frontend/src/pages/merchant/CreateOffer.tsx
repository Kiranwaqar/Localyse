import { useMemo, useState } from 'react';
import { OfferCard } from '@/components/OfferCard';
import { Category } from '@/lib/domain';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { generateOffers, updateMerchant } from '@/lib/api';
import { getSession, setSession } from '@/lib/auth';

const goals = [
  { id: 'clear', label: 'Clear overstock / slow movers', icon: 'bi-box-seam' },
  { id: 'traffic', label: 'Boost slow-day foot traffic', icon: 'bi-people' },
  { id: 'margin', label: 'Push high-margin products', icon: 'bi-graph-up-arrow' },
  { id: 'newcust', label: 'Attract new customers', icon: 'bi-stars' },
];

const DEFAULT_LOCATION = { lat: 33.6844, lng: 73.0479 };
const PIN_RANGE_METERS = 500;
const GEOAPIFY_API_KEY = import.meta.env.VITE_GEOAPIFY_API_KEY || '';

type AddressResult = {
  display_name: string;
  lat: number;
  lon: number;
  type?: string;
  class?: string;
};

type GeoapifyFeature = {
  properties?: {
    formatted?: string;
    name?: string;
    address_line1?: string;
    address_line2?: string;
    lat?: number;
    lon?: number;
    result_type?: string;
    category?: string;
  };
  geometry?: {
    coordinates?: [number, number];
  };
};

const toAddressResult = (feature: GeoapifyFeature): AddressResult | null => {
  const properties = feature.properties || {};
  const coordinates = feature.geometry?.coordinates;
  const lon = Number(properties.lon ?? coordinates?.[0]);
  const lat = Number(properties.lat ?? coordinates?.[1]);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  return {
    display_name:
      properties.formatted ||
      [properties.address_line1 || properties.name, properties.address_line2].filter(Boolean).join(', '),
    lat,
    lon,
    type: properties.result_type,
    class: properties.category,
  };
};

const getPinnedCoordinates = (center: { lat: number; lng: number }, pin: { x: number; y: number }) => {
  const dxMeters = ((pin.x - 50) / 50) * PIN_RANGE_METERS;
  const dyMeters = ((50 - pin.y) / 50) * PIN_RANGE_METERS;
  const lat = center.lat + dyMeters / 111320;
  const lng = center.lng + dxMeters / (111320 * Math.cos((center.lat * Math.PI) / 180));

  return {
    lat: Number(lat.toFixed(6)),
    lng: Number(lng.toFixed(6)),
  };
};

const CreateOffer = () => {
  const navigate = useNavigate();
  const session = getSession();
  const [goal, setGoal] = useState('clear');
  const [financeFile, setFinanceFile] = useState<File | null>(null);
  const [inventoryFile, setInventoryFile] = useState<File | null>(null);
  const [marginFile, setMarginFile] = useState<File | null>(null);
  const [address, setAddress] = useState(session?.location?.address || '');
  const [addressResults, setAddressResults] = useState<AddressResult[]>([]);
  const [selectedAddress, setSelectedAddress] = useState(session?.location?.address || '');
  const [mapCenter, setMapCenter] = useState({
    lat: Number(session?.location?.lat) || DEFAULT_LOCATION.lat,
    lng: Number(session?.location?.lng) || DEFAULT_LOCATION.lng,
  });
  const [pin, setPin] = useState({ x: 50, y: 50 });
  const [draggingPin, setDraggingPin] = useState(false);
  const [locating, setLocating] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<{
    offerText: string;
    reasonWhyNow: string;
    expiresInMinutes: number;
    expectedCustomerVolume?: number;
    expectedBusinessImpact?: string;
    targetItem?: string;
    aiSuggestion?: string;
    originalPrice?: number;
    offerPrice?: number;
  } | null>(null);
  const offerCategory = ((session?.category === 'fitness' ? 'gym' : session?.category) || 'flash') as Category;
  const pinnedCoordinates = useMemo(() => getPinnedCoordinates(mapCenter, pin), [mapCenter, pin]);
  const mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${mapCenter.lng - 0.004}%2C${mapCenter.lat - 0.003}%2C${mapCenter.lng + 0.004}%2C${mapCenter.lat + 0.003}&layer=mapnik&marker=${pinnedCoordinates.lat}%2C${pinnedCoordinates.lng}`;

  const updatePinFromPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.min(92, Math.max(8, ((event.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(92, Math.max(8, ((event.clientY - rect.top) / rect.height) * 100));

    setPin({ x, y });
  };

  const onMapPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingPin) return;
    updatePinFromPointer(event);
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Your browser does not support location detection.');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setMapCenter({
          lat: Number(position.coords.latitude.toFixed(6)),
          lng: Number(position.coords.longitude.toFixed(6)),
        });
        setPin({ x: 50, y: 50 });
        setAddressResults([]);
        setLocating(false);
        toast.success('Pinned your current location.');
      },
      () => {
        setLocating(false);
        toast.error('Location access was blocked. You can still search by address.');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  const findAddress = async () => {
    if (!address.trim()) {
      toast.error('Enter your merchant address first.');
      return;
    }

    if (!GEOAPIFY_API_KEY) {
      toast.error('Geoapify key missing', {
        description: 'Add VITE_GEOAPIFY_API_KEY to frontend/.env to enable exact Islamabad address search.',
      });
      return;
    }

    setLocating(true);
    setAddressResults([]);

    try {
      const searchText = /\bislamabad\b/i.test(address)
        ? address.trim()
        : `${address.trim()}, Islamabad, Pakistan`;
      const params = new URLSearchParams({
        text: searchText,
        limit: '8',
        lang: 'en',
        filter: 'circle:73.0479,33.6844,30000',
        bias: `proximity:${mapCenter.lng},${mapCenter.lat}`,
        apiKey: GEOAPIFY_API_KEY,
      });
      const response = await fetch(
        `https://api.geoapify.com/v1/geocode/autocomplete?${params.toString()}`
      );
      const data = await response.json();
      const matches = ((data.features || []) as GeoapifyFeature[])
        .map(toAddressResult)
        .filter((result): result is AddressResult => Boolean(result));

      if (!matches.length) {
        toast.error('Could not find that Islamabad address. Try adding sector, road, or landmark.');
        return;
      }

      setAddressResults(matches);
      selectAddressResult(matches[0]);
      toast.success(matches.length > 1 ? 'Choose the correct match below.' : 'Address found. Move the pin if needed.');
    } catch {
      toast.error('Address lookup failed. Try current location or enter coordinates manually.');
    } finally {
      setLocating(false);
    }
  };

  const selectAddressResult = (match: AddressResult) => {
    const lat = Number(match.lat.toFixed(6));
    const lng = Number(match.lon.toFixed(6));

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    setSelectedAddress(match.display_name);
    setAddress(match.display_name);
    setMapCenter({ lat, lng });
    setPin({ x: 50, y: 50 });
  };

  const updateExactCoordinate = (field: 'lat' | 'lng', value: string) => {
    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) return;

    const nextCoordinates = {
      ...pinnedCoordinates,
      [field]: numericValue,
    };

    setMapCenter(nextCoordinates);
    setPin({ x: 50, y: 50 });
  };

  const setPinToCurrentMapCenter = () => {
    setPin({ x: 50, y: 50 });
  };

  const saveAddress = address.trim() || selectedAddress;

  const currentExactCoordinates = pinnedCoordinates;

  const isAddressReady = Boolean(saveAddress.trim());

  const saveLocation = async () => {
    if (!session?._id) return null;
    if (!isAddressReady) {
      toast.error('Add your exact business address before generating an offer.');
      return null;
    }

    return updateMerchant(session._id, {
      name: session.name || '',
      email: session.email,
      category: session.category || 'food',
      location: {
        ...currentExactCoordinates,
        address: saveAddress.trim(),
      },
    });
  };

  const previewSelectedAddress = selectedAddress || address;

  const shortAddressResults = addressResults.slice(0, 5);

  const hasAddressResults = shortAddressResults.length > 0;

  const hasSelectedAddress = Boolean(previewSelectedAddress);

  const selectedAddressLabel = hasSelectedAddress ? previewSelectedAddress : 'No address selected yet';

  const selectedCoordinateLabel = `${currentExactCoordinates.lat}, ${currentExactCoordinates.lng}`;

  const resetAddressResults = () => {
    setAddressResults([]);
    setSelectedAddress('');
  };

  const onAddressChange = (value: string) => {
    setAddress(value);
    resetAddressResults();
  };

  const onManualCoordinateBlur = () => {
    toast.info('Exact pin updated from coordinates.');
  };

  const focusMapOnAddress = () => {
    if (!hasSelectedAddress) return;

    setMapCenter(currentExactCoordinates);
    setPinToCurrentMapCenter();
  };

  const onSearchEnter = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      findAddress();
    }
  };

  const applyCurrentPinAsExact = () => {
    setMapCenter(currentExactCoordinates);
    setPinToCurrentMapCenter();
    toast.success('Pin location set as exact merchant location.');
  };

  const getResultTypeLabel = (result: AddressResult) =>
    [result.class, result.type].filter(Boolean).join(' / ') || 'address match';

  const getResultTitle = (result: AddressResult) => result.display_name.split(',').slice(0, 2).join(',');

  const getResultSubtitle = (result: AddressResult) => result.display_name.split(',').slice(2).join(',').trim();

  const renderAddressResults = () => {
    if (!hasAddressResults) return null;

    return (
      <div className="space-y-2 rounded-2xl border border-border bg-secondary/40 p-3">
        <p className="text-xs font-semibold text-muted-foreground">Select the exact match</p>
        {shortAddressResults.map((result) => (
          <button
            key={`${result.lat}-${result.lon}-${result.display_name}`}
            type="button"
            onClick={() => selectAddressResult(result)}
            className="w-full rounded-xl border border-border bg-card p-3 text-left transition hover:border-primary/50 hover:bg-primary-soft/20"
          >
            <span className="block text-sm font-semibold">{getResultTitle(result)}</span>
            <span className="mt-1 block text-xs text-muted-foreground">{getResultSubtitle(result)}</span>
            <span className="mt-2 inline-flex rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">
              {getResultTypeLabel(result)}
            </span>
          </button>
        ))}
      </div>
    );
  };

  const onGenerate = async () => {
    if (!session?._id) {
      toast.error('Please sign in again before generating an offer.');
      return;
    }

    if (!financeFile || !inventoryFile || !marginFile) {
      toast.error('Upload finance, inventory, and product margin sheets before generating an offer.');
      return;
    }

    if (!isAddressReady) {
      toast.error('Add your exact business address before generating an offer.');
      return;
    }

    setGenerating(true);
    setGenerated(null);

    try {
      const updatedSession = await saveLocation();

      if (!updatedSession) {
        setGenerating(false);
        return;
      }

      setSession(updatedSession);

      const result = await generateOffers({
        merchantId: session._id,
        goal,
        financeFile,
        inventoryFile,
        marginFile,
      });
      const bestOffer = result.offers[0];

      setGenerated(
        bestOffer
          ? {
              offerText: bestOffer.offerText,
              reasonWhyNow: bestOffer.reasonWhyNow,
              expiresInMinutes: bestOffer.expiresInMinutes,
              expectedCustomerVolume: bestOffer.expectedCustomerVolume,
              expectedBusinessImpact: bestOffer.expectedBusinessImpact,
              targetItem: bestOffer.targetItem,
              aiSuggestion: bestOffer.aiSuggestion,
              originalPrice: bestOffer.originalPrice,
              offerPrice: bestOffer.offerPrice,
            }
          : null
      );

      if (!bestOffer) {
        toast.info('No offer generated for this merchant.');
      } else {
        toast.success('AI offer generated and saved', {
          description: 'The offer is now stored in MongoDB.',
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI service is unavailable.';
      toast.error('AI generation failed', { description: message });
    } finally {
      setGenerating(false);
    }
  };

  /*
      setMapCenter({
        lat: Number(Number(match.lat).toFixed(6)),
        lng: Number(Number(match.lon).toFixed(6)),
      });
      setPin({ x: 50, y: 50 });
      toast.success('Address found. Move the pin if needed.');
    } catch {
      toast.error('Address lookup failed. Try current location or enter coordinates manually.');
    } finally {
      setLocating(false);
    }
  };

  const onGenerate = async () => {
    if (!session?._id) {
      toast.error('Please sign in again before generating an offer.');
      return;
    }

    if (!financeFile || !inventoryFile || !marginFile) {
      toast.error('Upload finance, inventory, and product margin sheets before generating an offer.');
      return;
    }

    if (!address.trim()) {
      toast.error('Add your exact business address before generating an offer.');
      return;
    }

    setGenerating(true);
    setGenerated(null);

    try {
      const updatedSession = await updateMerchant(session._id, {
        name: session.name || '',
        email: session.email,
        category: session.category || 'food',
        location: {
          ...pinnedCoordinates,
          address: address.trim(),
        },
      });
      setSession(updatedSession);

      const result = await generateOffers({
        merchantId: session._id,
        goal,
        financeFile,
        inventoryFile,
        marginFile,
      });
      const bestOffer = result.offers[0];

      setGenerated(
        bestOffer
          ? {
              offerText: bestOffer.offerText,
              reasonWhyNow: bestOffer.reasonWhyNow,
              expiresInMinutes: bestOffer.expiresInMinutes,
              expectedCustomerVolume: bestOffer.expectedCustomerVolume,
              expectedBusinessImpact: bestOffer.expectedBusinessImpact,
              targetItem: bestOffer.targetItem,
              aiSuggestion: bestOffer.aiSuggestion,
              originalPrice: bestOffer.originalPrice,
              offerPrice: bestOffer.offerPrice,
            }
          : null
      );

      if (!bestOffer) {
        toast.info('No offer generated for this merchant.');
      } else {
        toast.success('AI offer generated and saved', {
          description: 'The offer is now stored in MongoDB.',
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI service is unavailable.';
      toast.error('AI generation failed', { description: message });
    } finally {
      setGenerating(false);
    }
  };
  */

  const publish = () => {
    toast.success('Offer already saved', { description: 'This AI-generated offer is live in MongoDB.' });
    navigate('/merchant');
  };

  return (
    <div className="w-full max-w-6xl p-3 xs:p-4 sm:p-8 lg:p-10 space-y-6 sm:space-y-8 overflow-x-hidden">
      <header>
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">AI Offer Studio</p>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight leading-tight">Create an offer</h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Select a goal and upload sales, inventory, and product margin sheets. Localyse AI decides the item, safe discount, customer cap, and expiry.
        </p>
      </header>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(320px,400px)] gap-6 lg:gap-8">
        {/* Form */}
        <div className="space-y-4 sm:space-y-5">
          <Section step="1" title="What's your goal?">
            <div className="grid grid-cols-1 xs:grid-cols-2 gap-2">
              {goals.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setGoal(g.id)}
                  className={cn(
                    'p-3.5 rounded-xl border text-left text-sm font-medium transition flex items-start gap-2.5',
                    goal === g.id
                      ? 'bg-primary-soft border-primary/40 text-foreground'
                      : 'bg-card border-border hover:border-foreground/20'
                  )}
                >
                  <i className={`bi ${g.icon} text-base mt-0.5 ${goal === g.id ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className="leading-tight">{g.label}</span>
                </button>
              ))}
            </div>
          </Section>

          <Section step="2" title="Business data">
            <div className="grid sm:grid-cols-3 gap-3">
              <FileInput
                label="Sales / finance sheet"
                description="Date, customers, total sales, top seller"
                file={financeFile}
                onChange={setFinanceFile}
              />
              <FileInput
                label="Inventory sheet"
                description="Stock levels, ingredient quantities, expiry dates"
                file={inventoryFile}
                onChange={setInventoryFile}
              />
              <FileInput
                label="Product margins"
                description="Sell price, cost, margin, safe discount"
                file={marginFile}
                onChange={setMarginFile}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
              AI will analyze sales trends, slow days, peak sellers, stock status, AI action flags, and product-level safe discount limits.
            </p>
          </Section>

          <Section step="3" title="Exact merchant address">
            <div className="space-y-3">
              <label className="block">
                <span className="text-xs font-medium text-muted-foreground">Address shown on customer offer cards</span>
                <textarea
                  value={address}
                  onChange={(event) => onAddressChange(event.target.value)}
                  onKeyDown={onSearchEnter}
                  placeholder="Restaurant name, street, area, city, landmark..."
                  className="mt-1.5 min-h-[78px] w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <span className="mt-1 block text-[11px] text-muted-foreground">
                  Tip: add area/city for restaurant names. Press Ctrl+Enter to search.
                </span>
              </label>

              <div className="flex flex-col xs:flex-row xs:flex-wrap gap-2">
                <button
                  type="button"
                  onClick={findAddress}
                  disabled={locating}
                  className="min-h-9 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60"
                >
                  <i className="bi bi-search mr-1" /> Find address
                </button>
                <button
                  type="button"
                  onClick={useCurrentLocation}
                  disabled={locating}
                  className="min-h-9 rounded-xl border border-border px-3 py-2 text-xs font-semibold disabled:opacity-60"
                >
                  <i className="bi bi-crosshair mr-1" /> Use current location
                </button>
                <button
                  type="button"
                  onClick={applyCurrentPinAsExact}
                  className="min-h-9 rounded-xl border border-border px-3 py-2 text-xs font-semibold"
                >
                  <i className="bi bi-pin-map mr-1" /> Use this pin
                </button>
              </div>

              {renderAddressResults()}

              <div className="rounded-2xl border border-border bg-secondary/30 p-3">
                <div className="flex flex-col xs:flex-row xs:items-start xs:justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-muted-foreground">Selected map location</p>
                    <p className="mt-1 text-sm font-medium leading-snug">{selectedAddressLabel}</p>
                    <p className="mt-1 font-mono text-[11px] text-muted-foreground">{selectedCoordinateLabel}</p>
                  </div>
                  <button
                    type="button"
                    onClick={focusMapOnAddress}
                    className="w-full xs:w-auto shrink-0 rounded-lg bg-card px-2 py-1 text-[11px] font-semibold text-primary"
                  >
                    Center
                  </button>
                </div>
                <div className="mt-3 grid grid-cols-1 xs:grid-cols-2 gap-2">
                  <label className="block">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Latitude</span>
                    <input
                      value={currentExactCoordinates.lat}
                      onChange={(event) => updateExactCoordinate('lat', event.target.value)}
                      onBlur={onManualCoordinateBlur}
                      className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-2 text-xs outline-none focus:border-primary"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Longitude</span>
                    <input
                      value={currentExactCoordinates.lng}
                      onChange={(event) => updateExactCoordinate('lng', event.target.value)}
                      onBlur={onManualCoordinateBlur}
                      className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-2 text-xs outline-none focus:border-primary"
                    />
                  </label>
                </div>
              </div>

              <div
                className="relative h-64 overflow-hidden rounded-2xl border border-border bg-secondary"
                onPointerMove={onMapPointerMove}
                onPointerUp={() => setDraggingPin(false)}
                onPointerLeave={() => setDraggingPin(false)}
              >
                <iframe
                  title="Merchant exact location picker"
                  src={mapSrc}
                  className="absolute inset-0 h-full w-full border-0"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-background/5" />
                <button
                  type="button"
                  onPointerDown={(event) => {
                    setDraggingPin(true);
                    updatePinFromPointer(event);
                  }}
                  className="absolute z-20 -translate-x-1/2 -translate-y-full rounded-full bg-primary px-2.5 sm:px-3 py-2 text-[11px] sm:text-xs font-semibold text-primary-foreground shadow-lg touch-none"
                  style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
                >
                  <i className="bi bi-geo-alt-fill mr-1" /> Move pin
                </button>
              </div>

              <p className="text-xs text-muted-foreground">
                Exact pin: {pinnedCoordinates.lat}, {pinnedCoordinates.lng}
              </p>
            </div>
          </Section>

          <button
            onClick={onGenerate}
            disabled={generating}
            className="w-full bg-primary text-primary-foreground rounded-xl min-h-12 px-3 py-2 font-medium text-sm hover:bg-[hsl(var(--primary-hover))] transition inline-flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.99]"
          >
            {generating ? (
              <><i className="bi bi-arrow-repeat animate-spin text-base" /> AI is writing your offer…</>
            ) : (
              <><i className="bi bi-stars" /> Generate with AI</>
            )}
          </button>
        </div>

        {/* Preview */}
        <aside className="lg:sticky lg:top-6 lg:self-start space-y-3">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Live preview</p>
          {generated ? (
            <div className="space-y-3 animate-fade-up">
              <OfferCard
                merchantName={session?.name || ''}
                category={offerCategory}
                distanceMeters={120}
                offerText={generated.offerText}
                reasonWhyNow={generated.reasonWhyNow}
                expiresInMinutes={generated.expiresInMinutes}
                originalPrice={generated.originalPrice}
                offerPrice={generated.offerPrice}
                merchantAddress={address}
                onClaim={() => {}}
              />
              <div className="bg-card border border-border rounded-2xl p-4 space-y-2">
                {generated.targetItem && (
                  <p className="text-xs text-muted-foreground">
                    Target item: <span className="font-medium text-foreground">{generated.targetItem}</span>
                  </p>
                )}
                {(generated.originalPrice || generated.offerPrice) && (
                  <div className="grid grid-cols-1 xs:grid-cols-2 gap-2">
                    <div className="rounded-xl bg-secondary/70 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Actual price</p>
                      <p className="text-sm font-semibold mt-1">
                        {generated.originalPrice ? `$${generated.originalPrice.toFixed(2)}` : 'Unavailable'}
                      </p>
                    </div>
                    <div className="rounded-xl bg-success-soft p-3">
                      <p className="text-[10px] uppercase tracking-wider text-success">Offer price</p>
                      <p className="text-sm font-semibold text-success mt-1">
                        {generated.offerPrice ? `$${generated.offerPrice.toFixed(2)}` : 'Unavailable'}
                      </p>
                    </div>
                  </div>
                )}
                {generated.expectedCustomerVolume && (
                  <p className="text-xs text-muted-foreground">
                    First-come customer cap:{' '}
                    <span className="font-medium text-foreground">{generated.expectedCustomerVolume}</span>
                  </p>
                )}
                {generated.aiSuggestion && (
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    AI suggestion: <span className="text-foreground">{generated.aiSuggestion}</span>
                  </p>
                )}
                {generated.expectedBusinessImpact && (
                  <p className="text-xs text-muted-foreground leading-relaxed">{generated.expectedBusinessImpact}</p>
                )}
              </div>
              <button
                onClick={publish}
                className="w-full h-11 rounded-xl border border-primary text-primary bg-card text-sm font-medium hover:bg-primary hover:text-primary-foreground transition inline-flex items-center justify-center gap-2"
              >
                <i className="bi bi-check2-circle" /> Publish offer
              </button>
            </div>
          ) : (
            <div className="bg-card border border-dashed border-border rounded-2xl p-6 xs:p-10 text-center">
              <div className="w-12 h-12 rounded-xl bg-primary-soft text-primary flex items-center justify-center mx-auto mb-3">
                <i className="bi bi-stars text-lg" />
              </div>
              <p className="text-sm font-medium">Preview appears here</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[220px] mx-auto leading-relaxed">
                Your AI-generated offer will be shown as a customer would see it.
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

const Section = ({ step, title, children }: { step: string; title: string; children: React.ReactNode }) => (
  <section className="bg-card border border-border rounded-2xl p-4 sm:p-6 shadow-xs">
    <div className="flex items-center gap-2.5 mb-4">
      <span className="w-6 h-6 rounded-full bg-lavender-soft text-lavender flex items-center justify-center text-xs font-semibold">{step}</span>
      <h2 className="text-sm font-semibold">{title}</h2>
    </div>
    {children}
  </section>
);

const FileInput = ({
  label,
  description,
  file,
  onChange,
}: {
  label: string;
  description: string;
  file: File | null;
  onChange: (file: File | null) => void;
}) => (
  <label className="block rounded-2xl border border-dashed border-border bg-secondary/30 hover:bg-primary-soft/30 transition p-4 cursor-pointer">
    <span className="flex items-center gap-3">
      <span className="w-10 h-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center shrink-0">
        <i className="bi bi-file-earmark-spreadsheet text-lg" />
      </span>
      <span className="min-w-0">
        <span className="text-sm font-medium block">{label}</span>
        <span className="text-xs text-muted-foreground block break-all">
          {file ? file.name : description}
        </span>
      </span>
    </span>
    <input
      type="file"
      accept=".csv,.xlsx,.xls"
      onChange={(event) => onChange(event.target.files?.[0] || null)}
      className="hidden"
    />
  </label>
);

export default CreateOffer;
