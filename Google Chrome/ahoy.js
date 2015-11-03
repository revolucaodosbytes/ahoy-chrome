
var Ahoy = function() {

	/**
	 * DEFAULTS
	 */
	this.sites_list = ['thepiratebay.org'];
	this.proxy_addr = "162.208.49.45:3127"; //default proxy
	this.webreq_filter_list = [];
	this.webnav_filter_list = [];
	

	// Set up the local storage
	this.update_site_list();

	// Get a proxy
	this.update_proxy();

	//TODO: REFACTOR THIS TO USE EVENTS
	//	When there is an proxy updated event, update the variable;
	//	If there is a site list update event, it should update the site list and reload*
	//	all the callbacks;
	//
	//	*removeListener and *addListener
	chrome.storage.sync.get( [ "sites_list", "proxy_addr" ],function( result) {
		this.sites_list = result.sites_list;
		console.log("Aqui");
		this.proxy_addr = result.proxy_addr;

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

		// Init callbacks;
		this.init_callbacks();
		this.init_stats();
		this.init_events();

	}.bind(this));
	//END OF TODO

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
	xhr.open("GET", "http://ahoy.app:8000/api/sites" );
	xhr.onreadystatechange = function() {
	  if (xhr.readyState == 4) {
	 	console.log("Site list sucessfully retrived.");
	    // JSON.parse does not evaluate the attacker's scripts.
	    var resp = JSON.parse(xhr.responseText);

	    // Update the local storage
	    chrome.storage.sync.set( { "sites_list": resp } );
	    this.sites_list = resp;

	    // Dispatch the event
	    //document.dispatchEvent(ahoy.events.sites_updated);
	  }
	}
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
		    //document.dispatchEvent( new CustomEvent("proxy_updated"), { detail: { proxy: server } } );
		    this.proxy_addr = server;
		    console.log("Mudei a variavel proxy" + this.proxy_addr);
		    chrome.storage.sync.set( { "proxy_addr": server } );
		  }
		}.bind(this);
		xhr.send();

};

/**
 * Callbacks
 */

Ahoy.prototype.init_callbacks = function( ) {

	chrome.webRequest.onBeforeRequest.addListener(
		this.proxy_turn_on_webrequest.bind(this),
        {urls: this.webreq_filter_list},
        ["blocking"]
	);

	chrome.webNavigation.onCompleted.addListener( this.restore_pac.bind(this), {url: this.webnav_filter_list} );
	chrome.webNavigation.onErrorOccurred.addListener( this.restore_pac.bind(this), {url: this.webnav_filter_list} );
	chrome.webRequest.onErrorOccurred.addListener( this.change_proxy_if_connection_fails.bind(this), {urls: this.webreq_filter_list } );

	chrome.runtime.onInstalled.addListener( this.after_update.bind(this) );
};

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


Ahoy.prototype.init_stats = function () {

	chrome.webNavigation.onBeforeNavigate.addListener( this.send_hostname, {url: this.webnav_filter_list } );

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
	document.addEventListener("onProxyUpdated", this.proxy_updated, false);
};

Ahoy.prototype.event_proxy_updated = function( e ) {
	console.log( e );
};

Ahoy.prototype.event_sites_updated = function( e ) {
	console.log ( e );
};

