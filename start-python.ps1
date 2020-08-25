$MY_PORT=3000
python -m http.server $MY_PORT

write-host "http://localhost:$MY_PORT/index.html"