"use client";

import { useEffect, useRef, useState } from "react";
import type { PostSummary } from "@/types/content";
import { ArticleCard } from "@/components/article/ArticleCard";
import { ChevronDownIcon } from "@/components/layout/icons";

export function HeroSlider({ posts, locale }: { posts: PostSummary[]; locale: string }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || posts.length <= 1) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = slideRefs.current.indexOf(entry.target as HTMLDivElement);
          if (index !== -1) setActiveIndex(index);
        }
      },
      { root: track, threshold: 0.6 }
    );

    for (const el of slideRefs.current) {
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [posts.length]);

  function goTo(index: number) {
    slideRefs.current[index]?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
  }

  if (posts.length === 0) return null;

  return (
    <div role="region" aria-roledescription="carousel" aria-label="Featured articles" className="relative">
      <div
        ref={trackRef}
        className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {posts.map((slide, index) => (
          <div
            key={slide.slug}
            ref={(el) => {
              slideRefs.current[index] = el;
            }}
            role="group"
            aria-roledescription="slide"
            aria-label={`Slide ${index + 1} of ${posts.length}`}
            className="w-full shrink-0 snap-start"
          >
            <ArticleCard post={slide} variant="banner" priority={index === 0} locale={locale} />
          </div>
        ))}
      </div>

      {posts.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => goTo((activeIndex - 1 + posts.length) % posts.length)}
            aria-label="Previous slide"
            className="absolute left-2 sm:left-3 top-1/2 flex h-8 w-8 sm:h-9 sm:w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink transition-colors hover:bg-white shadow-sm"
          >
            <ChevronDownIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 rotate-90" />
          </button>
          <button
            type="button"
            onClick={() => goTo((activeIndex + 1) % posts.length)}
            aria-label="Next slide"
            className="absolute right-2 sm:right-3 top-1/2 flex h-8 w-8 sm:h-9 sm:w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink transition-colors hover:bg-white shadow-sm"
          >
            <ChevronDownIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 -rotate-90" />
          </button>

          <p aria-live="polite" className="sr-only">
            Slide {activeIndex + 1} of {posts.length}
          </p>
        </>
      )}

      {posts.length > 1 && (
        <div className="mt-3 flex justify-center gap-1">
          {posts.map((slide, index) => (
            <button
              key={slide.slug}
              type="button"
              onClick={() => goTo(index)}
              aria-label={`Go to slide ${index + 1}`}
              aria-current={index === activeIndex}
              className="flex h-6 w-6 items-center justify-center"
            >
              <span
                aria-hidden="true"
                className={`h-2 w-2 rounded-full transition-colors ${
                  index === activeIndex ? "bg-ink" : "bg-border/40"
                }`}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
