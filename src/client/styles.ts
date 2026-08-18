/**
 * The settings-section stylesheet for dsh-github-picker, hand-written as a
 * template string and injected once by the plugin body: the web server
 * serves exactly one file per client plugin, so no separate CSS artifact may
 * exist. Tokens come only from the shared `--dsw-alias-*` design platform
 * (no literal colors); class names carry the `dsh_atGh` prefix to stay
 * unique in the assembled shell. The picker popup styles are inline in
 * picker.tsx; this sheet covers only the settings section.
 */

/** Stable `<style>` element id (idempotent injection across HMR re-runs). */
export const STYLE_ID = 'dsh-github-picker-style'

/** The injected stylesheet text. */
export const cssText = `
/* The plugin card, matching the official settings.plugin.item PluginCard
   (dsh-client-ui-settings-plugins): a bordered card whose header is a
   disclosure button; the open card deepens its background and rotates the
   chevron, and the body is inset with a top divider. */
.dsh_atGh_card {
  border: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-3);
  border-radius: 12px;
  list-style: none;
  transition: border-color 0.16s, background 0.16s;
}
.dsh_atGh_card:hover {
  border-color: var(--dsw-alias-label-dimmed);
}
.dsh_atGh_cardOpen {
  background: var(--dsw-alias-bg-layer-2);
  border-color: var(--dsw-alias-label-dimmed);
}
.dsh_atGh_cardHeader {
  appearance: none;
  width: 100%;
  font: inherit;
  color: inherit;
  text-align: left;
  cursor: pointer;
  background: 0 0;
  border: 0;
  border-radius: 12px;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  display: flex;
}
.dsh_atGh_cardHeader:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary);
  outline-offset: -2px;
}
.dsh_atGh_cardHeadText {
  flex-direction: column;
  flex: 1;
  gap: 4px;
  min-width: 0;
  display: flex;
}
.dsh_atGh_cardName {
  color: var(--dsw-alias-label-primary);
  font-size: 15px;
  font-weight: 600;
  line-height: 1.4;
}
.dsh_atGh_cardDescription {
  color: var(--dsw-alias-label-tertiary);
  font-size: 13px;
  line-height: 1.5;
}
.dsh_atGh_cardChevron {
  color: var(--dsw-alias-label-tertiary);
  flex: none;
  transition: transform 0.16s;
}
.dsh_atGh_cardChevronOpen {
  transform: rotate(180deg);
}
.dsh_atGh_cardBody {
  display: flex;
  flex-direction: column;
  gap: 12px;
  border-top: 1px solid var(--dsw-alias-border-l2);
  margin: 0 16px;
  padding: 12px 0 8px;
}
.dsh_atGh_field {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
}
.dsh_atGh_field > span {
  color: var(--dsw-alias-label-tertiary);
  font-size: 13px;
  line-height: 20px;
}
.dsh_atGh_select {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  height: 36px;
  padding: 0 10px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 8px;
  outline: none;
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 13px;
  line-height: 20px;
}
.dsh_atGh_select:focus {
  border-color: var(--dsw-alias-brand-primary);
}
.dsh_atGh_select:disabled {
  opacity: 0.55;
}
/* The GitHub-branded connection card: a large, low-density SaaS integration
   card. Left = gray-black GitHub mark + title/description; right = a pill
   status (light green background, light green border, dark green text).
   Font sizes match the rest of the settings section (13–14px). */
.dsh_atGh_connCard {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  padding: 12px 14px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 14px;
  background: var(--dsw-alias-bg-layer-1);
}
.dsh_atGh_connMark {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--dsw-alias-label-secondary);
  /* Align the mark with the title's first line instead of the full card
     center; the pill on the right stays vertically centered. */
  align-self: flex-start;
  margin-top: 1px;
}
.dsh_atGh_connMark svg {
  width: 18px;
  height: 18px;
}
.dsh_atGh_connBody {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1 1 auto;
}
.dsh_atGh_connTitle {
  color: var(--dsw-alias-label-primary);
  font-size: 14px;
  line-height: 20px;
  font-weight: 600;
}
.dsh_atGh_connVia {
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
  line-height: 18px;
}
.dsh_atGh_connCli {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}
.dsh_atGh_statusPill {
  flex: none;
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 9999px;
  font-size: 12px;
  line-height: 18px;
  font-weight: 500;
}
.dsh_atGh_statusPill_on {
  border: 1px solid color-mix(in srgb, var(--dsw-alias-state-success-primary) 30%, transparent);
  background: var(--dsw-alias-state-success-soft);
  color: var(--dsw-alias-state-success-primary);
}
.dsh_atGh_statusPill_off {
  border: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-state-muted-soft, var(--dsw-alias-interactive-bg-hover));
  color: var(--dsw-alias-label-secondary);
}
.dsh_atGh_connLoading {
  flex: none;
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 18px;
}
.dsh_atGh_connError {
  color: var(--dsw-alias-state-error-primary);
  font-size: 12px;
  line-height: 18px;
  margin-top: -4px;
}
`

/**
 * Inject the stylesheet once (stable id; HMR-safe).
 */
export function adoptStyles(): void {
  if (document.getElementById(STYLE_ID) !== null) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = cssText
  document.head.appendChild(style)
}