# Tiny local web server for the show on Windows, using only what ships with Windows 10/11
# (PowerShell + .NET HttpListener). No installs, no admin rights.
# Normally started by start-windows.bat. Usage: powershell -File server.ps1 [-Port 8123] [-Open]
param(
  [int]$Port = 8123,
  [switch]$Open
)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$url = "http://localhost:$Port/control.html"

$types = @{
  '.html' = 'text/html; charset=utf-8'; '.js' = 'text/javascript; charset=utf-8';
  '.css' = 'text/css; charset=utf-8'; '.json' = 'application/json'; '.svg' = 'image/svg+xml';
  '.png' = 'image/png'; '.jpg' = 'image/jpeg'; '.jpeg' = 'image/jpeg'; '.gif' = 'image/gif'; '.webp' = 'image/webp';
  '.mp4' = 'video/mp4'; '.m4v' = 'video/mp4'; '.webm' = 'video/webm'; '.mov' = 'video/quicktime';
  '.woff2' = 'font/woff2'; '.txt' = 'text/plain; charset=utf-8'
}
$maxChunk = 4MB   # cap for open-ended range requests, so one video can't hold up everything else

function Open-Show {
  $candidates = @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
    "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe"
  )
  $browser = $candidates | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
  if ($browser) { Start-Process -FilePath $browser -ArgumentList $url }
  else {
    Write-Host "Chrome/Edge not found - opening the default browser (Chrome or Edge recommended)."
    Start-Process $url
  }
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
try {
  $listener.Start()
} catch {
  Write-Host "Port $Port is already in use (probably an earlier start-windows.bat window)."
  Write-Host "Opening the show with it. If the page looks wrong, close the other window and run this again."
  if ($Open) { Open-Show }
  exit 0
}

Write-Host "Oasis is running."
Write-Host "  Show control: $url"
Write-Host "  Effects lab:  http://localhost:$Port/index.html"
Write-Host "Close this window (or press Ctrl+C) to stop."
if ($Open) { Open-Show }

function Send-Status($resp, [int]$code, [string]$text) {
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($text)
  $resp.StatusCode = $code
  $resp.ContentType = 'text/plain; charset=utf-8'
  $resp.ContentLength64 = $bytes.Length
  $resp.OutputStream.Write($bytes, 0, $bytes.Length)
}

function Handle($ctx) {
  $req = $ctx.Request
  $resp = $ctx.Response
  if ($req.HttpMethod -ne 'GET' -and $req.HttpMethod -ne 'HEAD') { Send-Status $resp 405 'Method not allowed'; return }

  $rel = [Uri]::UnescapeDataString($req.Url.AbsolutePath)
  if ($rel -eq '/') { $rel = '/index.html' }
  if ($rel -match '\.\.') { Send-Status $resp 403 'Forbidden'; return }
  $file = Join-Path $root ($rel.TrimStart('/') -replace '/', '\')
  if (-not [System.IO.File]::Exists($file)) { Send-Status $resp 404 'Not found'; return }

  $ext = [System.IO.Path]::GetExtension($file).ToLower()
  $type = $types[$ext]
  if (-not $type) { $type = 'application/octet-stream' }

  $fs = [System.IO.File]::Open($file, 'Open', 'Read', 'ReadWrite')
  try {
    $size = $fs.Length
    $start = [int64]0
    $end = $size - 1
    $resp.ContentType = $type
    $resp.AddHeader('Accept-Ranges', 'bytes')
    $resp.AddHeader('Cache-Control', 'no-cache')

    # Range requests let videos loop and seek properly
    $range = $req.Headers['Range']
    if ($range -and $size -gt 0 -and $range -match '^bytes=(\d*)-(\d*)$') {
      if ($Matches[1] -eq '') { $start = $size - [int64]$Matches[2] }
      else {
        $start = [int64]$Matches[1]
        if ($Matches[2] -ne '') { $end = [int64]$Matches[2] }
        else { $end = [Math]::Min($size - 1, $start + $maxChunk - 1) }
      }
      if ($start -lt 0) { $start = 0 }
      if ($end -gt $size - 1) { $end = $size - 1 }
      if ($start -gt $end) {
        $resp.StatusCode = 416
        $resp.AddHeader('Content-Range', "bytes */$size")
        $resp.ContentLength64 = 0
        return
      }
      $resp.StatusCode = 206
      $resp.AddHeader('Content-Range', "bytes $start-$end/$size")
    } else {
      $resp.StatusCode = 200
    }

    $len = [int64]0
    if ($size -gt 0) { $len = $end - $start + 1 }
    $resp.ContentLength64 = $len
    if ($req.HttpMethod -eq 'HEAD' -or $len -eq 0) { return }

    [void]$fs.Seek($start, 'Begin')
    $buf = New-Object byte[] 65536
    $left = $len
    while ($left -gt 0) {
      $n = $fs.Read($buf, 0, [int][Math]::Min([int64]$buf.Length, $left))
      if ($n -le 0) { break }
      $resp.OutputStream.Write($buf, 0, $n)
      $left -= $n
    }
  } finally {
    $fs.Close()
  }
}

try {
  while ($listener.IsListening) {
    # wait in short slices so Ctrl+C can stop the server
    $task = $listener.GetContextAsync()
    while (-not $task.AsyncWaitHandle.WaitOne(200)) { }
    $ctx = $task.GetAwaiter().GetResult()
    try { Handle $ctx }
    catch { }   # browser closed the connection early, etc.
    finally { try { $ctx.Response.Close() } catch { } }
  }
} finally {
  $listener.Stop()
  $listener.Close()
}
