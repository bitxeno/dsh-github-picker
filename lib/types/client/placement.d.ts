/**
 * Popup placement math for the composer picker. The popup stays a plain
 * absolutely-positioned sibling of the GitHub button (no portal), but its box
 * is fitted to the visible viewport so a phone screen never truncates it: the
 * width shrinks to the free width, the left edge stops at the keep-out margin,
 * and the height follows the roomier side of the button. The visible viewport
 * is `visualViewport` when present, so the on-screen keyboard also counts.
 *
 * Pure functions only — the component measures the anchor and the viewport,
 * then feeds them here; this module has no DOM access. Inputs are CSS pixels
 * in viewport coordinates; outputs are offsets relative to the anchor's box,
 * which is the absolutely-positioned popup's containing block.
 */
/** Preferred popup width in CSS pixels. */
export declare const POPUP_WIDTH = 360;
/** Preferred popup height cap in CSS pixels. */
export declare const POPUP_MAX_HEIGHT = 340;
/** Width cap of the bottom-sheet fallback. */
export declare const SHEET_WIDTH = 480;
/** Height cap of the bottom-sheet fallback. */
export declare const SHEET_MAX_HEIGHT = 420;
/** Below this much room on both sides the popup becomes a bottom sheet. */
export declare const SHEET_THRESHOLD = 160;
/** Distance between the button and the popup. */
export declare const POPUP_GAP = 8;
/** Keep-out margin between the popup and the viewport edges. */
export declare const POPUP_MARGIN = 8;
/** A box in viewport coordinates (a `DOMRect` subset). */
export interface Box {
    readonly top: number;
    readonly right: number;
    readonly bottom: number;
    readonly left: number;
}
/** The visible viewport: offset and size (a `visualViewport` subset). */
export interface ViewportBox extends Box {
    readonly width: number;
    readonly height: number;
}
/** How the popup is attached to the button. */
export type PopupSide = 'above' | 'below' | 'sheet';
/** The fitted popup box, as offsets relative to the anchor's box. */
export interface PopupPlacement {
    readonly side: PopupSide;
    /** Left edge relative to the anchor's left edge. */
    readonly offsetLeft: number;
    readonly width: number;
    readonly maxHeight: number;
    /** Top edge relative to the anchor's top edge (below only). */
    readonly offsetTop?: number;
    /** Bottom edge relative to the anchor's bottom edge (above and sheet). */
    readonly offsetBottom?: number;
}
/**
 * Fit the popup into the clipping box, opening on the roomier side of the
 * anchor. When neither side has usable room (a landscape phone, or the
 * keyboard up) the popup becomes a bottom sheet centred in the box. The
 * result is always clamped inside the box, even when the anchor itself has
 * scrolled out of view (a keyboard that covers the composer).
 * @param anchor - the button's viewport-space box.
 * @param clip - the box the popup must stay inside (see {@link clipBoxFor}).
 * @returns the anchor-relative offsets, width, height cap, and attachment side.
 */
export declare function computePopupPlacement(anchor: Box, clip: Box): PopupPlacement;
/** The intersection of two boxes, or an empty box at `b`'s top-left. */
export declare function intersectBoxes(a: Box, b: Box): Box;
/** Keep-out below floating chrome on touch shells (the mobile menu button). */
export declare const TOUCH_TOP_INSET = 44;
/**
 * The popup's clipping box: the visible viewport intersected with the nearest
 * scrolling ancestor (the conversation's scroll body). An absolutely
 * positioned popup is clipped by that ancestor, so fitting to the viewport
 * alone still truncates it — and lets it slide under the app header.
 * @param element - the popup's anchor wrapper.
 * @param viewport - the visible viewport.
 * @param topInset - extra top keep-out for floating chrome.
 * @returns the box the popup must stay inside.
 */
export declare function clipBoxFor(element: Element, viewport: ViewportBox, topInset?: number): Box;
/**
 * Read the visible viewport. `visualViewport` is authoritative on mobile: it
 * shrinks when the on-screen keyboard opens, while the layout viewport (and
 * `innerWidth`/`innerHeight`) does not.
 * @returns the visual viewport box, or the window's own size as a fallback.
 */
export declare function readViewport(): ViewportBox;
/** A `matchMedia`-shaped target, injected so the media helper stays testable. */
export interface MediaTarget {
    matchMedia?: (query: string) => {
        readonly matches: boolean;
    };
}
/**
 * Whether the pointer is coarse (a finger). Phones then get a 16px search
 * field (iOS Safari zooms the page in when a focused input's font-size is
 * below 16px) and the row's open-link affordance is always visible, because
 * there is no hover to reveal it.
 * @param target - media-query source; defaults to the current window.
 * @returns true for touch-primary devices.
 */
export declare function prefersCoarsePointer(target?: MediaTarget): boolean;
