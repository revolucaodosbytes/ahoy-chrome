
var Ahoy = function() {
	/**
	 * DEFAULTS
	 */
	this.sites_list = ['thepiratebay.org'];
	this.proxy_addr = "162.208.49.45:3127"; //default proxy
	this.webreq_filter_list = [];
	this.webnav_filter_list = [];

	// Update the info with the latest content from the Local Storage
	chrome.storage.sync.get( [ "sites_list", "proxy_addr" ],function( result) {
		if (result.sites_list !== undefined)
			this.sites_list = result.sites_list;

		if (result.proxy_addr !== undefined)
			this.proxy_addr = result.proxy_addr;

		// Init callbacks
		this.init_callbacks();
		this.init_events();

	}.bind(this));
	//END OF TODO

	chrome.runtime.onInstalled.addListener( this.after_update.bind(this) );
};


Ahoy.prototype.update_proxy_settings = function () {

	// Mudar o proxy
	var config = {
	    mode: 'pac_script',
	    pacScript: {
	      data: this.generate_pac()
	    }
	  };
	  
	// Describes the current proxy setting being used.
	var proxySettings = {
		'value': config,
		'scope': 'regular'
	};

	// Setup new settings for the appropriate window.

	// Make sure that the PAC settings are applied with a small delay
	sleep(100);
	console.log("Applying proxy settings");
	chrome.proxy.settings.set(proxySettings, function() {} );

};

Ahoy.prototype.generate_pac = function () {
	var pac = 	"function FindProxyForURL(url, host) {\n";
	for( var siteid in this.sites_list ) {
		var site = this.sites_list[siteid];
		 pac += "  if (host == '" + site + "' || host == 'www." + site + "')\n" +
         		"    return 'PROXY " + this.proxy_addr + "';\n";
		//console.log(site);
	}
    pac += 	"  return 'DIRECT';\n" +
   			"}";
   	return pac;
};

Ahoy.prototype.update_site_list = function () { 

	var xhr = new XMLHttpRequest();
	xhr.open("GET", "http://46.101.76.116/api/sites" );
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

Ahoy.prototype.update_proxy = function () { 

	var xhr = new XMLHttpRequest();
	xhr.open("GET", "http://46.101.76.116/api/getProxy" );
	xhr.onreadystatechange = function() {
	  if (xhr.readyState == 4) {
	 	console.log("Got a new Proxy.");
	    // JSON.parse does not evaluate the attacker's scripts.
	    var resp = JSON.parse(xhr.responseText);
	    var server = resp.host + ":" + resp.port;

	    // Dispatch the event
	    document.dispatchEvent( new CustomEvent( "onProxyUpdated", { 
	    	'detail': { 
	    		proxy_addr: server
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
	// Check if the callbacks filters have been generated
	if( this.webreq_filter_list.length === 0 || this.webnav_filter_list.length === 0) {
		this.setup_callback_filters();
	}

	chrome.webRequest.onBeforeRequest.addListener(
		this.proxy_turn_on_webrequest.bind(this),
        {urls: this.webreq_filter_list},
        ["blocking"]
	);

	chrome.webNavigation.onCompleted.addListener( this.restore_pac.bind(this), {url: this.webnav_filter_list} );
	chrome.webNavigation.onErrorOccurred.addListener( this.restore_pac.bind(this), {url: this.webnav_filter_list} );
	chrome.webRequest.onErrorOccurred.addListener( this.change_proxy_if_connection_fails.bind(this), {urls: this.webreq_filter_list } );

	// Stats
	chrome.webNavigation.onBeforeNavigate.addListener( this.send_hostname, {url: this.webnav_filter_list } );

};

Ahoy.prototype.update_callbacks = function() {

	// Remove all the callbacks
	console.log("Updating old callbacks...");

	chrome.webRequest.onBeforeRequest.removeListener(this.proxy_turn_on_webrequest);
	chrome.webNavigation.onCompleted.removeListener(this.restore_pac);
	chrome.webNavigation.onErrorOccurred.removeListener(this.restore_pac);
	chrome.webRequest.onErrorOccurred.removeListener(this.change_proxy_if_connection_fails);

	// Stats
	chrome.webNavigation.onBeforeNavigate.removeListener(this.send_hostname);

	// Recreate new callbacks
	this.init_callbacks();

}

Ahoy.prototype.proxy_turn_on_webrequest = function(details) {
	// Turn the page option on
	if ( -1 !== details.tabId )
		chrome.pageAction.show( details.tabId );

	// Update the proxy settings
	this.update_proxy_settings();
};

/**
 * Retore PAC callback
 */
Ahoy.prototype.restore_pac = function( details ) {
	// Make sure that the PAC settings are applied with a small delay
	setTimeout( function() {
		console.log( "Reverting proxy settings");
		chrome.proxy.settings.clear( { scope: 'regular' } );
	}, 2000 );
};

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
};



/**
 * Stats functions
 */
Ahoy.prototype.send_hostname = function ( details ) {
	var parser = document.createElement('a');
	parser.href = details.url;
	var hostname = parser.hostname.replace("www.","");

	var xhr = new XMLHttpRequest();
	xhr.open("GET", "http://46.101.76.116/api/stats/host/" + hostname);
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
	chrome.storage.sync.set( { "proxy_addr": e.detail.proxy_addr } );

};

Ahoy.prototype.event_sites_updated = function( e ) {
	console.log("[EVENT] Sites list updated. Total size: " + e.detail.sites.length);

    // Update the local storage
    chrome.storage.sync.set( { "sites_list": e.detail.sites } );
    this.sites_list = e.detail.sites;

    // Setup the callback filters
    this.setup_callback_filters();

  	// Update the old callbacks
  	this.update_callbacks();

};

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



