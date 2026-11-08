/**
 * Text recognition stub.
 *
 * The interface mirrors what a real OCR provider returns. Until a provider is
 * wired (on-device ML Kit via a development build, or a server-side vision API),
 * the app returns one clearly-labelled demo transcription so the flow can be
 * tested end to end. The screen tells the reader the text is a placeholder.
 */
const DEMO = {
  text: 'Nie chodziło o to, że odszedł. Chodziło o to, że przez chwilę wierzyłam, że jednak zostanie.',
  confidence: 0.0,
};

export async function recogniseFragment(_uri: string): Promise<typeof DEMO> {
  await new Promise((resolve) => setTimeout(resolve, 1200));
  return DEMO;
}
