# remember to run "npm install" to get all modules
$MY_PORT=3000
node server.js -p $MY_PORT

write-host "http://localhost:$MY_PORT/index.html"