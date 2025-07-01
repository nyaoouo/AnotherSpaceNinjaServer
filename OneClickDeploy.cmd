@echo off
SETLOCAL EnableDelayedExpansion
goto :main

:_setArg
set "_ARG_KEY=%~1"
set "_ARG_VALUE=%~2"
if "!_ARG_VALUE:~0,1!"=="\"" if "!_ARG_VALUE:~-1!"=="\"" (
    set "_ARG_VALUE=!_ARG_VALUE:~1,-1!"
)
set "ARG[!_ARG_KEY!]=!_ARG_VALUE!"
exit /b 0

:parseArgs
set "ARG_MAX=0"
set "_LastKey="
for %%A in (%*) do (
    set "_ARG=%%A"
    if "!_ARG:~0,1!"=="-" (
        if defined _LastKey call :_setArg !_LastKey! 1
        set "_LastKey=!_ARG:~1!"
    ) else (
        if defined _LastKey (
            call :_setArg !_LastKey! !_ARG!
            set "_LastKey="
        ) else (
            call :_setArg !ARG_MAX! !_ARG!
            set /a ARG_MAX+=1
        )
    )
)
if defined _LastKey call :_setArg !_LastKey! 1
exit /b 0

:resolve_path
set "%~2=%~f1"
exit /b 0


:raise
set gErrorLevel=%~2
echo %~1
goto :end

:assert
if %errorlevel% neq 0 (
    call :raise "Assertion failed: %~1" %errorlevel%
)
exit /b 0

:download
SETLOCAL EnableDelayedExpansion
set "url=%~1"
set "dest=%~2"

set "destDir=%~dp2"
if not exist "%destDir%" (
    mkdir "%destDir%"
    call :assert "Failed to create directory %destDir%"
)

if not exist "%dest%" (
    echo Downloading %url% to %dest%...
    @REM powershell -Command "Invoke-WebRequest -Uri '%url%' -OutFile '%dest%'"
    powershell -Command "$ProgressPreference='SilentlyContinue'; Invoke-WebRequest -Uri '%url%' -OutFile '%dest%'"
    call :assert "Failed to download %url%"
) else (
    call :raise "File %dest% already exists."
)
ENDLOCAL
exit /b 0

:unzip
SETLOCAL EnableDelayedExpansion
set "zipFile=%~1"
set "destDir=%~2"
if not exist "%zipFile%" (
    call :raise "Zip file %zipFile% does not exist."
)
if not exist "%destDir%" (
    mkdir "%destDir%"
)
powershell -Command "Expand-Archive -Path '%zipFile%' -DestinationPath '%destDir%' -Force"
call :assert "Failed to unzip %zipFile% to %destDir%"
ENDLOCAL
exit /b 0

:ensure-mongodb
SETLOCAL EnableDelayedExpansion
set "archivePath=%ExternalDir%\.tmp\mongodb.zip"
set "targetDir=%ExternalDir%\mongodb"
set "expectedDir=%ExternalDir%\mongodb-win32-x86_64-windows-8.0.10"
set "dlLink=https://fastdl.mongodb.org/windows/mongodb-windows-x86_64-8.0.10.zip"
set "testFile=%targetDir%\bin\mongod.exe"

if not exist "%targetDir%" (
    echo MongoDB not found...
    if not exist "%archivePath%" (
        echo Downloading MongoDB...
        call :download "%dlLink%" "%archivePath%"
    )
    echo Unzipping MongoDB...
    call :unzip "%archivePath%" "%ExternalDir%"
    if exist "%expectedDir%" (
        move /Y "%expectedDir%" "%targetDir%"
    ) else (
        call :raise "Expected directory %expectedDir% does not exist after unzipping."
    )
)
if not exist "%testFile%" (
    call :raise "MongoDB executable not found, expected at %testFile%."
)
echo MongoDB setup complete.
ENDLOCAL
exit /b 0

