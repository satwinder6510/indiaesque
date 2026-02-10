"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Staycation {
  slug: string;
  name: string;
  location: string;
  description: string;
  cardImage: string;
}

export default function StaycationsPage() {
  const [staycations, setStaycations] = useState<Staycation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [adding, setAdding] = useState(false);
  const router = useRouter();

  const fetchStaycations = () => {
    fetch("/api/staycations")
      .then(res => res.json())
      .then(data => {
        setStaycations(data.staycations || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchStaycations();
  }, []);

  const handleAdd = async () => {
    if (!newName.trim() || !newLocation.trim()) return;

    setAdding(true);
    try {
      const res = await fetch("/api/staycations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), location: newLocation.trim() }),
      });
      const data = await res.json();

      if (data.success) {
        setShowAddModal(false);
        setNewName("");
        setNewLocation("");
        router.push(`/staycations/${data.staycation.slug}`);
      } else {
        alert(data.error || "Failed to create staycation");
      }
    } catch (error) {
      console.error("Add error:", error);
      alert("Failed to create staycation");
    }
    setAdding(false);
  };

  const handleDelete = async (e: React.MouseEvent, slug: string, name: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/staycations?slug=${slug}`, { method: "DELETE" });
      const data = await res.json();

      if (data.success) {
        setStaycations(staycations.filter(s => s.slug !== slug));
      } else {
        alert(data.error || "Failed to delete staycation");
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("Failed to delete staycation");
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">Loading staycations...</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <Link href="/" className="text-blue-600 hover:underline text-sm mb-2 block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold">Staycations</h1>
          <p className="text-gray-600 mt-1">Manage hotel listings and details</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <span className="text-xl">+</span> Add Staycation
        </button>
      </div>

      <div className="grid gap-4">
        {staycations.map((stay) => (
          <div
            key={stay.slug}
            className="border rounded-lg p-4 hover:border-blue-500 hover:shadow-md transition-all flex gap-4 group"
          >
            <Link href={`/staycations/${stay.slug}`} className="flex gap-4 flex-1">
              {stay.cardImage ? (
                <img
                  src={stay.cardImage}
                  alt={stay.name}
                  className="w-32 h-24 object-cover rounded"
                />
              ) : (
                <div className="w-32 h-24 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-xs">
                  No image
                </div>
              )}
              <div className="flex-1">
                <h2 className="text-xl font-semibold">{stay.name}</h2>
                <p className="text-gray-500">{stay.location}</p>
                <p className="text-gray-600 text-sm mt-1 line-clamp-2">{stay.description || "No description yet"}</p>
              </div>
            </Link>
            <div className="flex flex-col justify-between items-end">
              <Link href={`/staycations/${stay.slug}`} className="text-gray-400 hover:text-blue-600">
                Edit →
              </Link>
              <button
                onClick={(e) => handleDelete(e, stay.slug, stay.name)}
                className="text-red-400 hover:text-red-600 text-sm opacity-0 group-hover:opacity-100 transition-opacity"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {staycations.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No staycations found. Click "Add Staycation" to create one.
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add New Staycation</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Property Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full border rounded-lg p-2"
                  placeholder="e.g., Taj Lake Palace"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Location</label>
                <input
                  type="text"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="w-full border rounded-lg p-2"
                  placeholder="e.g., Udaipur, Rajasthan"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewName("");
                  setNewLocation("");
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={adding || !newName.trim() || !newLocation.trim()}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {adding ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
