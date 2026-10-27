@echo off
rem Run daily by Windows Task Scheduler: add the last 2 days of news to data\news.json, drop news older than 30 days.
cd /d "%~dp0.."
echo ==== %date% %time% >> logs\news.log
call npm run news -- 2 >> logs\news.log 2>&1
