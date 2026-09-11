import Image from "next/image";
import type { FeaturedImage } from "@/types/content";

type PostCardImageProps = {
  image: FeaturedImage;
  className?: string;
  isLcp?: boolean;
  sizes?: string;
  fit?: "natural" | "contain" | "cover";
};

const DEFAULT_SIZES = "(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw";

export function PostCardImage({
  image,
  className,
  isLcp = false,
  sizes = DEFAULT_SIZES,
  fit = "natural",
}: PostCardImageProps) {
  if (fit === "contain") {
    return (
      <Image
        src={image.url}
        alt={image.alt}
        fill
        sizes={sizes}
        loading={isLcp ? "eager" : "lazy"}
        fetchPriority={isLcp ? "high" : undefined}
        quality={75}
        className={`object-contain ${className ?? ""}`}
      />
    );
  }

  if (fit === "cover") {
    return (
      <Image
        src={image.url}
        alt={image.alt}
        fill
        sizes={sizes}
        loading={isLcp ? "eager" : "lazy"}
        fetchPriority={isLcp ? "high" : undefined}
        quality={75}
        className={`object-cover ${className ?? ""}`}
      />
    );
  }

  return (
    <Image
      src={image.url}
      alt={image.alt}
      width={image.width ?? 1200}
      height={image.height ?? 675}
      sizes={sizes}
      loading={isLcp ? "eager" : "lazy"}
      fetchPriority={isLcp ? "high" : undefined}
      quality={75}
      className={`h-auto w-full ${className ?? ""}`}
    />
  );
}
