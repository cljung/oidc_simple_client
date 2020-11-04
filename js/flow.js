
var usePKCE = false;
var pkceQP = "";
var useROPC = false;
// construct the redirect url to the IDP
function getIdpUrl() {
    var config = JSON.parse(window.localStorage.getItem('config' ));
    //scope = config.scope.replace("{client_id}", config.client_id);
    scope = getScope(config, "GET");
    if ( config.ROPC == true ) {
        return config.token_endpoint;
    } else {
        return config.authorization_endpoint + "?response_type=" + config.response_type + "&response_mode=" + config.response_mode + "&scope=" + scope + "&client_id=" + config.client_id + "&redirect_uri=" + config.redirectUrl;
    }
}

function getScope(config, forMethod) {
    var scope = config.scope.replace("{client_id}", config.client_id);
    var parts = scope.split(" ");
    var index;
    for (index = 0; index < parts.length; ++index) {
        parts[index] = encodeURIComponent(parts[index]);
    }
    if ( forMethod == "POST" )
         scope = parts.join(" ");
    else scope = parts.join("+");
    return scope;
}
// Send the user to the authorize endpoint for login and authorization. 
// It will comback with redirect with 'code' as query param and then we do the 2nd step of the Auth Code flow
function authorize() {
    if ( useROPC ) 
         doROPC();         
    else window.location = document.getElementById('id-auth-link').href;
}

function logout() {
	var config = JSON.parse(window.localStorage.getItem('config' ));
    window.location = config.end_session_endpoint + "?post_logout_redirect_uri=" + config.redirectUrl;
}
function setAuthCodeUrl(url) {
    // display the link we are about to redirect to
    if ( useROPC )
         document.getElementById('id-auth-link').href = "#"; // you can't navigate to ROPC. must be a POST
    else document.getElementById('id-auth-link').href = url;
    document.getElementById('id-auth-link').innerHTML = url;      
}
function setFlowTitle() {
    var title = "";
	var config = JSON.parse(window.localStorage.getItem('config' ));
    usePKCE = config.PKCE;
    useROPC = config.ROPC;
    document.getElementById('ropc-panel').style.display = "none";   
    if ( config.response_type.indexOf("code") >= 0) {
        if ( config.PKCE == true ) {
            title = "Auth Code Flow with PKCE";
        } else {
            title = "Auth Code Flow";
        }
    } else {
        if ( config.ROPC == true ) {
            title = "ROPC Flow";            
            document.getElementById('ropc-panel').style.display = "block";   
            var site = document.location.protocol + "//" + document.location.host;
            document.getElementById("help-msg").innerHTML = "For ROPC, you need to enter userid and password and press the Login button";
            /*
            "<br/><br/>" + 
            "For ROPC to work with Azure AD B2C, you need to add the Chrome extension 'Allow CORS: Access-Control-Allow-Origin' and add <strong>" + site + "</strong> since the B2C response for ROPC will ble blocked by CORS policy." + 
            "<br/>" + 
            "Do not add 'on all sites' in the extension as that would be a security risk.";       
            */
            scope = config.scope.replace("{client_id}", config.client_id);
            document.getElementById('client_id').value = config.client_id;
            document.getElementById('response_type').value = config.response_type;
            document.getElementById('scope').value = scope;                    
        } else {
            title = "Implicit Grant Flow";
        }
    }
    document.title = title;
    document.getElementById('id-h1-title').innerHTML = title; 
}

