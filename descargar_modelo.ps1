# URL del modelo que SÍ existe (ssd_mobilenet_v2)
$baseUrl = "https://storage.googleapis.com/tfjs-models/savedmodel/ssd_mobilenet_v2"
$outputDir = ".\public\models\coco-ssd"

# 1. Preparar carpeta
if (Test-Path -Path $outputDir) { Remove-Item -Path $outputDir -Recurse -Force }
New-Item -ItemType Directory -Path $outputDir | Out-Null
Write-Host "Carpeta limpia: $outputDir" -ForegroundColor Cyan

# 2. Descargar y Analizar model.json
$jsonUrl = "$baseUrl/model.json"
$jsonPath = "$outputDir\model.json"

Write-Host "Descargando model.json..." -NoNewline
try {
    # Descargar el JSON
    Invoke-WebRequest -Uri $jsonUrl -OutFile $jsonPath
    Write-Host "[OK]" -ForegroundColor Green
    
    # LEER el JSON para encontrar los nombres reales de los archivos .bin
    $jsonContent = Get-Content $jsonPath -Raw | ConvertFrom-Json
    $binFiles = $jsonContent.weightsManifest[0].paths
    
    Write-Host "El modelo requiere $($binFiles.Count) archivos binarios." -ForegroundColor Yellow
} catch {
    Write-Error "Error fatal descargando/leyendo model.json"
    exit
}

# 3. Descargar los archivos binarios detectados
foreach ($fileName in $binFiles) {
    $fileUrl = "$baseUrl/$fileName"
    $filePath = "$outputDir\$fileName"
    
    Write-Host "Descargando $fileName ... " -NoNewline
    try {
        Invoke-WebRequest -Uri $fileUrl -OutFile $filePath
        Write-Host "[OK]" -ForegroundColor Green
    } catch {
        Write-Host "[ERROR]" -ForegroundColor Red
    }
}

Write-Host "--- DESCARGA COMPLETA ---" -ForegroundColor Cyan