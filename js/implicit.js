
var settings = {
    scopes: 'openid%20',                       					// client_id added before call
    response_type: "id_token%20token",
}

// construct the redirect url to the IDP
function getIdpUrl() {
	var config = JSON.parse(window.localStorage.getItem('config' ));
	var scope = settings.scopes + config.extraScopes;
	scope = scope.replace("{client_id}", config.client_id);
	return config.authorization_endpoint + "?response_type=" + settings.response_type + "&scope=" + scope + "&client_id=" + config.client_id + "&redirect_uri=" + config.redirectUrl;
}
// Send the user to the authorize endpoint for login and authorization
function authorize() {
	window.location = document.getElementById('id-auth-link').href;
}
function logout() {
	var config = JSON.parse(window.localStorage.getItem('config' ));
    window.location = config.end_session_endpoint + "?post_logout_redirect_uri=" + config.redirectUrl;
}

window.onload = function() {
	url = getIdpUrl();
	// display the link we are about to redirect to
    document.getElementById('id-auth-link').href = url;
    document.getElementById('id-auth-link').innerHTML = url;        
    // Try to get the token from the URL. It will be there on the redirect from the IDP
	accessToken = getAccessToken();
	idToken = getIdToken();
	if (idToken) {
		document.getElementById('authenticated-msg').style.display = "block";
        var linkJwt = "<a href=\"https://jwt.ms#id_token=" + idToken + "\" target=\"_blank\">" + idToken + "</a>";
		document.getElementById('id-token-msg').innerHTML = "<h2>Id Token</h2>" + linkJwt;
		document.getElementById('id-token-msg').style.display = "block";
    } else {
        document.getElementById('id-token-msg').style.display = "none";
    }
	if (accessToken) {
        var linkJwt = "<a href=\"https://jwt.ms#access_token=" + accessToken + "\" target=\"_blank\">" + accessToken + "</a>";
		document.getElementById('access-token-msg').innerHTML = "<h2>Access Token</h2>" + linkJwt;
		document.getElementById('access-token-msg').style.display = "block";
    } else {
        document.getElementById('access-token-msg').style.display = "none";
    }
	// IDP may have given us an error
    err = getError();
    if ( err ) {
        document.getElementById('error-msg').innerHTML = "<h2 style=\"color: red;\">ERROR:</h2>" + err.error + "<br/></br>" + err.error_description;
        document.getElementById('error-msg').style.display = "block";    
    } else {
        document.getElementById('error-msg').style.display = "none";    
    }
}

// Parses the URL parameters and returns an object
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

function getIdToken() {
	//substring(1) to remove the '#'
	hash = parseParms(document.location.hash.substring(1));
	return hash.id_token;
}
function getAccessToken() {
	//substring(1) to remove the '#'
	hash = parseParms(document.location.hash.substring(1));
	return hash.access_token;
}

function getError() {
	//substring(1) to remove the '#'
    hash = parseParms(document.location.hash.substring(1));
    if ( hash.error ) {
        return hash;
    } else {
        return null;
    }
}
