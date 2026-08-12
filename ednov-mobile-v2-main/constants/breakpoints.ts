/** Viewport width above typical tablet — desktop-style layout on web (side nav with déconnexion, login split, etc.). */
export const WEB_DESKTOP_MIN_WIDTH = 1024;

/** Tablet / large phone / narrow web: centered column, merged login card (below desktop split). */
export const TABLET_MIN_WIDTH = 600;

/** Very narrow phones: tighter vertical spacing on auth screens. */
export const COMPACT_PHONE_MAX_WIDTH = 400;

/** Max width for login content on tablet and sub-desktop web (readable line length, touch-friendly). */
export const LOGIN_TABLET_MAX_CONTENT_WIDTH = 520;

/** Desktop login: hero + form read as one unit; avoids a stretched hero on ultrawide monitors. */
export const LOGIN_WEB_DESKTOP_LAYOUT_MAX_WIDTH = 1040;
