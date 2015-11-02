
var Ahoy = {

	/**
	 * DEFAULTS
	 */
	sites_list: ['thepiratebay.org'],
	proxy_addr: "162.208.49.45:3127", //default proxy
	
	

	/**
	 * Initializes the Ahoy! code
	 */
	init: function () {

		// Set up the local storage
		this.update_site_list();

		// Get a proxy
		this.update_proxy();

		//TODO: REFACTOR THIS SHIT
		chrome.storage.sync.get( [ "sites_list", "proxy_addr" ], function( result) {
			Ahoy.sites_list = result.sites_list;
			
			Ahoy.proxy_addr = result.proxy_addr;

			// Create the filter to be used in the onBeforeRequest
			Ahoy.callbacks.webreq_filter_list = [];

			for ( var siteid in Ahoy.sites_list ) {
				var site = Ahoy.sites_list[siteid];
				Ahoy.callbacks.webreq_filter_list.push( "*://" + site + "/*" );
				Ahoy.callbacks.webreq_filter_list.push( "*://*." + site + "/*" );
			}

			// Create the filter to be used in the onComplete and onErrorOccurred listeners
			Ahoy.callbacks.webnav_filter_list = [];

			for ( var siteid in Ahoy.sites_list ) {
				var site = Ahoy.sites_list[siteid];
				Ahoy.callbacks.webnav_filter_list.push( { "hostContains": site } );
			}

			// Setup the listeners
			Ahoy.setup_listeners();
		});
		//END OF TODO


	},

	setup_listeners: function () {
		/*
		 * Event Listeners
		 */
		 // Proxy listener
		document.addEventListener("proxy_updated", function( e ) {
			console.log(e);
		});

		// Initialize all the callbacks
		this.callbacks.init();

		//Stats listeners
		this.stats.init();

	},

	update_proxy_settings: function () {

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

	},

	generate_pac: function () {
		var pac = 	"function FindProxyForURL(url, host) {\n";
		console.log("PROXYYYYY " + Ahoy.proxy_addr);
		for( var siteid in Ahoy.sites_list ) {
			var site = Ahoy.sites_list[siteid];
			 pac += "  if (host == '" + site + "' || host == 'www." + site + "')\n" +
	         		"    return 'PROXY " + Ahoy.proxy_addr + "';\n";
			//console.log(site);
		}
	    pac += 	"  return 'DIRECT';\n" +
	   			"}";

	   	console.log(pac);
	   	return pac;
	},

	update_site_list: function () { 

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

	},

	update_proxy: function () { 

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
		    console.log(server);
		    chrome.storage.sync.set( { "proxy_addr": server } );
		  }
		}
		xhr.send();

	},

	/**
	 * Callbacks
	 */

	callbacks: {

		webreq_filter_list: [],
		webnav_filter_list: [],
		
		init: function() {
			chrome.webRequest.onBeforeRequest.addListener(
				this.proxy_turn_on_webrequest,
		        {urls: this.webreq_filter_list},
		        ["blocking"]
			);

			chrome.webNavigation.onCompleted.addListener( this.restore_pac, {url: this.webnav_filter_list} );
			chrome.webNavigation.onErrorOccurred.addListener( this.restore_pac, {url: this.webnav_filter_list} );
			chrome.webRequest.onErrorOccurred.addListener( this.change_proxy_if_connection_fails, {urls: this.webreq_filter_list } );

			chrome.runtime.onInstalled.addListener( this.after_update );
		},

		proxy_turn_on_webrequest: function(details) {
			// Turn the page option on
			if ( -1 !== details.tabId )
				chrome.pageAction.show( details.tabId );

			// Update the proxy settings
			Ahoy.update_proxy_settings();
		},

	 	/**
	 	 * Retore PAC callback
	 	 */
	 	restore_pac: function( details ) {
			// Make sure that the PAC settings are applied with a small delay
			setTimeout( function() {
				console.log( "Reverting proxy settings");
				chrome.proxy.settings.clear( { scope: 'regular' } );
			}, 2000 );
		},

		/**
		 * If the connection fails, for exemple, dead proxy, get a new one
		 */
		change_proxy_if_connection_fails: function ( details ) {
			if ( details.error == "net::ERR_PROXY_CONNECTION_FAILED" ) {
				Ahoy.update_proxy();
			}
		},

		after_update: function( details ) {
			// Make sure the plugins fetch for new information when it's installed/updated
			Ahoy.update_site_list();
			Ahoy.update_proxy();
		} 

	 },

	 stats: {

	 	init: function () {

			chrome.webNavigation.onBeforeNavigate.addListener( this.send_hostname, {url: Ahoy.callbacks.webnav_filter_list } );

	 	},

		/**
		 * Stats functions
		 */
		send_hostname: function ( details ) {
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
		}

	 }

}

// OLD CODE BELOW!






