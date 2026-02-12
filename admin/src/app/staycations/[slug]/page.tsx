"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AIImportTab from "./components/AIImportTab";

interface RoomType {
  id: string;
  name: string;
  description: string;
  pricePerNight: number;
  maxGuests: number;
  amenities: string[];
  images: string[];
}

interface Staycation {
  slug: string;
  name: string;
  location: string;
  description: string;
  homePageImage: string;
  portraitImage: string;
  cardImage: string;
  heroImage: string;
  gallery: { url: string; alt: string }[];
  overview: {
    description: string;
    highlights: string[];
    checkIn: string;
    checkOut: string;
    amenities: string[];
  };
  rooms: RoomType[];
  destination: {
    name: string;
    description: string;
    attractions: string[];
    distanceFromAirport: string;
    distanceFromRailway: string;
  };
  transfers: {
    airportPickup: { available: boolean; price: number };
    railwayPickup: { available: boolean; price: number };
  };
  booking: {
    email: string;
    phone: string;
    whatsapp: string;
    externalUrl: string;
  };
  tours: {
    enabled: boolean;
    source: "viator" | "custom";
    viatorDestinationId: number;
    viatorTagIds: number[];
    customTourIds: string[];
    gygEnabled: boolean;
    gygTourIds: string[];
  };
}

const defaultStaycation: Partial<Staycation> = {
  gallery: [],
  overview: {
    description: "",
    highlights: [],
    checkIn: "2:00 PM",
    checkOut: "11:00 AM",
    amenities: [],
  },
  rooms: [],
  destination: {
    name: "",
    description: "",
    attractions: [],
    distanceFromAirport: "",
    distanceFromRailway: "",
  },
  transfers: {
    airportPickup: { available: false, price: 0 },
    railwayPickup: { available: false, price: 0 },
  },
  booking: {
    email: "",
    phone: "",
    whatsapp: "",
    externalUrl: "",
  },
  tours: {
    enabled: false,
    source: "viator",
    viatorDestinationId: 0,
    viatorTagIds: [],
    customTourIds: [],
    gygEnabled: true,
    gygTourIds: [],
  },
};

type TabType = "images" | "overview" | "rooms" | "destination" | "transfers" | "booking" | "tours" | "ai-import";

