
var Ahoy = function() {
	/**
	 * CONFIGS
	 */
	this.api_url = "https://ahoy-api.revolucaodosbytes.pt";
	//this.api_url = "http://ahoy.app:8000";

	/**
	 * DEFAULTS
	 */
	this.sites_list = ['thepiratebay.org'];
	this.proxy_addr = "proxy1.ahoy.pro:3127"; //default proxy
	this.webreq_filter_list = [];
	this.webnav_filter_list = [];
	this.disabled = false;

	this.last_request_redirected = false;

	// Update the info with the latest content from the Local Storage
	chrome.storage.local.get( [ "sites_list", "proxy_addr", "disabled" ],function( result) {
		if (result.sites_list !== undefined)
			this.sites_list = result.sites_list;

		if (result.proxy_addr !== undefined)
			this.proxy_addr = result.proxy_addr;

		if (result.disabled !== undefined )
			this.disabled = result.disabled;

		this.enable_proxy();

		if( this.disabled ) {
			this.disable();
		} else {
			this.enable();
		}

		// Init
		this.init_events();

	}.bind(this));
	//END OF TODO

	chrome.runtime.onInstalled.addListener( this.after_update.bind(this) );
};

Ahoy.prototype.disable = function() {
	this.disabled = true;
	chrome.storage.local.set( { "disabled": true } );

	// Set disabled popup
	chrome.browserAction.setPopup({popup: "views/disabled.html"});
	if( getPopup() != undefined )
		getPopup().location.href = "disabled.html";

	this.disable_proxy() // Disable the pac file

};

Ahoy.prototype.enable = function() {
	this.disabled = false;
	chrome.storage.local.set( { "disabled": false } );
	
	// Set enabled popup
	chrome.browserAction.setPopup({popup: "views/popup.html"});
	if( getPopup() != undefined )
		getPopup().location.href = "popup.html";

	this.update_callbacks();

	this.enable_proxy();
};


Ahoy.prototype.enable_proxy = function () {

	// Mudar o proxy
	var config = {
	    mode: 'pac_script',
	    pacScript: {
	      url: this.api_url + "/api/pac?proxy_addr="+this.proxy_addr,
	      mandatory: true
	    }
	  };
	  
	// Describes the current proxy setting being used.
	var proxySettings = {
		'value': config,
		'scope': 'regular'
	};

	// Setup new settings for the appropriate window.
	console.log("Applying proxy settings for " + this.proxy_addr);
	chrome.proxy.settings.set(proxySettings);

};

/**
 * Retore PAC callback
 */
Ahoy.prototype.disable_proxy = function( ) {

	console.log( "Reverting proxy settings");
	chrome.proxy.settings.clear( { scope: 'regular' } );

};

//TODO: Remove?
Ahoy.prototype.fix_index_html_after_proxied = function(sender) {

	if( this.disabled )
		return;

	if ( sender.url.indexOf("index.html") === -1 )
		return;

	console.log("Detecting a index.html page - " + sender.url +  " -, redirecting to the non index.html");
	return {redirectUrl: sender.url.replace("index.html", "") };
};

Ahoy.prototype.update_site_list = function () { 

	var xhr = new XMLHttpRequest();
	xhr.open("GET", this.api_url + "/api/sites" );
	xhr.onreadystatechange = function() {
	  if (xhr.readyState == 4) {
	 	console.log("Site list sucessfully retrived.");
	    // JSON.parse does not evaluate the attacker's scripts.
	    var resp = JSON.parse(xhr.responseText);

	    // Dispatch the event
		document.dispatchEvent( new CustomEvent( "onSitesUpdated", { 
			'detail': { 
				sites: resp
			},
		}));
	  }
	}.bind(this);
	xhr.send();

};

Ahoy.prototype.update_proxy = function ( forceReload ) { 

	var xhr = new XMLHttpRequest();
	xhr.open("GET", this.api_url + "/api/getProxy" );
	xhr.onreadystatechange = function() {
	  if (xhr.readyState == 4) {
	 	console.log("Got a new Proxy.");
	    // JSON.parse does not evaluate the attacker's scripts.
	    var resp = JSON.parse(xhr.responseText);
	    var server = resp.host + ":" + resp.port;

	    // Dispatch the event
	    document.dispatchEvent( new CustomEvent( "onProxyUpdated", { 
	    	'detail': { 
	    		proxy_addr: server,
	    		forceReload: forceReload
	    	},
	    }));

	  }
	}.bind(this);
	xhr.send();

};

