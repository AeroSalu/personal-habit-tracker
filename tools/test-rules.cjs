// Runs the security rules tests on their own Firestore emulator (port 8181), then makes sure
// that emulator is gone. On Windows, `firebase emulators:exec` leaves the emulator's Java
// process running after the tests finish, which blocks the next run with "port taken".
const { spawnSync } = require('child_process')

const PORT = 8181

function stopLeftover() {
  if (process.platform !== 'win32') return
  // Only stops the Firestore emulator itself, never anything else on the port.
  const script = [
    `$c = Get-NetTCPConnection -LocalPort ${PORT} -State Listen -ErrorAction SilentlyContinue`,
    'foreach ($x in $c) {',
    '  $p = Get-CimInstance Win32_Process -Filter "ProcessId=$($x.OwningProcess)"',
    "  if ($p.CommandLine -like '*cloud-firestore-emulator*') { Stop-Process -Id $p.ProcessId -Force }",
    '}',
  ].join('\n')
  spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', script], { stdio: 'ignore' })
}

stopLeftover()
const run = spawnSync(
  'firebase emulators:exec --config firebase.rules-test.json --only firestore --project demo-lockin-rules "vitest run --config vitest.rules.config.ts"',
  { stdio: 'inherit', shell: true },
)
stopLeftover()
process.exit(run.status ?? 1)
