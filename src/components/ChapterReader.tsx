/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Layers,
  BookOpen,
  SkipBack,
  SkipForward,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from "lucide-react";
import { LocalChapter } from "@/types/comick";
import { getImage } from "@/lib/db";
import { createTouchGestureHandler } from "@/lib/touch-gestures";

interface ChapterReaderProps {
  chapter: LocalChapter;
  onPrevChapter: () => void;
  onNextChapter: () => void;
  hasPrevChapter: boolean;
  hasNextChapter: boolean;
  onClose: () => void;
}

type ReadingMode = "strip" | "page";

export function ChapterReader({
  chapter,
  onPrevChapter,
  onNextChapter,
  hasPrevChapter,
  hasNextChapter,
  onClose,
}: ChapterReaderProps) {
  const [images, setImages] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [loading, setLoading] = useState(true);
  const [readingMode, setReadingMode] = useState<ReadingMode>("strip");
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [controlsTimeout, setControlsTimeout] = useState<NodeJS.Timeout | null>(
    null,
  );
  const [forceShowControls, setForceShowControls] = useState(false);

  const gestureHandler = useRef(
    createTouchGestureHandler({
      swipeThreshold: 30,
      velocityThreshold: 0.2,
    }),
  );
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadImages();
  }, [chapter]);

  useEffect(() => {
    if (showControls && readingMode === "strip" && !forceShowControls) {
      if (controlsTimeout) clearTimeout(controlsTimeout);
      const timeout = setTimeout(() => setShowControls(false), 3000);
      setControlsTimeout(timeout);
    }
    return () => {
      if (controlsTimeout) clearTimeout(controlsTimeout);
    };
  }, [showControls, readingMode, forceShowControls, controlsTimeout]);

  const loadImages = async () => {
    try {
      setLoading(true);
      const imageUrls: string[] = [];

      for (const imageId of chapter.images) {
        const blob = await getImage(imageId);
        if (blob) {
          const url = URL.createObjectURL(blob);
          imageUrls.push(url);
        }
      }

      setImages(imageUrls);
      setCurrentPage(0);
      setZoom(1);
      setPanOffset({ x: 0, y: 0 });
    } catch (error) {
      console.error("Error loading images:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = useCallback(
    (event: KeyboardEvent) => {
      if (readingMode === "page") {
        switch (event.key) {
          case "ArrowLeft":
            prevPage();
            break;
          case "ArrowRight":
            nextPage();
            break;
        }
      }

      if (event.key === "Escape") {
        onClose();
      }
    },
    [readingMode, currentPage, images.length, hasPrevChapter, hasNextChapter],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyPress);
    return () => document.removeEventListener("keydown", handleKeyPress);
  }, [handleKeyPress]);

  const nextPage = () => {
    if (currentPage < images.length - 1) {
      setCurrentPage((prev) => prev + 1);
      setZoom(1);
      setPanOffset({ x: 0, y: 0 });
    } else if (hasNextChapter) {
      onNextChapter();
    }
  };

  const prevPage = () => {
    if (currentPage > 0) {
      setCurrentPage((prev) => prev - 1);
      setZoom(1);
      setPanOffset({ x: 0, y: 0 });
    } else if (hasPrevChapter) {
      onPrevChapter();
    }
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev * 1.5, 5));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev / 1.5, 0.5));
  };

  const resetZoom = () => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const toggleControls = () => {
    if (!forceShowControls) {
      setShowControls(!showControls);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    gestureHandler.current.onTouchStart(e.nativeEvent, {
      onLongPress: () => {
        setForceShowControls(true);
        setShowControls(true);
        navigator.vibrate?.(50);
      },
      onPinchStart: () => {
        if (readingMode === "page") {
          setForceShowControls(true);
          setShowControls(true);
        }
      },
    });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    gestureHandler.current.onTouchMove(e.nativeEvent, {
      onPinch: (gesture) => {
        if (readingMode === "page") {
          e.preventDefault();
          setZoom((prev) => Math.max(0.5, Math.min(5, prev * gesture.scale)));
        }
      },
    });
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    gestureHandler.current.onTouchEnd(e.nativeEvent, {
      onSwipe: (gesture) => {
        if (readingMode === "page") {
          if (gesture.direction === "left") {
            nextPage();
          } else if (gesture.direction === "right") {
            prevPage();
          }
        } else if (readingMode === "strip") {
          if (gesture.direction === "left" && gesture.velocity > 0.5) {
            if (hasNextChapter) {
              onNextChapter();
            }
          } else if (gesture.direction === "right" && gesture.velocity > 0.5) {
            if (hasPrevChapter) {
              onPrevChapter();
            }
          }
        }
      },
      onTap: () => {
        if (forceShowControls) {
          setForceShowControls(false);
        }
        toggleControls();
      },
      onDoubleTap: () => {
        if (readingMode === "page") {
          if (zoom === 1) {
            handleZoomIn();
          } else {
            resetZoom();
          }
        } else {
          setReadingMode("page");
        }
      },
      onPinchEnd: () => {
        setForceShowControls(false);
      },
    });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
          <div className="text-white text-lg">Loading chapter...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black flex flex-col select-none z-50">
      {showControls && (
        <div className="absolute top-0 left-0 right-0 bg-black/90 backdrop-blur-sm p-4 z-20 transition-opacity duration-300 safe-top">
          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              className="text-white/90 hover:text-white flex items-center gap-2 transition-colors p-3 rounded-xl hover:bg-white/10"
            >
              <X size={20} />
            </button>

            <div className="text-white text-center flex-1 mx-4">
              <div className="font-semibold text-base">
                Chapter {chapter.chapterNumber}
              </div>
              {chapter.translator && (
                <div className="text-white/70 text-sm">
                  by {chapter.translator}
                </div>
              )}
              {readingMode === "page" && (
                <div className="text-white/80 text-sm mt-1">
                  {currentPage + 1} / {images.length}
                  {zoom !== 1 && ` • ${Math.round(zoom * 100)}%`}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {readingMode === "page" && zoom !== 1 && (
                <button
                  onClick={resetZoom}
                  className="text-white/90 hover:text-white flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all"
                >
                  <RotateCcw size={14} />
                </button>
              )}
              <button
                onClick={() =>
                  setReadingMode(readingMode === "strip" ? "page" : "strip")
                }
                className="text-white/90 hover:text-white flex items-center gap-2 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all"
              >
                {readingMode === "strip" ? (
                  <BookOpen size={16} />
                ) : (
                  <Layers size={16} />
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {readingMode === "strip" ? (
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            paddingTop: showControls ? "100px" : "0",
            paddingBottom: showControls ? "100px" : "0",
          }}
        >
          <div className="flex flex-col items-center">
            {images.map((image, index) => (
              <img
                key={`strip-${index}`}
                src={image}
                alt={`Page ${index + 1}`}
                className="w-full h-auto block max-w-full"
                style={{ maxWidth: "100vw" }}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center relative overflow-hidden">
          <div
            ref={imageContainerRef}
            className="w-full h-full flex items-center justify-center"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {images[currentPage] && (
              <img
                src={images[currentPage]}
                alt={`Page ${currentPage + 1}`}
                className="max-w-full max-h-full object-contain transition-transform duration-200"
                style={{
                  transform: `scale(${zoom}) translate(${panOffset.x}px, ${panOffset.y}px)`,
                  maxWidth: "calc(100vw - 2rem)",
                  maxHeight: "calc(100vh - 2rem)",
                }}
              />
            )}
          </div>
        </div>
      )}

      {showControls && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/90 backdrop-blur-sm p-4 z-20 transition-opacity duration-300 safe-bottom">
          <div className="flex justify-center items-center gap-3">
            <button
              onClick={onPrevChapter}
              disabled={!hasPrevChapter}
              className="bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:text-white/30 text-white px-4 py-3 rounded-xl font-medium transition-all flex items-center gap-2 disabled:cursor-not-allowed"
            >
              <SkipBack size={16} />
              <span className="hidden sm:inline">Prev</span>
            </button>

            {readingMode === "page" && (
              <>
                <button
                  onClick={prevPage}
                  disabled={currentPage === 0 && !hasPrevChapter}
                  className="bg-blue-600/80 hover:bg-blue-600 disabled:bg-white/5 disabled:text-white/30 text-white px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={16} />
                  <span className="hidden sm:inline">Back</span>
                </button>

                {zoom !== 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleZoomOut}
                      className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg transition-all"
                    >
                      <ZoomOut size={14} />
                    </button>
                    <button
                      onClick={handleZoomIn}
                      className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg transition-all"
                    >
                      <ZoomIn size={14} />
                    </button>
                  </div>
                )}

                <div className="bg-white/10 px-4 py-3 rounded-xl text-white text-sm font-medium">
                  {currentPage + 1} / {images.length}
                </div>

                <button
                  onClick={nextPage}
                  disabled={
                    currentPage === images.length - 1 && !hasNextChapter
                  }
                  className="bg-blue-600/80 hover:bg-blue-600 disabled:bg-white/5 disabled:text-white/30 text-white px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 disabled:cursor-not-allowed"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight size={16} />
                </button>
              </>
            )}

            <button
              onClick={onNextChapter}
              disabled={!hasNextChapter}
              className="bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:text-white/30 text-white px-4 py-3 rounded-xl font-medium transition-all flex items-center gap-2 disabled:cursor-not-allowed"
            >
              <span className="hidden sm:inline">Next</span>
              <SkipForward size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
