$ErrorActionPreference = "Stop"
Write-Host "Cargando variables de entorno desde Heroku..."
$cfg = heroku config -s --app horario-inteligente-utp
foreach ($line in $cfg) {
    if ($line -match "^([A-Za-z0-9_]+)=(.*)$") {
        $k = $matches[1]
        $v = $matches[2].Trim("'").Trim('"')
        [System.Environment]::SetEnvironmentVariable($k, $v, [System.EnvironmentVariableTarget]::Process)
    }
}

$env:PORT = "8080"
Write-Host "Variables cargadas. Conectando a Aiven MySQL..."
Write-Host "Iniciando Spring Boot..."
java "-Dserver.port=8080" -jar target/horario-backend-1.0.0.jar
