$originalDir = Get-Location
Set-Location -Path '' # Caminho para a pasta emulator, geralmente em 'Appdata\Local\Android\Sdk\emulator\'ou 'Appdata\Local\Android\Sdk\tools\emulator\'
Start-Process -FilePath './emulator' -ArgumentList '-avd [AVD NAME]' -NoNewWindow # Troque [AVD NAME] pelo nome da sua AVD, você pode chegcar executando o comando '/.emulator --list-avds'
Start-Sleep -Seconds 10
Set-Location -Path $originalDir
expo start --android
