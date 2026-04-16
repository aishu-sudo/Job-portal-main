@echo off
echo ============================================
echo  Oracle XE Connection Fix - Run as Admin
echo ============================================

REM Set USE_SHARED_SOCKET for Oracle (fixes ORA-12518 on Windows)
echo Setting USE_SHARED_SOCKET=TRUE...
reg add "HKLM\SOFTWARE\ORACLE\KEY_OraDB21Home2" /v USE_SHARED_SOCKET /t REG_SZ /d TRUE /f
reg add "HKLM\SOFTWARE\ORACLE\KEY_OraDB21Home1" /v USE_SHARED_SOCKET /t REG_SZ /d TRUE /f

REM Add Windows Firewall rule to allow Oracle
echo Adding firewall rule for Oracle...
netsh advfirewall firewall delete rule name="Oracle XE" >nul 2>&1
netsh advfirewall firewall add rule name="Oracle XE" dir=in action=allow program="D:\oracle\dbhomeXE\bin\oracle.exe" enable=yes
netsh advfirewall firewall add rule name="Oracle Listener 1521" dir=in action=allow protocol=TCP localport=1521 enable=yes

REM Restart the Oracle Listener
echo Restarting Oracle listener...
net stop OracleOraDB21Home2TNSListener
net start OracleOraDB21Home2TNSListener

echo.
echo Done! Now try connecting again.
echo Test: cd server ^&^& node server.js
pause
