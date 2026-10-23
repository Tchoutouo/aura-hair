import { mediaSrc, type MediaItem } from "@/lib/media";

/** A video that only loads when played (poster first), with its caption. */
export default function VideoCard({ item, caption, className = "" }: { item: MediaItem; caption: string; className?: string }) {
  return (
    <figure className={`overflow-hidden rounded-xl border border-line bg-white ${className}`}>
      <video
        controls
        playsInline
        preload="none"
        poster={mediaSrc(item.id, "jpg")}
        width={item.w}
        height={item.h}
        aria-label={caption}
        className="aspect-[3/4] w-full bg-sand object-cover"
      >
        <source src={mediaSrc(item.id, "mp4")} type="video/mp4" />
      </video>
      <figcaption className="px-3 py-2 text-sm font-semibold text-plum">{caption}</figcaption>
    </figure>
  );
}
