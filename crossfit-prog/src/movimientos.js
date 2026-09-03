// Catálogo de movimientos para los RM. Para agregar uno nuevo alcanza con
// sumar una línea acá: el `id` es lo que queda guardado en la base (no
// cambiarlo una vez que hay atletas con datos cargados), el `label` es lo
// que se muestra en pantalla.
export const MOVIMIENTOS = [
  { grupo: 'Levantamientos olímpicos', items: [
    { id: 'snatch',          label: 'Snatch' },
    { id: 'power_snatch',    label: 'Power Snatch' },
    { id: 'hang_snatch',     label: 'Hang Snatch' },
    { id: 'clean',           label: 'Clean' },
    { id: 'power_clean',     label: 'Power Clean' },
    { id: 'hang_clean',      label: 'Hang Clean' },
    { id: 'squat_clean',     label: 'Squat Clean' },
    { id: 'clean_and_jerk',  label: 'Clean & Jerk' },
    { id: 'split_jerk',      label: 'Split Jerk' },
    { id: 'push_jerk',       label: 'Push Jerk' },
  ]},
  { grupo: 'Sentadillas', items: [
    { id: 'back_squat',      label: 'Back Squat' },
    { id: 'front_squat',     label: 'Front Squat' },
    { id: 'overhead_squat',  label: 'Overhead Squat' },
  ]},
  { grupo: 'Tirones', items: [
    { id: 'deadlift',        label: 'Deadlift' },
    { id: 'sumo_deadlift',   label: 'Sumo Deadlift' },
    { id: 'bent_over_row',   label: 'Bent Over Row' },
    { id: 'weighted_pullup', label: 'Weighted Pull-up' },
  ]},
  { grupo: 'Empujes', items: [
    { id: 'strict_press',    label: 'Strict Press' },
    { id: 'push_press',      label: 'Push Press' },
    { id: 'bench_press',     label: 'Bench Press' },
    { id: 'thruster',        label: 'Thruster' },
  ]},
]

export const CATALOGO = MOVIMIENTOS.flatMap(g => g.items)
export const ETIQUETAS = Object.fromEntries(CATALOGO.map(m => [m.id, m.label]))

// Posición de cada movimiento en el catálogo, para ordenar listas sueltas
// (por ejemplo los RM de un atleta) con el mismo criterio que el panel.
export const ORDEN = Object.fromEntries(CATALOGO.map((m, i) => [m.id, i]))

// 100.00 → "100" ; 62.50 → "62.5"
export function fmtKg(v) {
  const n = Number(v)
  return isFinite(n) ? String(Math.round(n * 100) / 100) : String(v ?? '')
}
