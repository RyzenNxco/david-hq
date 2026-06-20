export default function TrackerPage() {
  return (
    <div style={{ width: '100%', height: '100vh', overflow: 'hidden' }}>
      <iframe
        src="/tracker.html"
        style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
        title="Tracker de Comisiones"
      />
    </div>
  )
}
