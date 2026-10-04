# Script de Respaldo Automatizado de Base de Datos y Sesiones
$BackupDir = "C:\Users\Admin\Documents\erp\backups"
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
}

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$AuthBackup = "$BackupDir\auth_info_$Timestamp.zip"

# Respaldar credenciales de sesión de WhatsApp
if (Test-Path "C:\Users\Admin\Documents\erp\auth_info") {
    Compress-Archive -Path "C:\Users\Admin\Documents\erp\auth_info" -DestinationPath $AuthBackup -Force
    Write-Output "Respaldo de sesion WhatsApp creado: $AuthBackup"
}

Write-Output "Respaldo completado satisfactoriamente."
