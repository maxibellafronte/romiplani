const ACCENT = '#31708E'

const CARDIO = [
  { rpe: '10',  color: '#D9534F', titulo: 'Actividad de esfuerzo máximo', texto: 'Se siente casi imposible de seguir con la actividad. Completamente sin aliento, incapaz de hablar.' },
  { rpe: '9',   color: '#E08A3C', titulo: 'Actividad muy dura', texto: 'Muy difícil de mantener la intensidad del ejercicio. Apenas puede respirar. Decir solo unas pocas palabras.' },
  { rpe: '7-8', color: '#E0C93C', titulo: 'Actividad vigorosa', texto: 'Falta de aliento. Puede decir una oración.' },
  { rpe: '4-6', color: '#5FA85F', titulo: 'Actividad moderada', texto: 'Respiración pesada, puede mantener una conversación corta. Todavía algo cómoda, pero cada vez más desafiante.' },
  { rpe: '2-3', color: '#5B9BD5', titulo: 'Actividad ligera', texto: 'Se siente como si pudieras realizar la actividad durante horas. Fácil de respirar y mantener una conversación.' },
  { rpe: '1',   color: '#9B7FC7', titulo: 'Actividad muy ligera', texto: 'Casi ningún esfuerzo, pero más que dormir o ver televisión.' },
]

const FUERZA = [
  { rpe: '10',  texto: 'Esfuerzo máximo' },
  { rpe: '9',   texto: '1 repetición en reserva' },
  { rpe: '8',   texto: '2 repeticiones en reserva' },
  { rpe: '7',   texto: '3 repeticiones en reserva' },
  { rpe: '5-6', texto: '4-6 repeticiones en reserva' },
  { rpe: '3-4', texto: 'Esfuerzo liviano' },
  { rpe: '1-2', texto: 'Poco o ningún esfuerzo' },
]

const REPS = [1, 2, 3, 4, 5, 6, 7, 8]
const FUERZA_PCT = [
  { rpe: '10',  vals: [100, 95, 90, 87, 85, 83, 81, 79] },
  { rpe: '9.5', vals: [97, 93, 89, 86, 84, 82, 80, 77.5] },
  { rpe: '9',   vals: [95, 91, 87, 85, 83, 81, 80, 77.5] },
  { rpe: '8.5', vals: [93, 89, 86, 84, 82, 80, 79, 76] },
  { rpe: '8',   vals: [91, 87, 85, 83, 82, 80, 79, 76] },
  { rpe: '7.5', vals: [89, 86, 84, 82, 80, 77.5, 76, 73] },
  { rpe: '7',   vals: [87, 85, 83, 80, 79, 77.5, 76, 70] },
]

function Seccion({ titulo, subtitulo, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: ACCENT, letterSpacing: '0.06em', marginBottom: 2 }}>{titulo}</div>
      {subtitulo && <div style={{ fontSize: 11, color: '#7A8FA0', marginBottom: 8 }}>{subtitulo}</div>}
      <div style={{ background: '#EEF2F0', border: '1px solid #AEB9C0', borderRadius: 10, overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  )
}

export default function RPEPanel() {
  return (
    <div style={{ padding: '14px 12px', maxWidth: 760, margin: '0 auto' }}>
      <div style={{ background: '#EEF2F0', border: '1px solid #AEB9C0', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: ACCENT, letterSpacing: '0.08em' }}>💪 ESCALAS DE RPE</div>
        <div style={{ fontSize: 11, color: '#7A8FA0', marginTop: 3 }}>Percepción Subjetiva de Esfuerzo — referencia para cardio y fuerza</div>
      </div>

      <Seccion titulo="RPE CARDIO" subtitulo="Escala de percepción subjetiva de esfuerzo">
        {CARDIO.map((r, i) => (
          <div key={r.rpe} style={{ display: 'flex', gap: 12, padding: '10px 12px', borderBottom: i < CARDIO.length - 1 ? '1px solid #C4CDD4' : 'none' }}>
            <div style={{
              flexShrink: 0, width: 40, height: 40, borderRadius: 8, background: r.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 15, fontWeight: 900, color: 'white',
            }}>{r.rpe}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#1F3A4A' }}>{r.titulo}</div>
              <div style={{ fontSize: 11, color: '#5C6E78', marginTop: 2 }}>{r.texto}</div>
            </div>
          </div>
        ))}
      </Seccion>

      <Seccion titulo="RPE FUERZA" subtitulo="Escala de percepción de esfuerzo en entrenamiento de fuerza">
        {FUERZA.map((r, i) => (
          <div key={r.rpe} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '9px 12px', borderBottom: i < FUERZA.length - 1 ? '1px solid #C4CDD4' : 'none' }}>
            <div style={{ flexShrink: 0, width: 40, textAlign: 'center', fontSize: 14, fontWeight: 900, color: ACCENT }}>{r.rpe}</div>
            <div style={{ fontSize: 12, color: '#1F3A4A', fontWeight: 600 }}>{r.texto}</div>
          </div>
        ))}
      </Seccion>

      <Seccion titulo="RPE FUERZA %" subtitulo="Relación entre %1RM, repeticiones realizadas y RPE (RIR)">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 420 }}>
            <thead>
              <tr style={{ background: '#E2E8EA' }}>
                <th style={{ padding: '8px 10px', fontSize: 11, fontWeight: 800, color: ACCENT, textAlign: 'center', borderBottom: '1px solid #AEB9C0' }}>RPE</th>
                {REPS.map(rep => (
                  <th key={rep} style={{ padding: '8px 6px', fontSize: 11, fontWeight: 800, color: ACCENT, textAlign: 'center', borderBottom: '1px solid #AEB9C0' }}>{rep}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FUERZA_PCT.map((row, i) => (
                <tr key={row.rpe} style={{ background: i % 2 === 0 ? '#EEF2F0' : '#E7ECED' }}>
                  <td style={{ padding: '7px 10px', fontSize: 12, fontWeight: 800, color: '#1F3A4A', textAlign: 'center' }}>{row.rpe}</td>
                  {row.vals.map((v, j) => (
                    <td key={j} style={{ padding: '7px 6px', fontSize: 11, color: '#3E5361', textAlign: 'center' }}>{v}%</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '8px 12px', fontSize: 10, color: '#8A98A2' }}>Repeticiones realizadas por serie →</div>
      </Seccion>
    </div>
  )
}