:ensure-nodejs
SETLOCAL EnableDelayedExpansion
set "archivePath=%ExternalDir%\.tmp\nodejs.zip"
set "targetDir=%ExternalDir%\nodejs"
set "expectedDir=%ExternalDir%\node-v22.16.0-win-x64"
set "dlLink=https://nodejs.org/dist/v22.16.0/node-v22.16.0-win-x64.zip"
set "testFile=%targetDir%\npm.cmd"

if not exist "%targetDir%" (
    echo Node.js not found...
    if not exist "%archivePath%" (
        echo Downloading Node.js...
        call :download "%dlLink%" "%archivePath%"
    )
    echo Unzipping Node.js...
    call :unzip "%archivePath%" "%ExternalDir%"
    if exist "%expectedDir%" (
        move /Y "%expectedDir%" "%targetDir%"
    ) else (
        call :raise "Expected directory %expectedDir% does not exist after unzipping."
    )
)
if not exist "%testFile%" (
    call :raise "npm executable not found, expected at %testFile%."
)
echo Node.js setup complete.
ENDLOCAL
exit /b 0

:ensure-windows-terminal
SETLOCAL EnableDelayedExpansion
set "archivePath=%ExternalDir%\.tmp\WindowsTerminal.zip"
set "targetDir=%ExternalDir%\WindowsTerminal"
set "expectedDir=%ExternalDir%\terminal-1.22.11141.0"
set "dlLink=https://github.com/microsoft/terminal/releases/download/v1.22.11141.0/Microsoft.WindowsTerminal_1.22.11141.0_x64.zip"
set "testFile=%targetDir%\wt.exe"
if not exist "%targetDir%" (
    echo Windows Terminal not found...
    if not exist "%archivePath%" (
        echo Downloading Windows Terminal...
        call :download "%dlLink%" "%archivePath%"
    )
    echo Unzipping Windows Terminal...
    call :unzip "%archivePath%" "%ExternalDir%"
    if exist "%expectedDir%" (
        move /Y "%expectedDir%" "%targetDir%"
    ) else (
        call :raise "Expected directory %expectedDir% does not exist after unzipping."
    )
)
if not exist "%testFile%" (
    call :raise "Windows Terminal executable not found, expected at %testFile%."
)
ENDLOCAL
exit /b 0


:ensure-git
SETLOCAL EnableDelayedExpansion
set "gitSelfInstall=%ExternalDir%\.tmp\PortableGit-2.49.0-64-bit.7z.exe"
set "gitDir=%ExternalDir%\git"
set "dlLink=https://github.com/git-for-windows/git/releases/download/v2.49.0.windows.1/PortableGit-2.49.0-64-bit.7z.exe"
if "%~1" neq "" (
    where git >nul 2>&1
    if %errorlevel% == 0 (
        echo Using global Git installation...
        set "foundGit=1"
    )
)
if not defined foundGit (
    if not exist "%gitDir%" (
        echo Git not found...
        if not exist "%gitSelfInstall%" (
            echo Downloading Git...
            call :download "%dlLink%" "%gitSelfInstall%"
        )
        echo Unzipping Git...
        start /b /wait "" "%gitSelfInstall%" -o "%gitDir%" -y
        if not exist "%gitDir%" (
            call :raise "Expected directory %gitDir% does not exist after unzipping."
        )
    )
    SET "PATH=%gitDir%;%PATH%"
    where git >nul 2>&1
    call :assert "Git executable not found in PATH."
    echo Git setup complete.
)
ENDLOCAL
exit /b 0

:ensure-server
SETLOCAL EnableDelayedExpansion
if exist "%ServerDir%" (
    echo Server repository already exists, updating...
    pushd "%ServerDir%"
    git pull
    @REM call :assert "Failed to update server repository %ServerRepo% in %ServerDir%"
    if %errorlevel% neq 0 (
        echo Failed to update server repository in %ServerDir%.
    )
    popd
    echo Server updated in %ServerDir%.
) else (
    git clone "%ServerRepo%" "%ServerDir%"
    call :assert "Failed to clone server repository %ServerRepo% to %ServerDir%"
    echo Server repository cloned to %ServerDir%.
)
if not exist "%ServerDir%\config.json" (
    copy "%ServerDir%\config.json.example" "%ServerDir%\config.json"
    call :assert "Failed to copy config.json.example to config.json"
)

