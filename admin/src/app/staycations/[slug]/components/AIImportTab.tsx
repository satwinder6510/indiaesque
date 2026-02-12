"use client";

import { useState, useCallback } from "react";
import {
  AIImportProgress,
  ExtractedStaycation,
  ImageDownloadResult,
} from "@/lib/ai-import/types";

/* eslint-disable @typescript-eslint/no-explicit-any */
interface AIImportTabProps {
  staycation: any;
  setStaycation: (s: any) => void;
}

type FieldKey = "name" | "location" | "overview" | "rooms" | "booking" | "images";

const FIELD_LABELS: Record<FieldKey, string> = {
  name: "Name",
  location: "Location",
  overview: "Overview",
  rooms: "Rooms",
  booking: "Booking",
  images: "Images",
};

export default function AIImportTab({
  staycation,
  setStaycation,
}: AIImportTabProps) {
  const [url, setUrl] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState<AIImportProgress | null>(null);
  const [extractedData, setExtractedData] =
    useState<ExtractedStaycation | null>(null);
  const [imageResults, setImageResults] = useState<ImageDownloadResult[]>([]);
  const [selectedFields, setSelectedFields] = useState<Set<FieldKey>>(
    new Set()
  );
  const [showRawData, setShowRawData] = useState(false);

  const handleImport = useCallback(async () => {
    if (!url.trim()) return;

    setIsImporting(true);
    setProgress(null);
    setExtractedData(null);
    setImageResults([]);
    setSelectedFields(new Set());

    try {
      const response = await fetch("/api/ai-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, slug: staycation.slug }),
      });

      if (!response.ok) {
        const error = await response.json();
        setProgress({
          step: "error",
          message: error.error || "Import failed",
          error: error.error,
        });
        setIsImporting(false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response stream");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE messages
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6)) as AIImportProgress;
              setProgress(data);

              if (data.step === "complete" && data.data) {
                setExtractedData(data.data);
                setImageResults(data.imageResults || []);
                // Auto-select all fields with data
                const fieldsWithData = getFieldsWithData(data.data);
                setSelectedFields(new Set(fieldsWithData));
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      setProgress({
        step: "error",
        message:
          error instanceof Error ? error.message : "Connection failed",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }

    setIsImporting(false);
  }, [url, staycation.slug]);

  const toggleField = (field: FieldKey) => {
    const newSelected = new Set(selectedFields);
    if (newSelected.has(field)) {
      newSelected.delete(field);
    } else {
      newSelected.add(field);
    }
    setSelectedFields(newSelected);
  };

  const handleApply = () => {
    if (!extractedData) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: Record<string, any> = {};

    if (selectedFields.has("name") && extractedData.name) {
      updates.name = extractedData.name;
    }

    if (selectedFields.has("location") && extractedData.location) {
      updates.location = extractedData.location;
    }

    if (selectedFields.has("overview") && extractedData.overview) {
      updates.overview = {
        ...staycation.overview,
        description:
          extractedData.overview.description ||
          staycation.overview.description,
        highlights:
          extractedData.overview.highlights.length > 0
            ? extractedData.overview.highlights
            : staycation.overview.highlights,
        amenities:
          extractedData.overview.amenities.length > 0
            ? extractedData.overview.amenities
            : staycation.overview.amenities,
      };
    }

    if (selectedFields.has("rooms") && extractedData.rooms) {
      const newRooms = extractedData.rooms.map((room, index) => ({
        id: `room-imported-${Date.now()}-${index}`,
        name: room.name,
        description: room.description,
        pricePerNight: 0,
        maxGuests: 2,
        amenities: [],
        images: room.images || [],
      }));
      updates.rooms = [...staycation.rooms, ...newRooms];
    }

    if (selectedFields.has("booking") && extractedData.booking) {
      updates.booking = {
        ...staycation.booking,
        email: extractedData.booking.email || staycation.booking.email,
        phone: extractedData.booking.phone || staycation.booking.phone,
        externalUrl:
          extractedData.booking.externalUrl ||
          staycation.booking.externalUrl,
      };
    }

    if (selectedFields.has("images") && extractedData.images) {
      if (extractedData.images.hero) {
        updates.heroImage = extractedData.images.hero;
      }
      if (extractedData.images.gallery && extractedData.images.gallery.length > 0) {
        const newGallery = extractedData.images.gallery.map((url) => ({
          url,
          alt: "",
        }));
        updates.gallery = [...staycation.gallery, ...newGallery];
      }
    }

    setStaycation({ ...staycation, ...updates });
  };

  const failedImages = imageResults.filter((r) => r.error);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-lg mb-2">AI Import</h3>
        <p className="text-gray-600 text-sm mb-4">
          Import hotel data from a website URL. The AI will extract property
          information, amenities, room types, and images.
        </p>
      </div>

      {/* URL Input */}
      <div>
        <label className="block font-medium mb-2">Hotel Website URL</label>
        <div className="flex gap-3">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.example.com/hotel-page"
            className="flex-1 border rounded-lg p-3"
            disabled={isImporting}
          />
          <button
            onClick={handleImport}
            disabled={isImporting || !url.trim()}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isImporting ? "Importing..." : "Import"}
          </button>
        </div>
      </div>

      {/* Progress */}
      {progress && (
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">
              {progress.step === "error" ? "Error" : "Progress"}
            </span>
            {progress.progress !== undefined && (
              <span className="text-sm text-gray-500">
                {progress.progress}%
              </span>
            )}
          </div>

          {progress.progress !== undefined && progress.step !== "error" && (
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${progress.progress}%` }}
              />
            </div>
          )}

          <p
            className={`text-sm ${progress.step === "error" ? "text-red-600" : "text-gray-600"}`}
          >
            {progress.message}
          </p>
        </div>
      )}

      {/* Extracted Data Preview */}
      {extractedData && progress?.step === "complete" && (
        <div className="border rounded-lg p-4">
          <h4 className="font-medium mb-4">Extracted Data</h4>

          <p className="text-sm text-gray-600 mb-4">
            Select fields to apply to the staycation:
          </p>

          {/* Field Checkboxes */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {(Object.keys(FIELD_LABELS) as FieldKey[]).map((field) => {
              const hasData = fieldHasData(extractedData, field);
              return (
                <label
                  key={field}
                  className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                    !hasData
                      ? "opacity-50 cursor-not-allowed bg-gray-50"
                      : selectedFields.has(field)
                        ? "bg-blue-50 border-blue-300"
                        : "hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedFields.has(field)}
                    onChange={() => hasData && toggleField(field)}
                    disabled={!hasData}
                    className="w-4 h-4"
                  />
                  <span className="font-medium">{FIELD_LABELS[field]}</span>
                  {!hasData && (
                    <span className="text-xs text-gray-400">(empty)</span>
                  )}
                </label>
              );
            })}
          </div>

          {/* Image Warnings */}
          {failedImages.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-yellow-800">
                {failedImages.length} image(s) failed to download
              </p>
            </div>
          )}

          {/* Raw Data Toggle */}
          <button
            onClick={() => setShowRawData(!showRawData)}
            className="text-sm text-blue-600 hover:underline mb-4"
          >
            {showRawData ? "▼ Hide Raw Data" : "▶ View Raw Data"}
          </button>

          {showRawData && (
            <pre className="bg-gray-100 p-4 rounded-lg text-xs overflow-auto max-h-64 mb-4">
              {JSON.stringify(extractedData, null, 2)}
            </pre>
          )}

          {/* Apply Button */}
          <button
            onClick={handleApply}
            disabled={selectedFields.size === 0}
            className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            Apply {selectedFields.size} Field(s) to Staycation
          </button>
        </div>
      )}
    </div>
  );
}

function getFieldsWithData(data: ExtractedStaycation): FieldKey[] {
  const fields: FieldKey[] = [];

  if (data.name) fields.push("name");
  if (data.location) fields.push("location");
  if (
    data.overview &&
    (data.overview.description ||
      data.overview.highlights?.length ||
      data.overview.amenities?.length)
  ) {
    fields.push("overview");
  }
  if (data.rooms && data.rooms.length > 0) fields.push("rooms");
  if (
    data.booking &&
    (data.booking.phone || data.booking.email || data.booking.externalUrl)
  ) {
    fields.push("booking");
  }
  if (
    data.images &&
    (data.images.hero || (data.images.gallery && data.images.gallery.length > 0))
  ) {
    fields.push("images");
  }

  return fields;
}

function fieldHasData(data: ExtractedStaycation, field: FieldKey): boolean {
  switch (field) {
    case "name":
      return !!data.name;
    case "location":
      return !!data.location;
    case "overview":
      return !!(
        data.overview &&
        (data.overview.description ||
          data.overview.highlights?.length ||
          data.overview.amenities?.length)
      );
    case "rooms":
      return !!(data.rooms && data.rooms.length > 0);
    case "booking":
      return !!(
        data.booking &&
        (data.booking.phone || data.booking.email || data.booking.externalUrl)
      );
    case "images":
      return !!(
        data.images &&
        (data.images.hero ||
          (data.images.gallery && data.images.gallery.length > 0))
      );
    default:
      return false;
  }
}
