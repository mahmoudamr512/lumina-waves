/**
 * A low-key dark ambient backdrop: a faint gold radial glow plus a very subtle
 * grid. Purely decorative (aria-hidden) and fixed behind all content. Opacities
 * are kept low so text contrast stays well above WCAG AA on the ink background.
 *
 * Server component — no interactivity.
 */
export function AmbientBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-ink"
    >
      {/* Faint grid. */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #D4AF37 1px, transparent 1px), linear-gradient(to bottom, #D4AF37 1px, transparent 1px)',
          backgroundSize: '56px 56px',
        }}
      />
      {/* Top-centre gold glow. */}
      <div
        className="absolute left-1/2 top-[-20%] h-[60vh] w-[60vh] -translate-x-1/2 rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(212,175,55,0.16) 0%, rgba(212,175,55,0.05) 40%, transparent 70%)',
        }}
      />
      {/* Bottom vignette to deepen the ink. */}
      <div
        className="absolute inset-x-0 bottom-0 h-[40vh]"
        style={{
          background:
            'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)',
        }}
      />
    </div>
  );
}