ENDLOCAL
exit /b 0

:ensure-extras
SETLOCAL EnableDelayedExpansion
set "extrasDir=%ServerDir%\static\data"
set "repoDir=%extrasDir%\0"
set "flagDontDownload=%extrasDir%\.dontDownload"
set "repoUrl=https://openwf.io/0.git"

if exist "%flagDontDownload%" (
    echo Skipping extra data download as per flag.
) else (
    if exist "%repoDir%" (
        echo Extra data repository already exists, updating...
        pushd "%repoDir%"
        git pull
        @REM call :assert "Failed to update repository %repoUrl% in %repoDir%"
        if %errorlevel% neq 0 (
            echo Failed to update repository in %repoDir%.
        )
        popd
        echo Extra data updated in %repoDir%.
    ) else (
        set /p "downloadExtras=Do you want to download extra data? (y/n): "
        if /i "!downloadExtras!"=="y" (
            echo Downloading extra data...
            git clone "%repoUrl%" "%repoDir%"
            call :assert "Failed to clone repository %repoUrl% to %repoDir%"
            echo Extra data downloaded to %repoDir%.
        ) else (
            echo Skipping extra data download.
            echo . > "%flagDontDownload%"
            echo If you want to download it later, delete the file "%flagDontDownload%".
        )
    )
)
ENDLOCAL
exit /b 0

:ensure-irc
SETLOCAL EnableDelayedExpansion
set "ircPath=%ExternalDir%\IRC\warframe-irc-server.exe"
set "noIrcFlag=%ExternalDir%\.dontDownloadIRC"
set "ircDlLink=https://github.com/Sainan/warframe-irc-server/releases/download/1.3.1/warframe-irc-server.exe"
if exist "%noIrcFlag%" (
    echo Skipping IRC server download as per flag.
) else (
    if exist "%ircPath%" (
        echo IRC server already exists, skipping download.
    ) else (
        set /p "downloadIrc=Do you want to download the IRC server? (y/n): "
        if /i "!downloadIrc!"=="y" (
            call :download "%ircDlLink%" "%ircPath%"
        ) else (
            echo Skipping IRC server download.
            echo . > "%noIrcFlag%"
            echo If you want to download it later, delete the file "%noIrcFlag%".
        )
    )
)
ENDLOCAL
exit /b 0


