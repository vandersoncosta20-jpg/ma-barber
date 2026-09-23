$root = $PSScriptRoot
$port = 5173
$prefix = "http://127.0.0.1:$port/"
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)
$listener.Start()
Write-Output "M&A Barber em $prefix"

$types = @{
  ".html" = "text/html; charset=utf-8"
  ".css" = "text/css; charset=utf-8"
  ".js" = "text/javascript; charset=utf-8"
  ".png" = "image/png"
  ".webmanifest" = "application/manifest+json"
  ".json" = "application/json; charset=utf-8"
  ".svg" = "image/svg+xml"
}

while ($listener.IsListening) {
  $context = $listener.GetContext()
  $requestPath = [Uri]::UnescapeDataString($context.Request.Url.AbsolutePath)
  if ($requestPath -eq "/") { $requestPath = "/index.html" }
  $relative = $requestPath.TrimStart("/").Replace("/", "\")
  $file = [IO.Path]::GetFullPath((Join-Path $root $relative))
  $rootFull = [IO.Path]::GetFullPath($root)
  if (-not $file.StartsWith($rootFull) -or -not (Test-Path -LiteralPath $file -PathType Leaf)) {
    $context.Response.StatusCode = 404
    $bytes = [Text.Encoding]::UTF8.GetBytes("Não encontrado")
  } else {
    $ext = [IO.Path]::GetExtension($file).ToLower()
    $context.Response.ContentType = $(if ($types.ContainsKey($ext)) { $types[$ext] } else { "application/octet-stream" })
    $bytes = [IO.File]::ReadAllBytes($file)
  }
  $context.Response.Headers.Add("Cache-Control", "no-cache")
  $context.Response.ContentLength64 = $bytes.Length
  $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  $context.Response.Close()
}
