
chrome.storage.sync.get( "sites_list", function( result) {
	chrome.sites_list = result.sites_list;
})

// Set up the local storage
update_site_list();

chrome.webRequest.onBeforeRequest.addListener(
	function(details) {

		//console.log(chrome.sites_list);
		for( var siteid in chrome.sites_list ) {
			var site = chrome.sites_list[siteid];
			if ( details.url.indexOf(site) != -1 ) {
				console.log("encontrei o " + site);
				proxy_turn_on();
				break;
			}
			//console.log(site);
		}

	},
        {urls: ["<all_urls>"]},
        ["blocking"]
)

function restore_pac_callback( details ) {
	console.log("Desactivar pac");

	// Make sure that the PAC settings are applied with a small delay
	setTimeout( function() {}, 2000 );

	chrome.proxy.settings.clear( { scope: 'regular' } );
}

chrome.webNavigation.onCompleted.addListener( restore_pac_callback, {url: [ 
        		{ "hostContains": "omeuip.com" }
        	]} );
chrome.webNavigation.onErrorOccurred.addListener( restore_pac_callback, {url: [ 
        		{ "hostContains": "omeuip.com" }
        	]} );

function proxy_turn_on() {
	// Validar se o URL é valido
	console.log("Site correct, activar proxy");

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
	chrome.proxy.settings.set(proxySettings, function() {});
	
	chrome.proxy.settings.get(
      {'incognito': false},
      function(config) {console.log(JSON.stringify(config));});

	// Make sure that the PAC settings are applied with a small delay
	setTimeout( function() {}, 2000 );
}

function generate_pac() {
	var pac = 	"function FindProxyForURL(url, host) {\n";
	for( var siteid in chrome.sites_list ) {
		var site = chrome.sites_list[siteid];
		 pac += "  if (host == '" + site + "')\n" +
         		"    return 'PROXY 162.208.49.45:3127';\n";
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
	xhr.open("GET", "http://ahoy.app:8000/api/sites", ! block );
	xhr.onreadystatechange = function() {
	  if (xhr.readyState == 4) {
	 	console.log("Site list sucessfully retrived.");
	    // JSON.parse does not evaluate the attacker's scripts.
	    var resp = JSON.parse(xhr.responseText);
	    chrome.storage.sync.set( { "sites_list": resp } );
	  }
	}
	xhr.send();
}

// Make sure that everything is up to date
update_site_list();

/**
 * Alarms - Periodic Tasks
 * Updating the Local Storage with the latest info
 */

// Create the periodic alarm to fetch new sites
chrome.alarms.create( 'update_sites', { delayInMinutes: 30, periodInMinutes: 30 } )

// Handle the alarms

chrome.alarms.onAlarm.addListener( function (alarm) {
	if( alarm.name == 'update_sites' ) {
		update_site_list();
	}
});


/*


*/