/**
 * Minimal layout for the projector route. No header/nav chrome — the stage
 * view should render edge-to-edge so the live results dominate the screen
 * behind the speaker.
 */
export default function StageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