export default function StaycationEditPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [staycation, setStaycation] = useState<Staycation | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("images");

  useEffect(() => {
    fetch(`/api/staycations?slug=${slug}`)
      .then(res => res.json())
      .then(data => {
        // Merge with defaults for missing fields
        const merged = { ...defaultStaycation, ...data.staycation };
        merged.overview = { ...defaultStaycation.overview, ...data.staycation?.overview };
        merged.destination = { ...defaultStaycation.destination, ...data.staycation?.destination };
        merged.transfers = { ...defaultStaycation.transfers, ...data.staycation?.transfers };
        merged.booking = { ...defaultStaycation.booking, ...data.staycation?.booking };
        merged.tours = { ...defaultStaycation.tours, ...data.staycation?.tours };
        merged.gallery = data.staycation?.gallery || [];
        merged.rooms = data.staycation?.rooms || [];
        setStaycation(merged);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [slug]);

  const save = async () => {
    if (!staycation) return;
    setSaving(true);
    try {
      await fetch("/api/staycations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, updates: staycation }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error("Save error:", error);
    }
    setSaving(false);
  };

  const uploadImage = async (file: File, name: string): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", `${slug}-${name}-${Date.now()}`);

    const res = await fetch("/api/images", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    return data.generated?.[0]?.url || "";
  };

  if (loading) {
    return <div className="p-8 animate-pulse">Loading...</div>;
  }

  if (!staycation) {
    return <div className="p-8">Staycation not found</div>;
  }

  const tabs: { id: TabType; label: string }[] = [
    { id: "images", label: "Images" },
    { id: "overview", label: "Hotel Overview" },
    { id: "rooms", label: "Room Types" },
    { id: "destination", label: "Destination" },
    { id: "transfers", label: "Transfers" },
    { id: "booking", label: "Booking" },
    { id: "tours", label: "Tours" },
    { id: "ai-import", label: "AI Import" },
  ];

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <Link href="/staycations" className="text-blue-600 hover:underline text-sm mb-2 block">
            ← Back to Staycations
          </Link>
          <h1 className="text-3xl font-bold">{staycation.name}</h1>
          <p className="text-gray-500">{staycation.location}</p>
        </div>
        <div className="flex items-center gap-3">
          {saved && <span className="text-green-600">Saved!</span>}
          <button
            onClick={save}
            disabled={saving}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b mb-6">
        <div className="flex gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 font-medium rounded-t-lg ${
                activeTab === tab.id
                  ? "bg-white border border-b-white -mb-px text-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white border rounded-lg p-6">
        {activeTab === "images" && (
          <ImagesTab staycation={staycation} setStaycation={setStaycation} />
        )}
        {activeTab === "overview" && (
          <OverviewTab staycation={staycation} setStaycation={setStaycation} />
        )}
        {activeTab === "rooms" && (
          <RoomsTab staycation={staycation} setStaycation={setStaycation} />
        )}
        {activeTab === "destination" && (
          <DestinationTab staycation={staycation} setStaycation={setStaycation} />
        )}
        {activeTab === "transfers" && (
          <TransfersTab staycation={staycation} setStaycation={setStaycation} />
        )}
        {activeTab === "booking" && (
          <BookingTab staycation={staycation} setStaycation={setStaycation} />
        )}
        {activeTab === "tours" && (
          <ToursTab staycation={staycation} setStaycation={setStaycation} />
        )}
        {activeTab === "ai-import" && (
          <AIImportTab staycation={staycation} setStaycation={setStaycation} />
        )}
      </div>
    </div>
  );
}

// Images Tab
function ImagesTab({ staycation, setStaycation }: { staycation: Staycation; setStaycation: (s: Staycation) => void }) {
  const [uploading, setUploading] = useState<string | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(field);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("category", "staycations");
    formData.append("name", `${staycation.slug}-${field}`);

    try {
      const res = await fetch("/api/images", { method: "POST", body: formData });
      const data = await res.json();
      // Use publicUrl (relative path) for storage, not GitHub raw URL
      if (data.generated?.[0]?.publicUrl) {
        setStaycation({ ...staycation, [field]: data.generated[0].publicUrl });
      }
    } catch (error) {
      console.error("Upload error:", error);
    }
    setUploading(null);
  };

  const addGalleryImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading("gallery");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("category", "staycations");
    formData.append("name", `${staycation.slug}-gallery-${Date.now()}`);

    try {
      const res = await fetch("/api/images", { method: "POST", body: formData });
      const data = await res.json();
      // Use publicUrl (relative path) for storage, not GitHub raw URL
      if (data.generated?.[0]?.publicUrl) {
        setStaycation({
          ...staycation,
          gallery: [...(staycation.gallery || []), { url: data.generated[0].publicUrl, alt: "" }],
        });
      }
    } catch (error) {
      console.error("Upload error:", error);
    }
    setUploading(null);
  };

  const removeGalleryImage = (index: number) => {
    const newGallery = [...staycation.gallery];
    newGallery.splice(index, 1);
    setStaycation({ ...staycation, gallery: newGallery });
  };

  const imageFields = [
    { key: "homePageImage", label: "Home Page Slot", desc: "Featured on homepage" },
    { key: "heroImage", label: "Hero Image", desc: "Banner on detail page" },
    { key: "cardImage", label: "Card Image", desc: "Listing thumbnail" },
    { key: "portraitImage", label: "Portrait Image", desc: "Vertical format" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h3 className="font-semibold text-lg mb-4">Main Images</h3>
        <div className="grid grid-cols-2 gap-6">
          {imageFields.map(({ key, label, desc }) => (
            <div key={key} className="border rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="font-medium">{label}</div>
                  <div className="text-sm text-gray-500">{desc}</div>
                </div>
                <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded text-sm">
                  {uploading === key ? "Uploading..." : "Upload"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleUpload(e, key)}
                    disabled={uploading === key}
                  />
                </label>
              </div>
              {staycation[key as keyof Staycation] ? (
                <img
                  src={staycation[key as keyof Staycation] as string}
                  alt={label}
                  className="w-full h-32 object-cover rounded"
                />
              ) : (
                <div className="w-full h-32 bg-gray-100 rounded flex items-center justify-center text-gray-400">
                  No image
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-lg">Gallery</h3>
          <label className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            {uploading === "gallery" ? "Uploading..." : "+ Add Image"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={addGalleryImage}
              disabled={uploading === "gallery"}
            />
          </label>
        </div>
        {staycation.gallery?.length > 0 ? (
          <div className="grid grid-cols-4 gap-4">
            {staycation.gallery.map((img, index) => (
              <div key={index} className="relative group">
                <img src={img.url} alt={img.alt} className="w-full h-24 object-cover rounded" />
                <button
                  onClick={() => removeGalleryImage(index)}
                  className="absolute top-1 right-1 bg-red-500 text-white w-6 h-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-500 text-center py-8 border-2 border-dashed rounded-lg">
            No gallery images. Click "Add Image" to upload.
          </div>
        )}
      </div>
    </div>
  );
}

// Overview Tab
function OverviewTab({ staycation, setStaycation }: { staycation: Staycation; setStaycation: (s: Staycation) => void }) {
  const updateOverview = (field: string, value: unknown) => {
    setStaycation({
      ...staycation,
      overview: { ...staycation.overview, [field]: value },
    });
  };

  const addHighlight = () => {
    updateOverview("highlights", [...(staycation.overview.highlights || []), ""]);
  };

  const updateHighlight = (index: number, value: string) => {
    const highlights = [...staycation.overview.highlights];
    highlights[index] = value;
    updateOverview("highlights", highlights);
  };

  const removeHighlight = (index: number) => {
    const highlights = [...staycation.overview.highlights];
    highlights.splice(index, 1);
    updateOverview("highlights", highlights);
  };

  const addAmenity = () => {
    updateOverview("amenities", [...(staycation.overview.amenities || []), ""]);
  };

  const updateAmenity = (index: number, value: string) => {
    const amenities = [...staycation.overview.amenities];
    amenities[index] = value;
    updateOverview("amenities", amenities);
  };

  const removeAmenity = (index: number) => {
    const amenities = [...staycation.overview.amenities];
    amenities.splice(index, 1);
    updateOverview("amenities", amenities);
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block font-medium mb-2">Hotel Description</label>
        <textarea
          value={staycation.overview.description || ""}
          onChange={(e) => updateOverview("description", e.target.value)}
          rows={5}
          className="w-full border rounded-lg p-3"
          placeholder="Detailed description of the hotel..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block font-medium mb-2">Check-in Time</label>
          <input
            type="text"
            value={staycation.overview.checkIn || ""}
            onChange={(e) => updateOverview("checkIn", e.target.value)}
            className="w-full border rounded-lg p-2"
            placeholder="2:00 PM"
          />
        </div>
        <div>
          <label className="block font-medium mb-2">Check-out Time</label>
          <input
            type="text"
            value={staycation.overview.checkOut || ""}
            onChange={(e) => updateOverview("checkOut", e.target.value)}
            className="w-full border rounded-lg p-2"
            placeholder="11:00 AM"
          />
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="font-medium">Highlights</label>
          <button onClick={addHighlight} className="text-blue-600 text-sm hover:underline">
            + Add Highlight
          </button>
        </div>
        <div className="space-y-2">
          {staycation.overview.highlights?.map((h, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="text"
                value={h}
                onChange={(e) => updateHighlight(i, e.target.value)}
                className="flex-1 border rounded-lg p-2"
                placeholder="e.g., Lake view rooms"
              />
              <button onClick={() => removeHighlight(i)} className="text-red-500 px-2">×</button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="font-medium">Amenities</label>
          <button onClick={addAmenity} className="text-blue-600 text-sm hover:underline">
            + Add Amenity
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {staycation.overview.amenities?.map((a, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="text"
                value={a}
                onChange={(e) => updateAmenity(i, e.target.value)}
                className="flex-1 border rounded-lg p-2"
                placeholder="e.g., Swimming Pool"
              />
              <button onClick={() => removeAmenity(i)} className="text-red-500 px-2">×</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Rooms Tab
function RoomsTab({ staycation, setStaycation }: { staycation: Staycation; setStaycation: (s: Staycation) => void }) {
  const addRoom = () => {
    const newRoom: RoomType = {
      id: `room-${Date.now()}`,
      name: "",
      description: "",
      pricePerNight: 0,
      maxGuests: 2,
      amenities: [],
      images: [],
    };
    setStaycation({ ...staycation, rooms: [...(staycation.rooms || []), newRoom] });
  };

  const updateRoom = (index: number, updates: Partial<RoomType>) => {
    const rooms = [...staycation.rooms];
    rooms[index] = { ...rooms[index], ...updates };
    setStaycation({ ...staycation, rooms });
  };

  const removeRoom = (index: number) => {
    const rooms = [...staycation.rooms];
    rooms.splice(index, 1);
    setStaycation({ ...staycation, rooms });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-lg">Room Types</h3>
        <button onClick={addRoom} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          + Add Room Type
        </button>
      </div>

      {staycation.rooms?.length > 0 ? (
        <div className="space-y-4">
          {staycation.rooms.map((room, index) => (
            <div key={room.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-start mb-4">
                <input
                  type="text"
                  value={room.name}
                  onChange={(e) => updateRoom(index, { name: e.target.value })}
                  className="text-lg font-medium border-b border-transparent hover:border-gray-300 focus:border-blue-500 outline-none"
                  placeholder="Room Name (e.g., Deluxe Suite)"
                />
                <button onClick={() => removeRoom(index)} className="text-red-500 hover:underline text-sm">
                  Remove
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Price per Night (₹)</label>
                  <input
                    type="number"
                    value={room.pricePerNight || ""}
                    onChange={(e) => updateRoom(index, { pricePerNight: parseInt(e.target.value) || 0 })}
                    className="w-full border rounded p-2"
                    placeholder="5000"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Max Guests</label>
                  <input
                    type="number"
                    value={room.maxGuests || ""}
                    onChange={(e) => updateRoom(index, { maxGuests: parseInt(e.target.value) || 2 })}
                    className="w-full border rounded p-2"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm text-gray-600 mb-1">Description</label>
                <textarea
                  value={room.description}
                  onChange={(e) => updateRoom(index, { description: e.target.value })}
                  rows={2}
                  className="w-full border rounded p-2"
                  placeholder="Room description..."
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Room Amenities (comma-separated)</label>
                <input
                  type="text"
                  value={room.amenities?.join(", ") || ""}
                  onChange={(e) => updateRoom(index, { amenities: e.target.value.split(",").map(a => a.trim()).filter(Boolean) })}
                  className="w-full border rounded p-2"
                  placeholder="AC, Wi-Fi, Mini Bar, Balcony"
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border-2 border-dashed rounded-lg text-gray-500">
          No room types added. Click "Add Room Type" to create one.
        </div>
      )}
    </div>
  );
}

// Destination Tab
function DestinationTab({ staycation, setStaycation }: { staycation: Staycation; setStaycation: (s: Staycation) => void }) {
  const updateDestination = (field: string, value: unknown) => {
    setStaycation({
      ...staycation,
      destination: { ...staycation.destination, [field]: value },
    });
  };

  const addAttraction = () => {
    updateDestination("attractions", [...(staycation.destination.attractions || []), ""]);
  };

  const updateAttraction = (index: number, value: string) => {
    const attractions = [...staycation.destination.attractions];
    attractions[index] = value;
    updateDestination("attractions", attractions);
  };

  const removeAttraction = (index: number) => {
    const attractions = [...staycation.destination.attractions];
    attractions.splice(index, 1);
    updateDestination("attractions", attractions);
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block font-medium mb-2">Destination Name</label>
        <input
          type="text"
          value={staycation.destination.name || ""}
          onChange={(e) => updateDestination("name", e.target.value)}
          className="w-full border rounded-lg p-2"
          placeholder="e.g., Udaipur, Rajasthan"
        />
      </div>

      <div>
        <label className="block font-medium mb-2">Destination Description</label>
        <textarea
          value={staycation.destination.description || ""}
          onChange={(e) => updateDestination("description", e.target.value)}
          rows={4}
          className="w-full border rounded-lg p-3"
          placeholder="About the destination..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block font-medium mb-2">Distance from Airport</label>
          <input
            type="text"
            value={staycation.destination.distanceFromAirport || ""}
            onChange={(e) => updateDestination("distanceFromAirport", e.target.value)}
            className="w-full border rounded-lg p-2"
            placeholder="e.g., 25 km (45 min)"
          />
        </div>
        <div>
          <label className="block font-medium mb-2">Distance from Railway Station</label>
          <input
            type="text"
            value={staycation.destination.distanceFromRailway || ""}
            onChange={(e) => updateDestination("distanceFromRailway", e.target.value)}
            className="w-full border rounded-lg p-2"
            placeholder="e.g., 5 km (15 min)"
          />
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="font-medium">Nearby Attractions</label>
          <button onClick={addAttraction} className="text-blue-600 text-sm hover:underline">
            + Add Attraction
          </button>
        </div>
        <div className="space-y-2">
          {staycation.destination.attractions?.map((a, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="text"
                value={a}
                onChange={(e) => updateAttraction(i, e.target.value)}
                className="flex-1 border rounded-lg p-2"
                placeholder="e.g., City Palace (2 km)"
              />
              <button onClick={() => removeAttraction(i)} className="text-red-500 px-2">×</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Transfers Tab
function TransfersTab({ staycation, setStaycation }: { staycation: Staycation; setStaycation: (s: Staycation) => void }) {
  const updateTransfer = (type: "airportPickup" | "railwayPickup", field: string, value: unknown) => {
    setStaycation({
      ...staycation,
      transfers: {
        ...staycation.transfers,
        [type]: { ...staycation.transfers[type], [field]: value },
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="border rounded-lg p-4">
        <div className="flex items-center gap-3 mb-4">
          <input
            type="checkbox"
            id="airportPickup"
            checked={staycation.transfers.airportPickup?.available || false}
            onChange={(e) => updateTransfer("airportPickup", "available", e.target.checked)}
            className="w-5 h-5"
          />
          <label htmlFor="airportPickup" className="font-medium text-lg">Airport Pickup Available</label>
        </div>
        {staycation.transfers.airportPickup?.available && (
          <div>
            <label className="block text-sm text-gray-600 mb-1">Price (₹)</label>
            <input
              type="number"
              value={staycation.transfers.airportPickup?.price || ""}
              onChange={(e) => updateTransfer("airportPickup", "price", parseInt(e.target.value) || 0)}
              className="w-48 border rounded p-2"
              placeholder="1500"
            />
          </div>
        )}
      </div>

      <div className="border rounded-lg p-4">
        <div className="flex items-center gap-3 mb-4">
          <input
            type="checkbox"
            id="railwayPickup"
            checked={staycation.transfers.railwayPickup?.available || false}
            onChange={(e) => updateTransfer("railwayPickup", "available", e.target.checked)}
            className="w-5 h-5"
          />
          <label htmlFor="railwayPickup" className="font-medium text-lg">Railway Station Pickup Available</label>
        </div>
        {staycation.transfers.railwayPickup?.available && (
          <div>
            <label className="block text-sm text-gray-600 mb-1">Price (₹)</label>
            <input
              type="number"
              value={staycation.transfers.railwayPickup?.price || ""}
              onChange={(e) => updateTransfer("railwayPickup", "price", parseInt(e.target.value) || 0)}
              className="w-48 border rounded p-2"
              placeholder="800"
            />
          </div>
        )}
      </div>
    </div>
  );
}

// Booking Tab
function BookingTab({ staycation, setStaycation }: { staycation: Staycation; setStaycation: (s: Staycation) => void }) {
  const updateBooking = (field: string, value: string) => {
    setStaycation({
      ...staycation,
      booking: { ...staycation.booking, [field]: value },
    });
  };

  return (
    <div className="space-y-6">
      <p className="text-gray-600">
        Configure contact details for enquiries and bookings.
      </p>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block font-medium mb-2">Email</label>
          <input
            type="email"
            value={staycation.booking.email || ""}
            onChange={(e) => updateBooking("email", e.target.value)}
            className="w-full border rounded-lg p-2"
            placeholder="reservations@hotel.com"
          />
        </div>
        <div>
          <label className="block font-medium mb-2">Phone</label>
          <input
            type="tel"
            value={staycation.booking.phone || ""}
            onChange={(e) => updateBooking("phone", e.target.value)}
            className="w-full border rounded-lg p-2"
            placeholder="+91 98765 43210"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block font-medium mb-2">WhatsApp</label>
          <input
            type="tel"
            value={staycation.booking.whatsapp || ""}
            onChange={(e) => updateBooking("whatsapp", e.target.value)}
            className="w-full border rounded-lg p-2"
            placeholder="+91 98765 43210"
          />
        </div>
        <div>
          <label className="block font-medium mb-2">External Booking URL</label>
          <input
            type="url"
            value={staycation.booking.externalUrl || ""}
            onChange={(e) => updateBooking("externalUrl", e.target.value)}
            className="w-full border rounded-lg p-2"
            placeholder="https://booking.com/hotel/..."
          />
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
        <h4 className="font-medium text-blue-800 mb-2">Booking Buttons Preview</h4>
        <div className="flex gap-3">
          <button className="bg-green-600 text-white px-4 py-2 rounded">
            WhatsApp Enquiry
          </button>
          <button className="bg-blue-600 text-white px-4 py-2 rounded">
            Book Now
          </button>
        </div>
      </div>
    </div>
  );
}

// Viator Filter Options
const VIATOR_DESTINATIONS = [
  { id: 684, name: "Delhi" },
  { id: 953, name: "Jaipur" },
  { id: 955, name: "Mumbai" },
  { id: 947, name: "Goa" },
  { id: 930, name: "Agra" },
  { id: 959, name: "Udaipur" },
  { id: 960, name: "Varanasi" },
  { id: 958, name: "Kerala" },
  { id: 952, name: "Hyderabad" },
  { id: 932, name: "Amritsar" },
  { id: 954, name: "Kolkata" },
  { id: 956, name: "Chennai" },
  { id: 957, name: "Bangalore" },
];

const VIATOR_QUALITY_TAGS = [
  { id: 367652, name: "Top Product", desc: "Viator's highest quality" },
  { id: 21972, name: "Excellent Quality", desc: "High-rated experiences" },
  { id: 22143, name: "Best Conversion", desc: "Products that sell well" },
  { id: 22083, name: "Likely To Sell Out", desc: "High-demand products" },
];

const VIATOR_CATEGORY_TAGS = [
  { id: 21913, name: "Tours & Sightseeing" },
  { id: 21911, name: "Food & Drink" },
  { id: 11890, name: "Dining Experiences" },
  { id: 21909, name: "Outdoor Activities" },
  { id: 21912, name: "Classes & Workshops" },
  { id: 21910, name: "Art & Culture" },
  { id: 21915, name: "Tickets & Passes" },
  { id: 21914, name: "Transport & Transfers" },
];

const VIATOR_EXPERIENCE_TAGS = [
  { id: 11940, name: "Once in a Lifetime" },
  { id: 21074, name: "Unique Experiences" },
  { id: 12716, name: "Private Tours" },
  { id: 21568, name: "Skip the Line" },
  { id: 11866, name: "Walking Tours" },
  { id: 12565, name: "Day Trips" },
  { id: 11943, name: "Multi-day Tours" },
];

// Tours Tab
function ToursTab({ staycation, setStaycation }: { staycation: Staycation; setStaycation: (s: Staycation) => void }) {
  const updateTours = (field: string, value: unknown) => {
    setStaycation({
      ...staycation,
      tours: { ...staycation.tours, [field]: value },
    });
  };

  const toggleTag = (tagId: number) => {
    const currentTags = staycation.tours?.viatorTagIds || [];
    const newTags = currentTags.includes(tagId)
      ? currentTags.filter(id => id !== tagId)
      : [...currentTags, tagId];
    updateTours("viatorTagIds", newTags);
  };

  const isTagSelected = (tagId: number) => {
    return staycation.tours?.viatorTagIds?.includes(tagId) || false;
  };

  return (
    <div className="space-y-6">
      <p className="text-gray-600">
        Add tours and experiences to display at the bottom of the property page.
      </p>

      <div className="border rounded-lg p-4">
        <div className="flex items-center gap-3 mb-4">
          <input
            type="checkbox"
            id="toursEnabled"
            checked={staycation.tours?.enabled || false}
            onChange={(e) => updateTours("enabled", e.target.checked)}
            className="w-5 h-5"
          />
          <label htmlFor="toursEnabled" className="font-medium text-lg">Enable Tours Section</label>
        </div>
      </div>

      {staycation.tours?.enabled && (
        <>
          <div>
            <label className="block font-medium mb-2">Tour Source</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="tourSource"
                  checked={staycation.tours?.source === "viator"}
                  onChange={() => updateTours("source", "viator")}
                  className="w-4 h-4"
                />
                <span>Viator (Affiliate)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="tourSource"
                  checked={staycation.tours?.source === "custom"}
                  onChange={() => updateTours("source", "custom")}
                  className="w-4 h-4"
                />
                <span>Custom Tours (Coming Soon)</span>
              </label>
            </div>
          </div>

          {staycation.tours?.source === "viator" && (
            <div className="bg-gray-50 border rounded-lg p-4 space-y-6">
              <h3 className="font-medium text-lg">Viator Configuration</h3>

              {/* Destination Dropdown */}
              <div>
                <label className="block text-sm font-medium mb-2">Destination</label>
                <select
                  value={staycation.tours?.viatorDestinationId || ""}
                  onChange={(e) => updateTours("viatorDestinationId", parseInt(e.target.value) || 0)}
                  className="w-full border rounded-lg p-2 bg-white"
                >
                  <option value="">Select a destination...</option>
                  {VIATOR_DESTINATIONS.map(dest => (
                    <option key={dest.id} value={dest.id}>
                      {dest.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quality Tags */}
              <div>
                <label className="block text-sm font-medium mb-2">Quality Filters</label>
                <div className="grid grid-cols-2 gap-2">
                  {VIATOR_QUALITY_TAGS.map(tag => (
                    <label
                      key={tag.id}
                      className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors ${
                        isTagSelected(tag.id) ? "bg-blue-50 border-blue-300" : "bg-white hover:bg-gray-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isTagSelected(tag.id)}
                        onChange={() => toggleTag(tag.id)}
                        className="w-4 h-4"
                      />
                      <div>
                        <div className="font-medium text-sm">{tag.name}</div>
                        <div className="text-xs text-gray-500">{tag.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Category Tags */}
              <div>
                <label className="block text-sm font-medium mb-2">Categories</label>
                <div className="grid grid-cols-2 gap-2">
                  {VIATOR_CATEGORY_TAGS.map(tag => (
                    <label
                      key={tag.id}
                      className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors ${
                        isTagSelected(tag.id) ? "bg-green-50 border-green-300" : "bg-white hover:bg-gray-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isTagSelected(tag.id)}
                        onChange={() => toggleTag(tag.id)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">{tag.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Experience Type Tags */}
              <div>
                <label className="block text-sm font-medium mb-2">Experience Types</label>
                <div className="grid grid-cols-2 gap-2">
                  {VIATOR_EXPERIENCE_TAGS.map(tag => (
                    <label
                      key={tag.id}
                      className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors ${
                        isTagSelected(tag.id) ? "bg-purple-50 border-purple-300" : "bg-white hover:bg-gray-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isTagSelected(tag.id)}
                        onChange={() => toggleTag(tag.id)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">{tag.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Selected Tags Summary */}
              {(staycation.tours?.viatorTagIds?.length || 0) > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded p-3">
                  <p className="text-sm text-blue-800">
                    <strong>Selected filters:</strong>{" "}
                    {staycation.tours.viatorTagIds.length} tag(s) active
                  </p>
                  <button
                    onClick={() => updateTours("viatorTagIds", [])}
                    className="text-sm text-blue-600 hover:underline mt-1"
                  >
                    Clear all filters
                  </button>
                </div>
              )}
            </div>
          )}

          {staycation.tours?.source === "custom" && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800">
                Custom tours database coming soon. You'll be able to create and manage your own tours here.
              </p>
            </div>
          )}
        </>
      )}

      {/* GetYourGuide Widget Section */}
      <div className="border-t pt-6 mt-6">
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-3 mb-4">
            <input
              type="checkbox"
              id="gygEnabled"
              checked={staycation.tours?.gygEnabled !== false}
              onChange={(e) => updateTours("gygEnabled", e.target.checked)}
              className="w-5 h-5"
            />
            <label htmlFor="gygEnabled" className="font-medium text-lg">GetYourGuide Widget</label>
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Affiliate</span>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Embeds an interactive GetYourGuide widget with live availability and booking. Partner ID: OBZX5NA
          </p>

          {staycation.tours?.gygEnabled !== false && (
            <div className="bg-gray-50 border rounded-lg p-4 space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium">GYG Tour IDs</label>
                  <button
                    onClick={() => updateTours("gygTourIds", [...(staycation.tours?.gygTourIds || []), ""])}
                    className="text-blue-600 text-sm hover:underline"
                  >
                    + Add Tour
                  </button>
                </div>
                <div className="space-y-2">
                  {(staycation.tours?.gygTourIds || []).map((id: string, i: number) => (
                    <div key={i} className="flex gap-2">
                      <input
                        type="text"
                        value={id}
                        onChange={(e) => {
                          const ids = [...(staycation.tours?.gygTourIds || [])];
                          ids[i] = e.target.value;
                          updateTours("gygTourIds", ids);
                        }}
                        className="flex-1 border rounded-lg p-2 bg-white"
                        placeholder="e.g., 280242"
                      />
                      <button
                        onClick={() => {
                          const ids = [...(staycation.tours?.gygTourIds || [])];
                          ids.splice(i, 1);
                          updateTours("gygTourIds", ids);
                        }}
                        className="text-red-500 px-2"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  The numeric tour ID from GetYourGuide. Find it in the activity URL (e.g., getyourguide.com/...t280242). Each ID shows an availability widget.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
