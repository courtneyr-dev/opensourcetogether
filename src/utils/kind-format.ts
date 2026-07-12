/**
 * Kind → presentation format mapping (PFBT parity).
 *
 * The stored taxonomy is the IndieWeb post kind (28 values, defined in
 * seed/seed.json). Presentation is derived, not stored:
 *
 * - `format` picks the stream-card variant (status/quote/chat/gallery/…)
 * - `chipType` picks the design-system post-type accent
 *   (`.cr-chip--{chipType}` / `.cr-stream-item--{chipType}`, 18 colors
 *   defined in tokens.css)
 * - `emoji` is the stream-item avatar glyph (decorative, aria-hidden)
 */

export type StreamFormat =
	| "standard" // titled longform — article, recipe
	| "status" // short title-less text — note, mood, acquisition
	| "quote" // quotation
	| "chat" // chat transcript
	| "gallery" // photo sets
	| "media" // single media item — photo, video, audio, jam
	| "citation" // response to an external URL — reply, like, repost, ...
	| "event" // time/place — event, rsvp, checkin
	| "log"; // consumption log — listen, watch, read, play, eat, drink

export type ChipType =
	| "blog"
	| "aside"
	| "image"
	| "gallery"
	| "video"
	| "audio"
	| "chat"
	| "status"
	| "link"
	| "bookmark"
	| "quote"
	| "speaking"
	| "book"
	| "like"
	| "repost"
	| "reply"
	| "event"
	| "review";

export interface KindFormat {
	format: StreamFormat;
	chipType: ChipType;
	label: string;
	emoji: string;
}

const KIND_FORMATS: Record<string, KindFormat> = {
	article: { format: "standard", chipType: "blog", label: "Article", emoji: "📰" },
	note: { format: "status", chipType: "status", label: "Note", emoji: "🖊️" },
	photo: { format: "media", chipType: "image", label: "Photo", emoji: "📷" },
	video: { format: "media", chipType: "video", label: "Video", emoji: "📹" },
	audio: { format: "media", chipType: "audio", label: "Audio", emoji: "🎧" },
	reply: { format: "citation", chipType: "reply", label: "Reply", emoji: "💬" },
	like: { format: "citation", chipType: "like", label: "Like", emoji: "⭐" },
	repost: { format: "citation", chipType: "repost", label: "Repost", emoji: "🔁" },
	bookmark: { format: "citation", chipType: "bookmark", label: "Bookmark", emoji: "🔖" },
	rsvp: { format: "event", chipType: "event", label: "RSVP", emoji: "📅" },
	checkin: { format: "event", chipType: "event", label: "Check-in", emoji: "📍" },
	listen: { format: "log", chipType: "audio", label: "Listen", emoji: "🎵" },
	watch: { format: "log", chipType: "video", label: "Watch", emoji: "🍿" },
	read: { format: "log", chipType: "book", label: "Read", emoji: "📚" },
	play: { format: "log", chipType: "review", label: "Play", emoji: "🎮" },
	eat: { format: "log", chipType: "review", label: "Eat", emoji: "🍽️" },
	drink: { format: "log", chipType: "review", label: "Drink", emoji: "☕" },
	chat: { format: "chat", chipType: "chat", label: "Chat", emoji: "🗯️" },
	event: { format: "event", chipType: "event", label: "Event", emoji: "🗓️" },
	review: { format: "standard", chipType: "review", label: "Review", emoji: "⭐" },
	recipe: { format: "standard", chipType: "blog", label: "Recipe", emoji: "🥘" },
	favorite: { format: "citation", chipType: "like", label: "Favorite", emoji: "💖" },
	jam: { format: "media", chipType: "audio", label: "Jam", emoji: "🎶" },
	wish: { format: "citation", chipType: "bookmark", label: "Wish", emoji: "🌠" },
	mood: { format: "status", chipType: "status", label: "Mood", emoji: "🙂" },
	acquisition: { format: "status", chipType: "status", label: "Acquisition", emoji: "📦" },
	"tag-reply": { format: "citation", chipType: "reply", label: "Tag Reply", emoji: "🏷️" },
	quotation: { format: "quote", chipType: "quote", label: "Quote", emoji: "❝" },
};

const DEFAULT_FORMAT: KindFormat = {
	format: "standard",
	chipType: "blog",
	label: "Post",
	emoji: "📰",
};

/** Resolve a stored kind to its derived presentation format. */
export function getKindFormat(kind: string | null | undefined): KindFormat {
	if (!kind) return DEFAULT_FORMAT;
	return KIND_FORMATS[kind] ?? DEFAULT_FORMAT;
}
