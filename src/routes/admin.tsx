import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { PLAYERS } from "@/data/players";

export const Route = createFileRoute("/admin")({
  component: AdminComponent,
});

const STORAGE_KEY = "udaan-khelotsav-admin-auth";
const PHOTOS_KEY = "udaan-khelotsav-player-photos";
const ADMIN_PASSWORD = "khelotsav2025"; // You can change this password

function AdminComponent() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "true";
  });
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const clearMessages = () => {
    setError("");
    setSuccessMessage("");
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      localStorage.setItem(STORAGE_KEY, "true");
    } else {
      setError("Incorrect password");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem(STORAGE_KEY);
    setPassword("");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedPlayer) return;

    // Validate file size (max 500KB to avoid localStorage quota issues)
    const MAX_SIZE = 500 * 1024; // 500KB in bytes
    if (file.size > MAX_SIZE) {
      setError(`File too large. Please choose an image under 500KB. (Selected: ${(file.size / 1024).toFixed(0)}KB)`);
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return;
    }

    setUploading(true);
    clearMessages();

    try {
      // Convert image to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        try {
          const base64 = reader.result as string;

          // Check localStorage quota before saving
          const existingPhotos = localStorage.getItem(PHOTOS_KEY);
          const photosMap = existingPhotos ? JSON.parse(existingPhotos) : {};

          // Store the photo for this player
          photosMap[selectedPlayer] = base64;

          // Try to save and check for quota exceeded error
          try {
            localStorage.setItem(PHOTOS_KEY, JSON.stringify(photosMap));
            setUploading(false);
            setSuccessMessage(`Photo uploaded successfully for ${PLAYERS.find(p => p.slug === selectedPlayer)?.name}!`);
            e.target.value = ""; // Reset file input
          } catch (quotaErr) {
            if (quotaErr instanceof DOMException && quotaErr.name === "QuotaExceededError") {
              setError("Storage full. Please remove some photos first.");
            } else {
              throw quotaErr;
            }
            setUploading(false);
          }
        } catch (parseErr) {
          console.error("Error processing photo:", parseErr);
          setError("Failed to process photo. Please try a different file.");
          setUploading(false);
        }
      };

      reader.onerror = () => {
        setError("Failed to read file. Please try again.");
        setUploading(false);
      };

      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Error uploading photo:", err);
      setError("Failed to upload photo");
      setUploading(false);
    }
  };

  const getStoredPhoto = (slug: string) => {
    // Include refreshKey to force re-fetch when photos change
    void refreshKey;
    const existingPhotos = localStorage.getItem(PHOTOS_KEY);
    const photosMap = existingPhotos ? JSON.parse(existingPhotos) : {};
    return photosMap[slug] || null;
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-accent/20">
        <div className="w-full max-w-md p-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-display font-bold text-foreground mb-2">
              Admin Login
            </h1>
            <p className="text-muted-foreground">Udaan Khelotsav</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Enter admin password"
              />
            </div>

            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}

            <button
              type="submit"
              className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              Login
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              to="/"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Back to Auction
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-display font-bold text-foreground">
            Admin Panel
          </h1>
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Back to Auction
            </Link>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Player List */}
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Select a Player
            </h2>
            <div className="bg-card rounded-lg border border-border p-4 max-h-[600px] overflow-y-auto">
              <div className="space-y-2">
                {PLAYERS.map((player) => {
                  const hasPhoto = !!getStoredPhoto(player.slug);
                  return (
                    <button
                      key={`${player.slug}-${refreshKey}`}
                      onClick={() => setSelectedPlayer(player.slug)}
                      className={`w-full p-3 rounded-lg text-left transition-colors ${
                        selectedPlayer === player.slug
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted hover:bg-muted/80"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{player.name}</p>
                          <p className={`text-sm ${selectedPlayer === player.slug ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                            {player.category} • {player.gender}
                          </p>
                        </div>
                        {hasPhoto && (
                          <span className="text-xs bg-green-500 text-white px-2 py-1 rounded">
                            Photo Added
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Upload Section */}
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Upload Photo
            </h2>
            {selectedPlayer ? (
              <div key={`upload-${refreshKey}`} className="bg-card rounded-lg border border-border p-6">
                {(() => {
                  const player = PLAYERS.find((p) => p.slug === selectedPlayer);
                  const storedPhoto = getStoredPhoto(selectedPlayer);
                  return (
                    <>
                      <div className="mb-6">
                        <h3 className="text-lg font-medium text-foreground mb-2">
                          {player?.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {player?.category} • {player?.gender}
                        </p>
                      </div>

                      {/* Photo Preview */}
                      <div className="mb-6">
                        <p className="text-sm font-medium text-foreground mb-2">
                          Current Photo:
                        </p>
                        <div className="w-48 h-48 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                          {storedPhoto ? (
                            <img
                              src={storedPhoto}
                              alt={player?.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="text-center p-4">
                              <p className="text-muted-foreground text-sm">
                                No photo uploaded
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Upload Button */}
                      <div>
                        <label className="block">
                          <span className="sr-only">Choose photo</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                            disabled={uploading}
                            className="block w-full text-sm text-muted-foreground
                              file:mr-4 file:py-2 file:px-4
                              file:rounded-lg file:border-0
                              file:text-sm file:font-medium
                              file:bg-primary file:text-primary-foreground
                              hover:file:bg-primary/90
                              cursor-pointer disabled:opacity-50"
                          />
                          <p className="text-xs text-muted-foreground mt-2">
                            Max file size: 500KB. Recommended: Square or portrait image.
                          </p>
                        </label>
                        {uploading && (
                          <p className="text-sm text-primary mt-2 flex items-center gap-2">
                            <span className="inline-block w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            Uploading...
                          </p>
                        )}
                        {error && (
                          <p className="text-sm text-red-500 mt-2">{error}</p>
                        )}
                        {successMessage && (
                          <p className="text-sm text-green-600 mt-2">{successMessage}</p>
                        )}
                      </div>

                      {/* Delete Button */}
                      {storedPhoto && (
                        <button
                          onClick={() => {
                            const existingPhotos = localStorage.getItem(PHOTOS_KEY);
                            const photosMap = existingPhotos ? JSON.parse(existingPhotos) : {};
                            delete photosMap[selectedPlayer];
                            localStorage.setItem(PHOTOS_KEY, JSON.stringify(photosMap));
                            setSuccessMessage("Photo removed successfully.");
                            setRefreshKey(prev => prev + 1);
                          }}
                          className="mt-4 px-4 py-2 text-sm bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors"
                        >
                          Remove Photo
                        </button>
                      )}
                    </>
                  );
                })()}
              </div>
            ) : (
              <div className="bg-card rounded-lg border border-border p-6 text-center">
                <p className="text-muted-foreground">
                  Select a player from the list to upload their photo
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
