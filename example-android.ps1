$originalDir = Get-Location
Set-Location -Path '' # Caminho para a pasta emulator, geralmente em 'Appdata\Local\Android\Sdk\emulator\'ou 'Appdata\Local\Android\Sdk\tools\emulator\'
Start-Process -FilePath './emulator' -ArgumentList '-avd S20' -NoNewWindow
Start-Sleep -Seconds 10
Set-Location -Path $originalDir
expo start --android
