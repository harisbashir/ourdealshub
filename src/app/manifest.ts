import type { MetadataRoute } from "next";

/** Lets visitors add OurDealsHub to their phone's home screen. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "OurDealsHub",
    short_name: "OurDealsHub",
    description: "Hand-picked products on Amazon, explained in plain words.",
    start_url: "/",
    display: "standalone",
    background_color: "#f2f2f7",
    theme_color: "#f2f2f7",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
