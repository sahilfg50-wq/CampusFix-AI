export default function SetupNeeded() {
  return (
    <div className="mx-auto max-w-[640px] p-5">
      <div className="card">
        <h2>Firebase is not connected yet</h2>
        <p className="my-2">This app needs your Firebase web settings.</p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>Copy the file <code>.env.example</code> and name the copy <code>.env.local</code>.</li>
          <li>Open <code>.env.local</code> and paste your Firebase values (see README, step 3).</li>
          <li>Stop the app (Ctrl + C) and start it again with <code>npm run dev</code>.</li>
        </ol>
      </div>
    </div>
  );
}
