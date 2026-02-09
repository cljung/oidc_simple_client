function onPkce() {
	config = JSON.parse(window.localStorage.getItem('config' ));
	config.PKCE = document.getElementById("pkce").checked;
	if ( config.PKCE == true ) {
		document.getElementById("ropc").checked = false;
		var response_type = document.getElementById("response_type").value;
		if ( response_type.indexOf("code") == -1) {
			config.response_type = "code " + response_type;
			document.getElementById('response_type').value = config.response_type;
			alert( "PKCE is an Auth Code flow and requires 'code' in response_type");
		}
	}
	window.localStorage.setItem('config', JSON.stringify(config) );
}  
function onRopc() {
	config = JSON.parse(window.localStorage.getItem('config' ));
	config.ROPC = document.getElementById("ropc").checked;
	if ( config.ROPC == true ) {
		document.getElementById("pkce").checked = false;
		config.response_type = "token id_token";
		document.getElementById('response_type').value = config.response_type;
	}
	window.localStorage.setItem('config', JSON.stringify(config) );
}  
function parseParms(str) {
	var pieces = str.split("&"), data = {}, i, parts;
	// process each query pair
	for (i = 0; i < pieces.length; i++) {
		parts = pieces[i].split("=");
		if (parts.length < 2) {
			parts.push("");
		}
		data[decodeURIComponent(parts[0])] = decodeURIComponent(parts[1]);
	}
	return data;
}

// config that is needed for the IDP. We persist it to browser local storage in index.html so the other pages can use it
var config = {
	client_id: "",
	client_secret: "",
	scope: "openid offline_access {client_id}",
	response_type: "code",
	resource: "",
	response_mode: "query",
	PKCE: false,
	ROPC: false,
	promptLogin: "",
	redirectUrl: document.location.origin + "/index.html",     // index.html will handle redirect back to index_authcode.html
	authorization_endpoint: "", 
	token_endpoint: "", 
	end_session_endpoint: "",
	metadataUrl: "https://login.microsoftonline.com/yourtenant/v2.0/.well-known/openid-configuration"
}

window.onload = function() {
    /*
	document.getElementById('configFile').addEventListener('change', function() {
        console.log('open file...');
		var fr=new FileReader(); 
		fr.onload=function(){ 
			getConfigFromString(fr.result); 
		} 
		fr.readAsText(this.files[0]); 
	})
        */
	// if this is not the first time we hit this page, we have the config in browser local storage
	var data = window.localStorage.getItem('config' );
	if ( data ) {
		loadConfig();
	} else {		
		updateUI();
	}
	// possible redirects. code == auth code flow. hash == implicit grant
	var code = parseParms(document.location.search.substring(1)).code;
	if ( code ) {
		document.location = "/runflow.html" + document.location.search;
	} 
	if ( document.location.hash) {
		document.location = "/runflow.html" + document.location.hash;
	}
	var id_token = parseParms(document.location.search.substring(1)).id_token;
	var access_token = parseParms(document.location.search.substring(1)).access_token;
	if ( id_token || access_token ) {
		document.location = "/runflow.html" + document.location.search;
	} 
}

function updateUI() {
	document.getElementById('client_id').value = config.client_id;
	document.getElementById('client_secret').value = config.client_secret;
	document.getElementById('metadataUrl').value = config.metadataUrl;
	document.getElementById('authorization_endpoint').value = config.authorization_endpoint;
	document.getElementById('end_session_endpoint').value = config.end_session_endpoint;
	document.getElementById('token_endpoint').value = config.token_endpoint;
	if ( config.redirectUrl.startsWith("{{host}}")) {
		config.redirectUrl = config.redirectUrl.replace("{{host}}", document.location.origin);
	}
	document.getElementById('redirectUrl').value = config.redirectUrl;	
	document.getElementById('scope').value = config.scope;	
	document.getElementById('response_type').value = config.response_type;	
	document.getElementById('resource').value = config.resource;	
	document.getElementById('response_mode').value = config.response_mode;	
	document.getElementById("pkce").checked = config.PKCE;
	document.getElementById("ropc").checked = config.ROPC;
	document.getElementById("promptLogin").value = config.promptLogin;
	var urlConfig = window.localStorage.getItem('configUrl' );
	if(urlConfig == undefined && urlConfig == null) {
		urlConfig = document.location.origin + "/config.json"		
	}
	document.getElementById('configUrl').value = urlConfig;
}
function clearUI() {
	document.getElementById('client_id').value = "";
	document.getElementById('client_secret').value = "";
	document.getElementById('metadataUrl').value = "";
	document.getElementById('authorization_endpoint').value = "";
	document.getElementById('end_session_endpoint').value = "";
	document.getElementById('token_endpoint').value = "";
	document.getElementById('redirectUrl').value = document.location.origin + "/index.html";
	document.getElementById('scope').value = "openid offline_access";	
	document.getElementById('response_type').value = "code";		
	document.getElementById('resource').value = "";		
	document.getElementById('response_mode').value = "query";		
	document.getElementById("pkce").checked = false;
	document.getElementById("ropc").checked = false;
	document.getElementById("promptLogin").value = "";
}

