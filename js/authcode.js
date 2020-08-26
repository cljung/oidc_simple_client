
var settings = {
    scopes: 'openid%20offline_access%20',                       // client_id added before call
    response_type: "code",
}

//var usePKCE = false;

// construct the redirect url to the IDP
function getIdpUrl() {
	var config = JSON.parse(window.localStorage.getItem('config' ));
	var scope = settings.scopes + config.extraScopes;
	scope = scope.replace("{client_id}", config.client_id);
    return config.authorization_endpoint + "?response_type=" + settings.response_type + "&scope=" + scope + "&client_id=" + config.client_id + "&redirect_uri=" + config.redirectUrl;
}
// Send the user to the authorize endpoint for login and authorization. 
// It will comback with redirect with 'code' as query param and then we do the 2nd step of the Auth Code flow
function authorize() {
    window.location = document.getElementById('id-auth-link').href;
}

function logout() {
	var config = JSON.parse(window.localStorage.getItem('config' ));
    window.location = config.end_session_endpoint + "?post_logout_redirect_uri=" + config.redirectUrl;
}
function setAuthCodeUrl(url) {
	// display the link we are about to redirect to
    document.getElementById('id-auth-link').href = url;
    document.getElementById('id-auth-link').innerHTML = url;      
}
window.onload = function() {   
    var usePKCE = false;
    if ( parseParms(document.location.search.substring(1)).usePKCE === "true" ) {
        usePKCE = true;
        document.title += " with PKCE";
        document.getElementById('id-h1-title').innerHTML = "Auth Code Flow with PKCE login"; 
    } 
    // if we have 'code' as a query param, then this is the redirect and we need to redeem the code to get tokens
    var code = parseParms(document.location.search.substring(1)).code;
    url = getIdpUrl();
    setAuthCodeUrl(url);
    if ( code ) {
        document.getElementById('error-msg').style.display = "block";    
        authcodeRedeem( code );
    } else {
        // If we are to use PKCE, then generate the verifier and the challange and modify the authorize url
        if ( usePKCE ) {
            var CX1 = new DefaultCrypto();
            var verifier = CX1.generateRandom(64);
            console.log(verifier);
            CX1.deriveChallenge(verifier).then((challange)=>{
                url += '&code_challenge=' + challange + '&code_challenge_method=S256';
                setAuthCodeUrl(url);
            });
            window.localStorage.setItem('code_verifier', verifier );            
        } else {
            window.localStorage.removeItem('code_verifier' ); // remove verifier as this is the signal in the token call to use PKCE
        }
    }
    // The IDP may have given us an error in the autothize call
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

function getError() {
	//substring(1) to remove the '#'
    hash = parseParms(document.location.hash.substring(1));
    if ( hash.error ) {
        return hash;
    } else {
        return null;
    }
}

// make a HTTP POST call to the token endpoint and redeem the code
function authcodeRedeem(code) {
    var config = JSON.parse(window.localStorage.getItem('config' ));
    var postData = 'grant_type=authorization_code&client_id=' + config.client_id + '&redirect_uri=' + config.redirectUrl + '&code=' + code;
    // if to use PKCE, then add the verifier, else add the client_secret
    var verifier = window.localStorage.getItem('code_verifier' );
    if(verifier !== undefined && verifier !== null){
        postData += '&code_verifier=' + verifier;
        window.localStorage.removeItem('code_verifier' );
    } else {
        postData += '&client_secret=' + config.client_secret;
    }
	$.ajax({
        url: config.token_endpoint,
        type: 'post',
        data: postData, //'grant_type=authorization_code&client_id=' + config.client_id + '&client_secret=' + config.client_secret + '&redirect_uri=' + config.redirectUrl + '&code=' + code,
        contentType: 'application/x-www-form-urlencoded',
		success: function(response) {            
            document.getElementById('un-authenticated-msg').style.display = "none";
            document.getElementById('authenticated-msg').style.display = "block";
			var data = (JSON.stringify(response, null, 2));
            if (response.id_token) {
                var linkJwt = "<a href=\"https://jwt.ms#id_token=" + response.id_token + "\" target=\"_blank\">" + response.id_token + "</a>";
                document.getElementById('id-token-msg').innerHTML = "<h2>Id Token</h2>" + linkJwt;
                document.getElementById('id-token-msg').style.display = "block";
            } else {
                document.getElementById('id-token-msg').style.display = "none";
            }
            if (response.access_token) {
                var linkJwt = "<a href=\"https://jwt.ms#access_token=" + response.access_token + "\" target=\"_blank\">" + response.access_token + "</a>";
                document.getElementById('access-token-msg').innerHTML = "<h2>Access Token</h2>" + linkJwt;
                document.getElementById('access-token-msg').style.display = "block";
            } else {
                document.getElementById('access-token-msg').style.display = "none";
            }        
        },error: function( jqXhr, textStatus, errorThrown ){
            document.getElementById('error-msg').innerHTML = "<h2 style=\"color: red;\">ERROR:</h2>" + jqXhr.responseText;
            document.getElementById('error-msg').style.display = "block";    
        }
	});
}