window.onload = function() {   
    setFlowTitle();
    // clear errmsg
    document.getElementById('error-msg').style.display = "none";    
    // The IDP may have given us an error in the autothize call
    err = getError();    
    if ( err ) {
        uiUpdateError( err.error + " - " + err.error_description );
        return;
    }

    // callback option 1 - redirect with code=X
    // if we have 'code' as a query param, then this is the redirect and we need to redeem the code to get tokens
    var code = parseParms(document.location.search.substring(1)).code;
    url = getIdpUrl();
    setAuthCodeUrl(url);
    if ( code ) {
        document.getElementById('error-msg').style.display = "block";    
        authcodeRedeem( code );
        return;
    } 
    if ( useROPC ) {
        document.getElementById('ropcForm').action = url;
    }
    // callback option 2 - redirect with #access_token= etc
	if ( document.location.hash ) {
        var access_token = getAccessToken();
        var id_token = getIdToken();
        uiUpdateTokens( id_token, access_token);
        return;
    }
        
    // If we are to use PKCE, then generate the verifier and the challange and modify the authorize url
    if ( usePKCE ) {
        var CX1 = new DefaultCrypto();
        var verifier = CX1.generateRandom(64);
        console.log(verifier);
        CX1.deriveChallenge(verifier).then((challange)=>{
            pkceQP = '&code_challenge=' + challange + '&code_challenge_method=S256';
            url += pkceQP;
            setAuthCodeUrl(url);
        });
        window.localStorage.setItem('code_verifier', verifier );            
    } else {
        window.localStorage.removeItem('code_verifier' ); // remove verifier as this is the signal in the token call to use PKCE
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

function uiUpdateTokens( id_token, access_token, refresh_token ) {
    document.getElementById('un-authenticated-msg').style.display = "none";
    document.getElementById('authenticated-msg').style.display = "block";
    if (id_token) {
        var linkJwt = "<a href=\"https://jwt.ms#id_token=" + id_token + "\" target=\"_blank\">" + id_token + "</a>";
        document.getElementById('id-token-msg').innerHTML = "<h2>Id Token</h2>" + linkJwt;
        document.getElementById('id-token-msg').style.display = "block";
    } else {
        document.getElementById('id-token-msg').style.display = "none";
    }
    if (access_token) {
        var linkJwt = "<a href=\"https://jwt.ms#access_token=" + access_token + "\" target=\"_blank\">" + access_token + "</a>";
        document.getElementById('access-token-msg').innerHTML = "<h2>Access Token</h2>" + linkJwt;
        document.getElementById('access-token-msg').style.display = "block";
    } else {
        document.getElementById('access-token-msg').style.display = "none";
    }        
    if (refresh_token) {
        var btnRefresh = "<button type=\"button\" id=\"idRefreshToken\" onclick=\"refresAccessToken('" + refresh_token + "')\">refresh Token</button>";
        document.getElementById('refresh-token-msg').innerHTML = "<h2>Refresh Token</h2>" + "<p>" + refresh_token + "<br/><br/>" + btnRefresh + "</p>";
        document.getElementById('refresh-token-msg').style.display = "block";
    } else {
        document.getElementById('refresh-token-msg').style.display = "none";
    }        
}
function uiUpdateError( error_message ) {
    if ( error_message ) {
        document.getElementById('error-msg').innerHTML = "<h2 style=\"color: red;\">ERROR:</h2>" + error_message;
        document.getElementById('error-msg').style.display = "block";    
    } else {
        document.getElementById('error-msg').style.display = "none";            
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
        cache: false,
        data: postData, //'grant_type=authorization_code&client_id=' + config.client_id + '&client_secret=' + config.client_secret + '&redirect_uri=' + config.redirectUrl + '&code=' + code,
        contentType: 'application/x-www-form-urlencoded',
		success: function(response) {      
            //console.log(response);      
            //var data = (JSON.stringify(response, null, 2));
            uiUpdateTokens( response.id_token, response.access_token, response.refresh_token);
        },error: function( jqXhr, textStatus, errorThrown ){
            uiUpdateError( jqXhr.responseText );
        }
	});
}

function doROPC() {
    document.getElementById("ropcForm").submit();
    return;

    var config = JSON.parse(window.localStorage.getItem('config' ));    
    var uid = document.getElementById('username').value;	
    var pwd = document.getElementById('password').value;	
    scope = config.scope.replace("{client_id}", config.client_id);
    var postData = 'username=' + uid + '&password=' + pwd + '&grant_type=password&client_id=' + config.client_id + '&response_type=' + config.response_type + '&scope=' + scope;
	$.ajax({
        url: config.token_endpoint,
        type: 'post',
        data: postData, 
        cache: false,
        contentType: 'application/x-www-form-urlencoded',
        crossDomain: true,
		success: function(response) {      
            console.log(response);      
            //var data = (JSON.stringify(response, null, 2));
            uiUpdateTokens( response.id_token, response.access_token, response.refresh_token);
        },error: function( jqXhr, textStatus, errorThrown ){
            uiUpdateError( jqXhr.responseText );
        }
    });

}

// make a HTTP POST call to the token endpoint and redeem the code
function refresAccessToken(refreshToken) {
    var config = JSON.parse(window.localStorage.getItem('config' ));
    var scope = getScope(config, "POST");
    var postData = 'grant_type=refresh_token&client_id=' + config.client_id + "&scope=" + scope + /*'&redirect_uri=' + config.redirectUrl +*/ '&refresh_token=' + refreshToken;
	$.ajax({
        url: config.token_endpoint,
        type: 'post',
        cache: false,
        data: postData, 
        contentType: 'application/x-www-form-urlencoded;charset=utf-8',
		success: function(response) {      
            console.log(response);      
            //var data = (JSON.stringify(response, null, 2));
            uiUpdateTokens( response.id_token, response.access_token, response.refresh_token);
        },error: function( jqXhr, textStatus, errorThrown ){
            uiUpdateError( jqXhr.responseText );
        }
	});
}