:main
set gErrorLevel=0
call :parseArgs %*
echo Usage: %0 [options] [Positional Arguments]
echo Options:
echo   -externalDir [path]  Set the external directory (default: current script directory\external)
echo   -serverDir [path]    Set the server directory (default: current script directory\SpaceNinjaServer)
echo   -serverRepo [url]    Set the server repository URL (default: https://openwf.io/SpaceNinjaServer.git)
echo   -databasePath [path] Set the MongoDB data directory (default: externalDir\mongodb-data)
echo   -ignorePull           Ignore pulling updates for the server repository
echo   -irc-options [args]   Options to pass to the IRC server executable
echo   -db-options [args]    Options to pass to the MongoDB server executable
echo   -server-options [args] Options to pass to the main server
echo Positional Arguments:
echo   database             launch the database server
echo   irc                  launch the IRC server
echo   server               launch the main server
echo   note: if no positional arguments are provided, all servers will be launched
echo ============================================================

if defined ARG[externalDir] set "ExternalDir=%ARG[externalDir]%"
if defined ARG[serverDir] set "ServerDir=%ARG[serverDir]%"
if defined ARG[serverRepo] set "ServerRepo=%ARG[serverRepo]%"
if defined ARG[databasePath] set "DatabasePath=%ARG[databasePath]%"

if not defined ExternalDir set "ExternalDir=%~dp0\external"
if not defined ServerDir set "ServerDir=%~dp0\SpaceNinjaServer"
if not defined ServerRepo set "ServerRepo=https://openwf.io/SpaceNinjaServer.git"
if not defined DatabasePath set "DatabasePath=%ExternalDir%\mongodb-data"

call :resolve_path "%ExternalDir%" ExternalDir
call :resolve_path "%ServerDir%" ServerDir
call :resolve_path "%DatabasePath%" DatabasePath

echo Using External Directory: %ExternalDir%
echo Using Server Directory: %ServerDir%
echo Using Server Repository: %ServerRepo%
echo Using MongoDB Data Directory: %DatabasePath%


if %ARG_MAX%==0 (
    set "LaunchDatabase=1"
    set "LaunchIrc=1"
    set "LaunchServer=1"
) else (
    set "LaunchDatabase=0"
    set "LaunchIrc=0"
    set "LaunchServer=0"
    for /L %%i in (0,1,%ARG_MAX%) do (
        if "!ARG[%%i]!"=="database" set "LaunchDatabase=1"
        if "!ARG[%%i]!"=="irc" set "LaunchIrc=1"
        if "!ARG[%%i]!"=="server" set "LaunchServer=1"
    )
)

echo Launching:
echo - Launch Database [%LaunchDatabase%]
echo - Launch IRC [%LaunchIrc%]
echo - Launch Server [%LaunchServer%]

if not exist "%ExternalDir%" mkdir "%ExternalDir%"
if %LaunchDatabase%==1 call :ensure-mongodb
if %LaunchServer%==1 call :ensure-nodejs
call :ensure-windows-terminal
if %LaunchServer%==1 call :ensure-git
if %LaunchServer%==1 call :ensure-server
if %LaunchServer%==1 call :ensure-extras
if %LaunchIrc%==1 call :ensure-irc

if %LaunchServer%==1 (
    pushd "%ServerDir%"
    call npm install --omit=dev
    call :assert "Failed to install Node.js dependencies."
    call npm run build
    call :assert "Failed to build the server."
    popd
)


if not exist "%ExternalDir%\IRC\warframe-irc-server.exe" (
    set LaunchIrc=0
)

set WT_CMD_SERVER=nt --title "Main Server" -d "%ServerDir%" "%ExternalDir%\nodejs\npm.cmd" run start %ARG[server-options]%
set WT_CMD_DATABASE=nt --title "Database" -d "%ExternalDir%" "%ExternalDir%\mongodb\bin\mongod" --dbpath "%DatabasePath%" %ARG[db-options]%
set WT_CMD_IRC=nt --title "IRC" -d "%ExternalDir%\IRC" "%ExternalDir%\IRC\warframe-irc-server.exe" %ARG[irc-options]%

@REM Maybe use docker-compose instead?

set "WT_CMD="
if %LaunchServer%==1 set "WT_CMD=%WT_CMD% ; %WT_CMD_SERVER%"
if %LaunchDatabase%==1 (
    if not exist "%DatabasePath%" (
        mkdir "%DatabasePath%"
        call :assert "Failed to create MongoDB data directory %DatabasePath%"
    )
    set "WT_CMD=%WT_CMD% ; %WT_CMD_DATABASE%"
)
if %LaunchIrc%==1 set "WT_CMD=%WT_CMD% ; %WT_CMD_IRC%"
if "!WT_CMD:~0,2!"==" ;" set "WT_CMD=!WT_CMD:~2!"
if "!WT_CMD!"=="" (
    echo No servers to launch.
) else (
    start "OpenWf Server" %ExternalDir%\WindowsTerminal\wt.exe %WT_CMD%
    call :assert "Failed to start the server in Windows Terminal."
    exit /b 0
)

:end
ENDLOCAL
pause
exit %gErrorLevel%
