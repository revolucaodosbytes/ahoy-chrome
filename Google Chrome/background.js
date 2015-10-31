/**
 * DEFAULTS
 */
chrome.sites_list = [ 'thepiratebay.org' ];
chrome.proxy_addr = "162.208.49.45:3127"; //default proxy
chrome.webreq_filter_list = [];
chrome.webnav_filter_list = [];

chrome.storage.sync.get( [ "sites_list", "proxy_addr" ], function( result) {
	chrome.sites_list = result.sites_list;
	chrome.proxy_addr = result.proxy_addr[0];

	// Create the filter to be used in the onBeforeRequest
	chrome.webreq_filter_list = [];

	for ( var siteid in chrome.sites_list ) {
		var site = chrome.sites_list[siteid];
		chrome.webreq_filter_list.push( "*://" + site + "/*" );
		chrome.webreq_filter_list.push( "*://*." + site + "/*" );
	}

	// Create the filter to be used in the onComplete and onErrorOccurred listeners
	chrome.webnav_filter_list = [];

	for ( var siteid in chrome.sites_list ) {
		var site = chrome.sites_list[siteid];
		chrome.webnav_filter_list.push( { "hostContains": site } );
	}

	// Setup the listeners
	setup_listeners();
})

// Set up the local storage
update_site_list();

// Get a proxy
update_proxy();

function setup_listeners() {
	chrome.webRequest.onBeforeRequest.addListener(
		function(details) {
			//Turn the page option on
			chrome.pageAction.show( details.tabId );
			proxy_turn_on();
		},
        {urls: chrome.webreq_filter_list},
        ["blocking"]
	)

	function restore_pac_callback( details ) {
		// Make sure that the PAC settings are applied with a small delay
		setTimeout( function() {
			console.log( "Reverting proxy settings");
			chrome.proxy.settings.clear( { scope: 'regular' } );
		}, 2000 );
	}

	chrome.webNavigation.onCompleted.addListener( restore_pac_callback, {url: chrome.webnav_filter_list} );
	chrome.webNavigation.onErrorOccurred.addListener( restore_pac_callback, {url: chrome.webnav_filter_list} );
	chrome.webRequest.onErrorOccurred.addListener( change_proxy_if_connection_fails, {urls: chrome.webreq_filter_list } );

	chrome.runtime.onInstalled.addListener( function( details ) {
		// Make sure the plugins fetch for new information when it's installed/updated
		update_site_list();
		update_proxy();
	})
}


function change_proxy_if_connection_fails( details ) {
	if ( details.error == "net::ERR_PROXY_CONNECTION_FAILED" ) {
		update_proxy();
	}
}

function proxy_turn_on() {

	// Mudar o proxy
	var config = {
	    mode: 'pac_script',
	    pacScript: {
	      data: generate_pac()
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
}

function generate_pac() {
	var pac = 	"function FindProxyForURL(url, host) {\n";
	for( var siteid in chrome.sites_list ) {
		var site = chrome.sites_list[siteid];
		 pac += "  if (host == '" + site + "' || host == 'www." + site + "')\n" +
         		"    return 'PROXY " + chrome.proxy_addr + "';\n";
		//console.log(site);
	}
    pac += 	"  return 'DIRECT';\n" +
   			"}";

   	return pac;
}

function update_site_list( block ) { 
	// default value
	if (typeof(block)==='undefined') block = false;

	var xhr = new XMLHttpRequest();
	xhr.open("GET", "http://46.101.76.116/api/sites", ! block );
	xhr.onreadystatechange = function() {
	  if (xhr.readyState == 4) {
	 	console.log("Site list sucessfully retrived.");
	    // JSON.parse does not evaluate the attacker's scripts.
	    var resp = JSON.parse(xhr.responseText);
	    chrome.storage.sync.set( { "sites_list": resp } );
	    chrome.sites_list = resp;
	  }
	}
	xhr.send();
}

function update_proxy( block ) { 
	// default value
	if (typeof(block)==='undefined') block = false;

	var xhr = new XMLHttpRequest();
	xhr.open("GET", "http://46.101.76.116/api/getProxy", ! block );
	xhr.onreadystatechange = function() {
	  if (xhr.readyState == 4) {
	 	console.log("Got a new Proxy.");
	    // JSON.parse does not evaluate the attacker's scripts.
	    var resp = JSON.parse(xhr.responseText);
	    var server = resp.host + ":" + resp.port;
	    console.log(server);
	    chrome.storage.sync.set( { "proxy_addr": server } );
	    chrome.proxy_addr = server;
	  }
	}
	xhr.send();
}

/**
 * Alarms - Periodic Tasks
 * Updating the Local Storage with the latest info
 */

// Create the periodic alarm to fetch new sites
chrome.alarms.create( 'update_sites_and_proxy', { delayInMinutes: 30, periodInMinutes: 30 } )

// Handle the alarms

chrome.alarms.onAlarm.addListener( function (alarm) {
	if( alarm.name == 'update_sites_and_proxy' ) {
		update_site_list();
		update_proxy();
	}
});


/**
 * auxiliar functions
 */
function sleep(milliseconds) {
  var start = new Date().getTime();
  for (var i = 0; i < 1e7; i++) {
    if ((new Date().getTime() - start) > milliseconds){
      break;
    }
  }
}

