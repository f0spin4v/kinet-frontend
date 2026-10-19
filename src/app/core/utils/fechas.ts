/** "Quedan 3 días", "Quedan 5 h", "Menos de 1 h" o "Finalizado". */
export function tiempoRestante(fechaFin: string, ahora: Date = new Date()): string {
  const ms = new Date(fechaFin).getTime() - ahora.getTime();
  if (ms <= 0) return 'Finalizado';

  const horas = Math.floor(ms / 3_600_000);
  if (horas < 1) return 'Menos de 1 h';
  if (horas < 24) return `Quedan ${horas} h`;

  const dias = Math.floor(horas / 24);
  return `Quedan ${dias} ${dias === 1 ? 'día' : 'días'}`;
}
/** Para mostrar el tiempo restante en grande: { valor: 4, unidad: 'días' }. null si ya terminó. */
export function partesTiempoRestante(
  fechaFin: string,
  ahora: Date = new Date(),
): { valor: number; unidad: string } | null {
  const ms = new Date(fechaFin).getTime() - ahora.getTime();
  if (ms <= 0) return null;

  const horas = Math.max(1, Math.floor(ms / 3_600_000));
  if (horas < 24) return { valor: horas, unidad: horas === 1 ? 'hora' : 'horas' };

  const dias = Math.floor(horas / 24);
  return { valor: dias, unidad: dias === 1 ? 'día' : 'días' };
}

/** "Hoy, 08:20", "Ayer, 18:45" o "mié, 14 oct, 18:45". */
export function fechaRelativa(fecha: string, ahora: Date = new Date()): string {
  const d = new Date(fecha);
  const hora = d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false });
  const dia = (x: Date) => x.toLocaleDateString('en-CA');

  const ayer = new Date(ahora);
  ayer.setDate(ayer.getDate() - 1);

  if (dia(d) === dia(ahora)) return `Hoy, ${hora}`;
  if (dia(d) === dia(ayer)) return `Ayer, ${hora}`;
  return `${d.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })}, ${hora}`;
}

/** "lunes, 00:00" */
export function fechaLimite(fecha: string): string {
  return new Date(fecha).toLocaleString('es-CO', {
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}