/**
 * Callbacks
 */

Ahoy.prototype.init_callbacks = function( ) {

	console.log("Initializing callbacks");
	
	// Setup the handler variables
	this.fix_index_html_after_proxied_handler = this.fix_index_html_after_proxied.bind(this); 
	this.change_proxy_if_connection_fails_handler = this.change_proxy_if_connection_fails.bind(this);
	this.send_hostname_handler = this.send_hostname.bind(this);
	this.check_for_blocked_site_handler = this.check_for_blocked_site.bind(this);
	this.update_browse_action_icon_handler = this.update_browse_action_icon.bind(this);
	this.check_for_blocked_redirected_site_handler = this.check_for_blocked_redirected_site.bind(this);

	// Setup the callback filters
	this.setup_callback_filters();

	chrome.webRequest.onBeforeRequest.addListener( this.fix_index_html_after_proxied_handler, 
		{urls: this.webreq_filter_list},
        ["blocking"]
    );

	chrome.tabs.onUpdated.addListener( this.update_browse_action_icon_handler );

	chrome.webRequest.onErrorOccurred.addListener( this.change_proxy_if_connection_fails_handler, {urls: this.webreq_filter_list } );

	chrome.webRequest.onResponseStarted.addListener( this.check_for_blocked_site_handler , {urls: ["<all_urls>"]} );
	chrome.webRequest.onBeforeRedirect.addListener( this.check_for_blocked_redirected_site_handler , {urls: ["<all_urls>"]} );

	// Stats
	chrome.webNavigation.onCompleted.addListener( this.send_hostname_handler, {url: this.webnav_filter_list } );

};

Ahoy.prototype.update_callbacks = function() {

	// Remove all the callbacks
	console.log("Updating old callbacks...");

	chrome.webRequest.onBeforeRequest.removeListener(this.fix_index_html_after_proxied_handler);

	chrome.tabs.onUpdated.removeListener(this.update_browse_action_icon_handler);

	chrome.webRequest.onErrorOccurred.removeListener(this.change_proxy_if_connection_fails_handler);
	chrome.webRequest.onResponseStarted.removeListener(this.check_for_blocked_site_handler);
	chrome.webRequest.onBeforeRedirect.removeListener(this.check_for_blocked_redirected_site_handler);

	// Stats
	chrome.webNavigation.onCompleted.removeListener(this.send_hostname_handler);

	// Recreate new callbacks
	this.init_callbacks();

}

Ahoy.prototype.update_browse_action_icon = function(tabid, changeInfo, tab) {

	if( tab.url == undefined ) {
		return;
	}

	if ( ! this.is_url_in_list( tab.url ) ) {
		return;
	}
	// Turn the icon red for this tab
	chrome.browserAction.setIcon({
		path: {
				"38":  "icons/color/38x38.png",
			},
			tabId: tabid,
	});
	
}


/**
 * If the connection fails, for exemple, dead proxy, get a new one
 */
Ahoy.prototype.change_proxy_if_connection_fails = function ( details ) {
	if ( details.error == "net::ERR_PROXY_CONNECTION_FAILED" ) {
		this.update_proxy();
	}
};

Ahoy.prototype.after_update = function( details ) {
	// Make sure the plugins fetch for new information when it's installed/updated
	this.update_site_list();
	this.update_proxy();
	console.log(details);

	var last_version = parseVersionString(details.previousVersion);
	var current_version = parseVersionString(chrome.app.getDetails().version);


	if( last_version.major != current_version.major 
		|| last_version.minor != current_version.minor 
		|| details.reason === "install" ) {
		chrome.tabs.create({'url': chrome.extension.getURL('views/release_notes.html'), 'selected': true});
	}

};



/**
 * Stats functions
 */
