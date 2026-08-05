"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";

type GalleryImage = {
  src: string;
  alt: string;
};

type PublicGalleryViewerProps = {
  images: GalleryImage[];
};

export function PublicGalleryViewer({ images }: PublicGalleryViewerProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [zoomed, setZoomed] = useState(false);

  if (images.length === 0) {
    return null;
  }

  const close = () => {
    setActiveIndex(null);
    setZoomed(false);
  };
  const prev = () => {
    setActiveIndex((index) => (index === null ? 0 : (index - 1 + images.length) % images.length));
    setZoomed(false);
  };
  const next = () => {
    setActiveIndex((index) => (index === null ? 0 : (index + 1) % images.length));
    setZoomed(false);
  };

  const onTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    setTouchStartX(event.changedTouches[0]?.clientX ?? null);
  };

  const onTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartX === null) {
      return;
    }

    const endX = event.changedTouches[0]?.clientX ?? touchStartX;
    const distance = endX - touchStartX;
    if (Math.abs(distance) < 40) {
      setTouchStartX(null);
      return;
    }

    if (distance > 0) {
      prev();
    } else {
      next();
    }

    setTouchStartX(null);
  };

  return (
    <section id="gallery-section" className="rounded-[32px] border border-white/10 bg-slate-950/70 p-4 backdrop-blur">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-black">معرض الصور</h2>
        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-slate-300">{images.length} صورة</span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {images.map((image, index) => (
          <button key={`${image.src}-${index}`} onClick={() => setActiveIndex(index)} className="group h-28 overflow-hidden rounded-[20px] border border-white/10 bg-white/5 text-right sm:h-36">
            <div className="relative h-full w-full">
              <Image src={image.src} alt={image.alt} fill className="object-cover transition duration-300 group-hover:scale-105" loading="lazy" />
            </div>
          </button>
        ))}
      </div>

      {activeIndex !== null ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-4" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          <button onClick={close} className="absolute right-4 top-4 rounded-full border border-white/20 bg-white/10 p-2 text-white" aria-label="إغلاق">
            <X className="h-5 w-5" />
          </button>
          <div className="absolute top-4 left-4 rounded-full border border-white/20 bg-black/35 px-3 py-1 text-xs font-semibold text-white">
            {activeIndex + 1} / {images.length}
          </div>
          {images.length > 1 ? (
            <button onClick={prev} className="absolute left-3 rounded-full border border-white/20 bg-white/10 p-2 text-white" aria-label="السابق">
              <ChevronLeft className="h-5 w-5" />
            </button>
          ) : null}
          <div className="flex max-h-[85vh] max-w-[92vw] items-center justify-center rounded-2xl bg-black/20 p-2">
            <Image src={images[activeIndex].src} alt={images[activeIndex].alt} width={1200} height={900} className={`max-h-[85vh] max-w-[92vw] rounded-2xl object-contain transition duration-300 ${zoomed ? "scale-125" : "scale-100"}`} />
          </div>
          <button onClick={() => setZoomed((value) => !value)} className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold text-white" aria-label="تكبير/تصغير">
            <ZoomIn className="h-4 w-4" />
            {zoomed ? "تصغير" : "تكبير"}
          </button>
          {images.length > 1 ? (
            <button onClick={next} className="absolute right-3 rounded-full border border-white/20 bg-white/10 p-2 text-white" aria-label="التالي">
              <ChevronRight className="h-5 w-5" />
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
