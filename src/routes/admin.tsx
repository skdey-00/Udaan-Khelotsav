import { useState, useRef, useEffect } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { PLAYERS } from "@/data/players";

export const Route = createFileRoute("/admin")({
  component: AdminComponent,
});

const STORAGE_KEY = "udaan-khelotsav-admin-auth";
const PHOTOS_KEY = "udaan-khelotsav-player-photos";
const ADMIN_PASSWORD = "khelotsav2025"; // You can change this password

// Helper to check if a player has any photo (localStorage or static)
const playerHasPhoto = (player: { slug: string; photoFileName?: string }): { hasPhoto: boolean; source: 'localStorage' | 'static' | 'none'; src?: string } => {
  // First check localStorage
  try {
    const existingPhotos = localStorage.getItem(PHOTOS_KEY);
    const photosMap = existingPhotos ? JSON.parse(existingPhotos) : {};
    if (photosMap[player.slug]) {
      return { hasPhoto: true, source: 'localStorage', src: photosMap[player.slug] };
    }
  } catch {}

  // Then check if static photo exists (only if photoFileName is set)
  if (player.photoFileName) {
    return { hasPhoto: true, source: 'static', src: `/players/${player.photoFileName}` };
  }

  // No photo
  return { hasPhoto: false, source: 'none' };
};

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

  // Image cropping state
  const [showCropper, setShowCropper] = useState(false);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const clearMessages = () => {
    setError("");
    setSuccessMessage("");
  };

  // Drag handlers for cropper
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      e.preventDefault();
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      setCrop({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart]);

  // Touch handlers for mobile
  useEffect(() => {
    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      e.preventDefault();
      const touch = e.touches[0];
      const newX = touch.clientX - dragStart.x;
      const newY = touch.clientY - dragStart.y;
      setCrop({ x: newX, y: newY });
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, dragStart]);

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
      // Load image for cropping
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          setOriginalImage(reader.result as string);
          // Center the crop area initially
          setCrop({ x: 0, y: 0 });
          setZoom(1);
          setShowCropper(true);
          setUploading(false);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Error loading image:", err);
      setError("Failed to load image");
      setUploading(false);
    }
  };

  const handleCropComplete = () => {
    if (!originalImage || !selectedPlayer) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calculate crop area
    const cropSize = 300; // Output size
    canvas.width = cropSize;
    canvas.height = cropSize;

    // Get the visible area based on zoom and position
    const sourceX = (cropSize / 2 - crop.x) / zoom;
    const sourceY = (cropSize / 2 - crop.y) / zoom;
    const sourceSize = cropSize / zoom;

    // Draw cropped image
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, cropSize, cropSize);

    const img = new Image();
    img.onload = () => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cropSize / 2, cropSize / 2, cropSize / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(
        img,
        sourceX,
        sourceY,
        sourceSize,
        sourceSize,
        0,
        0,
        cropSize,
        cropSize
      );
      ctx.restore();

      // Convert to base64 and save
      const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.85);

      // Save to localStorage
      try {
        const existingPhotos = localStorage.getItem(PHOTOS_KEY);
        const photosMap = existingPhotos ? JSON.parse(existingPhotos) : {};
        photosMap[selectedPlayer] = croppedDataUrl;

        // Check size before saving
        if (croppedDataUrl.length > 700000) { // ~500KB base64
          setError("Cropped image is still too large. Try zooming in more.");
          return;
        }

        localStorage.setItem(PHOTOS_KEY, JSON.stringify(photosMap));
        setSuccessMessage(`Photo uploaded and cropped successfully for ${PLAYERS.find(p => p.slug === selectedPlayer)?.name}!`);
        setShowCropper(false);
        setOriginalImage(null);
        setRefreshKey(prev => prev + 1);
      } catch (quotaErr) {
        if (quotaErr instanceof DOMException && quotaErr.name === "QuotaExceededError") {
          setError("Storage full. Please remove some photos first.");
        } else {
          throw quotaErr;
        }
      }
    };
    img.src = originalImage;
  };

  const cancelCrop = () => {
    setShowCropper(false);
    setOriginalImage(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  };

  const getStoredPhoto = (slug: string) => {
    // Include refreshKey to force re-fetch when photos change
    void refreshKey;
    const existingPhotos = localStorage.getItem(PHOTOS_KEY);
    const photosMap = existingPhotos ? JSON.parse(existingPhotos) : {};
    return photosMap[slug] || null;
  };

  // Get photo info (localStorage or static)
  const getPhotoInfo = (player: { slug: string; photoFileName?: string }) => {
    // First check localStorage
    const stored = getStoredPhoto(player.slug);
    if (stored) {
      return { hasPhoto: true, source: 'uploaded' as const, src: stored };
    }
    // Then check static
    const info = playerHasPhoto(player);
    if (info.hasPhoto) {
      return { hasPhoto: true, source: 'static' as const, src: info.src || `/players/${player.slug}.jpg` };
    }
    return { hasPhoto: false, source: 'none' as const, src: undefined };
  };

  // Count players with photos (either uploaded or static)
  const photosCount = PLAYERS.reduce((count, player) => {
    return count + (playerHasPhoto(player).hasPhoto ? 1 : 0);
  }, 0);

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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-foreground">
                Select a Player
              </h2>
              <span className="text-sm bg-primary/20 text-primary px-3 py-1 rounded-full">
                {photosCount}/{PLAYERS.length} photos
              </span>
            </div>
            <div className="bg-card rounded-lg border border-border p-4 max-h-[600px] overflow-y-auto">
              <div className="space-y-2">
                {PLAYERS.map((player) => {
                  const photoInfo = getPhotoInfo(player);
                  return (
                    <button
                      key={`${player.slug}-${refreshKey}`}
                      onClick={() => setSelectedPlayer(player.slug)}
                      className={`w-full p-3 rounded-lg text-left transition-all relative ${
                        selectedPlayer === player.slug
                          ? "bg-primary text-primary-foreground ring-2 ring-primary/50"
                          : "bg-muted hover:bg-muted/80"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Thumbnail or placeholder */}
                        <div className={`w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center ${
                          photoInfo.hasPhoto ? 'bg-transparent' : 'bg-muted-foreground/20'
                        }`}>
                          {photoInfo.hasPhoto ? (
                            <img
                              src={photoInfo.src!}
                              alt={player.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-lg font-bold text-muted-foreground">
                              {player.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                            </span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{player.name}</p>
                          <p className={`text-sm ${selectedPlayer === player.slug ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                            {player.category} • {player.gender}
                          </p>
                        </div>

                        {/* Photo indicator - different for uploaded vs static */}
                        {photoInfo.hasPhoto && (
                          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
                            photoInfo.source === 'uploaded'
                              ? 'bg-green-500 text-white'
                              : 'bg-blue-500/20 text-blue-400 dark:text-blue-300'
                          }`}>
                            {photoInfo.source === 'uploaded' ? (
                              <>
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                                </svg>
                                <span>Uploaded</span>
                              </>
                            ) : (
                              <>
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span>Static</span>
                              </>
                            )}
                          </div>
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
                  const photoInfo = getPhotoInfo(player!);
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
                        <div className="w-48 h-48 rounded-lg overflow-hidden bg-muted flex items-center justify-center relative">
                          {photoInfo.hasPhoto ? (
                            <>
                              <img
                                src={photoInfo.src!}
                                alt={player?.name}
                                className="w-full h-full object-cover"
                              />
                              {/* Source badge */}
                              <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium ${
                                photoInfo.source === 'uploaded'
                                  ? 'bg-green-500 text-white'
                                  : 'bg-blue-500/80 text-white'
                              }`}>
                                {photoInfo.source === 'uploaded' ? 'Uploaded' : 'Static'}
                              </div>
                            </>
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
                            Max file size: 500KB. Your photo will be cropped to a square.
                          </p>
                        </label>
                        {uploading && (
                          <p className="text-sm text-primary mt-2 flex items-center gap-2">
                            <span className="inline-block w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            Loading...
                          </p>
                        )}
                        {error && (
                          <p className="text-sm text-red-500 mt-2">{error}</p>
                        )}
                        {successMessage && (
                          <p className="text-sm text-green-600 mt-2">{successMessage}</p>
                        )}
                      </div>

                      {/* Delete Button - only for uploaded photos */}
                      {photoInfo.source === 'uploaded' && (
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

      {/* Image Cropper Modal */}
      {showCropper && originalImage && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 overflow-hidden">
          <div className="bg-card rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-foreground mb-2">Crop Photo</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Drag the image to position the face • Use zoom to adjust size
            </p>

            {/* Cropper Container */}
            <div className="flex flex-col items-center mb-6">
              <div
                className="relative overflow-hidden rounded-xl border-4 border-primary/50 shadow-2xl"
                style={{ width: '280px', height: '280px', backgroundColor: '#000' }}
              >
                {/* The movable image */}
                <div
                  className="absolute top-0 left-0 cursor-grab active:cursor-grabbing w-full h-full"
                  style={{
                    transform: `translate(${crop.x}px, ${crop.y}px) scale(${zoom})`,
                    transformOrigin: 'center center',
                    transition: isDragging ? 'none' : 'transform 0.05s ease-out',
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    const rect = e.currentTarget.getBoundingClientRect();
                    setIsDragging(true);
                    setDragStart({ x: e.clientX - crop.x, y: e.clientY - crop.y });
                  }}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    const touch = e.touches[0];
                    setIsDragging(true);
                    setDragStart({ x: touch.clientX - crop.x, y: touch.clientY - crop.y });
                  }}
                >
                  <img
                    src={originalImage}
                    alt="Crop preview"
                    className="w-full h-full object-cover pointer-events-none"
                    draggable={false}
                    style={{
                      maxWidth: 'none',
                      maxHeight: 'none',
                      width: '280px',
                      height: '280px',
                    }}
                  />
                </div>

                {/* Overlay with circular cutout */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: 'radial-gradient(circle at center, transparent 120px, rgba(0,0,0,0.8) 121px)',
                  }}
                />

                {/* Focus circle indicator */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div
                    className="border-2 border-dashed border-yellow-400 rounded-full"
                    style={{ width: '240px', height: '240px' }}
                  />
                </div>

                {/* Crosshair guides */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-1/2 left-0 right-0 h-px bg-yellow-400/50" />
                  <div className="absolute left-1/2 top-0 bottom-0 w-px bg-yellow-400/50" />
                </div>
              </div>

              {/* Instructions */}
              <div className="mt-4 text-center text-sm text-muted-foreground">
                Position the face inside the yellow circle
              </div>
            </div>

            {/* Zoom Slider */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-foreground">
                  Zoom
                </label>
                <span className="text-sm text-primary font-mono bg-primary/10 px-2 py-0.5 rounded">
                  {zoom.toFixed(1)}x
                </span>
              </div>
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.1"
                value={zoom}
                onChange={(e) => {
                  setZoom(parseFloat(e.target.value));
                  setCrop({ x: 0, y: 0 });
                }}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                style={{ accentColor: 'hsl(45, 100%, 50%)' }}
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>0.5x</span>
                <span>1.75x</span>
                <span>3x</span>
              </div>
            </div>

            {/* Quick position buttons */}
            <div className="mb-6 grid grid-cols-3 gap-2">
              <button
                onClick={() => setCrop({ x: 0, y: 0 })}
                className="px-3 py-2 bg-muted text-sm rounded-lg hover:bg-muted/80 transition-colors"
              >
                Center
              </button>
              <button
                onClick={() => setZoom(1)}
                className="px-3 py-2 bg-muted text-sm rounded-lg hover:bg-muted/80 transition-colors"
              >
                Reset Zoom
              </button>
              <button
                onClick={() => {
                  setCrop({ x: 0, y: 0 });
                  setZoom(1);
                }}
                className="px-3 py-2 bg-muted text-sm rounded-lg hover:bg-muted/80 transition-colors"
              >
                Reset All
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={cancelCrop}
                className="flex-1 px-4 py-3 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCropComplete}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-primary to-accent text-primary-foreground rounded-lg hover:opacity-90 transition-opacity font-medium"
              >
                ✓ Apply Crop
              </button>
            </div>

            {/* Hidden canvas for cropping */}
            <canvas ref={canvasRef} width={300} height={300} className="hidden" />
          </div>
        </div>
      )}
    </div>
  );
}