Ahoy.prototype.send_hostname = function ( details ) {

	if( this.disabled )
		return;

	var parser = document.createElement('a');
	parser.href = details.url;
	var hostname = parser.hostname.replace("www.","");

	var xhr = new XMLHttpRequest();
	xhr.open("GET", this.api_url + "/api/stats/host/" + hostname);
	xhr.onreadystatechange = function() {
	  if (xhr.readyState == 4) {
	 	console.log("Stats sent.");
	  }
	}
	xhr.send();
};

Ahoy.prototype.init_events = function() {
	// Proxy Updated event callback
	document.addEventListener("onProxyUpdated", this.event_proxy_updated.bind(this), false);

	// Sites list updated event callback
	document.addEventListener("onSitesUpdated", this.event_sites_updated.bind(this), false);

};

Ahoy.prototype.event_proxy_updated = function( e ) {
	console.log("[EVENT] Proxy updated! New IP = " + e.detail.proxy_addr);

	// Update the fields
 	this.proxy_addr = e.detail.proxy_addr;
	chrome.storage.local.set( { "proxy_addr": e.detail.proxy_addr }, function() {
		// Enable the proxy
		if( ! this.disabled )
			this.enable_proxy();
	}.bind(this) );
  	
};

Ahoy.prototype.event_sites_updated = function( e ) {
	console.log("[EVENT] Sites list updated. Total size: " + e.detail.sites.length);

    // Update the local storage
    chrome.storage.local.set( { "sites_list": e.detail.sites } );

    this.sites_list = e.detail.sites;

  	// Update the old callbacks
  	this.update_callbacks();

};

Ahoy.prototype.check_for_blocked_redirected_site = function( details ) {
	this.check_for_blocked_site(details);
}

Ahoy.prototype.check_for_blocked_site = function( details ) {

	if( this.disabled )
		return;

	// Array with the IP's that the Blocked Page warning usually have.
	var warning_ips = [
		"195.23.113.202", 	// NOS
		"213.13.145.120", 	// MEO
		"212.18.182.164",	// Vodafone
		"212.18.182.197",	// Vodafone
		"213.228.128.216",  // Cabovisao IGAC
		"213.228.128.215"	// Cabovisao SRIJ
	];

	// Just bail if this request comes from a redirection.
	if( this.last_request_redirected === true ) {
		this.last_request_redirected = false;
		return;
	}

	// Ignore all the requests that aren't main
	if( details.type !== 'main_frame' )
		return;

	// Ignore if the IP of the site is not the one from above.
	if( warning_ips.indexOf( details.ip) === -1 )
		return;

	// Make sure we flag this as a redirect, if it's the case
	if( details.redirectUrl !== undefined )
		this.last_request_redirected = true;

	// Send the async request
	var xhr = new XMLHttpRequest();
	var params = "site=" + details.url;
	xhr.open("POST", this.api_url + "/api/report/blocked", true);
	xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
	xhr.onreadystatechange = function() {
	  if (xhr.readyState == 4 && xhr.status == 200) {
	 	console.log("Blocked site reported! " + details.url);
	  } else if ( xhr.status != 200 ) {
	  	console.log("There was an error reporting this Blocked site");
	  }
	}
	xhr.send(params);
}

Ahoy.prototype.setup_callback_filters = function() {
	console.log("Setting up callback filters...");
	// Create the filter to be used in the onBeforeRequest
	this.webreq_filter_list = [];

	for ( var siteid in this.sites_list ) {
		var site = this.sites_list[siteid];
		this.webreq_filter_list.push( "*://" + site + "/*" );
		this.webreq_filter_list.push( "*://*." + site + "/*" );
	}

	// Create the filter to be used in the onComplete and onErrorOccurred listeners
	this.webnav_filter_list = [];

	for ( var siteid in this.sites_list ) {
		var site = this.sites_list[siteid];
		this.webnav_filter_list.push( { "hostContains": site } );
	}
};

Ahoy.prototype.is_url_in_list = function( url ) {

	var parser = document.createElement('a');
	parser.href = url;

	// Get the hostname without www
	var hostname = parser.hostname.replace('www.','');

	for( var site_id in this.sites_list ) {
	    var site = this.sites_list[ site_id ];

	    if ( hostname == site ) {
	        return true;
	    } 
	}

	return false;
}



