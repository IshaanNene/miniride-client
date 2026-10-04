export function CrashScreen() {
  return (
    <div className="app crash" role="alert">
      <h1>Something went wrong</h1>
      <p>MiniRide stopped unexpectedly. Please reopen the app.</p>
      <button className="primary" onClick={() => location.assign("/")}>Reopen</button>
    </div>
  );
}