function clearConfig() {
	window.localStorage.removeItem('config' );
	window.localStorage.removeItem('configUrl' );
	clearUI();
}
function downloadConfig() {
	config = JSON.parse(window.localStorage.getItem('config' ));
	var fileName = 'config.json';
	var fileToSave = new Blob([JSON.stringify(config,undefined,2)], {
		type: 'application/json',
		name: fileName
	});
	saveAs(fileToSave, fileName);
}
function loadConfig() {
	config = JSON.parse(window.localStorage.getItem('config' ));
	updateUI();
}
function saveConfig() {
	config.client_id = document.getElementById('client_id').value;
	config.client_secret = document.getElementById('client_secret').value;
	config.metadataUrl = document.getElementById('metadataUrl').value;
	config.authorization_endpoint = document.getElementById('authorization_endpoint').value;
	config.token_endpoint = document.getElementById('token_endpoint').value;
	config.end_session_endpoint = document.getElementById('end_session_endpoint').value;
	config.redirectUrl = document.getElementById('redirectUrl').value;	
	config.scope = document.getElementById('scope').value;	
	config.response_type = document.getElementById('response_type').value;	
	config.resource = document.getElementById('resource').value;	
	config.response_mode = document.getElementById('response_mode').value;	
	config.PKCE = document.getElementById("pkce").checked;
	config.ROPC = document.getElementById("ropc").checked;
	config.promptLogin = document.getElementById("promptLogin").value;
	window.localStorage.setItem('config', JSON.stringify(config) );
    console.log(config);
	// if we have a metadataUrl, try go getch its details so we can get authorization/token endpoints
	if ( config.metadataUrl ) {
		loadMetadata(config.metadataUrl );
	}
    console.log(config);
}
function runFlow() {
	saveConfig();
	document.location = "/runflow.html";
}
function loadMetadata(metadataUrl) {
	if ( metadataUrl === undefined || metadataUrl === "") {
		return;
	}
	$.ajax({
		url: metadataUrl,
		type: 'get',
		headers: {
        	'Accept': 'application/json'
    	},
		success: function(response) {
			config = JSON.parse(window.localStorage.getItem('config' ));
			config.authorization_endpoint = response.authorization_endpoint;
			config.token_endpoint = response.token_endpoint;
			config.end_session_endpoint = response.end_session_endpoint;
			window.localStorage.setItem('config', JSON.stringify(config) );
			updateUI();
		},error: function( jqXhr, textStatus, errorThrown ){
			console.log( jqXhr );
		}
	});	
}

function loadConfigFromSource() {
	var urlConfig = document.getElementById('configUrl').value;
	if ( urlConfig.startsWith("http") ) {
		getConfigFromUrl(urlConfig);
	} else {
		getConfigFromString(urlConfig);
	}
}

function getConfigFromString(json) {
	config = JSON.parse(json); // this will crash if invalid json so we skip next lines
    config.log(config);
	window.localStorage.setItem('config', JSON.stringify(config) );
	window.localStorage.setItem('configUrl', json );
	updateUI();
	loadMetadata( config.metadataUrl );
}
function getConfigFromUrl(urlConfig) {
	clearUI();
	$.ajax({
        url: urlConfig,
        type: 'get',
		success: function(response) {            
			config = response; 
			window.localStorage.setItem('config', JSON.stringify(config) );
			window.localStorage.setItem('configUrl', urlConfig );
			updateUI();
			loadMetadata( config.metadataUrl );
        },error: function( jqXhr, textStatus, errorThrown ){
			console.log( jqXhr );
        }
	});

}
