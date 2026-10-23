"use client";

import Image from "next/image";
import { useState } from "react";
import { PRODUCT_IMAGE_PLACEHOLDER } from "@/lib/affiliate-url";

/** Product image with fallback when Amazon CDN URL 404s / blocks. */
export function SafeProductImage({
  src,
  alt,
  fill,
  width,
  height,
  className,
  sizes,
  priority,
}: {
  src: string;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  const [current, setCurrent] = useState(src || PRODUCT_IMAGE_PLACEHOLDER);
  const [failed, setFailed] = useState(false);

  return (
    <Image
      src={failed ? PRODUCT_IMAGE_PLACEHOLDER : current}
      alt={alt}
      fill={fill}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      className={className}
      sizes={sizes}
      priority={priority}
      unoptimized
      onError={() => {
        if (!failed) {
          setFailed(true);
          setCurrent(PRODUCT_IMAGE_PLACEHOLDER);
        }
      }}
    />
  );
}
