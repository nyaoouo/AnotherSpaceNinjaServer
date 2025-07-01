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

:ensure-mongodb-tools
SETLOCAL EnableDelayedExpansion
set "archivePath=%ExternalDir%\.tmp\mongodb-tools.zip"
set "dir=%ExternalDir%\mongodb-tools"
set "expectDir=%ExternalDir%\mongodb-database-tools-windows-x86_64-100.12.2"
set "dlLink=https://fastdl.mongodb.org/tools/db/mongodb-database-tools-windows-x86_64-100.12.2.zip"

if not exist "%dir%" (
    if not exist "%archivePath%" (
        echo Downloading MongoDB tools...
        call :download "%dlLink%" "%archivePath%"
    )
    call :unzip "%archivePath%" "%ExternalDir%"
    if exist "%expectDir%" (
        move /Y "%expectDir%" "%dir%"
    ) else (
        call :raise "Expected directory %expectDir% does not exist after unzipping."
    )
)
if not exist "%dir%\bin\mongodump.exe" (
    call :raise "mongodump executable not found in %dir%\bin."
)
if not exist "%dir%\bin\mongorestore.exe" (
    call :raise "mongorestore executable not found in %dir%\bin."
)
echo MongoDB tools are available at %dir%
ENDLOCAL
exit /b 0

:ensure-mongosh
SETLOCAL EnableDelayedExpansion
set "archivePath=%ExternalDir%\.tmp\mongosh.zip"
set "dir=%ExternalDir%\mongosh"
set "expectDir=%ExternalDir%\mongosh-2.5.2-win32-x64"
set "dlLink=https://downloads.mongodb.com/compass/mongosh-2.5.2-win32-x64.zip"

if not exist "%dir%" (
    if not exist "%archivePath%" (
        echo Downloading mongosh...
        call :download "%dlLink%" "%archivePath%"
    )
    call :unzip "%archivePath%" "%ExternalDir%"
    if exist "%expectDir%" (
        move /Y "%expectDir%" "%dir%"
    ) else (
        call :raise "Expected directory %expectDir% does not exist after unzipping."
    )
)
if not exist "%dir%\bin\mongosh.exe" (
    call :raise "mongosh executable not found in %dir%\bin."
)
echo mongosh is available at %dir%
ENDLOCAL
exit /b 0

:do-backup
SETLOCAL EnableDelayedExpansion
set "FILE_NAME=%date:~-4,4%-%date:~-10,2%-%date:~-7,2%_%time:~0,2%-%time:~3,2%-%time:~6,2%.gz"
set "FILE_NAME=%FILE_NAME: =0%"
if not exist "%BackupDir%" (
    mkdir "%BackupDir%"
    call :assert "Failed to create backup directory %BackupDir%"
)
"%ExternalDir%\mongodb-tools\bin\mongodump.exe" --uri="%MongodbUri%" --gzip --archive="%BackupDir%\%FILE_NAME%" >> "%LOG_FILE%" 2>&1
call :assert "Error during MongoDB dump. Check %LOG_FILE% for details."
echo Backup completed successfully. Archive saved as %FILE_NAME%.
ENDLOCAL
exit /b 0

:do-restore
"%ExternalDir%\mongosh\bin\mongosh.exe" --quiet --eval "db.dropDatabase();" "%MongodbUri%" >> "%LOG_FILE%" 2>&1
call :assert "Error during MongoDB collection clearing. Check %LOG_FILE% for details."
"%ExternalDir%\mongodb-tools\bin\mongorestore.exe" --uri="%MongodbUri%" --gzip --archive="%RESTORE_ARCHIVE%" >> "%LOG_FILE%" 2>&1
call :assert "Error during MongoDB restore from %RESTORE_ARCHIVE%. Check %LOG_FILE% for details."
echo "%ExternalDir%\mongodb-tools\bin\mongorestore.exe" --uri="%MongodbUri%" --gzip --archive="%RESTORE_ARCHIVE%"
echo Restore completed successfully from %RESTORE_ARCHIVE%.
exit /b 0


:main
set gErrorLevel=0
call :parseArgs %*
echo Usage: %0 [options] [backup-archive(optional)]
echo Options:
echo   -externalDir [path]  Set the external directory (default: current script directory\external)
echo   -backupDir [path]    Set the backup directory (default: current script directory\backup)
echo   -mongodbUri [uri]  Set the MongoDB URI (default: mongodb://127.0.0.1:27017/openWF)
echo ============================================================

if defined ARG[externalDir] set "ExternalDir=%ARG[externalDir]%"
if defined ARG[backupDir] set "BackupDir=%ARG[backupDir]%"
if defined ARG[mongodbUri] set "MongodbUri=%ARG[mongodbUri]%"
if not defined ExternalDir set "ExternalDir=%~dp0\external"
if not defined BackupDir set "BackupDir=%~dp0\backup"
if not defined MongodbUri set "MongodbUri=mongodb://127.0.0.1:27017/openWF"

call :resolve_path "%ExternalDir%" "ExternalDir"
call :resolve_path "%BackupDir%" "BackupDir"

set "LOG_FILE=%BackupDir%\.backup_log.txt"
set "RESTORE_ARCHIVE=%ARG[0]%"

echo External Directory: %ExternalDir%
echo Backup Directory: %BackupDir%
echo MongoDB URI: %MongodbUri%

call :ensure-mongodb-tools
call :ensure-mongosh

if not exist "%BackupDir%" (
    mkdir "%BackupDir%"
    call :assert "Failed to create backup directory %BackupDir%"
)


call :do-backup
if exist "%RESTORE_ARCHIVE%" (
    call :do-restore
) else (
    echo No restore archive specified or file does not exist: %RESTORE_ARCHIVE%
)

:end
ENDLOCAL
pause
exit %gErrorLevel%