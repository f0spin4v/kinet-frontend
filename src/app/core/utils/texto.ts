/** "Andrés Pérez Martínez" → "AP" */
export function iniciales(nombre: string | null | undefined): string {
  return (nombre ?? '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(parte => parte[0].toUpperCase())
    .join('');
}
